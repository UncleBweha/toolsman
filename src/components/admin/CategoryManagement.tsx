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

  // Get parent categories (categories without parent_id)
  const parentCategories = categories.filter(c => !c.parent_id);
  
  // Get subcategories for a parent
  const getSubcategories = (parentId: string) => 
    categories.filter(c => c.parent_id === parentId);
  
  // Get parent name for display
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = categories.find(c => c.id === parentId);
    return parent?.name || null;
  };

  const handleAddSubcategory = (parentCategory: Category) => {
    setAddingSubcategoryTo(parentCategory);
    setEditingCategory(null);
    setFormData({
      ...emptyFormData,
      parent_id: parentCategory.id,
      display_order: getSubcategories(parentCategory.id).length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? Products in this category will be uncategorized.")) return;

    const { error } = await supabase.from("categories").delete().eq("id", categoryId);

    if (error) {
      toast.error("Failed to delete category");
    } else {
      toast.success("Category deleted");
      fetchCategories();
    }
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
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">{categories.length} categories total</p>
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
                    ? `Add Subcategory to "${addingSubcategoryTo.name}"`
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
                    {parentCategories
                      .filter(c => c.id !== editingCategory?.id) // Can't be its own parent
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Show parent categories first, then their subcategories */}
          {parentCategories.map((category) => (
            <>
              <TableRow key={category.id}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {category.image_url && (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
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
                    <Button variant="ghost" size="icon" onClick={() => handleAddSubcategory(category)} title="Add subcategory">
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
              {/* Render subcategories */}
              {getSubcategories(category.id).map((subcat) => (
                <TableRow key={subcat.id} className="bg-muted/30">
                  <TableCell>
                    <div className="pl-4">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 pl-4">
                      <span className="text-muted-foreground">↳</span>
                      {subcat.image_url && (
                        <img
                          src={subcat.image_url}
                          alt={subcat.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium">{subcat.name}</div>
                        {subcat.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {subcat.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">{subcat.slug}</TableCell>
                  <TableCell>{subcat.display_order}</TableCell>
                  <TableCell>
                    {subcat.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(subcat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(subcat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CategoryManagement;
