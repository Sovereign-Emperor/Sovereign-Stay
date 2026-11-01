import { Building2, ClipboardList, LayoutDashboard, MessageSquareText, Plus, Store } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

/**
 * Provider workspace navigation for desktop and small screens.
 *
 * @param {{ isOpen: boolean, onNavigate: () => void }} props
 */
export default function ProviderSidebar({ isOpen, onNavigate }) {
  return (
    <aside
      id="provider-sidebar"
      className={`provider-sidebar${isOpen ? " provider-sidebar-open" : ""}`}
    >
      <Link className="provider-brand" to="/provider" onClick={onNavigate}>
        <span className="brand-mark">S</span>
        <span>Sovereign<span className="brand-light">Stay</span></span>
      </Link>
      <div className="provider-workspace-label">
        <span className="provider-workspace-icon"><Store size={16} /></span>
        <span><strong>Example workspace</strong><small>DEMO PROVIDER</small></span>
      </div>
      <nav className="provider-sidebar-nav" aria-label="Provider navigation">
        <p className="provider-nav-heading">WORKSPACE</p>
        <NavLink to="/provider" end onClick={onNavigate}>
          <LayoutDashboard size={17} /> Overview
        </NavLink>
        <NavLink to="/provider/properties" onClick={onNavigate}>
          <Building2 size={17} /> Properties
        </NavLink>
        <NavLink to="/provider/enquiries" onClick={onNavigate}>
          <MessageSquareText size={17} /> Enquiries
        </NavLink>
        <NavLink to="/provider/properties/new" onClick={onNavigate}>
          <Plus size={17} /> Add property
        </NavLink>
        <p className="provider-nav-heading provider-nav-heading-secondary">ACCOUNT</p>
        <Link to="/" onClick={onNavigate}>
          <ClipboardList size={17} /> Student marketplace
        </Link>
      </nav>
      <div className="provider-sidebar-note">
        <span className="provider-demo-dot" />
        Demo mode
        <p>Changes are not saved to an account or database.</p>
      </div>
    </aside>
  );
}
