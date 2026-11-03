import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ProviderHeader from "../../components/provider/ProviderHeader";
import ProviderSidebar from "../../components/provider/ProviderSidebar";
import { isExplicitSupabaseMode } from "../../data/supabaseClient";

function getProviderPageTitle(pathname) {
  if (pathname === "/provider") return "Overview";
  if (pathname === "/provider/properties") return "Your properties";
  if (pathname === "/provider/listings") return "Your listings";
  if (pathname === "/provider/listings/new") return "Create listing";
  if (pathname.startsWith("/provider/listings/") && pathname.endsWith("/edit")) return "Edit listing";
  if (pathname.startsWith("/provider/listings/")) return "Listing preview";
  if (pathname.endsWith("/new")) return "Add a property";
  if (pathname.endsWith("/edit")) return "Edit property";
  if (pathname.includes("/properties/")) return "Property overview";
  if (pathname.startsWith("/provider/enquiries")) return "Enquiries";
  if (pathname.startsWith("/provider/bookings")) return "Bookings";
  return "Provider workspace";
}

export default function ProviderLayout() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="provider-app-shell">
      <ProviderSidebar
        isOpen={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <button
          className="provider-sidebar-backdrop"
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close provider navigation"
        />
      )}
      <div className="provider-main-shell">
        <ProviderHeader
          title={getProviderPageTitle(pathname)}
          isMenuOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen((isOpen) => !isOpen)}
        />
        <main className="provider-main-content">
          <Outlet />
        </main>
        <footer className="provider-footer">
          <span>Sovereign Stay · Provider tools</span>
          <span>{isExplicitSupabaseMode ? "SUPABASE WORKSPACE · Role-based access enforced by the database" : "DEMONSTRATION ONLY · Data stays in this browser"}</span>
        </footer>
      </div>
    </div>
  );
}
