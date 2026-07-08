import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, TrendingUp, Loader2 } from "lucide-react";
import {
  useInstantSearch,
  useTrendingSearches,
  getSearchHistory,
  pushSearchHistory,
  clearSearchHistory,
  logSearchQuery,
} from "@/hooks/useInstantSearch";

interface Props {
  compact?: boolean;
  placeholder?: string;
}

const InstantSearchBox = ({ compact, placeholder = "Search products, brands, categories..." }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const trending = useTrendingSearches();
  const { suggestions, isLoading } = useInstantSearch(query);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHistory(getSearchHistory()), [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const submit = (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    pushSearchHistory(clean);
    logSearchQuery(clean);
    setOpen(false);
    setQuery("");
    navigate(`/search?q=${encodeURIComponent(clean)}`);
  };

  const goSuggestion = (s: { type: string; slug: string; label: string }) => {
    setOpen(false);
    setQuery("");
    if (s.type === "product") navigate(`/product/${s.slug}`);
    else if (s.type === "brand") navigate(`/brand/${s.slug}`);
    else navigate(`/category/${s.slug}`);
    pushSearchHistory(s.label);
    logSearchQuery(s.label);
  };

  const showPanel = open && (query.length >= 2 || history.length > 0 || trending.length > 0);

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <div className={`relative w-full flex items-center bg-white border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-[#FF5722] focus-within:border-transparent ${compact ? "" : ""}`}>
          <Search className="h-4 w-4 text-gray-400 ml-3" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="flex-1 bg-transparent border-0 outline-none px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
              }}
              className="text-gray-400 hover:text-gray-600 pr-2"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className={`bg-[#FF5722] hover:bg-[#e64a19] text-white font-semibold text-sm transition-colors ${compact ? "px-3 py-2" : "px-6 py-2.5"}`}
          >
            {compact ? "Go" : "SEARCH"}
          </button>
        </div>
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] max-h-[70vh] overflow-y-auto">
          {/* Suggestions from live search */}
          {query.length >= 2 ? (
            <div className="py-2">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Suggestions
              </div>
              {isLoading && suggestions.length === 0 && (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!isLoading && suggestions.length === 0 && (
                <div className="px-4 py-4 text-sm text-gray-500">
                  No matches. Press Enter to search anyway.
                </div>
              )}
              {suggestions.map((s) => (
                <button
                  key={`${s.type}-${s.id}`}
                  onClick={() => goSuggestion(s)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  {s.image ? (
                    <img
                      src={s.image}
                      alt=""
                      loading="lazy"
                      className="w-9 h-9 rounded object-contain bg-gray-50 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        s.type === "category"
                          ? "bg-blue-50 text-blue-600"
                          : s.type === "brand"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.type === "category" ? "CAT" : s.type === "brand" ? "B" : "P"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{s.label}</div>
                    <div className="text-[11px] text-gray-500">{s.subtitle}</div>
                  </div>
                  {s.price != null && (
                    <div className="text-sm font-bold text-[#FF5722] flex-shrink-0">
                      KSh {Number(s.price).toLocaleString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <>
              {history.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Recent searches
                    </span>
                    <button
                      onClick={() => {
                        clearSearchHistory();
                        setHistory([]);
                      }}
                      className="text-[11px] text-gray-500 hover:text-[#FF5722]"
                    >
                      Clear
                    </button>
                  </div>
                  {history.map((h) => (
                    <button
                      key={h}
                      onClick={() => submit(h)}
                      className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF5722]"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
              {trending.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" /> Trending searches
                  </div>
                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {trending.map((t) => (
                      <button
                        key={t}
                        onClick={() => submit(t)}
                        className="text-xs px-2.5 py-1 bg-gray-50 hover:bg-[#FF5722] hover:text-white text-gray-700 rounded-full border border-gray-200 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InstantSearchBox;
