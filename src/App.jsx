import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AboutPage from "./pages/AboutPage";
import HomePage from "./pages/HomePage";
import PropertyPage from "./pages/PropertyPage";
import ProviderDashboardPage from "./pages/provider/ProviderDashboardPage";
import ProviderLayout from "./pages/provider/ProviderLayout";
import ProviderManagePropertyPage from "./pages/provider/ProviderManagePropertyPage";
import ProviderPropertyFormPage from "./pages/provider/ProviderPropertyFormPage";
import ProviderPlaceholderPage from "./pages/provider/ProviderPlaceholderPage";
import ProviderPropertiesPage from "./pages/provider/ProviderPropertiesPage";
import ProviderListingsPage from "./pages/provider/ProviderListingsPage";
import ProviderListingFormPage from "./pages/provider/ProviderListingFormPage";
import ProviderListingPreviewPage from "./pages/provider/ProviderListingPreviewPage";
import ProviderEnquiriesPage from "./pages/provider/ProviderEnquiriesPage";
import ProviderEnquiryDetailPage from "./pages/provider/ProviderEnquiryDetailPage";
import AuthPage from "./pages/AuthPage";
import ProviderOnboardingPage from "./pages/ProviderOnboardingPage";
import RequireAuth from "./components/RequireAuth";
import { isExplicitDemoMode, isExplicitSupabaseMode, supabaseConfigured } from "./data/supabaseClient";
import { AuthProvider } from "./auth/AuthProvider";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PaymentCompletePage from "./pages/PaymentCompletePage";
import StudentBookingsPage from "./pages/StudentBookingsPage";
import ProviderBookingsPage from "./pages/provider/ProviderBookingsPage";
import {
  ProviderBackendDashboard,
  ProviderBackendListingForm,
  ProviderBackendListingPreview,
  ProviderBackendListings,
  ProviderBackendProperties,
  ProviderBackendPropertyDetail,
  ProviderBackendPropertyForm,
} from "./pages/provider/ProviderBackendPages";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  return null;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const isProviderRoute = pathname === "/provider" || pathname.startsWith("/provider/");
  const isAuthRoute = pathname.startsWith("/auth/");
  const isProviderOnboardingRoute = pathname === "/provider/onboarding";
  const isAdminRoute = pathname === "/admin";
  const isPaymentCompleteRoute = pathname === "/payment/complete";
  const explicitDemoMode = isExplicitDemoMode || (
    import.meta.env.DEV && !isExplicitSupabaseMode && !supabaseConfigured
  );

  if (isAdminRoute && (!isExplicitSupabaseMode || !supabaseConfigured)) {
    return <main className="auth-page"><section className="auth-card" role="alert"><h1>Administrator console unavailable</h1><p>Admin tools require an explicitly configured Supabase data mode and a server-authorized administrator role.</p></section></main>;
  }

  if (!explicitDemoMode && !isAuthRoute && !isProviderOnboardingRoute && !isAdminRoute && !isPaymentCompleteRoute) {
    return (
      <main className="auth-page">
        <section className="auth-card" role="alert">
          <p className="provider-eyebrow">PRODUCTION DATA SAFETY</p>
          <h1>Marketplace backend is not ready</h1>
          <p>
            This deployment will not fall back to browser demo listings. The Supabase
            repositories, production data policies, and project configuration must
            be completed before marketplace routes can be enabled.
          </p>
          {!supabaseConfigured && <p>Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for authentication.</p>}
          <Link className="provider-outline-button" to="/auth/login">Go to sign in <ArrowRight size={16} /></Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <ScrollToTop />
      {!isProviderRoute && <Navbar />}
      <Routes>
        <Route path="/auth/:mode" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthPage />} />
        <Route path="/payment/complete" element={<RequireAuth role="student"><PaymentCompletePage /></RequireAuth>} />
        <Route path="/student/bookings" element={<RequireAuth role="student"><StudentBookingsPage /></RequireAuth>} />
        <Route path="/provider/onboarding" element={<RequireAuth><ProviderOnboardingPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboardPage /></RequireAuth>} />
        <Route path="/" element={<HomePage />} />
        <Route path="/properties/:id" element={<PropertyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/provider" element={<RequireAuth role="provider"><ProviderLayout /></RequireAuth>}>
          <Route index element={isExplicitSupabaseMode ? <ProviderBackendDashboard /> : <ProviderDashboardPage />} />
          <Route path="properties" element={isExplicitSupabaseMode ? <ProviderBackendProperties /> : <ProviderPropertiesPage />} />
          <Route
            path="properties/new"
            element={isExplicitSupabaseMode ? <ProviderBackendPropertyForm /> : <ProviderPropertyFormPage />}
          />
          <Route
            path="properties/:propertyId/edit"
            element={isExplicitSupabaseMode ? <ProviderBackendPropertyForm /> : <ProviderPropertyFormPage />}
          />
          <Route
            path="properties/:propertyId"
            element={isExplicitSupabaseMode ? <ProviderBackendPropertyDetail /> : <ProviderManagePropertyPage />}
          />
          <Route path="listings" element={isExplicitSupabaseMode ? <ProviderBackendListings /> : <ProviderListingsPage />} />
          <Route path="listings/new" element={isExplicitSupabaseMode ? <ProviderBackendListingForm /> : <ProviderListingFormPage />} />
          <Route path="listings/:listingId/edit" element={isExplicitSupabaseMode ? <ProviderBackendListingForm /> : <ProviderListingFormPage />} />
          <Route path="listings/:listingId" element={isExplicitSupabaseMode ? <ProviderBackendListingPreview /> : <ProviderListingPreviewPage />} />
          <Route path="enquiries" element={<ProviderEnquiriesPage />} />
          <Route path="enquiries/:enquiryId" element={<ProviderEnquiryDetailPage />} />
          <Route path="bookings" element={<ProviderBookingsPage />} />
          <Route
            path="*"
            element={<ProviderPlaceholderPage page="not-found" />}
          />
        </Route>
        <Route
          path="*"
          element={
            <main className="not-found container">
              <span className="eyebrow">404 · A LITTLE LOST?</span>
              <h1>That page isn’t here.</h1>
              <p>Let’s find you somewhere better.</p>
              <Link className="button button-dark" to="/">
                Back to the stays <ArrowRight size={17} />
              </Link>
            </main>
          }
        />
      </Routes>
      {!isProviderRoute && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
