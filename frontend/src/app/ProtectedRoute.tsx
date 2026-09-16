import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "./hooks";

export function ProtectedRoute() {
  const staff = useAppSelector((s) => s.auth.staff);
  if (!staff) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
