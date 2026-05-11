import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Mail, Phone, ShoppingBag, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  orderCount: number;
  totalSpent: number;
}

const CustomerManagement = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false });

    if (!profiles) { setIsLoading(false); return; }

    const { data: orders } = await supabase
      .from("orders")
      .select("user_id, total");

    const orderMap: Record<string, { count: number; total: number }> = {};
    (orders || []).forEach((o) => {
      if (!o.user_id) return;
      if (!orderMap[o.user_id]) orderMap[o.user_id] = { count: 0, total: 0 };
      orderMap[o.user_id].count += 1;
      orderMap[o.user_id].total += Number(o.total) || 0;
    });

    setCustomers(
      profiles.map((p) => ({
        ...p,
        orderCount: orderMap[p.id]?.count || 0,
        totalSpent: orderMap[p.id]?.total || 0,
      }))
    );
    setIsLoading(false);
  };

  const fmt = (n: number) =>
    `KSh ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <p className="text-sm text-gray-500 mt-1">{customers.length} registered customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Customers</p>
              <p className="text-xl font-bold">{customers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Customers with Orders</p>
              <p className="text-xl font-bold">{customers.filter(c => c.orderCount > 0).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-orange-50 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold">{fmt(customers.reduce((s, c) => s + c.totalSpent, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium text-center">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    {search ? "No customers match your search." : "No customers yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                            {(customer.full_name || customer.email || "?")
                              .split(" ")
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.full_name || "—"}
                          </div>
                          <div className="text-xs text-gray-500">{customer.id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {customer.email && (
                          <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.orderCount > 0 ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {customer.orderCount}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {customer.totalSpent > 0 ? (
                        <span className="text-green-700">{fmt(customer.totalSpent)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(customer.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CustomerManagement;
