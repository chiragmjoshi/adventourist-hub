import { useEffect } from "react";
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
import StoryList from "./pages/StoryList";
import StoryEdit from "./pages/StoryEdit";
import SiteHome from "./site/pages/Home";
import SiteTripsList from "./site/pages/TripsList";
import SiteTripDetail from "./site/pages/TripDetail";
import SiteAbout from "./site/pages/About";
import SiteContact from "./site/pages/Contact";
import SiteFAQs from "./site/pages/FAQs";
import SiteTeam from "./site/pages/Team";
import SiteTravelStories from "./site/pages/TravelStories";
import SiteStoryDetail from "./site/pages/StoryDetail";
import { PrivacyPolicy, TermsConditions, RefundPolicy, PaymentPolicy } from "./site/pages/PolicyPage";
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
import Reminders from "./pages/Reminders";
import TripsKanban from "./pages/TripsKanban";
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";
import ResetPassword from "./pages/ResetPassword";
import { processAutomationQueue } from "./services/automationEngine";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    processAutomationQueue();
    const interval = setInterval(processAutomationQueue, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public site */}
            <Route path="/" element={<SiteHome />} />
            <Route path="/trips" element={<SiteTripsList />} />
            <Route path="/trips/:slug" element={<SiteTripDetail />} />
            <Route path="/about-us" element={<SiteAbout />} />
            <Route path="/contact" element={<SiteContact />} />
            <Route path="/faqs" element={<SiteFAQs />} />
            <Route path="/team" element={<SiteTeam />} />
            <Route path="/travel-stories" element={<SiteTravelStories />} />
            <Route path="/travel-stories/:slug" element={<SiteStoryDetail />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsConditions />} />
            <Route path="/refund-and-cancellation-policy" element={<RefundPolicy />} />
            <Route path="/payment-policy" element={<PaymentPolicy />} />
            <Route path="/l/:slug" element={<LandingPage />} />

            {/* Admin / CMS */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/accept-invite" element={<AcceptInvite />} />
            <Route path="/admin/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/leads" element={<ProtectedRoute><LeadManagement /></ProtectedRoute>} />
            <Route path="/admin/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
            <Route path="/admin/itineraries" element={<ProtectedRoute><ItineraryList /></ProtectedRoute>} />
            <Route path="/admin/itineraries/new" element={<ProtectedRoute><ItineraryEdit /></ProtectedRoute>} />
            <Route path="/admin/itineraries/edit/:id" element={<ProtectedRoute><ItineraryEdit /></ProtectedRoute>} />
            <Route path="/admin/landing-pages" element={<ProtectedRoute><LandingPageList /></ProtectedRoute>} />
            <Route path="/admin/landing-pages/new" element={<ProtectedRoute><LandingPageEdit /></ProtectedRoute>} />
            <Route path="/admin/landing-pages/edit/:id" element={<ProtectedRoute><LandingPageEdit /></ProtectedRoute>} />
            <Route path="/admin/landing-pages/:id" element={<ProtectedRoute><LandingPageDetail /></ProtectedRoute>} />
            <Route path="/admin/stories" element={<ProtectedRoute><StoryList /></ProtectedRoute>} />
            <Route path="/admin/stories/new" element={<ProtectedRoute><StoryEdit /></ProtectedRoute>} />
            <Route path="/admin/stories/:id/edit" element={<ProtectedRoute><StoryEdit /></ProtectedRoute>} />
            <Route path="/admin/trip-cashflow" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["operations", "admin", "super_admin", "finance"]} pageName="Trip Cashflow"><TripCashflowList /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/trip-cashflow/new" element={<ProtectedRoute><TripCashflowEdit /></ProtectedRoute>} />
            <Route path="/admin/trip-cashflow/edit/:id" element={<ProtectedRoute><TripCashflowEdit /></ProtectedRoute>} />
            <Route path="/admin/trip-cashflow/:id" element={<ProtectedRoute><TripCashflowDetail /></ProtectedRoute>} />
            <Route path="/admin/vendors" element={<ProtectedRoute><VendorList /></ProtectedRoute>} />
            <Route path="/admin/vendors/new" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />
            <Route path="/admin/vendors/edit/:id" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />
            <Route path="/admin/vendors/:id" element={<ProtectedRoute><VendorDetail /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["super_admin"]} pageName="Settings"><Settings /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><ReportsHub /></ProtectedRoute>} />
            <Route path="/admin/reports/sales" element={<ProtectedRoute><SalesReport /></ProtectedRoute>} />
            <Route path="/admin/reports/revenue" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["finance", "admin", "super_admin"]} pageName="Revenue Report"><RevenueReport /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/reports/conversion" element={<ProtectedRoute><ConversionReport /></ProtectedRoute>} />
            <Route path="/admin/reports/destinations" element={<ProtectedRoute><DestinationReport /></ProtectedRoute>} />
            <Route path="/admin/reports/platform-roi" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["admin", "super_admin"]} pageName="Platform ROI"><PlatformROI /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/reports/team" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["admin", "super_admin"]} pageName="Team Performance"><TeamPerformance /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/db/destinations" element={<ProtectedRoute><Destinations /></ProtectedRoute>} />
            <Route path="/admin/db/master-values" element={<ProtectedRoute><MasterValues /></ProtectedRoute>} />
            <Route path="/admin/user-management" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["super_admin"]} pageName="User Management"><UserManagementPage /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/role-management" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["super_admin"]} pageName="Role Management"><RoleManagementPage /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/automations" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={["admin", "super_admin"]} pageName="Automations"><Automations /></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
            <Route path="/admin/trips-kanban" element={<ProtectedRoute><TripsKanban /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
