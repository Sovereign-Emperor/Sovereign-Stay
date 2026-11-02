import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { signOut } from "../services/authService";

export default function Navbar() {
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const closeMenu = () => setMenuOpen(false);

  async function handleSignOut() {
    try {
      await signOut();
      closeMenu();
    } catch (error) {
      setAuthError(error.message || "You could not be signed out.");
    }
  }

  return (
    <header className="site-header">
      <nav className="nav-shell container" aria-label="Main navigation">
        <Link className="brand" to="/" onClick={closeMenu} aria-label="Sovereign Stay home">
          <span className="brand-mark">S</span>
          <span>Sovereign<span className="brand-light">Stay</span></span>
        </Link>
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div className={`nav-links${menuOpen ? " nav-links-open" : ""}`}>
          <NavLink to="/" end onClick={closeMenu}>Find a place</NavLink>
          <NavLink to="/about" onClick={closeMenu}>About us</NavLink>
          <NavLink to="/provider" onClick={closeMenu}>For providers</NavLink>
          {auth.roles.includes("admin") && <Link to="/admin" onClick={closeMenu}>Administration</Link>}
          {auth.user
            ? <button className="nav-account-action" type="button" onClick={handleSignOut}>Sign out</button>
            : <Link to="/auth/login" onClick={closeMenu}>Sign in</Link>}
          <Link className="nav-cta" to="/#listings" onClick={closeMenu}>Explore stays <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>
      {authError && <p className="nav-auth-error" role="alert">{authError}</p>}
    </header>
  );
}
