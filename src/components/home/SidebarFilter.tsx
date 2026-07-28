import { Link } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";

export interface FilterState {
  priceRange: [number, number];
  brands: string[];
  inStockOnly: boolean;
  minRating: number; // 0 = no min
}

interface Props {
  categoryId?: string;
  maxPrice?: number;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  subcategories?: { id: string; name: string; slug: string; count?: number }[];
  availableBrands?: string[];
}

const fmt = (n: number) => `KSh ${n.toLocaleString("en-US")}`;

const SidebarFilter = ({
  maxPrice = 100000,
  filters,
  onChange,
  subcategories = [],
  availableBrands = [],
}: Props) => {
  const clearAll = () =>
    onChange({ priceRange: [0, maxPrice], brands: [], inStockOnly: false, minRating: 0 });

  const toggleBrand = (b: string) => {
    const next = filters.brands.includes(b)
      ? filters.brands.filter((x) => x !== b)
      : [...filters.brands, b];
    onChange({ ...filters, brands: next });
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0 md:mr-8 mb-6 md:mb-0 space-y-6">
      {subcategories.length > 0 && (
        <div className="pb-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">Subcategories</h3>
          <ul className="space-y-2">
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

      <div className="pb-6 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">Price Range</h3>
        <div className="flex justify-between text-sm text-gray-600 mb-3">
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

      <div className="pb-6 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">Availability</h3>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <Checkbox
            checked={filters.inStockOnly}
            onCheckedChange={(v) => onChange({ ...filters, inStockOnly: !!v })}
          />
          In stock only
        </label>
      </div>

      <div className="pb-6 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">Customer Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1, 0].map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={filters.minRating === r}
                onChange={() => onChange({ ...filters, minRating: r })}
                className="accent-[#FF5722]"
              />
              {r === 0 ? (
                <span>Any</span>
              ) : (
                <>
                  <span className="inline-flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r ? "fill-[#FFA000] text-[#FFA000]" : "text-gray-300"}`}
                      />
                    ))}
                  </span>
                  <span className="text-gray-500 text-xs">& up</span>
                </>
              )}
            </label>
          ))}
        </div>
      </div>

      {availableBrands.length > 0 && (
        <div className="pb-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">Brand</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {availableBrands.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <Checkbox
                  checked={filters.brands.includes(b)}
                  onCheckedChange={() => toggleBrand(b)}
                />
                <span className="truncate">{b}</span>
              </label>
            ))}
          </div>
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
