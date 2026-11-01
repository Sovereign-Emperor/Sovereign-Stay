import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AboutPage from "./pages/AboutPage";
import HomePage from "./pages/HomePage";
import PropertyPage from "./pages/PropertyPage";

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
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties/:id" element={<PropertyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<main className="not-found container"><span className="eyebrow">404 · A LITTLE LOST?</span><h1>That page isn’t here.</h1><p>Let’s find you somewhere better.</p><a className="button button-dark" href="/">Back to the stays <ArrowRight size={17} /></a></main>} />
      </Routes>
      <Footer />
    </>
  );
}
