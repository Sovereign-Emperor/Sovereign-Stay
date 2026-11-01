import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

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
          <Link className="nav-cta" to="/#listings" onClick={closeMenu}>Explore stays <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>
    </header>
  );
}
