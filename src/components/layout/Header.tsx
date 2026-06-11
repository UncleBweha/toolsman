import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Heart, ShoppingCart, Menu, ChevronDown, ChevronRight, X, LogOut, Loader2, Home } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
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
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full flex items-center bg-white border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-[#FF5722] focus-within:border-transparent">
              <input
                type="text"
                placeholder="Search products, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500"
              />
              <button 
                type="submit" 
                className="bg-[#FF5722] hover:bg-[#e64a19] text-white px-8 py-2.5 font-semibold text-sm transition-colors"
              >
                SEARCH
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-6">
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

            <Link to="/wishlist" aria-label="Wishlist" className="hidden md:flex items-center gap-2 hover:text-[#FF5722] transition-colors">
              <Heart className="h-6 w-6" />
              <span className="text-sm font-medium">Wishlist</span>
            </Link>

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
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative w-full flex items-center bg-white border border-gray-300 rounded-md overflow-hidden">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none px-3 py-2 text-sm text-gray-900"
            />
            <button type="submit" className="bg-[#FF5722] text-white px-4 py-2 text-sm font-semibold">
              Go
            </button>
          </div>
        </form>
      </div>

      {/* Category Navigation - Desktop */}
      <nav className="hidden md:block border-t border-gray-100">
        <div className="container">
          <div className="flex items-center h-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-gray-800 font-semibold hover:text-[#FF5722] transition-colors px-4 border-r border-gray-100 h-full">
                  <Menu className="h-5 w-5" />
                  Shop by Category
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-[70vh] overflow-y-auto bg-white rounded-none border-gray-200 mt-0">
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  parentCategories.map((category) => (
                    <div key={category.id}>
                      <DropdownMenuItem asChild className="focus:bg-gray-50 cursor-pointer py-2">
                        <Link to={`/category/${category.slug}`} className="font-medium flex items-center w-full">
                          {category.name}
                        </Link>
                      </DropdownMenuItem>
                      {getSubcategories(category.id).map((subcat) => (
                        <DropdownMenuItem key={subcat.id} asChild className="focus:bg-gray-50 cursor-pointer py-1.5">
                          <Link to={`/category/${subcat.slug}`} className="pl-6 text-sm text-gray-600">
                            {subcat.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

          <div className="flex items-center h-full px-2 overflow-hidden">
              {parentCategories.slice(0, 3).concat(
                // show 4th and 5th only on lg+
                parentCategories.slice(3, 5).map(c => ({ ...c, _lgOnly: true }))
              ).map((category: typeof parentCategories[0] & { _lgOnly?: boolean }) => {
                const subcategories = getSubcategories(category.id);
                return (
                  <div
                    key={category.id}
                    className={`relative group h-full flex items-center${category._lgOnly ? " hidden lg:flex" : ""}`}
                  >
                    <Link
                      to={`/category/${category.slug}`}
                      className="text-gray-700 hover:text-[#FF5722] px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1"
                    >
                      {category.name}
                      {subcategories.length > 0 && (
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      )}
                    </Link>
                    {subcategories.length > 0 && (
                      <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[220px] z-50">
                        <div className="py-2">
                          {subcategories.map((subcat) => (
                            <Link
                              key={subcat.id}
                              to={`/category/${subcat.slug}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-[#FF5722] hover:bg-gray-50 transition-colors"
                            >
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                              {subcat.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Link to="/deals" className="text-gray-700 hover:text-[#FF5722] px-3 py-2 text-sm font-medium whitespace-nowrap flex items-center gap-1">
                Deals <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">HOT</span>
              </Link>
              <Link to="/new-arrivals" className="hidden lg:flex text-gray-700 hover:text-[#FF5722] px-3 py-2 text-sm font-medium whitespace-nowrap">
                New Arrivals
              </Link>
            </div>

          </div>
        </div>
      </nav>

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
