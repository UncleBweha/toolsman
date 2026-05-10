import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FolderTree, 
  Upload,
  ArrowLeft,
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/import", label: "Bulk Import", icon: Upload },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Store</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="bg-background rounded-lg border p-2 sticky top-24">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
