import { ArrowUpRight, Instagram, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { contactDetails } from "../config";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <Link className="brand footer-brand" to="/">
              <span className="brand-mark">S</span>
              <span>Sovereign<span className="brand-light">Stay</span></span>
            </Link>
            <p className="footer-tagline">Your next chapter starts with<br />a place that feels like yours.</p>
          </div>
          <div className="footer-links">
            <div><p className="footer-label">Explore</p><Link to="/">Find a place</Link><Link to="/about">Our story</Link></div>
            <div><p className="footer-label">Get in touch</p><a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a><span><MapPin size={15} /> Koforidua, Ghana</span></div>
          </div>
          <a className="footer-social" href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <Instagram size={18} /><ArrowUpRight size={15} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Sovereign Stay</span>
          <span>Made for student life in Ghana <span className="ghana-dot" aria-label="Ghana flag colors">●</span></span>
          <span className="demo-note">Demo experience · Listings are examples</span>
        </div>
      </div>
    </footer>
  );
}
