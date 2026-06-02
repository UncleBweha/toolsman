import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/database";
import { CategoryWithSubcategories } from "@/lib/excelTemplateGenerator";

/** Normalise a category name for case- and whitespace-tolerant matching. */
const normalize = (s: string) =>
  (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();

/** In-memory cache so each import only hits the DB once. */
let categoriesCache: Category[] | null = null;

async function getAllCategories(): Promise<Category[]> {
  if (categoriesCache) return categoriesCache;
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  categoriesCache = (data as Category[]) || [];
  return categoriesCache;
}

/** Find a category by name (case-insensitive), slug, or ID. Only parents. */
function findParent(all: Category[], lookup: string): Category | null {
  if (!lookup) return null;
  const n = normalize(lookup);
  return (
    all.find(c => !c.parent_id && (c.id === lookup || c.slug === lookup || normalize(c.name) === n)) ||
    all.find(c => !c.parent_id && (normalize(c.slug) === n)) ||
    null
  );
}

/** Find a subcategory by name/slug/ID under a specific parent. */
function findSub(all: Category[], lookup: string, parentId: string): Category | null {
  if (!lookup) return null;
  const n = normalize(lookup);
  return (
    all.find(c => c.parent_id === parentId && (c.id === lookup || c.slug === lookup || normalize(c.name) === n || normalize(c.slug) === n)) ||
    null
  );
}

export async function fetchCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
  categoriesCache = null; // force fresh fetch for template generation
  const all = await getAllCategories();
  const parents = all.filter(c => !c.parent_id);
  return parents.map(parent => ({
    id: parent.id,
    name: parent.name,
    parent_id: parent.parent_id,
    subcategories: all
      .filter(c => c.parent_id === parent.id)
      .map(sub => ({ id: sub.id, name: sub.name, parent_id: sub.parent_id! })),
  }));
}

export async function getCategoryIdByName(name: string): Promise<string | null> {
  const all = await getAllCategories();
  return findParent(all, name)?.id || null;
}

export async function getSubcategoryIdByName(
  name: string,
  categoryId: string
): Promise<string | null> {
  const all = await getAllCategories();
  return findSub(all, name, categoryId)?.id || null;
}

export async function validateImportedCategories(
  rows: Array<{ category?: string; sub_category?: string; rowIndex: number }>
): Promise<
  Array<{
    rowIndex: number;
    valid: boolean;
    categoryId?: string;
    subcategoryId?: string;
    errors: string[];
  }>
> {
  const all = await getAllCategories();
  const availableParents = all
    .filter(c => !c.parent_id)
    .map(c => c.name)
    .sort()
    .join(", ");

  return rows.map(row => {
    const errors: string[] = [];
    let categoryId: string | undefined;
    let subcategoryId: string | undefined;

    if (!row.category && !row.sub_category) {
      return { rowIndex: row.rowIndex, valid: true, errors: [] };
    }

    if (row.category) {
      const parent = findParent(all, row.category);
      if (!parent) {
        errors.push(
          `Row ${row.rowIndex}: Category "${row.category}" not found. ` +
          `Available categories: ${availableParents}`
        );
      } else {
        categoryId = parent.id;
      }
    }

    if (row.sub_category) {
      if (!categoryId) {
        errors.push(`Row ${row.rowIndex}: A valid parent category is required before sub-category "${row.sub_category}"`);
      } else {
        const sub = findSub(all, row.sub_category, categoryId);
        if (!sub) {
          const validSubs = all
            .filter(c => c.parent_id === categoryId)
            .map(c => c.name)
            .join(", ") || "(none)";
          errors.push(
            `Row ${row.rowIndex}: Sub-category "${row.sub_category}" not found under "${row.category}". ` +
            `Valid sub-categories: ${validSubs}`
          );
        } else {
          subcategoryId = sub.id;
        }
      }
    }

    return {
      rowIndex: row.rowIndex,
      valid: errors.length === 0,
      categoryId,
      subcategoryId,
      errors,
    };
  });
}
