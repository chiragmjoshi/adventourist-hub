import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeadManagement from "./pages/LeadManagement";
import LeadDetail from "./pages/LeadDetail";
import ItineraryList from "./pages/ItineraryList";
import ItineraryEdit from "./pages/ItineraryEdit";
import Destinations from "./pages/Destinations";
import MasterValues from "./pages/MasterValues";
import VendorList from "./pages/VendorList";
import VendorEdit from "./pages/VendorEdit";
import VendorDetail from "./pages/VendorDetail";
import TripCashflowList from "./pages/TripCashflowList";
import TripCashflowEdit from "./pages/TripCashflowEdit";
import TripCashflowDetail from "./pages/TripCashflowDetail";
import Settings from "./pages/Settings";
import LandingPageList from "./pages/LandingPageList";
import LandingPageEdit from "./pages/LandingPageEdit";
import LandingPageDetail from "./pages/LandingPageDetail";
import LandingPage from "./pages/LandingPage";
import ReportsHub from "./pages/ReportsHub";
import SalesReport from "./pages/reports/SalesReport";
import RevenueReport from "./pages/reports/RevenueReport";
import ConversionReport from "./pages/reports/ConversionReport";
import DestinationReport from "./pages/reports/DestinationReport";
import PlatformROI from "./pages/reports/PlatformROI";
import TeamPerformance from "./pages/reports/TeamPerformance";
import UserManagementPage from "./pages/UserManagementPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import ProfilePage from "./pages/ProfilePage";
import Automations from "./pages/Automations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><LeadManagement /></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
            <Route path="/itineraries" element={<ProtectedRoute><ItineraryList /></ProtectedRoute>} />
            <Route path="/itineraries/new" element={<ProtectedRoute><ItineraryEdit /></ProtectedRoute>} />
            <Route path="/itineraries/edit/:id" element={<ProtectedRoute><ItineraryEdit /></ProtectedRoute>} />
            <Route path="/landing-pages" element={<ProtectedRoute><LandingPageList /></ProtectedRoute>} />
            <Route path="/landing-pages/new" element={<ProtectedRoute><LandingPageEdit /></ProtectedRoute>} />
            <Route path="/landing-pages/edit/:id" element={<ProtectedRoute><LandingPageEdit /></ProtectedRoute>} />
            <Route path="/landing-pages/:id" element={<ProtectedRoute><LandingPageDetail /></ProtectedRoute>} />
            <Route path="/trip-cashflow" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["operations", "admin", "super_admin", "finance"]} pageName="Trip Cashflow"><TripCashflowList /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/trip-cashflow/new" element={<ProtectedRoute><TripCashflowEdit /></ProtectedRoute>} />
            <Route path="/trip-cashflow/edit/:id" element={<ProtectedRoute><TripCashflowEdit /></ProtectedRoute>} />
            <Route path="/trip-cashflow/:id" element={<ProtectedRoute><TripCashflowDetail /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><VendorList /></ProtectedRoute>} />
            <Route path="/vendors/new" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />
            <Route path="/vendors/edit/:id" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />
            <Route path="/vendors/:id" element={<ProtectedRoute><VendorDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["super_admin"]} pageName="Settings"><Settings /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsHub /></ProtectedRoute>} />
            <Route path="/reports/sales" element={<ProtectedRoute><SalesReport /></ProtectedRoute>} />
            <Route path="/reports/revenue" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["finance", "admin", "super_admin"]} pageName="Revenue Report"><RevenueReport /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/reports/conversion" element={<ProtectedRoute><ConversionReport /></ProtectedRoute>} />
            <Route path="/reports/destinations" element={<ProtectedRoute><DestinationReport /></ProtectedRoute>} />
            <Route path="/reports/platform-roi" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["admin", "super_admin"]} pageName="Platform ROI"><PlatformROI /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/reports/team" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["admin", "super_admin"]} pageName="Team Performance"><TeamPerformance /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/db/destinations" element={<ProtectedRoute><Destinations /></ProtectedRoute>} />
            <Route path="/db/master-values" element={<ProtectedRoute><MasterValues /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["super_admin"]} pageName="User Management"><UserManagementPage /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/role-management" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["super_admin"]} pageName="Role Management"><RoleManagementPage /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automations" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["admin", "super_admin"]} pageName="Automations"><Automations /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/l/:slug" element={<LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
