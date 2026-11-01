import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ProviderHeader from "../../components/provider/ProviderHeader";
import ProviderSidebar from "../../components/provider/ProviderSidebar";

function getProviderPageTitle(pathname) {
  if (pathname === "/provider") return "Overview";
  if (pathname === "/provider/properties") return "Your properties";
  if (pathname.endsWith("/new")) return "Add a property";
  if (pathname.includes("/properties/")) return "Property overview";
  if (pathname.startsWith("/provider/enquiries")) return "Enquiries";
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
          <span>DEMONSTRATION ONLY · No account or data is saved</span>
        </footer>
      </div>
    </div>
  );
}
