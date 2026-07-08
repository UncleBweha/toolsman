import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchSuggestion {
  type: "product" | "brand" | "category";
  id: string;
  label: string;
  slug: string;
  image?: string | null;
  price?: number | null;
  subtitle?: string | null;
}

const HISTORY_KEY = "toolsman.searchHistory";
const MAX_HISTORY = 8;

export const getSearchHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const pushSearchHistory = (q: string) => {
  const clean = q.trim();
  if (!clean) return;
  const prev = getSearchHistory().filter(
    (item) => item.toLowerCase() !== clean.toLowerCase()
  );
  const next = [clean, ...prev].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
};

export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
};

/** Log a search to the server-side popularity counter. Fire-and-forget. */
export const logSearchQuery = async (q: string) => {
  const clean = q.trim();
  if (clean.length < 2) return;
  try {
    // rpc is typed loose since types.ts hasn't regenerated
    await (supabase as any).rpc("log_search_query", { _query: clean });
  } catch {
    /* ignore */
  }
};

/** Instant search across products, brands, and categories. */
export const useInstantSearch = (query: string) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounced = useDebounce(query.trim(), 180);

  useEffect(() => {
    let cancelled = false;
    if (debounced.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    (async () => {
      const like = `%${debounced}%`;
      const [products, brands, categories] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, slug, price, image_url, sku, brand")
          .eq("is_active", true)
          .or(`name.ilike.${like},sku.ilike.${like},brand.ilike.${like}`)
          .limit(8),
        (supabase as any)
          .from("brands")
          .select("id, name, slug, logo_url")
          .eq("is_active", true)
          .ilike("name", like)
          .limit(4),
        supabase
          .from("categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .ilike("name", like)
          .limit(4),
      ]);

      if (cancelled) return;

      const out: SearchSuggestion[] = [];
      (categories.data || []).forEach((c: any) =>
        out.push({
          type: "category",
          id: c.id,
          label: c.name,
          slug: c.slug,
          subtitle: "Category",
        })
      );
      (brands.data || []).forEach((b: any) =>
        out.push({
          type: "brand",
          id: b.id,
          label: b.name,
          slug: b.slug,
          image: b.logo_url,
          subtitle: "Brand",
        })
      );
      (products.data || []).forEach((p: any) =>
        out.push({
          type: "product",
          id: p.id,
          label: p.name,
          slug: p.slug,
          image: p.image_url,
          price: p.price,
          subtitle: p.brand || "Product",
        })
      );
      setSuggestions(out);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return { suggestions, isLoading };
};

/** Trending search queries — top 8 by count in the last 30 days. */
export const useTrendingSearches = () => {
  const [trending, setTrending] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("search_queries")
        .select("query")
        .order("count", { ascending: false })
        .limit(8);
      setTrending((data || []).map((r: any) => r.query));
    })();
  }, []);

  return trending;
};

function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
