import { Navigate, Route, Routes } from "react-router-dom";

import BrandPanel from "./layouts/BrandPanel";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RepairManagementPage from "./pages/RepairManagementPage";
import PersonnelPage from "./pages/PersonnelPage";
import InventoryPage from "./pages/InventoryPage";
import ReportPage from "./pages/ReportPage";

export default function Moderator() {
  return (
    <Routes>
      <Route element={<BrandPanel />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoleIds={[2]} />}>
        <Route element={<MainLayout />}>
          <Route path="/moderator" element={<Navigate to="/moderator/home" replace/>}/>

          <Route
            path="/moderator/home"
            element={<HomePage />}
          />

          <Route
            path="/moderator/repairs"
            element={<RepairManagementPage />}
          />

          <Route
            path="/moderator/personnel"
            element={<PersonnelPage />}
          />

          <Route
            path="/moderator/inventory"
            element={<InventoryPage />}
          />

          <Route
            path="/moderator/reports"
            element={<ReportPage />}
          />
        </Route>
      </Route>

      {/* เปิดหน้าเว็บไซต์หลัก */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* URL ที่ไม่มีอยู่ในระบบ */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}