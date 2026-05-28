import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingCart, Users, Package, FolderTree,
  Settings, Menu, Search, Bell, ExternalLink, ChevronLeft,
  Upload, BarChart3, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminLayoutProps { children: ReactNode; }

const NAV = [
  {
    title: "",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "SALES",
    items: [
      { href: "/admin/orders",    label: "Orders",    icon: ShoppingCart },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "CATALOG",
    items: [
      { href: "/admin/products",   label: "Products",    icon: Package },
      { href: "/admin/categories", label: "Categories",  icon: FolderTree },
      { href: "/admin/import",     label: "Bulk Import", icon: Upload },
    ],
  },
  {
    title: "REPORTS",
    items: [{ href: "/admin/reports", label: "Sales & Analytics", icon: BarChart3 }],
  },
  {
    title: "SYSTEM",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

/* ── Shared nav list ── */
const NavList = ({
  location,
  collapsed,
  onNavigate,
}: {
  location: ReturnType<typeof useLocation>;
  collapsed: boolean;
  onNavigate: () => void;
}) => (
  <div className="flex-1 overflow-y-auto py-3">
    {NAV.map((section, idx) => (
      <div key={idx} className="mb-4">
        {!collapsed && section.title && (
          <p className="px-5 mb-1.5 text-[10px] font-semibold text-white/40 tracking-wider">
            {section.title}
          </p>
        )}
        <nav className="space-y-0.5">
          {section.items.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center mx-2 px-3 py-2 rounded-lg transition-colors",
                  active
                    ? "bg-[#FF6B00] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2.5")} />
                {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    ))}
  </div>
);

/* ── Main layout ── */
const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { profile } = useAuth();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden font-sans">

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] text-white flex flex-col transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="h-13 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <Link to="/admin" onClick={closeMobile} className="flex items-center gap-2">
            <img src="/logo.png" alt="Toolsman" className="h-7 w-7 object-contain" />
            <span className="font-bold text-base uppercase tracking-wide">Toolsman</span>
          </Link>
          <button onClick={closeMobile} className="text-white/60 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavList location={location} collapsed={false} onNavigate={closeMobile} />

        <div className="p-4 border-t border-white/10 text-xs text-white/30 shrink-0">
          Toolsman Admin v1.0
        </div>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex bg-[#111827] text-white flex-col transition-all duration-300 z-20 shrink-0",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-white/10 shrink-0">
          <Link to="/admin" className="flex items-center gap-2 overflow-hidden">
            <img src="/logo.png" alt="Toolsman" className="h-6 w-6 object-contain shrink-0" />
            {!collapsed && (
              <span className="font-bold text-sm uppercase tracking-wide whitespace-nowrap">Toolsman</span>
            )}
          </Link>
        </div>

        <NavList location={location} collapsed={collapsed} onNavigate={() => {}} />

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center w-full text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className={cn("h-4 w-4 shrink-0 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span className="ml-2 text-[12px] font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-12 bg-white border-b flex items-center justify-between px-3 md:px-5 shrink-0 z-10 gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger — opens mobile drawer */}
            <button
              className="text-gray-500 hover:text-gray-700 flex-shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop: desktop sidebar is always shown, so this is just a placeholder */}
            <button
              className="text-gray-500 hover:text-gray-700 flex-shrink-0 hidden md:block"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search bar — hidden on very small screens */}
            <div className="relative hidden sm:block w-40 md:w-64 lg:w-80 max-w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-8 h-8 text-sm bg-gray-50 border-gray-200 focus-visible:ring-gray-200"
              />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button className="text-gray-500 hover:text-gray-700">
              <Bell className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            <Link to="/" className="hidden sm:block">
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <span className="hidden md:inline">View Store</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>

            <div className="h-5 w-px bg-gray-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-semibold text-gray-900 leading-none">Admin</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Super Administrator</p>
              </div>
              <Avatar className="h-7 w-7 border">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] font-bold">AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-5 scrollbar-thin scrollbar-thumb-gray-300">
          <div className="mx-auto max-w-7xl">
            {children}
            <footer className="mt-8 pt-4 border-t flex items-center justify-between text-[11px] text-gray-400">
              <span>© 2026 ToolsMan Admin. All rights reserved.</span>
              <span>v1.0.0</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
