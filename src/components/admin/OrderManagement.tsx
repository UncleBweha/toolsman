import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Eye } from "lucide-react";
import { format } from "date-fns";

interface OrderWithItems extends Order {
  items?: {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const OrderManagement = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    return data || [];
  };

  const handleViewOrder = async (order: Order) => {
    const items = await fetchOrderItems(order.id);
    setSelectedOrder({ ...order, items });
    setIsDialogOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order status");
    } else {
      toast.success("Order status updated");
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    }
  };

  const formatPrice = (price: number) => {
    return `Kshs ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  const formatAddress = (address: unknown) => {
    if (!address || typeof address !== "object") return "-";
    const addr = address as Record<string, string>;
    return [addr.street, addr.city, addr.state, addr.postal_code, addr.country]
      .filter(Boolean)
      .join(", ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Orders</h2>
        <p className="text-sm text-muted-foreground">{orders.length} orders total</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No orders yet
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>{format(new Date(order.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <Badge className={statusColors[order.status] || "bg-gray-100"}>
                        {order.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatPrice(order.total)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Status</h4>
                  <Badge className={statusColors[selectedOrder.status] || "bg-gray-100"}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Order Date</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrder.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <p className="text-sm text-muted-foreground">
                  {formatAddress(selectedOrder.shipping_address)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × {formatPrice(item.unit_price)}
                        </div>
                      </div>
                      <div className="font-medium">{formatPrice(item.total_price)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{formatPrice(selectedOrder.shipping_cost)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
