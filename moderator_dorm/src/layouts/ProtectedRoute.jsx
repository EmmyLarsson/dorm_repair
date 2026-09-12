import { Navigate, Outlet } from "react-router-dom";

function decodeTokenPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * ProtectedRoute - กันไม่ให้ role อื่นเข้าเว็บ moderator
 * (นักศึกษา/ช่าง ไม่มีสิทธิ์เข้าหน้าเว็บฝั่งนี้)
 */
export default function ProtectedRoute({ allowedRoleIds }) {
  const accessToken = sessionStorage.getItem("access_token");

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const payload = decodeTokenPayload(accessToken);

  if (!payload || !allowedRoleIds.includes(payload.role_id)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
