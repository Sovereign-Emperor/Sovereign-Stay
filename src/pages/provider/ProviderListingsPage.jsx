import { useState } from "react";
import { FileText, Plus, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import ProviderListingCard from "../../components/provider/ProviderListingCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderDashboard } from "../../services/providerDashboardService";

const statuses = ["draft", "published", "archived"];
const statusNames = { draft: "Draft", published: "Published", archived: "Archived" };

export default function ProviderListingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  let dashboard;
  try {
    dashboard = getProviderDashboard(DEMO_PROVIDER_ID);
  } catch (error) {
    return <div className="provider-page provider-empty-state" role="alert"><h2>Listings could not be loaded</h2><p>{error.message}</p></div>;
  }

  const allListings = dashboard.properties.flatMap((property) => property.listings);
  const filtered = allListings.filter((listing) => {
    const searchable = `${listing.name} ${listing.propertyName} ${listing.location}`.toLowerCase();
    return (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
      (!status || listing.status === status);
  });
  const clearFilters = () => { setQuery(""); setStatus(""); };

  return (
    <div className="provider-page">
      <header className="provider-page-intro">
        <div>
          <p className="provider-eyebrow">ADVERTISEMENT MANAGEMENT</p>
          <h2>Manage listings</h2>
          <p>Create multiple advertisements for properties you manage. Listing visibility is local to this browser demo.</p>
        </div>
        <Link className="provider-primary-button" to="/provider/listings/new"><Plus size={17} /> Create listing</Link>
      </header>
      <div className="provider-demo-banner" role="note">
        <p><strong>Local demo publishing.</strong> Published listings appear in this browser&apos;s student marketplace only. No listing is public, moderated, or verified by a server.</p>
      </div>
      <div className="provider-listing-filters">
        <label>
          Search listings
          <span><Search size={16} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Headline, property, or location" /></span>
        </label>
        <label>
          Lifecycle status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{statusNames[item]}</option>)}
          </select>
        </label>
        {(query || status) && <button className="provider-clear-filters" type="button" onClick={clearFilters}><X size={15} /> Clear filters</button>}
      </div>
      <p className="provider-listing-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "listing" : "listings"}</p>
      {filtered.length ? (
        <div className="provider-listing-grid">{filtered.map((listing) => <ProviderListingCard key={listing.id} listing={listing} />)}</div>
      ) : (
        <div className="provider-empty-state">
          <FileText size={24} aria-hidden="true" />
          <h3>{allListings.length ? "No listings match these filters" : "No listings yet"}</h3>
          <p>{allListings.length ? "Try another search or status." : "Create a listing for one of your properties to begin."}</p>
          {allListings.length ? <button className="provider-outline-button" type="button" onClick={clearFilters}>Clear filters</button> : <Link className="provider-primary-button" to="/provider/listings/new"><Plus size={16} /> Create listing</Link>}
        </div>
      )}
    </div>
  );
}
