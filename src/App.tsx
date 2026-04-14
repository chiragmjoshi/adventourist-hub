import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import { LandingPages, Reports, UserManagement, RoleManagement } from "./pages/PlaceholderPages";
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
            <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
            <Route path="/trip-cashflow" element={<ProtectedRoute><TripCashflowList /></ProtectedRoute>} />
            <Route path="/trip-cashflow/new" element={<ProtectedRoute><TripCashflowEdit /></ProtectedRoute>} />
            <Route path="/trip-cashflow/edit/:id" element={<ProtectedRoute><TripCashflowEdit /></ProtectedRoute>} />
            <Route path="/trip-cashflow/:id" element={<ProtectedRoute><TripCashflowDetail /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><VendorList /></ProtectedRoute>} />
            <Route path="/vendors/new" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />
            <Route path="/vendors/edit/:id" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />
            <Route path="/vendors/:id" element={<ProtectedRoute><VendorDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/db/destinations" element={<ProtectedRoute><Destinations /></ProtectedRoute>} />
            <Route path="/db/master-values" element={<ProtectedRoute><MasterValues /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/role-management" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
