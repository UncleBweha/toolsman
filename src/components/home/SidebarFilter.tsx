import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  // Keep brands state for API compat but don't show the Brands filter section
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
