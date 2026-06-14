import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ProductManagement from "@/components/admin/ProductManagement";
import OrderManagement from "@/components/admin/OrderManagement";
import CustomerManagement from "@/components/admin/CustomerManagement";
import CategoryManagement from "@/components/admin/CategoryManagement";
import BulkProductImport from "@/components/admin/BulkProductImport";
import SalesReports from "@/components/admin/SalesReports";
import WatermarkSettings from "@/components/admin/WatermarkSettings";
import FeatureCleanupTool from "@/components/admin/FeatureCleanupTool";
import { Loader2 } from "lucide-react";

const Admin = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      } else {
        setCheckingAuth(false);
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="import" element={<BulkProductImport />} />
        <Route path="reports" element={<SalesReports />} />
        <Route path="settings" element={<WatermarkSettings />} />
        <Route path="feature-cleanup" element={<FeatureCleanupTool />} />
      </Routes>
    </AdminLayout>
  );
};

export default Admin;
