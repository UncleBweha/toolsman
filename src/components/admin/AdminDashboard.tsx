import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Dummy Data for Charts
const salesData = [
  { name: 'Mon', thisWeek: 2400, lastWeek: 1800 },
  { name: 'Tue', thisWeek: 3600, lastWeek: 2400 },
  { name: 'Wed', thisWeek: 6200, lastWeek: 3100 },
  { name: 'Thu', thisWeek: 3800, lastWeek: 2100 },
  { name: 'Fri', thisWeek: 5900, lastWeek: 3800 },
  { name: 'Sat', thisWeek: 4500, lastWeek: 2900 },
  { name: 'Sun', thisWeek: 5200, lastWeek: 3600 },
];

const orderStatusData = [
  { name: 'Delivered', value: 198, color: '#FF6B00' },
  { name: 'Processing', value: 78, color: '#8B5CF6' },
  { name: 'Shipped', value: 45, color: '#F59E0B' },
  { name: 'Pending', value: 23, color: '#3B82F6' },
  { name: 'Cancelled', value: 12, color: '#10B981' },
];

const bestSelling = [
  { name: 'DeWalt 20V MAX Cordless Drill', sold: 128, revenue: 15974.72, img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=50&q=80' },
  { name: 'Milwaukee M18 Fuel Hammer Drill', sold: 96, revenue: 13823.04, img: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=50&q=80' },
  { name: 'Makita 18V LXT Cordless Drill', sold: 84, revenue: 10617.16, img: 'https://images.unsplash.com/photo-1584444589320-994c6508f7ce?auto=format&fit=crop&w=50&q=80' },
  { name: 'Bosch 12V Max Cordless Drill', sold: 72, revenue: 7919.28, img: 'https://images.unsplash.com/photo-1508873535973-207d47e4526d?auto=format&fit=crop&w=50&q=80' },
  { name: 'Ryobi 18V One+ Cordless Drill', sold: 65, revenue: 6174.35, img: 'https://images.unsplash.com/photo-1590209673229-2ec8c9190ab7?auto=format&fit=crop&w=50&q=80' },
];

const topCustomers = [
  { name: 'John Smith', email: 'john.smith@example.com', orders: 12, spent: 1256.97, initials: 'JS' },
  { name: 'Sarah Johnson', email: 'sarah.j@example.com', orders: 9, spent: 987.50, initials: 'SJ' },
  { name: 'Michael Brown', email: 'michael.b@example.com', orders: 8, spent: 876.40, initials: 'MB' },
  { name: 'Emily Davis', email: 'emily.d@example.com', orders: 7, spent: 765.89, initials: 'ED' },
  { name: 'David Wilson', email: 'david.w@example.com', orders: 6, spent: 645.30, initials: 'DW' },
];

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalSales: number;
  pendingOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalSales: 0,
    pendingOrders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentData();
  }, []);

  const fetchRecentData = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id, 
        total, 
        status, 
        created_at,
        shipping_address
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (ordersData) {
      setRecentOrders(ordersData.map(o => {
        const address = o.shipping_address as { full_name?: string } | null;
        return {
          id: `#TM-${o.id.substring(0, 8).toUpperCase()}`,
          customer: address?.full_name || 'Guest',
          amount: o.total,
          status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
          time: new Date(o.created_at).toLocaleDateString()
        };
      }));
    }

    // Low Stock Products
    const { data: productsData } = await supabase
      .from("products")
      .select("name, sku, stock_quantity, image_url")
      .lt("stock_quantity", 10)
      .order("stock_quantity", { ascending: true })
      .limit(5);

    if (productsData) {
      setInventoryAlerts(productsData.map(p => ({
        name: p.name,
        sku: p.sku || 'N/A',
        stock: p.stock_quantity,
        img: p.image_url || 'https://via.placeholder.com/50'
      })));
    }
  };

  const fetchStats = async () => {
    const [productsRes, ordersRes, customersRes, pendingRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id, total", { count: "exact" }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const totalSales = ordersRes.data?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

    setStats({
      totalProducts: productsRes.count || 0,
      totalOrders: ordersRes.count || 0,
      totalCustomers: customersRes.count || 0,
      totalSales: totalSales,
      pendingOrders: pendingRes.count || 0,
    });
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return `Kshs ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Welcome back, Admin! Here's what's happening with your store.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5 shadow-sm">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">May 13 - May 19, 2024</span>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-full shrink-0">
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Sales</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-gray-900">{isLoading ? "..." : formatPrice(stats.totalSales)}</h3>
                <span className="text-[10px] font-bold text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> 18.6%
                </span>
              </div>
              <p className="text-[10px] text-gray-400">vs May 6 - May 12, 2024</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-sky-50 p-3 rounded-full shrink-0">
              <ShoppingBag className="h-6 w-6 text-sky-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Orders</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-gray-900">{isLoading ? "..." : stats.totalOrders.toLocaleString()}</h3>
                <span className="text-[10px] font-bold text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> 12.4%
                </span>
              </div>
              <p className="text-[10px] text-gray-400">vs May 6 - May 12, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-full shrink-0">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Customers</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-gray-900">{isLoading ? "..." : stats.totalCustomers.toLocaleString()}</h3>
                <span className="text-[10px] font-bold text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> 9.8%
                </span>
              </div>
              <p className="text-[10px] text-gray-400">vs May 6 - May 12, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-orange-50 p-3 rounded-full shrink-0">
              <Package className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Products</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-gray-900">{isLoading ? "..." : stats.totalProducts.toLocaleString()}</h3>
                <span className="text-[10px] font-bold text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> 3.2%
                </span>
              </div>
              <p className="text-[10px] text-gray-400">vs May 6 - May 12, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-full shrink-0">
              <ShoppingCart className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Pending Orders</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-gray-900">{isLoading ? "..." : stats.pendingOrders.toLocaleString()}</h3>
                <span className="text-[10px] font-bold text-red-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3" /> 8.0%
                </span>
              </div>
              <p className="text-[10px] text-gray-400">vs May 6 - May 12, 2024</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Overview Chart */}
        <Card className="lg:col-span-1 xl:col-span-1 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">Sales Overview</CardTitle>
            <Select defaultValue="this-week">
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="This Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF6B00]"></div>
                <span className="text-gray-600 font-medium">This Week</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-400"></div>
                <span className="text-gray-400">Last Week</span>
              </div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(val) => `$${val / 1000}K`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                  />
                  <Line type="monotone" dataKey="thisWeek" stroke="#FF6B00" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="lastWeek" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <div className="relative h-[160px] w-full flex justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-900">356</span>
                <span className="text-xs text-gray-500">Total</span>
              </div>
            </div>
            <div className="w-full mt-2 space-y-2">
              {orderStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.value}</span>
                    <span className="text-gray-400 w-10 text-right">({((item.value / 356) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentOrders.length > 0 ? recentOrders.map((order) => {
                let badgeColor = "bg-gray-100 text-gray-700";
                if (order.status === 'Delivered') badgeColor = "bg-green-100 text-green-700";
                if (order.status === 'Processing') badgeColor = "bg-blue-100 text-blue-700";
                if (order.status === 'Shipped') badgeColor = "bg-orange-100 text-orange-700";
                if (order.status === 'Pending') badgeColor = "bg-purple-100 text-purple-700";

                return (
                  <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{order.customer}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm text-gray-900">{formatPrice(order.amount)}</div>
                    </div>
                    <div>
                      <Badge variant="secondary" className={`font-normal text-[10px] px-2 py-0 h-5 ${badgeColor}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 w-16 text-right">
                      {order.time}
                    </div>
                  </div>
                );
              }) : (
                <div className="p-4 text-center text-sm text-gray-500">No recent orders found.</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Best Selling Products */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold">Best Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-center">Sold</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bestSelling.map((product, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <img src={product.img} alt={product.name} className="w-8 h-8 rounded object-cover border" />
                      <span className="font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[180px]">{product.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{product.sold}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-center">Orders</th>
                  <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topCustomers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{customer.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[100px]">{customer.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{customer.orders}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(customer.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>


        {/* Inventory & System */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold">Inventory Alerts</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-0">
              <div className="divide-y">
                {inventoryAlerts.length > 0 ? inventoryAlerts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img src={item.img} alt={item.name} className="w-8 h-8 rounded object-cover border" />
                      <div>
                        <div className="font-medium text-sm text-gray-900 truncate max-w-[120px]">{item.name}</div>
                        <div className="text-[10px] text-gray-500">SKU: {item.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{item.stock}</div>
                      <div className="text-[10px] text-red-400">Low Stock</div>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center text-sm text-gray-500">No inventory alerts!</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold">System Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Server Status</span>
                  <div className="flex items-center gap-1.5 text-green-600 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Backup</span>
                  <span className="font-medium text-gray-900">May 19, 2024 02:00 AM</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Storage Usage</span>
                    <span className="font-medium text-gray-900 text-xs">68% (136 GB / 200 GB)</span>
                  </div>
                  <Progress value={68} className="h-1.5 bg-gray-100" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-gray-500">Active Users</span>
                  <span className="text-xs text-gray-500">7 Admins Online</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
