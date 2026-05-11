import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, ShoppingBag, Users, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

interface DaySales { name: string; sales: number; orders: number }

const SalesReports = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [last30Days, setLast30Days] = useState<DaySales[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0, totalOrders: 0, avgOrder: 0, newCustomers: 0
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Last 30 days — grouped by day
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, total, created_at")
      .gte("created_at", start.toISOString())
      .order("created_at");

    // Build day map
    const dayMap: Record<string, { sales: number; orders: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      dayMap[key] = { sales: 0, orders: 0 };
    }
    (orders || []).forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (dayMap[key]) {
        dayMap[key].sales += Number(o.total) || 0;
        dayMap[key].orders += 1;
      }
    });
    const chartData = Object.entries(dayMap).map(([name, v]) => ({ name, ...v }));
    setLast30Days(chartData);

    const totalSales = (orders || []).reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders?.length || 0;

    // All-time summary
    const { count: allOrders } = await supabase.from("orders").select("id", { count: "exact", head: true });

    // New customers in last 30 days
    const { count: newCust } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start.toISOString());

    setSummary({
      totalSales,
      totalOrders,
      avgOrder: totalOrders ? totalSales / totalOrders : 0,
      newCustomers: newCust || 0,
    });

    // Top products by revenue
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity, price, products(name)");

    const productMap: Record<string, { name: string; sold: number; revenue: number }> = {};
    (items || []).forEach((item: any) => {
      if (!item.product_id) return;
      if (!productMap[item.product_id])
        productMap[item.product_id] = { name: item.products?.name || "Unknown", sold: 0, revenue: 0 };
      productMap[item.product_id].sold += item.quantity || 1;
      productMap[item.product_id].revenue += (item.price || 0) * (item.quantity || 1);
    });
    setTopProducts(
      Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({ ...p, name: p.name.length > 25 ? p.name.slice(0, 22) + "…" : p.name }))
    );

    setIsLoading(false);
  };

  const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sales & Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Last 30 days performance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, bg: "bg-blue-50", color: "text-blue-500", label: "Revenue (30d)", value: fmt(summary.totalSales) },
          { icon: ShoppingBag, bg: "bg-orange-50", color: "text-orange-500", label: "Orders (30d)", value: summary.totalOrders.toString() },
          { icon: TrendingUp, bg: "bg-green-50", color: "text-green-500", label: "Avg Order Value", value: fmt(summary.avgOrder) },
          { icon: Users, bg: "bg-purple-50", color: "text-purple-500", label: "New Customers (30d)", value: summary.newCustomers.toString() },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`${stat.bg} p-3 rounded-full shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales over time chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Daily Revenue — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {last30Days.every(d => d.sales === 0) ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
              No sales data in this period.
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30Days} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                    interval={4} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" }}
                    formatter={(v: any) => [fmt(v), "Revenue"]} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Revenue" stroke="#FF6B00" strokeWidth={2}
                    dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders over time + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Daily Orders — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last30Days} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false}
                    tickLine={false} interval={4} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" }}
                    formatter={(v: any) => [v, "Orders"]} />
                  <Bar dataKey="orders" name="Orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No sales data yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-center font-medium">Sold</th>
                    <th className="px-4 py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-800">{p.name}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{p.sold}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesReports;
