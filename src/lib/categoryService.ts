import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/database";
import { CategoryWithSubcategories } from "@/lib/excelTemplateGenerator";

/**
 * Fetches categories with their subcategories
 * Uses parent_id to determine hierarchy
 */
export async function fetchCategoriesWithSubcategories(): Promise<
  CategoryWithSubcategories[]
> {
  try {
    // Fetch all active categories
    const { data: allCategories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }

    if (!allCategories) {
      return [];
    }

    // Organize categories: parent categories with their subcategories
    const categoryMap = new Map<string, Category>();
    const parentCategories: Category[] = [];
    const subcategories: Category[] = [];

    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, cat);
      if (cat.parent_id === null) {
        parentCategories.push(cat);
      } else {
        subcategories.push(cat);
      }
    });

    // Build the result structure
    const result: CategoryWithSubcategories[] = parentCategories.map((parent) => {
      const relatedSubs = subcategories.filter(
        (sub) => sub.parent_id === parent.id
      );

      return {
        id: parent.id,
        name: parent.name,
        parent_id: parent.parent_id,
        subcategories: relatedSubs.map((sub) => ({
          id: sub.id,
          name: sub.name,
          parent_id: sub.parent_id,
        })),
      };
    });

    return result;
  } catch (error) {
    console.error("Failed to fetch categories with subcategories:", error);
    throw error;
  }
}

/**
 * Validates that a category exists and is active
 */
export async function validateCategory(categoryName: string): Promise<{
  valid: boolean;
  categoryId?: string;
  error?: string;
}> {
  try {
    const { data: category, error } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("is_active", true)
      .eq("parent_id", null) // Only parent categories (not subcategories)
      .single();

    if (error || !category) {
      return {
        valid: false,
        error: `Category "${categoryName}" not found`,
      };
    }

    return {
      valid: true,
      categoryId: category.id,
    };
  } catch (error) {
    console.error("Error validating category:", error);
    return {
      valid: false,
      error: "Failed to validate category",
    };
  }
}

/**
 * Validates that a subcategory exists and belongs to the given category
 */
export async function validateSubcategory(
  subcategoryName: string,
  categoryId: string
): Promise<{
  valid: boolean;
  subcategoryId?: string;
  error?: string;
}> {
  try {
    const { data: subcategory, error } = await supabase
      .from("categories")
      .select("id")
      .eq("name", subcategoryName)
      .eq("parent_id", categoryId)
      .eq("is_active", true)
      .single();

    if (error || !subcategory) {
      return {
        valid: false,
        error: `Subcategory "${subcategoryName}" not found or doesn't belong to this category`,
      };
    }

    return {
      valid: true,
      subcategoryId: subcategory.id,
    };
  } catch (error) {
    console.error("Error validating subcategory:", error);
    return {
      valid: false,
      error: "Failed to validate subcategory",
    };
  }
}

/**
 * Gets a category ID by name (for import mapping)
 */
export async function getCategoryIdByName(
  categoryName: string
): Promise<string | null> {
  try {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("is_active", true)
      .eq("parent_id", null)
      .single();

    return category?.id || null;
  } catch {
    return null;
  }
}

/**
 * Gets a subcategory ID by name and parent category ID
 */
export async function getSubcategoryIdByName(
  subcategoryName: string,
  categoryId: string
): Promise<string | null> {
  try {
    const { data: subcategory } = await supabase
      .from("categories")
      .select("id")
      .eq("name", subcategoryName)
      .eq("parent_id", categoryId)
      .eq("is_active", true)
      .single();

    return subcategory?.id || null;
  } catch {
    return null;
  }
}

/**
 * Bulk validate categories and subcategories from import data
 */
export async function validateImportedCategories(
  rows: Array<{
    category?: string;
    sub_category?: string;
    rowIndex: number;
  }>
): Promise<
  Array<{
    rowIndex: number;
    valid: boolean;
    categoryId?: string;
    subcategoryId?: string;
    errors: string[];
  }>
> {
  const results = [];

  for (const row of rows) {
    const errors: string[] = [];
    let categoryId: string | undefined;
    let subcategoryId: string | undefined;

    // Skip if both category and subcategory are empty
    if (!row.category && !row.sub_category) {
      results.push({
        rowIndex: row.rowIndex,
        valid: true,
        errors: [],
      });
      continue;
    }

    // Validate category if provided
    if (row.category) {
      const catValidation = await validateCategory(row.category);
      if (!catValidation.valid) {
        errors.push(catValidation.error || "Invalid category");
      } else {
        categoryId = catValidation.categoryId;
      }
    }

    // Validate subcategory if provided
    if (row.sub_category && categoryId) {
      const subValidation = await validateSubcategory(
        row.sub_category,
        categoryId
      );
      if (!subValidation.valid) {
        errors.push(subValidation.error || "Invalid subcategory");
      } else {
        subcategoryId = subValidation.subcategoryId;
      }
    } else if (row.sub_category && !categoryId) {
      errors.push("Category must be specified before subcategory");
    }

    results.push({
      rowIndex: row.rowIndex,
      valid: errors.length === 0,
      categoryId,
      subcategoryId,
      errors,
    });
  }

  return results;
}
