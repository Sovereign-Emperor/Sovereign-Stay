import { useState } from "react";
import { ArrowDown, ArrowRight, ChevronDown, Compass, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import PropertyImage from "../components/PropertyImage";
import { useListingFilterOptions, useListingSearch } from "../hooks/useListings";
import { validatePriceRange } from "../utils/propertyFilters";
import { isExplicitSupabaseMode } from "../data/supabaseClient";

const initialFilters = {
  query: "",
  school: "",
  area: "",
  roomType: "",
  propertyType: "",
  availabilityStatus: "",
  minPrice: "",
  maxPrice: "",
  facility: "",
};

export default function HomePage() {
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState("recommended");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const priceError = validatePriceRange(filters);
  const {
    items: filteredProperties,
    total,
    hasNextPage,
    isLoading,
    isLoadingMore,
    error: listingsError,
    loadMore,
  } = useListingSearch(filters, sort);
  const { options, error: filterOptionsError } = useListingFilterOptions();

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="hero-section">
        <PropertyImage
          photoId="photo-1600607687939-ce8a6c25118c"
          width={2000}
          alt=""
          loading="eager"
          className="hero-photo"
          imageClassName="hero-photo-image"
        />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="hero-kicker"><span className="live-dot" /> MADE FOR CAMPUS LIFE <span className="kicker-line" /> KOFORIDUA, GHANA</div>
          <h1>Find a place<br />that feels like <em>yours.</em></h1>
          <p className="hero-copy">Good rooms. Clear prices. Right around campus.<br className="desktop-break" /> Your search for somewhere to belong starts here.</p>
          <a className="hero-scroll" href="#listings"><span><ArrowDown size={16} /></span> FIND YOUR PLACE</a>
          <div className="hero-stats">
            <div><strong>{options.totalListings ?? "…"}</strong><span>{isExplicitSupabaseMode ? "published places to explore" : "demo places to explore"}</span></div>
            <div><strong>1</strong><span>student community</span></div>
            <div><strong>0</strong><span>guesswork required</span></div>
          </div>
        </div>
        <div className="hero-caption"><span>01 — YOUR NEXT CHAPTER</span><span>PHOTO FOR ILLUSTRATION</span></div>
      </section>

      <section className="discovery-section section-pad" id="listings">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow section-eyebrow"><span className="tiny-spark">✳</span> THE GOOD KIND OF SEARCH</p>
              <h2>Find your <em>somewhere.</em></h2>
              <p className="section-intro">Explore student-friendly stays around Koforidua Technical University.</p>
            </div>
            <div className="campus-note"><span className="campus-icon"><MapPin size={17} /></span><span>Starting around<strong> KTU, Koforidua</strong></span><ChevronDown size={16} /></div>
          </div>

          <div className="search-bar">
            <Search size={20} className="search-icon" />
            <label className="sr-only" htmlFor="property-search">Search by property name or location</label>
            <input id="property-search" type="search" placeholder="Search a property name or Koforidua location…" value={filters.query} onChange={(event) => setFilter("query", event.target.value)} />
            <button type="button" className="button button-dark search-submit" onClick={() => document.getElementById("property-grid")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <span>Find a place</span><ArrowRight size={17} />
            </button>
          </div>

          <div className="filter-toolbar">
            <button className={`filter-toggle${mobileFiltersOpen ? " active" : ""}`} type="button" onClick={() => setMobileFiltersOpen((open) => !open)} aria-expanded={mobileFiltersOpen}>
              <SlidersHorizontal size={16} /> Filters <span className="filter-count">{hasFilters ? Object.values(filters).filter(Boolean).length : 5}</span>
            </button>
            <div className={`filter-options${mobileFiltersOpen ? " filter-options-open" : ""}`}>
              <label className="select-wrap"><span className="sr-only">Filter by school</span><select value={filters.school} onChange={(event) => setFilter("school", event.target.value)}><option value="">All schools</option>{options.schools.map((school) => <option key={school}>{school}</option>)}</select><ChevronDown size={14} /></label>
              <label className="select-wrap"><span className="sr-only">Filter by neighbourhood</span><select value={filters.area} onChange={(event) => setFilter("area", event.target.value)}><option value="">All neighbourhoods</option>{options.areas.map((area) => <option key={area}>{area}</option>)}</select><ChevronDown size={14} /></label>
              <label className="select-wrap"><span className="sr-only">Filter by room type</span><select value={filters.roomType} onChange={(event) => setFilter("roomType", event.target.value)}><option value="">Any room type</option>{options.roomTypes.map((room) => <option key={room}>{room}</option>)}</select><ChevronDown size={14} /></label>
              <label className="select-wrap"><span className="sr-only">Filter by accommodation type</span><select value={filters.propertyType} onChange={(event) => setFilter("propertyType", event.target.value)}><option value="">Any accommodation type</option>{options.propertyTypes.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={14} /></label>
              <label className="select-wrap"><span className="sr-only">Filter by room availability</span><select value={filters.availabilityStatus} onChange={(event) => setFilter("availabilityStatus", event.target.value)}><option value="">Any availability status</option>{options.availabilityStatuses.map((status) => <option key={status} value={status}>{status === "unknown" ? "Not confirmed" : status[0].toUpperCase() + status.slice(1)}</option>)}</select><ChevronDown size={14} /></label>
              <div className="price-filter" role="group" aria-label="Filter by room price in Ghana cedis">
                <span className="price-filter-currency">GHS</span>
                <label className="sr-only" htmlFor="minimum-price">{isExplicitSupabaseMode ? "Minimum room price in GHS" : "Minimum semester price in GHS"}</label>
                <input id="minimum-price" type="number" min="0" step="1" placeholder="Min" value={filters.minPrice} aria-invalid={Boolean(priceError)} aria-describedby={priceError ? "price-filter-error" : undefined} onChange={(event) => setFilter("minPrice", event.target.value)} />
                <span className="price-filter-divider" aria-hidden="true">–</span>
                <label className="sr-only" htmlFor="maximum-price">{isExplicitSupabaseMode ? "Maximum room price in GHS" : "Maximum semester price in GHS"}</label>
                <input id="maximum-price" type="number" min="0" step="1" placeholder="Max" value={filters.maxPrice} aria-invalid={Boolean(priceError)} aria-describedby={priceError ? "price-filter-error" : undefined} onChange={(event) => setFilter("maxPrice", event.target.value)} />
              </div>
              <label className="select-wrap"><span className="sr-only">Filter by facility</span><select value={filters.facility} onChange={(event) => setFilter("facility", event.target.value)}><option value="">Any facility</option>{options.facilities.map((facility) => <option key={facility}>{facility}</option>)}</select><ChevronDown size={14} /></label>
            </div>
            {hasFilters && <button className="clear-filters" type="button" onClick={() => setFilters(initialFilters)}>Clear all</button>}
          </div>
          {priceError && <p className="filter-error" id="price-filter-error" role="alert">{priceError}</p>}

          <div className="results-heading" id="property-grid" aria-live="polite">
            <div><p className="eyebrow">{priceError ? "PRICE FILTER NEEDS ATTENTION" : hasFilters ? "YOUR MATCHES" : "A GOOD PLACE TO START"}</p><h3>{priceError ? "Check your price range" : hasFilters ? `${total} ${total === 1 ? "place" : "places"} found` : "Places you might love"} {!priceError && <span className="result-count">{total.toString().padStart(2, "0")}</span>}</h3></div>
            <label className="sort-control">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="nearest">Closest to campus</option></select><ChevronDown size={14} /></label>
          </div>

          {(listingsError || filterOptionsError) && (
            <p className="filter-error" role="alert">
              We could not load some accommodation data. Please try again in a moment.
            </p>
          )}
          {priceError ? null : isLoading && filteredProperties.length === 0 ? (
            <p role="status">Loading demonstration listings…</p>
          ) : listingsError ? null : filteredProperties.length > 0 ? (
            <div className="property-grid">
              {filteredProperties.map((property) => <PropertyCard key={property.id} property={property} />)}
            </div>
          ) : (
            <div className="empty-state"><span className="empty-icon"><Compass size={23} /></span><h3>No places found just yet.</h3><p>Try a different search or clear a filter to see more stays.</p><button className="button button-dark" onClick={() => setFilters(initialFilters)}>Clear filters</button></div>
          )}
          {!priceError && hasNextPage && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="button button-dark"
                onClick={loadMore}
                disabled={isLoading || isLoadingMore}
              >
                {isLoadingMore ? "Loading more places…" : "Load more places"}
              </button>
            </div>
          )}

          <div className="demo-disclaimer"><Sparkles size={15} /><span>{isExplicitSupabaseMode ? "Listing details are provider-submitted and have not been independently verified. Confirm price and room availability directly before making a decision." : "Every listing, photo, price, and room count is for demonstration only. None is a real or verified accommodation offer."}</span></div>
        </div>
      </section>

      <section className="neighborhood-section">
        <div className="neighborhood-image"><PropertyImage photoId="photo-1511818966892-d7d671e672a2" width={1200} alt="Illustrative campus buildings in a green neighbourhood" className="neighborhood-photo" imageClassName="neighborhood-photo-image" /><span>PHOTO FOR ILLUSTRATION</span></div>
        <div className="neighborhood-copy">
          <p className="eyebrow"><span className="tiny-spark">✳</span> START CLOSE TO CAMPUS</p>
          <h2>A little closer<br />to <em>everything.</em></h2>
          <p>Start your search where student life happens. Browse stays near KTU, compare what matters, and get in touch when a place feels right.</p>
          <Link className="text-link" to="/about">Get to know Sovereign Stay <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="closing-cta">
        <div className="container closing-cta-inner">
          <div><p className="eyebrow">YOUR NEXT CHAPTER IS OUT THERE</p><h2>Find a place to<br /><em>call your own.</em></h2></div>
          <a className="button button-light" href="#listings">Explore the stays <ArrowRight size={17} /></a>
        </div>
      </section>
    </>
  );
}
