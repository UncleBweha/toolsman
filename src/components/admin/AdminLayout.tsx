import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Undo2,
  TicketPercent,
  Users,
  Package, 
  FolderTree, 
  Tags,
  Warehouse,
  ListTree,
  Image as ImageIcon,
  Megaphone,
  Star,
  FileText,
  BarChart3,
  PieChart,
  UserCog,
  ShieldCheck,
  Settings,
  Activity,
  Menu,
  Search,
  Bell,
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AdminLayoutProps {
  children: ReactNode;
}

const sidebarSections = [
  {
    title: "",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "SALES",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/returns", label: "Returns", icon: Undo2 },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ]
  },
  {
    title: "CATALOG",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/brands", label: "Brands", icon: Tags },
      { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
      { href: "/admin/attributes", label: "Attributes", icon: ListTree },
    ]
  },
  {
    title: "MARKETING",
    items: [
      { href: "/admin/banners", label: "Banners", icon: ImageIcon },
      { href: "/admin/promotions", label: "Promotions", icon: Megaphone },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ]
  },
  {
    title: "REPORTS",
    items: [
      { href: "/admin/sales-reports", label: "Sales Reports", icon: FileText },
      { href: "/admin/product-reports", label: "Product Reports", icon: BarChart3 },
      { href: "/admin/customer-reports", label: "Customer Reports", icon: PieChart },
    ]
  },
  {
    title: "SYSTEM",
    items: [
      { href: "/admin/users", label: "Users", icon: UserCog },
      { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/activity", label: "Activity Logs", icon: Activity },
    ]
  }
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#111827] text-white flex flex-col transition-all duration-300 z-20",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-white/10 shrink-0">
          <Link to="/admin" className="flex items-center">
            <img src="/logo.png" alt="Toolsman" className="h-8 w-8 object-contain mr-3" />
            {!collapsed && <span className="font-bold text-lg tracking-wide uppercase">Toolsman</span>}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-white/10">
          {sidebarSections.map((section, idx) => (
            <div key={idx} className="mb-6">
              {!collapsed && section.title && (
                <div className="px-6 mb-2 text-xs font-semibold text-white/40 tracking-wider">
                  {section.title}
                </div>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center px-4 py-2.5 mx-2 rounded-lg transition-colors group relative",
                        isActive 
                          ? "bg-[#FF6B00] text-white" 
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", !collapsed && "mr-3")} />
                      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Collapse Button */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center w-full text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span className="ml-3 text-sm font-medium">Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center flex-1">
            <button className="mr-4 text-gray-500 hover:text-gray-700">
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative w-96 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search anything..." 
                className="pl-9 bg-gray-50/50 border-gray-200 focus-visible:ring-gray-200 h-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center bg-[#FF6B00] text-[10px] text-white border-white border">
                5
              </Badge>
            </button>
            
            <Link to="/">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                View Store
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">Admin</div>
                <div className="text-xs text-gray-500">Super Administrator</div>
              </div>
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gray-100 text-gray-600">AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300">
          <div className="mx-auto max-w-7xl">
            {children}
            
            <footer className="mt-12 pt-6 border-t flex items-center justify-between text-xs text-gray-500">
              <div>© 2024 ToolsMan Admin. All rights reserved.</div>
              <div>Version 1.0.0</div>
            </footer>
          </div>
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;
