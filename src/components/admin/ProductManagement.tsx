import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import RichTextEditor from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, FolderOpen, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number | null;
  sku: string;
  stock_quantity: number;
  category_id: string;
  subcategory_id: string;
  image_url: string;
  images: string[];
  brand: string;
  tags: string;
  key_features: string;
  status: string;
  is_featured: boolean;
  is_active: boolean;
}

const emptyFormData: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  original_price: null,
  sku: "",
  stock_quantity: 0,
  category_id: "",
  subcategory_id: "",
  image_url: "",
  images: [],
  brand: "",
  tags: "",
  key_features: "",
  status: "active",
  is_featured: false,
  is_active: true,
};

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkCategoryOpen, setIsBulkCategoryOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState<string>("");
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Organize categories into parent and subcategories
  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);
  const selectedParentHasSubcategories = bulkCategoryId ? getSubcategories(bulkCategoryId).length > 0 : false;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load products");
    } else {
      setProducts((data as unknown as Product[]) || []);
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    setCategories(data || []);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPrimary: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WEBP, or GIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    if (isPrimary) setIsUploading(true);
    else setIsUploadingAdditional(true);

    try {
      let uploadedUrl: string | null = null;

      // Try edge function first (adds watermark)
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("image", file);
        const { data, error } = await supabase.functions.invoke("process-product-image", {
          body: formDataUpload,
        });
        if (error) {
          console.warn("Edge function error (falling back to direct upload):", error.message || error);
        } else if (data?.url) {
          uploadedUrl = data.url;
          if (data.watermarked === false) {
            toast.info("Image uploaded without watermark — ensure watermark.png is in system-assets bucket");
          }
        }
      } catch (edgeFnErr) {
        console.warn("Edge function unavailable (falling back to direct upload):", edgeFnErr);
      }

      // Fallback: upload directly to Supabase Storage
      if (!uploadedUrl) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from("product-images")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (storageError) throw storageError;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        uploadedUrl = urlData.publicUrl;
      }

      if (uploadedUrl) {
        if (isPrimary) {
          setFormData((prev) => ({ ...prev, image_url: uploadedUrl! }));
        } else {
          setFormData((prev) => ({ ...prev, images: [...prev.images, uploadedUrl!] }));
        }
        toast.success("Image uploaded successfully");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      if (isPrimary) setIsUploading(false);
      else setIsUploadingAdditional(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Use subcategory if selected, otherwise parent category
    const finalCategoryId = formData.subcategory_id || formData.category_id || null;

    if (!finalCategoryId) {
      toast.error("Please select a category (and subcategory if applicable)");
      setIsSaving(false);
      return;
    }

    // Coerce numeric fields — inputs return strings, DB expects numbers
    const price = parseFloat(String(formData.price)) || 0;
    const originalPrice = formData.original_price
      ? parseFloat(String(formData.original_price))
      : null;
    const stockQty = parseInt(String(formData.stock_quantity), 10) || 0;

    // Handle slug uniqueness — on create, suffix with timestamp if collision
    let slug = formData.slug.trim();
    if (!editingProduct) {
      const { data: slugCheck } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (slugCheck) {
        slug = `${slug}-${Date.now().toString(36)}`;
        // Update the form so user sees the resolved slug
        setFormData(prev => ({ ...prev, slug }));
      }
    } else {
      // On update, check for collision with OTHER products
      const { data: slugCheck } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .neq("id", editingProduct.id)
        .maybeSingle();
      if (slugCheck) {
        toast.error(`Slug "${slug}" is already used by another product. Please change it.`);
        setIsSaving(false);
        return;
      }
    }

    const productData = {
      name: formData.name.trim(),
      slug,
      description: formData.description || null,
      price,
      original_price: originalPrice,
      // Empty SKU must be null — non-null empty string violates UNIQUE constraint
      sku: formData.sku?.trim() || null,
      stock_quantity: stockQty,
      category_id: finalCategoryId,
      image_url: formData.image_url || null,
      images: formData.images.filter(Boolean),
      brand: formData.brand?.trim() || null,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      generated_tags: formData.generated_tags.filter(Boolean),
      key_features: formData.key_features
        ? formData.key_features.split("\n").map(f => f.trim()).filter(Boolean)
        : [],
      status: formData.status || "active",
      is_featured: formData.is_featured,
      is_active: formData.is_active,
    };

    let error;
    if (editingProduct) {
      const result = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);
      error = result.error;
    } else {
      const result = await supabase.from("products").insert(productData);
      error = result.error;
    }

    if (error) {
      console.error("Product save error:", error);
      toast.error(
        editingProduct
          ? `Failed to update product: ${error.message}`
          : `Failed to create product: ${error.message}`
      );
    } else {
      toast.success(editingProduct ? "Product updated" : "Product created");
      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData(emptyFormData);
      fetchProducts();
    }
    setIsSaving(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const cat = categories.find(c => c.id === product.category_id);
    const isSubcat = cat?.parent_id != null;
    const existingManualTags = product.tags || [];

    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      original_price: product.original_price,
      sku: product.sku || "",
      stock_quantity: product.stock_quantity,
      category_id: isSubcat ? (cat?.parent_id || "") : (product.category_id || ""),
      subcategory_id: isSubcat ? (product.category_id || "") : "",
      image_url: product.image_url || "",
      images: product.images || [],
      brand: product.brand || "",
      tags: existingManualTags.join(", "),
      key_features: (product.key_features || []).join("\n"),
      status: product.status || "active",
      is_featured: product.is_featured,
      is_active: product.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      fetchProducts();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;

    setIsDeleting(true);
    const ids = Array.from(selectedProducts);

    const { error } = await supabase.from("products").delete().in("id", ids);

    if (error) {
      toast.error("Failed to delete products");
    } else {
      toast.success(`Deleted ${ids.length} products`);
      setSelectedProducts(new Set());
      fetchProducts();
    }
    setIsDeleting(false);
  };

  const handleBulkCategoryAssign = async () => {
    if (selectedProducts.size === 0 || !bulkCategoryId) return;

    // Use subcategory if selected, otherwise use parent category
    const finalCategoryId = bulkSubcategoryId || bulkCategoryId;

    setIsUpdatingCategory(true);
    const ids = Array.from(selectedProducts);

    const { error } = await supabase
      .from("products")
      .update({ category_id: finalCategoryId })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update categories");
    } else {
      const categoryName = categories.find(c => c.id === finalCategoryId)?.name || "category";
      toast.success(`Assigned ${ids.length} products to ${categoryName}`);
      setSelectedProducts(new Set());
      setIsBulkCategoryOpen(false);
      setBulkCategoryId("");
      setBulkSubcategoryId("");
      fetchProducts();
    }
    setIsUpdatingCategory(false);
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.category?.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const formatPrice = (price: number) => {
    return `Kshs ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border">
      {/* Floating action bar when products are selected */}
      {selectedProducts.size > 0 && (
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 flex items-center justify-between rounded-t-lg">
          <span className="font-medium">{selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Dialog open={isBulkCategoryOpen} onOpenChange={setIsBulkCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Assign Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Category to {selectedProducts.size} Products</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Category</Label>
                    <Select 
                      value={bulkCategoryId} 
                      onValueChange={(value) => {
                        setBulkCategoryId(value);
                        setBulkSubcategoryId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedParentHasSubcategories && (
                    <div className="space-y-2">
                      <Label>Select Subcategory (Optional)</Label>
                      <Select value={bulkSubcategoryId} onValueChange={setBulkSubcategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSubcategories(bulkCategoryId).map((subcat) => (
                            <SelectItem key={subcat.id} value={subcat.id}>
                              {subcat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsBulkCategoryOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkCategoryAssign} disabled={!bulkCategoryId || isUpdatingCategory}>
                      {isUpdatingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Assign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedProducts.size} products?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected products from your store.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      )}
      <div className="p-6 border-b flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Products</h2>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} of {products.length} products
            </p>
          </div>
          <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
              setFormData(emptyFormData);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  // Explicitly reset to creation mode before opening
                  setEditingProduct(null);
                  setFormData(emptyFormData);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={handleDescriptionChange}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Kshs) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="original_price">Original Price (Kshs)</Label>
                  <Input
                    id="original_price"
                    type="number"
                    value={formData.original_price || ""}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value, subcategory_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subcategory - shown when parent has subcategories */}
              {formData.category_id && getSubcategories(formData.category_id).length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory *</Label>
                  <Select
                    value={formData.subcategory_id}
                    onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubcategories(formData.category_id).map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Required: select a subcategory for this parent category.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="image_url">Primary Image URL or Upload</Label>
                <div className="flex gap-2">
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <div className="relative overflow-hidden w-24">
                    <Button type="button" variant="outline" className="w-full h-full" disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" className="w-20 h-20 object-contain rounded border mt-1 bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Additional Image URLs or Upload</Label>
                <p className="text-xs text-muted-foreground">Add one URL per line or upload files for extra product images</p>
                <div className="flex gap-2">
                  <textarea
                    value={formData.images.join("\n")}
                    onChange={(e) => setFormData({ ...formData, images: e.target.value.split("\n").map(s => s.trim()) })}
                    placeholder={"https://example.com/image2.jpg\nhttps://example.com/image3.jpg"}
                    rows={3}
                    className="flex flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <div className="relative overflow-hidden w-24">
                    <Button type="button" variant="outline" className="w-full h-full" disabled={isUploadingAdditional}>
                      {isUploadingAdditional ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploadingAdditional}
                    />
                  </div>
                </div>
                {formData.images.filter(Boolean).length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {formData.images.filter(Boolean).map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Image ${i + 1}`} className="w-16 h-16 object-contain rounded border bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, index) => index !== i) }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. DeWalt, Makita"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="power tool, cordless, drill (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas for better product discovery.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key_features">Key Features</Label>
                <textarea
                  id="key_features"
                  value={formData.key_features}
                  onChange={(e) => setFormData({ ...formData, key_features: e.target.value })}
                  placeholder={"20V Max Lithium-Ion Battery\n1/2 inch chuck size\nVariable speed trigger"}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground">One feature per line</p>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingProduct ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedProducts.size === products.length && products.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProducts.map((product) => (
            <TableRow key={product.id} className={selectedProducts.has(product.id) ? "bg-muted/50" : ""}>
              <TableCell>
                <Checkbox
                  checked={selectedProducts.has(product.id)}
                  onCheckedChange={() => toggleSelectProduct(product.id)}
                  aria-label={`Select ${product.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-10 object-contain rounded border border-gray-200 bg-white relative z-10"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    {product.images && product.images.length > 0 && (
                      <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-500 relative z-0">
                        +{product.images.length}
                      </div>
                    )}
                    {!product.image_url && (!product.images || product.images.length === 0) && (
                      <div className="w-10 h-10 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                        —
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.category?.name || "-"}</TableCell>
              <TableCell>
                <div>{formatPrice(product.price)}</div>
                {product.original_price && (
                  <div className="text-xs text-muted-foreground line-through">
                    {formatPrice(product.original_price)}
                  </div>
                )}
              </TableCell>
              <TableCell>{product.stock_quantity}</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {product.status === "active" ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
                  ) : product.status === "draft" ? (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Draft</span>
                  ) : product.status === "out_of_stock" ? (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Out of Stock</span>
                  ) : product.is_active ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                  )}
                  {product.is_featured && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Featured</span>
                  )}
                  {product.brand && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{product.brand}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete product?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{product.name}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(Number(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
