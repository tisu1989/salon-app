import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { AccountPage } from "../features/auth/AccountPage";
import { TodayBoardPage } from "../features/appointments/TodayBoardPage";
import { NewBookingWizard } from "../features/appointments/NewBookingWizard";
import { CustomerDirectoryPage } from "../features/customers/CustomerDirectoryPage";
import { CustomerProfilePage } from "../features/customers/CustomerProfilePage";
import { StaffDirectoryPage } from "../features/staff/StaffDirectoryPage";
import { StaffDetailPage } from "../features/staff/StaffDetailPage";
import { ServiceMenuPage } from "../features/services/ServiceMenuPage";
import { NotificationLogPage } from "../features/notifications/NotificationLogPage";
import { AppShell } from "./AppShell";
import { ManagePage } from "./ManagePage";
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
          { path: "/customers", element: <CustomerDirectoryPage /> },
          { path: "/customers/:id", element: <CustomerProfilePage /> },
          { path: "/manage", element: <ManagePage /> },
          { path: "/staff", element: <StaffDirectoryPage /> },
          { path: "/staff/:id", element: <StaffDetailPage /> },
          { path: "/services", element: <ServiceMenuPage /> },
          { path: "/notifications", element: <NotificationLogPage /> },
          { path: "/account", element: <AccountPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
