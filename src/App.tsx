import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
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
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";
import ResetPassword from "./pages/ResetPassword";
import { processAutomationQueue } from "./services/automationEngine";
import { getCrossHostRedirect, getHostKind } from "@/lib/hostname";

// Admin pages — lazy loaded to keep public site bundle small
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LeadManagement = lazy(() => import("./pages/LeadManagement"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const ItineraryList = lazy(() => import("./pages/ItineraryList"));
const ItineraryEdit = lazy(() => import("./pages/ItineraryEdit"));
const Destinations = lazy(() => import("./pages/Destinations"));
const MasterValues = lazy(() => import("./pages/MasterValues"));
const VendorList = lazy(() => import("./pages/VendorList"));
const VendorEdit = lazy(() => import("./pages/VendorEdit"));
const VendorDetail = lazy(() => import("./pages/VendorDetail"));
const TripCashflowList = lazy(() => import("./pages/TripCashflowList"));
const TripCashflowEdit = lazy(() => import("./pages/TripCashflowEdit"));
const TripCashflowDetail = lazy(() => import("./pages/TripCashflowDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const LandingPageList = lazy(() => import("./pages/LandingPageList"));
const LandingPageEdit = lazy(() => import("./pages/LandingPageEdit"));
const LandingPageDetail = lazy(() => import("./pages/LandingPageDetail"));
const StoryList = lazy(() => import("./pages/StoryList"));
const StoryEdit = lazy(() => import("./pages/StoryEdit"));
const ReportsHub = lazy(() => import("./pages/ReportsHub"));
const SalesReport = lazy(() => import("./pages/reports/SalesReport"));
const RevenueReport = lazy(() => import("./pages/reports/RevenueReport"));
const ConversionReport = lazy(() => import("./pages/reports/ConversionReport"));
const DestinationReport = lazy(() => import("./pages/reports/DestinationReport"));
const PlatformROI = lazy(() => import("./pages/reports/PlatformROI"));
const TeamPerformance = lazy(() => import("./pages/reports/TeamPerformance"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const RoleManagementPage = lazy(() => import("./pages/RoleManagementPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Automations = lazy(() => import("./pages/Automations"));
const Reminders = lazy(() => import("./pages/Reminders"));
const TripsKanban = lazy(() => import("./pages/TripsKanban"));

function AdminLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-blaze border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Hostname-based gating: redirect cross-domain traffic before anything renders.
    const redirect = getCrossHostRedirect();
    if (redirect) {
      window.location.replace(redirect);
      return;
    }

    // Mark admin host so we can apply noindex meta + future host-specific styling.
    const kind = getHostKind();
    document.documentElement.dataset.host = kind;
    if (kind === "admin") {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "robots";
        document.head.appendChild(meta);
      }
      meta.content = "noindex, nofollow";
    }

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
          <Suspense fallback={<AdminLoader />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
