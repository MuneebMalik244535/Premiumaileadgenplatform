import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { AISearch } from "./components/AISearch";
import { LeadsManagement } from "./components/LeadsManagement";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "search", Component: AISearch },
      { path: "leads", Component: LeadsManagement },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
    ],
  },
]);
