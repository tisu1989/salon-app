import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { TodayBoardPage } from "../features/appointments/TodayBoardPage";
import { NewBookingWizard } from "../features/appointments/NewBookingWizard";
import { StaffDirectoryPage } from "../features/staff/StaffDirectoryPage";
import { StaffDetailPage } from "../features/staff/StaffDetailPage";
import { ServiceMenuPage } from "../features/services/ServiceMenuPage";
import { AppShell } from "./AppShell";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <TodayBoardPage /> },
          { path: "/appointments/new", element: <NewBookingWizard /> },
          { path: "/staff", element: <StaffDirectoryPage /> },
          { path: "/staff/:id", element: <StaffDetailPage /> },
          { path: "/services", element: <ServiceMenuPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
