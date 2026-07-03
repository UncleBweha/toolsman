import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/database";
import { watermarkProduct } from "@/lib/watermark";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, XCircle, AlertCircle, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import { parseKeyFeatures } from "@/lib/featureParser";
import { generateProductImportTemplate, parseExcelFile, CategoryWithSubcategories } from "@/lib/excelTemplateGenerator";

import {
  fetchCategoriesWithSubcategories,
  getCategoryIdByName,
  getSubcategoryIdByName,
  validateImportedCategories,
} from "@/lib/categoryService";

// ──────────────────────────────────────────────────────────────────────────────
// Description / feature detection helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Detect whether a string looks like a feature list rather than a prose paragraph.
 * Heuristics:
 *  - Contains bullet characters (•, ●, ◦, ‣, -)
 *  - Contains newlines with short items (each < 120 chars)
 *  - Contains numbered list prefixes (1., 2., …)
 */
function looksLikeFeatureList(text: string): boolean {
  if (!text) return false;
  // Bullet characters
  if (/[•●◦‣]/.test(text)) return true;
  // Markdown-style list
  if (/^[-*]\s/m.test(text)) return true;
  // Numbered list (at least 2 items)
  const numberedMatches = text.match(/^\s*\d+[.)]\s/gm);
  if (numberedMatches && numberedMatches.length >= 2) return true;
  // Newline-separated items where most lines are short (< 120 chars) and non-empty
  if (/\n/.test(text)) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines.every(l => l.length < 120)) return true;
  }
  return false;
}

/**
 * Split a raw description cell into:
 *  - `paragraph`: the prose paragraph portion (or empty string)
 *  - `features`: items to go into key_features
 *
 * Strategy:
 *  1. If description is entirely a feature list → all goes to features, paragraph = ""
 *  2. If description is a prose paragraph → paragraph = text, features = []
 *  3. Mixed: first paragraph-like block → paragraph; subsequent lines that look like
 *     features → features
 */
function splitDescriptionAndFeatures(raw: string): { paragraph: string; features: string[] } {
  if (!raw || !raw.trim()) return { paragraph: "", features: [] };

  const text = raw.trim();

  // Entirely a feature list
  if (looksLikeFeatureList(text)) {
    return { paragraph: "", features: parseKeyFeatures(text) };
  }

  // Try to split: first big block as prose, remainder as features
  // Split on double-newline (paragraph boundary)
  const blocks = text.split(/\n{2,}/);
  if (blocks.length >= 2) {
    const firstBlock = blocks[0].trim();
    const rest = blocks.slice(1).join("\n\n").trim();
    if (looksLikeFeatureList(rest)) {
      return { paragraph: firstBlock, features: parseKeyFeatures(rest) };
    }
  }

  // No detectable feature list — treat whole thing as paragraph
  return { paragraph: text, features: [] };
}

// ──────────────────────────────────────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────────────────────────────────────

interface ImportProduct {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  original_price?: number | null;
  sku?: string;
  stock_quantity?: number;
  category?: string;
  sub_category?: string;
  sub_sub_category?: string;
  category_id?: string | null;
  sub_category_id?: string | null;
  image_url?: string;
  images?: string[];
  brand?: string;
  tags?: string;
  key_features?: string;
  product_status?: string;
  is_featured?: boolean;
  is_active?: boolean;
  status?: "pending" | "success" | "error" | "duplicate" | "warning";
  error?: string;
  warnings?: string[];
  rowIndex?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

const BulkProductImport = () => {
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true);
    setCategories(data || []);
    return data || [];
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  /**
   * Read a row value with multiple possible column name variants.
   * Always returns a trimmed string.
   */
  const getField = (row: Record<string, string>, ...keys: string[]): string => {
    for (const key of keys) {
      const val = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
      if (val !== undefined && val !== null) {
        return String(val).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ").trim();
      }
    }
    return "";
  };

  const parseFile = async (file: File) => {
    console.log("Starting file parse:", file.name, file.type, file.size);
    setIsParsing(true);
    toast.info(`Processing ${file.name}...`);

    try {
      const cats = await fetchCategories();
      console.log("Fetched categories:", cats.length);

      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            if (results.data.length === 0) {
              toast.error("The file appears to be empty");
              setIsParsing(false);
              return;
            }
            await processData(results.data as Record<string, string>[], cats);
            setIsParsing(false);
          },
          error: (error) => {
            toast.error("Failed to parse CSV file: " + error.message);
            setIsParsing(false);
          },
        });
      } else if (extension === "xlsx" || extension === "xls") {
        try {
          const jsonData = await parseExcelFile(file);
          console.log("Excel parse complete:", jsonData.length, "rows");
          if (jsonData.length > 0) {
            console.log("Column headers:", Object.keys(jsonData[0]));
          }
          await processData(jsonData, cats);
          setIsParsing(false);
        } catch (parseError) {
          console.error("Excel parse error:", parseError);
          toast.error("Failed to parse Excel file: " + (parseError instanceof Error ? parseError.message : "Unknown error"));
          setIsParsing(false);
        }
      } else {
        toast.error("Unsupported file format. Please use CSV or Excel files (.csv, .xlsx, .xls)");
        setIsParsing(false);
      }
    } catch (error) {
      console.error("parseFile error:", error);
      toast.error("An error occurred while processing the file: " + (error instanceof Error ? error.message : "Unknown error"));
      setIsParsing(false);
    }
  };

  const processData = async (data: Record<string, string>[], cats: Category[]) => {
    // Prepare rows for category validation
    const rowsToValidate = data.map((row, idx) => ({
      category: getField(row, "category", "Category", "CATEGORY"),
      sub_category: getField(row, "sub_category", "SubCategory", "sub_Category", "Sub Category"),
      rowIndex: idx + 2,
    }));

    // Validate categories — now returns warnings, not blocking errors
    const validationResults = await validateImportedCategories(rowsToValidate);
    const validationMap = new Map(validationResults.map(r => [r.rowIndex, r]));

    const processed: ImportProduct[] = data.map((row, idx) => {
      const name = getField(row, "name", "Name", "NAME");
      const categoryName = getField(row, "category", "Category", "CATEGORY");
      const subCategoryName = getField(row, "sub_category", "SubCategory", "sub_Category", "Sub Category");
      const subSubCategoryName = getField(row, "sub_sub_category", "SubSubCategory", "Sub Sub Category", "sub_sub_category");
      const rowIndex = idx + 2;

      // Category resolution (warnings only — never blocks)
      const validation = validationMap.get(rowIndex);
      const categoryId = validation?.categoryId || null;
      const subCategoryId = validation?.subcategoryId || null;
      const rowWarnings = validation?.warnings || [];

      // ── SKU: always force to string ──────────────────────────────────────
      const rawSku = getField(row, "sku", "SKU", "Sku");
      // If it's a pure number, it may have lost leading zeros — keep as-is
      const sku = rawSku;

      // ── Description + feature extraction ─────────────────────────────────
      const rawDescription = getField(row, "description", "Description", "DESCRIPTION");
      const rawKeyFeatures = getField(row, "key_features", "KeyFeatures", "key_features", "features", "Features");

      const { paragraph, features: descFeatures } = splitDescriptionAndFeatures(rawDescription);

      // Merge features from description detection + key_features column (deduplicated)
      const colFeatures = parseKeyFeatures(rawKeyFeatures);
      const mergedFeatures = [...colFeatures];
      const seen = new Set(colFeatures.map(f => f.toLowerCase().replace(/\s+/g, " ")));
      for (const f of descFeatures) {
        const key = f.toLowerCase().replace(/\s+/g, " ");
        if (!seen.has(key)) {
          mergedFeatures.push(f);
          seen.add(key);
        }
      }

      // Final description: use parsed paragraph (may be empty if all was features)
      const finalDescription = paragraph || null;
      const finalKeyFeatures = mergedFeatures.join("\n");

      return {
        name,
        slug: getField(row, "slug", "Slug") || generateSlug(name),
        description: finalDescription ?? undefined,
        price: parseInt(getField(row, "price", "Price", "PRICE")) || 0,
        original_price: getField(row, "original_price", "OriginalPrice")
          ? parseInt(getField(row, "original_price", "OriginalPrice")) || null
          : null,
        sku: sku || undefined,
        stock_quantity: parseInt(getField(row, "stock_quantity", "Stock", "stock")) || 0,
        category: categoryName,
        sub_category: subCategoryName,
        sub_sub_category: subSubCategoryName,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        image_url: getField(row, "image_url", "ImageUrl", "image"),
        images: [
          getField(row, "image_url_2", "ImageUrl2"),
          getField(row, "image_url_3", "ImageUrl3"),
          getField(row, "image_url_4", "ImageUrl4"),
          getField(row, "image_url_5", "ImageUrl5"),
        ].filter(Boolean),
        brand: getField(row, "brand", "Brand"),
        tags: getField(row, "tags", "Tags"),
        key_features: finalKeyFeatures,
        product_status: getField(row, "status", "Status") || "active",
        is_featured: getField(row, "is_featured", "Featured").toLowerCase() === "true",
        is_active: getField(row, "is_active", "Active").toLowerCase() !== "false",
        status: rowWarnings.length > 0 ? ("warning" as const) : ("pending" as const),
        warnings: rowWarnings.length > 0 ? rowWarnings : undefined,
        rowIndex,
      };
    });

    setProducts(processed);
    const warningCount = processed.filter(p => p.status === "warning").length;
    if (warningCount > 0) {
      toast.warning(`Loaded ${processed.length} products — ${warningCount} have category warnings (will still import)`);
    } else {
      toast.success(`Loaded ${processed.length} products for import`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "csv" || extension === "xlsx" || extension === "xls") {
        parseFile(file);
      } else {
        toast.error("Please drop a CSV or Excel file (.csv, .xlsx, .xls)");
      }
    }
  };

  const handleImport = async () => {
    if (products.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    const updatedProducts = [...products];
    const importedIds: string[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    // Fetch existing SKUs/names for duplicate detection
    const { data: existingProducts } = await supabase
      .from("products")
      .select("sku, name")
      .not("sku", "is", null);
    const existingSkus = new Set((existingProducts || []).map(p => p.sku?.toLowerCase()).filter(Boolean));
    const existingNames = new Set((existingProducts || []).map(p => p.name.toLowerCase()));

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Hard validation: name + price required
      if (!product.name || product.price <= 0) {
        updatedProducts[i] = { ...product, status: "error", error: "Name and valid price are required" };
        errors.push({ row: product.rowIndex || i + 1, message: "Name and valid price are required" });
        setProducts([...updatedProducts]);
        setImportProgress(((i + 1) / products.length) * 100);
        continue;
      }

      // Duplicate detection by SKU or name
      if (product.sku && existingSkus.has(product.sku.toLowerCase())) {
        updatedProducts[i] = { ...product, status: "duplicate", error: `Duplicate SKU: ${product.sku}` };
        errors.push({ row: product.rowIndex || i + 1, message: `Duplicate SKU: ${product.sku}` });
        setProducts([...updatedProducts]);
        setImportProgress(((i + 1) / products.length) * 100);
        continue;
      }
      if (existingNames.has(product.name.toLowerCase())) {
        updatedProducts[i] = { ...product, status: "duplicate", error: `Duplicate name: ${product.name}` };
        errors.push({ row: product.rowIndex || i + 1, message: `Duplicate name: ${product.name}` });
        setProducts([...updatedProducts]);
        setImportProgress(((i + 1) / products.length) * 100);
        continue;
      }

      // Resolve category if not already set
      let categoryId = product.category_id;
      if (!categoryId && product.category) {
        categoryId = await getCategoryIdByName(product.category);
        // Not finding a category is fine — just import without it
      }

      // Resolve subcategory
      let subcategoryId = product.sub_category_id;
      if (!subcategoryId && product.sub_category && categoryId) {
        subcategoryId = await getSubcategoryIdByName(product.sub_category, categoryId);
      }

      // Resolve sub-sub-category (use it as the most specific category_id if found)
      if (product.sub_sub_category && subcategoryId) {
        const subSubId = await getSubcategoryIdByName(product.sub_sub_category, subcategoryId);
        if (subSubId) subcategoryId = subSubId;
      }

      const rawImageUrl = product.image_url || null;
      const rawImages = product.images || [];

      const baseSlug = product.slug || generateSlug(product.name);
      const buildPayload = (slug: string) => ({
        name: product.name,
        slug,
        description: product.description || null,
        price: product.price,
        original_price: product.original_price || null,
        sku: product.sku || null,
        stock_quantity: 9999,
        category_id: categoryId || null,
        image_url: rawImageUrl,
        images: rawImages,
        brand: product.brand || null,
        tags: product.tags ? product.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        key_features: parseKeyFeatures(product.key_features),
        status: product.product_status || "active",
        is_featured: product.is_featured || false,
        is_active: product.is_active ?? true,
      });

      let inserted: { id: string } | null = null;
      let error: any = null;
      let slug = baseSlug;
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await supabase.from("products").insert(buildPayload(slug)).select("id").single();
        if (!res.error) { inserted = res.data as any; error = null; break; }
        error = res.error;
        if (res.error.code === "23505" && /slug/i.test(res.error.message)) {
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
          continue;
        }
        break;
      }

      if (error) {
        updatedProducts[i] = { ...product, status: "error", error: error.message };
        errors.push({ row: product.rowIndex || i + 1, message: error.message });
      } else {
        updatedProducts[i] = { ...product, status: "success" };
        if (inserted?.id) {
          importedIds.push(inserted.id);
          watermarkProduct(inserted.id, rawImageUrl, rawImages);
        }
        if (product.sku) existingSkus.add(product.sku.toLowerCase());
        existingNames.add(product.name.toLowerCase());
      }

      setProducts([...updatedProducts]);
      setImportProgress(((i + 1) / products.length) * 100);
    }

    setIsImporting(false);

    const successCount = updatedProducts.filter((p) => p.status === "success").length;
    const errorCount = updatedProducts.filter((p) => p.status === "error").length;
    const duplicateCount = updatedProducts.filter((p) => p.status === "duplicate").length;

    // Log import history
    try {
      await (supabase.from as any)("import_history").insert({
        filename: "bulk_import",
        total_rows: products.length,
        success_count: successCount,
        error_count: errorCount + duplicateCount,
        status: "completed",
        errors: errors as any,
        imported_product_ids: importedIds,
        completed_at: new Date().toISOString(),
      });
    } catch {
      // ignore if table not present
    }

    if (errorCount === 0 && duplicateCount === 0) {
      toast.success(`Successfully imported ${successCount} products`);
    } else {
      toast.warning(`Imported ${successCount}, ${duplicateCount} duplicates skipped, ${errorCount} failed`);
    }
  };

  const downloadTemplate = async () => {
    try {
      toast.loading("Generating template...");
      const categoriesWithSubs = await fetchCategoriesWithSubcategories();

      if (categoriesWithSubs.length === 0) {
        toast.error("No categories available. Please create categories first.");
        return;
      }

      await generateProductImportTemplate(categoriesWithSubs);
      toast.success("Template downloaded successfully!");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate template: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const formatPrice = (price: number) => {
    return `Kshs ${Number(price).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  const StatusIcon = ({ product }: { product: ImportProduct }) => {
    if (product.status === "success") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (product.status === "error") return <XCircle className="h-5 w-5 text-red-600" />;
    if (product.status === "duplicate") return <AlertCircle className="h-5 w-5 text-orange-500" />;
    if (product.status === "warning") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-background rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Bulk Product Import</h2>

        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative rounded-lg p-6 mb-6 border-2 border-dashed transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : isParsing
              ? "border-primary/50 bg-primary/5"
              : "border-muted-foreground/25 bg-muted/50 hover:border-muted-foreground/50"
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
              <div className="text-center">
                <Upload className="h-12 w-12 text-primary mx-auto mb-2 animate-bounce" />
                <p className="text-lg font-medium text-primary">Drop your file here</p>
              </div>
            </div>
          )}
          {isParsing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-2 animate-spin" />
                <p className="text-lg font-medium text-primary">Processing file...</p>
                <p className="text-sm text-muted-foreground">Please wait while we parse your data</p>
              </div>
            </div>
          )}
          <div className={`flex items-start gap-4 ${isDragging || isParsing ? "opacity-30" : ""}`}>
            <FileSpreadsheet className="h-8 w-8 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">Upload CSV or Excel File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your file here, or click to browse. Download the template to see the required format.
              </p>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isParsing}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isParsing ? "Processing..." : "Select File"}
                </Button>
                <Button variant="outline" onClick={downloadTemplate} disabled={isParsing}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {products.length} products ready for import
                {products.filter(p => p.status === "warning").length > 0 && (
                  <span className="ml-2 text-yellow-600">
                    · {products.filter(p => p.status === "warning").length} with category warnings (will still import)
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setProducts([])}>
                  Clear
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing... {Math.round(importProgress)}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import All
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isImporting && (
              <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Row</TableHead>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 50).map((product, index) => (
                    <TableRow
                      key={index}
                      className={
                        product.status === "warning" ? "bg-yellow-50/50" : ""
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground">{product.rowIndex ?? index + 2}</TableCell>
                      <TableCell>
                        <StatusIcon product={product} />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell className="text-xs">
                        {[product.category, product.sub_category, product.sub_sub_category]
                          .filter(Boolean).join(" › ") || "-"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[220px]">
                        {product.status === "error" && (
                          <span className="text-red-600">{product.error}</span>
                        )}
                        {product.status === "duplicate" && (
                          <span className="text-orange-600">{product.error}</span>
                        )}
                        {product.status === "warning" && product.warnings && (
                          <span className="text-yellow-700 text-xs leading-tight">
                            {product.warnings.join("; ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {products.length > 50 && (
                <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                  Showing first 50 of {products.length} products
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-background rounded-lg border p-6">
        <h3 className="font-semibold mb-3">Import Guidelines</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• <strong>Required fields:</strong> name, price (in Kshs)</li>
          <li>• <strong>Optional fields:</strong> description, original_price, sku, category, sub_category, sub_sub_category, brand, tags, key_features, image_url, image_url_2…image_url_5</li>
          <li>• <strong>Price format:</strong> Enter prices in Kshs (e.g., 9999 for Kshs 9,999)</li>
          <li>• <strong>Category matching:</strong> Case-insensitive, space-tolerant, fuzzy — products import even if category is not found (shown as yellow warning)</li>
          <li>• <strong>SKU:</strong> Always treated as text — leading zeros are preserved</li>
          <li>• <strong>Description + Features:</strong> If description contains bullet points or a numbered list, features are automatically extracted from it and merged with the key_features column</li>
          <li>• <strong>Tags:</strong> Comma-separated (e.g., "drill, cordless, power tool")</li>
          <li>• <strong>Key features:</strong> Supports bullet lists, numbered lists, or comma-separated</li>
        </ul>
      </div>
    </div>
  );
};

export default BulkProductImport;
