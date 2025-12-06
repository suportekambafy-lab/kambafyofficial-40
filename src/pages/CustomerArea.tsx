import { Routes, Route, Navigate } from "react-router-dom";
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

// Lazy load sub-pages
const CustomerAccesses = lazy(() => import("@/components/customer/CustomerAccesses"));
const CustomerPurchases = lazy(() => import("@/components/customer/CustomerPurchases"));

export default function CustomerArea() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <CustomerTopBar />
        
        <Suspense fallback={<div className="p-4 md:p-6"><PageSkeleton variant="dashboard" /></div>}>
          <Routes>
            <Route index element={<CustomerAccesses />} />
            <Route path="compras" element={<CustomerPurchases />} />
            <Route path="*" element={<Navigate to="/meus-acessos" replace />} />
          </Routes>
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}
