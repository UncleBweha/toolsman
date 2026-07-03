import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types/database";
import { CategoryWithSubcategories } from "@/lib/excelTemplateGenerator";

/**
 * Normalise a category name for case- and whitespace-tolerant matching.
 * Also strips zero-width chars, non-breaking spaces, and common punctuation
 * variants that Excel can introduce.
 */
const normalize = (s: string) =>
  (s || "")
    .toString()
    // Remove zero-width / non-breaking spaces
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Fuzzy normalize — additionally strips all non-alphanumeric characters.
 * Used as a second-pass fallback when exact-normalised match fails.
 */
const fuzzyNormalize = (s: string) =>
  normalize(s).replace(/[^a-z0-9]/g, "");

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

/**
 * Find a category by name (case-insensitive, fuzzy), slug, or ID.
 * Searches all active categories (not just top-level parents),
 * so it works for any depth.
 * Pass `parentId` to restrict to children of a specific parent.
 */
function findCategory(
  all: Category[],
  lookup: string,
  parentId?: string | null
): Category | null {
  if (!lookup) return null;
  const n = normalize(lookup);
  const fn = fuzzyNormalize(lookup);

  const pool = parentId !== undefined
    ? all.filter(c => c.parent_id === parentId)
    : all;

  // 1. Exact ID match
  const byId = pool.find(c => c.id === lookup);
  if (byId) return byId;

  // 2. Exact slug match
  const bySlug = pool.find(c => c.slug === lookup || normalize(c.slug) === n);
  if (bySlug) return bySlug;

  // 3. Normalised name match (case + whitespace insensitive)
  const byName = pool.find(c => normalize(c.name) === n);
  if (byName) return byName;

  // 4. Fuzzy name match (strips all non-alphanumeric)
  if (fn.length >= 3) {
    const byFuzzy = pool.find(c => fuzzyNormalize(c.name) === fn);
    if (byFuzzy) return byFuzzy;
  }

  // 5. Partial match — lookup is contained in the category name or vice versa
  if (n.length >= 4) {
    const byPartial = pool.find(
      c => normalize(c.name).includes(n) || n.includes(normalize(c.name))
    );
    if (byPartial) return byPartial;
  }

  return null;
}

/** Find a top-level (parent-less) category. */
function findParent(all: Category[], lookup: string): Category | null {
  return findCategory(all.filter(c => !c.parent_id), lookup);
}

/** Find a child category under a specific parent (any depth). */
function findSub(all: Category[], lookup: string, parentId: string): Category | null {
  return findCategory(all, lookup, parentId);
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
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        parent_id: sub.parent_id!,
        // Include 3rd-level children of this subcategory
        children: all
          .filter(c => c.parent_id === sub.id)
          .map(child => ({ id: child.id, name: child.name, parent_id: child.parent_id! })),
      })),
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
  // Search all descendants of the given category (any depth)
  const descendants = all.filter(c => {
    let curr: Category | undefined = c;
    while (curr?.parent_id) {
      if (curr.parent_id === categoryId) return true;
      curr = all.find(x => x.id === curr!.parent_id);
    }
    return false;
  });
  return findCategory(descendants, name)?.id || null;
}

export interface ValidationResult {
  rowIndex: number;
  /** true = no blocking errors (category may still be missing — that's a warning) */
  valid: boolean;
  categoryId?: string;
  subcategoryId?: string;
  /** Hard errors that block import (e.g. price missing) */
  errors: string[];
  /** Soft warnings — product still imports, just without a category */
  warnings: string[];
}

export async function validateImportedCategories(
  rows: Array<{ category?: string; sub_category?: string; rowIndex: number }>
): Promise<ValidationResult[]> {
  const all = await getAllCategories();
  const availableParents = all
    .filter(c => !c.parent_id)
    .map(c => c.name)
    .sort()
    .join(", ");

  return rows.map(row => {
    const warnings: string[] = [];
    let categoryId: string | undefined;
    let subcategoryId: string | undefined;

    // No category info at all — totally fine, just import without it
    if (!row.category && !row.sub_category) {
      return { rowIndex: row.rowIndex, valid: true, errors: [], warnings: [] };
    }

    if (row.category) {
      const parent = findParent(all, row.category);
      if (!parent) {
        warnings.push(
          `Category "${row.category}" not found (available: ${availableParents}). Product will be imported without a category.`
        );
      } else {
        categoryId = parent.id;
      }
    }

    if (row.sub_category) {
      if (!categoryId) {
        warnings.push(
          `Sub-category "${row.sub_category}" ignored because parent category "${row.category}" was not found.`
        );
      } else {
        const sub = findSub(all, row.sub_category, categoryId);
        if (!sub) {
          const validSubs = all
            .filter(c => c.parent_id === categoryId)
            .map(c => c.name)
            .join(", ") || "(none)";
          warnings.push(
            `Sub-category "${row.sub_category}" not found under "${row.category}" (valid: ${validSubs}). Product will be imported under the parent category only.`
          );
        } else {
          subcategoryId = sub.id;
        }
      }
    }

    // Categories are NEVER blocking errors — only warnings
    return {
      rowIndex: row.rowIndex,
      valid: true,           // always valid — missing category is just a warning
      categoryId,
      subcategoryId,
      errors: [],
      warnings,
    };
  });
}
