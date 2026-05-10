import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

export interface FilterState {
  priceRange: [number, number];
  brands: string[];
}

interface Props {
  categoryId?: string;
  maxPrice?: number;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  subcategories?: { id: string; name: string; slug: string; count?: number }[];
}

const fmt = (n: number) => `KSh ${n.toLocaleString("en-US")}`;

const SidebarFilter = ({ categoryId, maxPrice = 100000, filters, onChange, subcategories = [] }: Props) => {
  const [brands, setBrands] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    if (!categoryId) { setBrands([]); return; }
    (async () => {
      // Derive brand from product name's first word as a fallback (no brand column).
      const { data } = await supabase
        .from("products")
        .select("name")
        .eq("category_id", categoryId)
        .eq("is_active", true);
      if (!data) return;
      const counts = new Map<string, number>();
      for (const p of data) {
        const first = (p.name || "").trim().split(/\s+/)[0];
        if (!first) continue;
        counts.set(first, (counts.get(first) || 0) + 1);
      }
      const arr = Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setBrands(arr);
    })();
  }, [categoryId]);

  const toggleBrand = (b: string) => {
    const set = new Set(filters.brands);
    set.has(b) ? set.delete(b) : set.add(b);
    onChange({ ...filters, brands: Array.from(set) });
  };

  const clearAll = () => onChange({ priceRange: [0, maxPrice], brands: [] });

  return (
    <aside className="w-full md:w-64 flex-shrink-0 md:mr-8 mb-6 md:mb-0">
      {subcategories.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">Subcategories</h3>
          <ul className="space-y-3">
            {subcategories.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/category/${s.slug}`}
                  className="text-gray-600 hover:text-[#FF5722] flex justify-between text-sm"
                >
                  <span>{s.name}</span>
                  {typeof s.count === "number" && (
                    <span className="text-gray-400">({s.count})</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4">Price Range</h3>
        <div className="flex justify-between text-sm text-gray-600 mb-4">
          <span>{fmt(filters.priceRange[0])}</span>
          <span>{fmt(filters.priceRange[1])}+</span>
        </div>
        <Slider
          min={0}
          max={maxPrice}
          step={Math.max(100, Math.round(maxPrice / 100))}
          value={filters.priceRange}
          onValueChange={(v) => onChange({ ...filters, priceRange: [v[0], v[1]] as [number, number] })}
          className="w-full"
        />
      </div>

      {brands.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">Brands</h3>
          <ul className="space-y-3">
            {brands.map((b) => (
              <li key={b.name} className="flex items-center gap-2">
                <Checkbox
                  id={`brand-${b.name}`}
                  checked={filters.brands.includes(b.name)}
                  onCheckedChange={() => toggleBrand(b.name)}
                />
                <label htmlFor={`brand-${b.name}`} className="text-sm text-gray-600 cursor-pointer flex-1 flex justify-between">
                  <span>{b.name}</span>
                  <span className="text-gray-400">({b.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={clearAll}
        className="w-full py-2 px-4 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50 transition-colors text-sm"
      >
        CLEAR ALL
      </button>
    </aside>
  );
};

export default SidebarFilter;
