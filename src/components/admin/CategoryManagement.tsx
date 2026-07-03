import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, GripVertical, FolderPlus } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  parent_id: string | null;
}

const emptyFormData: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  display_order: 0,
  is_active: true,
  parent_id: null,
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyFormData);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Failed to load categories");
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const categoryData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      image_url: formData.image_url || null,
      display_order: formData.display_order,
      is_active: formData.is_active,
      parent_id: formData.parent_id || null,
    };

    let error;
    if (editingCategory) {
      const result = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);
      error = result.error;
    } else {
      const result = await supabase.from("categories").insert(categoryData);
      error = result.error;
    }

    if (error) {
      toast.error(editingCategory ? "Failed to update category" : "Failed to create category");
    } else {
      toast.success(editingCategory ? "Category updated" : "Category created");
      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData(emptyFormData);
      fetchCategories();
    }
    setIsSaving(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image_url: category.image_url || "",
      display_order: category.display_order,
      is_active: category.is_active,
      parent_id: category.parent_id || null,
    });
    setIsDialogOpen(true);
  };

  /** All categories that are immediate children of parentId */
  const getChildren = (parentId: string | null) =>
    categories.filter(c => c.parent_id === (parentId ?? null));

  /** Recursively collect all descendant IDs (to prevent cycles in parent picker) */
  const getDescendantIds = (id: string): string[] => {
    const children = getChildren(id);
    return children.flatMap(c => [c.id, ...getDescendantIds(c.id)]);
  };

  const handleAddSubcategory = (parentCategory: Category) => {
    setAddingSubcategoryTo(parentCategory);
    setEditingCategory(null);
    setFormData({
      ...emptyFormData,
      parent_id: parentCategory.id,
      display_order: getChildren(parentCategory.id).length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? Sub-categories and products in this category will be affected.")) return;

    const { error } = await supabase.from("categories").delete().eq("id", categoryId);

    if (error) {
      toast.error("Failed to delete category");
    } else {
      toast.success("Category deleted");
      fetchCategories();
    }
  };

  /** Build a flat list of categories with depth for the parent-picker dropdown */
  const buildFlatTree = (parentId: string | null = null, depth = 0): Array<{ cat: Category; depth: number }> => {
    return getChildren(parentId).flatMap(cat => [
      { cat, depth },
      ...buildFlatTree(cat.id, depth + 1),
    ]);
  };

  const flatTree = buildFlatTree(null, 0);

  /**
   * Recursive table row renderer — renders a category and all its descendants
   * with increasing indentation.
   */
  const renderCategoryRows = (parentId: string | null = null, depth = 0): React.ReactNode => {
    const children = getChildren(parentId);
    if (children.length === 0) return null;

    const indent = depth * 20; // px indent per level

    return children.map(category => (
      <>
        <TableRow key={category.id} className={depth === 0 ? "" : depth === 1 ? "bg-muted/30" : "bg-muted/50"}>
          <TableCell>
            <div style={{ paddingLeft: `${indent}px` }}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3" style={{ paddingLeft: `${indent}px` }}>
              {depth > 0 && <span className="text-muted-foreground">{"↳".repeat(depth)}</span>}
              {category.image_url && (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className={`object-cover rounded ${depth === 0 ? "w-10 h-10" : "w-7 h-7"}`}
                />
              )}
              <div>
                <div className={`font-medium ${depth > 0 ? "text-sm" : ""}`}>{category.name}</div>
                {category.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {category.description}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground text-sm">
            {category.parent_id
              ? categories.find(c => c.id === category.parent_id)?.name ?? "—"
              : "—"}
          </TableCell>
          <TableCell className="text-muted-foreground">{category.slug}</TableCell>
          <TableCell>{category.display_order}</TableCell>
          <TableCell>
            {category.is_active ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
            )}
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddSubcategory(category)}
                title={`Add subcategory under "${category.name}"`}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {/* Render children recursively */}
        {renderCategoryRows(category.id, depth + 1)}
      </>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const forbiddenParentIds = editingCategory
    ? new Set([editingCategory.id, ...getDescendantIds(editingCategory.id)])
    : new Set<string>();

  return (
    <div className="bg-background rounded-lg border">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">{categories.length} categories total · Supports unlimited nesting levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            setAddingSubcategoryTo(null);
            setFormData(emptyFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory
                  ? "Edit Category"
                  : addingSubcategoryTo
                    ? `Add Subcategory under "${addingSubcategoryTo.name}"`
                    : "Add New Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_id">Parent Category (optional)</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (Top-level category)</SelectItem>
                    {flatTree
                      .filter(({ cat }) => !forbiddenParentIds.has(cat.id))
                      .map(({ cat, depth }) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {depth > 0 ? `${"  ".repeat(depth)}↳ ` : ""}{cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You can nest categories to any depth (e.g. Tools → Power Tools → Angle Grinders)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderCategoryRows(null, 0)}
        </TableBody>
      </Table>
    </div>
  );
};

export default CategoryManagement;
