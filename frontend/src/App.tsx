import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthBootstrap } from "@/components/auth/AuthBootstrap"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { AdminRoute } from "@/routes/AdminRoute"
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"
import { JswStockListPage } from "@/pages/jsw-stock"
import { JvmlStockListPage } from "@/pages/jvml-stock"
import { CreditReportPage } from "@/pages/credit-report"
import { ReportPage } from "@/pages/report"
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
import { SettingsPage } from "@/pages/admin/settings"
import { CoilConfigPage } from "@/pages/admin/coil-config"

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/jvml-stock" element={<JvmlStockListPage />} />
            <Route path="/jsw-stock" element={<JswStockListPage />} />
            <Route path="/credit-report" element={<CreditReportPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/regions" element={<RegionManagementPage />} />
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
              <Route path="/admin/coil-config" element={<CoilConfigPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
