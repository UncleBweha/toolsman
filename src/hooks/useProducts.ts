import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types/database";

export const useProducts = (options?: {
  categorySlug?: string;
  featured?: boolean;
  limit?: number;
  search?: string;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      
      let query = supabase
        .from("products")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("is_active", true);

      if (options?.featured) {
        query = query.eq("is_featured", true);
      }

      if (options?.categorySlug) {
        // First get category by slug, then filter products
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", options.categorySlug)
          .maybeSingle();
        
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }

      if (options?.search) {
        query = query.ilike("name", `%${options.search}%`);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        setError(error);
      } else {
        setProducts(data || []);
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, [options?.categorySlug, options?.featured, options?.limit, options?.search]);

  return { products, isLoading, error };
};

export const useProduct = (slug: string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        setError(error);
      } else {
        setProduct(data);
      }
      setIsLoading(false);
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  return { product, isLoading, error };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      setCategories(data || []);
      setIsLoading(false);
    };

    fetchCategories();
  }, []);

  return { categories, isLoading };
};
