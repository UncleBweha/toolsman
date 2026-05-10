import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, FolderTree, Users, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCategories: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalCategories: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [productsRes, ordersRes, categoriesRes, revenueRes, pendingRes, lowStockRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("total").eq("status", "delivered"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 10),
    ]);

    const revenue = revenueRes.data?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

    setStats({
      totalProducts: productsRes.count || 0,
      totalOrders: ordersRes.count || 0,
      totalCategories: categoriesRes.count || 0,
      totalRevenue: revenue,
      pendingOrders: pendingRes.count || 0,
      lowStockProducts: lowStockRes.count || 0,
    });
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return `Kshs ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      icon: Package,
      description: `${stats.lowStockProducts} low stock`,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      description: `${stats.pendingOrders} pending`,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Categories",
      value: stats.totalCategories.toString(),
      icon: FolderTree,
      description: "Active categories",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Revenue",
      value: formatPrice(stats.totalRevenue),
      icon: DollarSign,
      description: "From delivered orders",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome to your admin dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/products" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Add New Product</div>
                <div className="text-sm text-muted-foreground">Create a new product listing</div>
              </div>
            </Link>
            <Link to="/admin/import" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Bulk Import</div>
                <div className="text-sm text-muted-foreground">Import products from CSV/Excel</div>
              </div>
            </Link>
            <Link to="/admin/orders" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">View Orders</div>
                <div className="text-sm text-muted-foreground">Manage and track orders</div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Activity feed coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
