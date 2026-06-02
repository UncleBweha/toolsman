import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, ShoppingBag, Users, Package, ShoppingCart,
  ArrowUpRight, CalendarDays, Loader2, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  delivered: "#10B981", processing: "#8B5CF6",
  shipped: "#F59E0B", pending: "#3B82F6", cancelled: "#EF4444",
};

interface Stats {
  totalProducts: number; totalOrders: number;
  totalCustomers: number; totalSales: number; pendingOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalOrders: 0, totalCustomers: 0, totalSales: 0, pendingOrders: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [bestSelling, setBestSelling] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [salesChartData, setSalesChartData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.all([fetchStats(), fetchRecentData(), fetchChartData()]);
      if (!cancelled) setIsLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const fetchStats = async () => {
    const [productsRes, ordersRes, customersRes, pendingRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id, total", { count: "exact" }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const totalSales = ordersRes.data?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;
    setStats({
      totalProducts: productsRes.count || 0,
      totalOrders: ordersRes.count || 0,
      totalCustomers: customersRes.count || 0,
      totalSales,
      pendingOrders: pendingRes.count || 0,
    });
  };

  const fetchRecentData = async () => {
    // Recent Orders
    const { data: ordersData } = await supabase
      .from("orders").select("id, total, status, created_at, shipping_address")
      .order("created_at", { ascending: false }).limit(5);
    if (ordersData) {
      setRecentOrders(ordersData.map(o => {
        const addr = o.shipping_address as { full_name?: string } | null;
        return {
          id: `#TM-${o.id.substring(0, 8).toUpperCase()}`,
          customer: addr?.full_name || "Guest",
          amount: o.total,
          status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
          time: new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        };
      }));
    }

    // Order Status breakdown
    const { data: allOrders } = await supabase.from("orders").select("status");
    if (allOrders) {
      const counts: Record<string, number> = {};
      allOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
      setOrderStatusData(Object.entries(counts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: STATUS_COLORS[name] || "#9CA3AF",
      })));
    }

    // Inventory alerts disabled — store operates with unlimited inventory.
    setInventoryAlerts([]);

    // Best selling products (by order item count)
    const { data: bsData } = await supabase
      .from("order_items").select("product_id, quantity, price, products(name, image_url)");
    if (bsData) {
      const map: Record<string, { name: string; img: string; sold: number; revenue: number }> = {};
      bsData.forEach((item: any) => {
        const pid = item.product_id;
        if (!map[pid]) map[pid] = { name: item.products?.name || "Unknown", img: item.products?.image_url || "", sold: 0, revenue: 0 };
        map[pid].sold += item.quantity || 1;
        map[pid].revenue += (item.price || 0) * (item.quantity || 1);
      });
      setBestSelling(Object.values(map).sort((a, b) => b.sold - a.sold).slice(0, 5));
    }

    // Top customers by total spend
    const { data: custData } = await supabase
      .from("orders").select("user_id, total, shipping_address, profiles(full_name)");
    if (custData) {
      const map: Record<string, { name: string; orders: number; spent: number }> = {};
      custData.forEach((o: any) => {
        if (!o.user_id) return;
        const addr = o.shipping_address as { full_name?: string } | null;
        const name = o.profiles?.full_name || addr?.full_name || "Guest";
        if (!map[o.user_id]) map[o.user_id] = { name, orders: 0, spent: 0 };
        map[o.user_id].orders += 1;
        map[o.user_id].spent += o.total || 0;
      });
      setTopCustomers(Object.values(map).sort((a, b) => b.spent - a.spent).slice(0, 5));
    }
  };

  const fetchChartData = async () => {
    // Last 7 days sales per day
    const now = new Date();
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      const { data } = await supabase.from("orders")
        .select("total").gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
      const total = data?.reduce((s, o) => s + (o.total || 0), 0) || 0;
      days.push({ name: d.toLocaleDateString("en-GB", { weekday: "short" }), sales: total });
    }
    setSalesChartData(days);
  };

  const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  const totalStatusOrders = orderStatusData.reduce((s, d) => s + d.value, 0);

  const StatCard = ({ icon: Icon, bg, iconColor, label, value, loading }: any) => (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`${bg} p-3 rounded-full shrink-0`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <h3 className="text-xl font-bold text-gray-900">
            {loading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : value}
          </h3>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Live store overview</p>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5 shadow-sm">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={DollarSign} bg="bg-blue-50" iconColor="text-blue-500" label="Total Sales" value={fmt(stats.totalSales)} loading={isLoading} />
        <StatCard icon={ShoppingBag} bg="bg-sky-50" iconColor="text-sky-500" label="Total Orders" value={stats.totalOrders.toLocaleString()} loading={isLoading} />
        <StatCard icon={Users} bg="bg-green-50" iconColor="text-green-500" label="Customers" value={stats.totalCustomers.toLocaleString()} loading={isLoading} />
        <StatCard icon={Package} bg="bg-orange-50" iconColor="text-orange-500" label="Products" value={stats.totalProducts.toLocaleString()} loading={isLoading} />
        <StatCard icon={ShoppingCart} bg="bg-red-50" iconColor="text-red-500" label="Pending Orders" value={stats.pendingOrders.toLocaleString()} loading={isLoading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Sales Overview (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : salesChartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No sales data</div>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(v: any) => [fmt(v), "Sales"]} />
                    <Line type="monotone" dataKey="sales" stroke="#FF6B00" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center w-full"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : orderStatusData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No orders yet</div>
            ) : (
              <>
                <div className="relative h-[160px] w-full flex justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">{totalStatusOrders}</span>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                </div>
                <div className="w-full mt-2 space-y-2">
                  {orderStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.value}</span>
                        <span className="text-gray-400 w-12 text-right">({totalStatusOrders ? ((item.value / totalStatusOrders) * 100).toFixed(1) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : recentOrders.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No orders yet.</div>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => {
                  const colors: Record<string, string> = { Delivered: "bg-green-100 text-green-700", Processing: "bg-blue-100 text-blue-700", Shipped: "bg-orange-100 text-orange-700", Pending: "bg-purple-100 text-purple-700", Cancelled: "bg-red-100 text-red-700" };
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{order.id}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{order.customer}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm text-gray-900">{fmt(order.amount)}</div>
                      </div>
                      <Badge variant="secondary" className={`font-normal text-[10px] px-2 py-0 h-5 ${colors[order.status] || "bg-gray-100 text-gray-700"}`}>{order.status}</Badge>
                      <div className="text-xs text-gray-400 w-14 text-right">{order.time}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Selling */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">Best Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : bestSelling.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No sales data yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-center">Sold</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bestSelling.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 flex items-center gap-3">
                        {p.img ? <img src={p.img} alt={p.name} className="w-8 h-8 rounded object-cover border" /> : <div className="w-8 h-8 rounded bg-gray-100 border flex items-center justify-center"><Package className="h-4 w-4 text-gray-400" /></div>}
                        <span className="font-medium text-gray-900 truncate max-w-[140px]">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{p.sold}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : topCustomers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No customer data yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-center">Orders</th>
                    <th className="px-4 py-3 font-medium text-right">Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{c.name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900 truncate max-w-[110px]">{c.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{c.orders}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(c.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-0">
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : inventoryAlerts.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">✅ All products have sufficient stock.</div>
            ) : (
              <div className="divide-y">
                {inventoryAlerts.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      {item.img ? <img src={item.img} alt={item.name} className="w-8 h-8 rounded object-cover border" /> : <div className="w-8 h-8 rounded bg-gray-100 border flex items-center justify-center"><Package className="h-4 w-4 text-gray-400" /></div>}
                      <div>
                        <div className="font-medium text-sm text-gray-900 truncate max-w-[130px]">{item.name}</div>
                        <div className="text-[10px] text-gray-500">SKU: {item.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{item.stock}
                      </div>
                      <div className="text-[10px] text-red-400">Low Stock</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
