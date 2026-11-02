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

export default function App() {
  const { pathname } = useLocation();
  const isProviderRoute = pathname === "/provider" || pathname.startsWith("/provider/");

  return (
    <>
      <ScrollToTop />
      {!isProviderRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties/:id" element={<PropertyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/provider" element={<ProviderLayout />}>
          <Route index element={<ProviderDashboardPage />} />
          <Route path="properties" element={<ProviderPropertiesPage />} />
          <Route
            path="properties/new"
            element={<ProviderPropertyFormPage />}
          />
          <Route
            path="properties/:propertyId/edit"
            element={<ProviderPropertyFormPage />}
          />
          <Route
            path="properties/:propertyId"
            element={<ProviderManagePropertyPage />}
          />
          <Route path="listings" element={<ProviderListingsPage />} />
          <Route path="listings/new" element={<ProviderListingFormPage />} />
          <Route path="listings/:listingId/edit" element={<ProviderListingFormPage />} />
          <Route path="listings/:listingId" element={<ProviderListingPreviewPage />} />
          <Route path="enquiries" element={<ProviderEnquiriesPage />} />
          <Route path="enquiries/:enquiryId" element={<ProviderEnquiryDetailPage />} />
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
