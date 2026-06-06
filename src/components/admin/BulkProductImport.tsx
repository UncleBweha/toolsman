import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/database";
import { watermarkUrl, uploadWatermarkedBlob, isAlreadyWatermarked, watermarkProduct } from "@/lib/watermark";
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
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parseKeyFeatures } from "@/lib/featureParser";
import { generateProductImportTemplate, parseExcelFile, CategoryWithSubcategories } from "@/lib/excelTemplateGenerator";

import { 
  fetchCategoriesWithSubcategories, 
  getCategoryIdByName, 
  getSubcategoryIdByName,
  validateImportedCategories 
} from "@/lib/categoryService";

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
  status?: "pending" | "success" | "error" | "duplicate";
  error?: string;
  rowIndex?: number;
}

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

  const parseFile = async (file: File) => {
    console.log("Starting file parse:", file.name, file.type, file.size);
    setIsParsing(true);
    toast.info(`Processing ${file.name}...`);
    
    try {
      const cats = await fetchCategories();
      console.log("Fetched categories:", cats.length);
      
      const extension = file.name.split(".").pop()?.toLowerCase();
      console.log("File extension:", extension);

      if (extension === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            console.log("CSV parse complete:", results.data.length, "rows");
            if (results.data.length === 0) {
              toast.error("The file appears to be empty");
              setIsParsing(false);
              return;
            }
            await processData(results.data as Record<string, string>[], cats);
            setIsParsing(false);
          },
          error: (error) => {
            console.error("CSV parse error:", error);
            toast.error("Failed to parse CSV file: " + error.message);
            setIsParsing(false);
          },
        });
      } else if (extension === "xlsx" || extension === "xls") {
        try {
          const jsonData = await parseExcelFile(file);
          console.log("Excel parse complete:", jsonData.length, "rows");
          
          if (jsonData.length > 0) {
            console.log("First row sample:", JSON.stringify(jsonData[0]));
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
    const categoryMap = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));

    // Prepare rows for validation
    const rowsToValidate = data.map((row, idx) => ({
      category: row.category || row.Category || row.CATEGORY || "",
      sub_category: row.sub_category || row.SubCategory || row.sub_Category || row["Sub Category"] || "",
      rowIndex: idx + 2, // +2 because Excel row numbering starts at 1 and headers are row 1
    }));

    // Validate categories and subcategories
    const validationResults = await validateImportedCategories(rowsToValidate);

    // Create validation map for quick lookup
    const validationMap = new Map(validationResults.map(r => [r.rowIndex, r]));

    const processed: ImportProduct[] = data.map((row, idx) => {
      const name = row.name || row.Name || row.NAME || "";
      const categoryName = row.category || row.Category || row.CATEGORY || "";
      const subCategoryName = row.sub_category || row.SubCategory || row.sub_Category || row["Sub Category"] || "";
      const rowIndex = idx + 2;

      // Get validation result
      const validation = validationMap.get(rowIndex);
      let categoryId: string | null = null;
      let subCategoryId: string | null = null;
      let validationError = "";

      if (validation && !validation.valid) {
        validationError = validation.errors.join("; ");
      } else if (validation) {
        categoryId = validation.categoryId || null;
        subCategoryId = validation.subcategoryId || null;
      }

      // Fallback to old category lookup for backward compatibility
      if (!categoryId && categoryName) {
        categoryId = categoryMap.get(categoryName.toLowerCase()) || null;
      }

      return {
        name,
        slug: row.slug || row.Slug || generateSlug(name),
        description: row.description || row.Description || "",
        price: parseInt(row.price || row.Price || "0") || 0,
        original_price: row.original_price || row.OriginalPrice ? parseInt(row.original_price || row.OriginalPrice) : null,
        sku: row.sku || row.SKU || "",
        stock_quantity: parseInt(row.stock_quantity || row.Stock || row.stock || "0") || 0,
        category: categoryName,
        sub_category: subCategoryName,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        image_url: row.image_url || row.ImageUrl || row.image || "",
        // Collect extra image columns (image_url_2 … image_url_5) into the images array
        images: [
          row.image_url_2 || row.ImageUrl2 || "",
          row.image_url_3 || row.ImageUrl3 || "",
          row.image_url_4 || row.ImageUrl4 || "",
          row.image_url_5 || row.ImageUrl5 || "",
        ].filter(Boolean),
        brand: row.brand || row.Brand || "",
        tags: row.tags || row.Tags || "",
        key_features: row.key_features || row.KeyFeatures || row.features || "",
        product_status: row.status || row.Status || "active",
        is_featured: (row.is_featured || row.Featured || "").toLowerCase() === "true",
        is_active: (row.is_active || row.Active || "true").toLowerCase() !== "false",
        status: validationError ? "error" : ("pending" as const),
        error: validationError || undefined,
        rowIndex: rowIndex,
      };
    });

    setProducts(processed);
    toast.success(`Loaded ${processed.length} products for import`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
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

    // Fetch existing SKUs for duplicate detection
    const { data: existingProducts } = await supabase
      .from("products")
      .select("sku, name")
      .not("sku", "is", null);
    const existingSkus = new Set((existingProducts || []).map(p => p.sku?.toLowerCase()).filter(Boolean));
    const existingNames = new Set((existingProducts || []).map(p => p.name.toLowerCase()));

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      if (!product.name || product.price <= 0) {
        updatedProducts[i] = { ...product, status: "error", error: "Name and valid price are required" };
        errors.push({ row: product.rowIndex || i + 1, message: "Name and valid price are required" });
        setProducts([...updatedProducts]);
        setImportProgress(((i + 1) / products.length) * 100);
        continue;
      }

      // Check for validation errors from parsing
      if (product.error) {
        updatedProducts[i] = { ...product, status: "error" };
        errors.push({ row: product.rowIndex || i + 1, message: product.error });
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

      // Resolve category if using name-based lookup
      let categoryId = product.category_id;
      if (!categoryId && product.category) {
        categoryId = await getCategoryIdByName(product.category);
        if (!categoryId) {
          updatedProducts[i] = { 
            ...product, 
            status: "error", 
            error: `Category "${product.category}" not found` 
          };
          errors.push({ 
            row: product.rowIndex || i + 1, 
            message: `Category "${product.category}" not found` 
          });
          setProducts([...updatedProducts]);
          setImportProgress(((i + 1) / products.length) * 100);
          continue;
        }
      }

      // Resolve subcategory if using name-based lookup
      let subcategoryId = product.sub_category_id;
      if (!subcategoryId && product.sub_category && categoryId) {
        subcategoryId = await getSubcategoryIdByName(product.sub_category, categoryId);
        if (!subcategoryId) {
          updatedProducts[i] = { 
            ...product, 
            status: "error", 
            error: `Subcategory "${product.sub_category}" not found for this category` 
          };
          errors.push({ 
            row: product.rowIndex || i + 1, 
            message: `Subcategory "${product.sub_category}" not found for this category` 
          });
          setProducts([...updatedProducts]);
          setImportProgress(((i + 1) / products.length) * 100);
          continue;
        }
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
        // Retry only on unique slug conflict
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
          // Trigger background watermarking so it doesn't block the import speed
          watermarkProduct(inserted.id, rawImageUrl, rawImages);
        }
        // Add to tracking sets to catch duplicates within the same batch
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

    // Log import history (table optional)
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
    return `Kshs ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
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
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 50).map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs text-muted-foreground">{product.rowIndex ?? index + 2}</TableCell>
                      <TableCell>
                        {product.status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {product.status === "error" && (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {product.status === "duplicate" && (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                        {product.status === "pending" && (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell className="text-xs">{product.sub_category || product.category || "-"}</TableCell>
                      <TableCell className={product.status === "duplicate" ? "text-orange-600 text-sm" : "text-red-600 text-sm"}>
                        {product.error}
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
          <li>• <strong>Optional fields:</strong> description, original_price, sku, category, sub_category, brand, tags, key_features, image_url, image_url_2…image_url_5</li>
          <li>• <strong>Price format:</strong> Enter prices in Kshs (e.g., 9999 for Kshs 9,999)</li>
          <li>• <strong>Category & Sub Category:</strong> Use dropdowns in the template - they automatically populate from your website</li>
          <li>• <strong>Sub Category:</strong> Will automatically filter based on selected category</li>
          <li>• <strong>Tags:</strong> Comma-separated (e.g., "drill, cordless, power tool")</li>
          <li>• <strong>Key features:</strong> Comma-separated (e.g., "20V Battery, Variable Speed")</li>
          <li>• <strong>Backward compatibility:</strong> Old imports without sub_category column will still work</li>
        </ul>
      </div>
    </div>
  );
};

export default BulkProductImport;
