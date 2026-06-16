import "@/i18n";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import FeatureDetail from "./pages/FeatureDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import PlansManagement from "./pages/admin/PlansManagement";
import LearnManagement from "./pages/admin/LearnManagement";

import Home from "./pages/site/Home";
import About from "./pages/site/About";
import AppPage from "./pages/site/AppPage";
import Community from "./pages/site/Community";
import Contact from "./pages/site/Contact";
import Device from "./pages/site/Device";
import Download from "./pages/site/Download";
import Learn from "./pages/site/Learn";
import Press from "./pages/site/Press";
import Privacy from "./pages/site/Privacy";
import Reserve from "./pages/site/Reserve";
import Schools from "./pages/site/Schools";
import Science from "./pages/site/Science";
import Story from "./pages/site/Story";
import Students from "./pages/site/Students";
import Symphony from "./pages/site/Symphony";
import Support from "./pages/site/Support";
import Teachers from "./pages/site/Teachers";
import Terms from "./pages/site/Terms";
import UserInfo from "./pages/site/UserInfo";
import AccessibilityStatement from "./pages/site/AccessibilityStatement";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { roles, isLoading } = useAuth();
  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  if (isLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Marketing site */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/app" element={<AppPage />} />
              <Route path="/community" element={<Community />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/device" element={<Device />} />
              <Route path="/download" element={<Download />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/press" element={<Press />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/reserve" element={<Reserve />} />
              <Route path="/schools" element={<Schools />} />
              <Route path="/science" element={<Science />} />
              <Route path="/story" element={<Story />} />
              <Route path="/symphony" element={<Symphony />} />
              <Route path="/support" element={<Support />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/students" element={<Students />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/accessibility-statement" element={<AccessibilityStatement />} />
              <Route path="/userinfo" element={<UserInfo />} />
              <Route path="/userinfo/:hex" element={<UserInfo />} />

              {/* Legacy events redirects */}
              <Route path="/events" element={<Navigate to="/teachers" replace />} />
              <Route path="/events/privacy" element={<Navigate to="/privacy" replace />} />
              <Route path="/events/support" element={<Navigate to="/support#ontenna-pa" replace />} />
              <Route path="/events/contact" element={<Navigate to="/contact" replace />} />

              {/* Existing auth & app — preserved */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/feature/:id" element={<ProtectedRoute><FeatureDetail /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UsersManagement /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/plans" element={<ProtectedRoute><AdminRoute><PlansManagement /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/learn" element={<ProtectedRoute><AdminRoute><LearnManagement /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
