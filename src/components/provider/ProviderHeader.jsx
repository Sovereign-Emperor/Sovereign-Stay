import { Menu, UserRound, X } from "lucide-react";

/**
 * Dashboard title bar with the example provider identity.
 *
 * @param {{ title: string, isMenuOpen: boolean, onMenuClick: () => void }} props
 */
export default function ProviderHeader({ title, isMenuOpen, onMenuClick }) {
  return (
    <header className="provider-header">
      <button
        className="provider-mobile-menu"
        type="button"
        onClick={onMenuClick}
        aria-label={isMenuOpen ? "Close provider navigation" : "Open provider navigation"}
        aria-controls="provider-sidebar"
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <div className="provider-header-title">
        <p>PROVIDER WORKSPACE <span>· DEMO</span></p>
        <h1>{title}</h1>
      </div>
      <div className="provider-profile">
        <span className="provider-profile-avatar" aria-hidden="true"><UserRound size={18} /></span>
        <span><strong>Example provider</strong><small>Demo account</small></span>
      </div>
    </header>
  );
}
