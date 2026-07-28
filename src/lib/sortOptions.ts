import { Product } from "@/types/database";

export type SortKey =
  | "featured"
  | "popularity"
  | "best-selling"
  | "trending"
  | "newest"
  | "rating"
  | "most-reviewed"
  | "price-low"
  | "price-high"
  | "discount"
  | "az"
  | "za";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "popularity", label: "Popularity" },
  { value: "best-selling", label: "Best Selling" },
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "rating", label: "Customer Rating" },
  { value: "most-reviewed", label: "Most Reviewed" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "discount", label: "Biggest Discount" },
  { value: "az", label: "A – Z" },
  { value: "za", label: "Z – A" },
];

const discount = (p: Product) => {
  if (!p.original_price || p.original_price <= p.price) return 0;
  return (Number(p.original_price) - Number(p.price)) / Number(p.original_price);
};

export const sortProducts = (arr: Product[], key: SortKey): Product[] => {
  const list = [...arr];
  switch (key) {
    case "featured":
      return list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    case "popularity":
    case "trending":
    case "most-reviewed":
      return list.sort((a, b) => (Number((b as any).review_count) || 0) - (Number((a as any).review_count) || 0));
    case "best-selling":
      return list.sort(
        (a, b) => Number(b.is_featured) - Number(a.is_featured) || (Number((b as any).review_count) || 0) - (Number((a as any).review_count) || 0)
      );
    case "rating":
      return list.sort((a, b) => (Number((b as any).rating) || 0) - (Number((a as any).rating) || 0));
    case "price-low":
      return list.sort((a, b) => Number(a.price) - Number(b.price));
    case "price-high":
      return list.sort((a, b) => Number(b.price) - Number(a.price));
    case "discount":
      return list.sort((a, b) => discount(b) - discount(a));
    case "az":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "za":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "newest":
    default:
      return list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
};
