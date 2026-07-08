import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Heart, ShoppingCart, Menu, ChevronDown, ChevronRight, X, LogOut, Loader2, Home, Tag } from "lucide-react";
import InstantSearchBox from "@/components/layout/InstantSearchBox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState<string | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { cartCount } = useCartContext();
  const navigate = useNavigate();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["header-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) =>
    categories.filter(c => c.parent_id === parentId);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };




  return (
    <header className="sticky top-12 md:top-14 z-50 bg-white border-b border-gray-200">
      {/* Main Header */}
      <div className="container py-2.5 md:py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <div className="flex flex-col leading-none items-center">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#1a1a2e]">
                TOOLS<span className="text-[#FF5722]">MAN</span>
              </h1>
              <span className="text-[9px] md:text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Online Store</span>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <InstantSearchBox />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-5">

            {/* Category Dropdown — Desktop (3-level accordion) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => { setCategoryMenuOpen(o => !o); setExpandedCategory(null); setExpandedSubCategory(null); }}
                className="flex items-center gap-1.5 hover:text-[#FF5722] transition-colors text-sm font-semibold"
              >
                <Tag className="h-5 w-5" />
                <span>Category</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${categoryMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {categoryMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setCategoryMenuOpen(false); setExpandedCategory(null); setExpandedSubCategory(null); }}
                  />
                  {/* Panel */}
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden">
                    {categoriesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="py-1 max-h-[70vh] overflow-y-auto">
                        {parentCategories.map((category) => {
                          const subcats = getSubcategories(category.id);
                          const isCatExpanded = expandedCategory === category.id;
                          return (
                            <div key={category.id}>
                              {/* Level 1: Parent category row */}
                              <div className="flex items-center justify-between">
                                <Link
                                  to={`/category/${category.slug}`}
                                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:text-[#FF5722] hover:bg-orange-50 transition-colors"
                                  onClick={() => { setCategoryMenuOpen(false); setExpandedCategory(null); setExpandedSubCategory(null); }}
                                >
                                  {category.name}
                                </Link>
                                {subcats.length > 0 && (
                                  <button
                                    className="px-3 py-2.5 text-gray-400 hover:text-[#FF5722] hover:bg-orange-50 transition-colors border-l border-gray-100"
                                    onClick={() => { setExpandedCategory(isCatExpanded ? null : category.id); setExpandedSubCategory(null); }}
                                    aria-label={isCatExpanded ? "Collapse" : "Expand"}
                                  >
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCatExpanded ? "rotate-180" : ""}`} />
                                  </button>
                                )}
                              </div>

                              {/* Level 2: Subcategories */}
                              {subcats.length > 0 && isCatExpanded && (
                                <div className="bg-gray-50 border-t border-gray-100">
                                  {subcats.map((subcat) => {
                                    const subSubcats = getSubcategories(subcat.id);
                                    const isSubExpanded = expandedSubCategory === subcat.id;
                                    return (
                                      <div key={subcat.id}>
                                        <div className="flex items-center justify-between">
                                          <Link
                                            to={`/category/${subcat.slug}`}
                                            className="flex-1 pl-7 pr-3 py-2 text-sm text-gray-700 hover:text-[#FF5722] hover:bg-orange-50 transition-colors flex items-center gap-2"
                                            onClick={() => { setCategoryMenuOpen(false); setExpandedCategory(null); setExpandedSubCategory(null); }}
                                          >
                                            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                            {subcat.name}
                                          </Link>
                                          {subSubcats.length > 0 && (
                                            <button
                                              className="px-2.5 py-2 text-gray-400 hover:text-[#FF5722] hover:bg-orange-50 transition-colors border-l border-gray-100"
                                              onClick={() => setExpandedSubCategory(isSubExpanded ? null : subcat.id)}
                                              aria-label={isSubExpanded ? "Collapse" : "Expand"}
                                            >
                                              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isSubExpanded ? "rotate-180" : ""}`} />
                                            </button>
                                          )}
                                        </div>

                                        {/* Level 3: Sub-subcategories */}
                                        {subSubcats.length > 0 && isSubExpanded && (
                                          <div className="bg-gray-100 border-t border-gray-200">
                                            {subSubcats.map((child) => (
                                              <Link
                                                key={child.id}
                                                to={`/category/${child.slug}`}
                                                className="flex items-center gap-2 pl-11 pr-4 py-1.5 text-xs text-gray-600 hover:text-[#FF5722] hover:bg-orange-50 transition-colors"
                                                onClick={() => { setCategoryMenuOpen(false); setExpandedCategory(null); setExpandedSubCategory(null); }}
                                              >
                                                <ChevronRight className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                                                {child.name}
                                              </Link>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Account — Desktop */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Account" className="hidden md:flex items-center gap-2 hover:text-[#FF5722] transition-colors">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold">
                        {(profile?.full_name || user.email || "U").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col items-start text-xs font-medium">
                      <span className="text-gray-500 font-normal">Account</span>
                      <span className="truncate max-w-[100px]">{profile?.full_name || 'My Profile'}</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white">
                  <DropdownMenuItem asChild>
                    <Link to="/account">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account?tab=orders">My Orders</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth" aria-label="Sign In" className="hidden md:flex items-center gap-2 hover:text-[#FF5722] transition-colors">
                <User className="h-6 w-6" />
                <div className="flex flex-col items-start text-xs font-medium">
                  <span className="text-gray-500 font-normal">Account</span>
                  <span>Sign In</span>
                </div>
              </Link>
            )}

            {/* Wishlist */}
            <Link to="/wishlist" aria-label="Wishlist" className="hidden md:flex items-center gap-2 hover:text-[#FF5722] transition-colors">
              <Heart className="h-6 w-6" />
              <span className="text-sm font-medium">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link to="/cart" aria-label="Cart" className="relative flex items-center gap-2 hover:text-[#FF5722] transition-colors">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF5722] text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden md:block text-sm font-medium">Cart</span>
            </Link>

            {/* Mobile/tablet account avatar */}
            <Link
              to={user ? "/account" : "/auth"}
              aria-label="Account"
              className="md:hidden flex items-center"
            >
              {user && profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold">
                  {user
                    ? (profile?.full_name || user.email || "U")
                        .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()
                    : <User className="h-4 w-4" />}
                </div>
              )}
            </Link>

            <button
              aria-label="Menu"
              className="md:hidden flex items-center text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden mt-4">
          <InstantSearchBox compact placeholder="Search products..." />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg">
          <div className="container py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 py-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : (
                  parentCategories.map((category) => (
                    <div key={category.id}>
                      <Link
                        to={`/category/${category.slug}`}
                        className="block py-2 font-medium text-gray-800 hover:text-[#FF5722]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {category.name}
                      </Link>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <Link to="/" className="flex items-center gap-2 py-2 text-gray-800" onClick={() => setMobileMenuOpen(false)}>
                  <Home className="h-5 w-5" />
                  Home
                </Link>
                {user ? (
                  <>
                    <Link to="/account" className="flex items-center gap-2 py-2 text-gray-800" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-5 w-5" />
                      My Account
                    </Link>
                    <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2 text-gray-800 w-full text-left">
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/auth" className="flex items-center gap-2 py-2 text-gray-800" onClick={() => setMobileMenuOpen(false)}>
                    <User className="h-5 w-5" />
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
