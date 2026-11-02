import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Pencil, Send, ArchiveRestore, Archive } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ListingImage from "../../components/ListingImage";
import ProviderStatusBadge from "../../components/provider/ProviderStatusBadge";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import {
  getProviderListingById,
  updateProviderListingStatus,
} from "../../services/providerListingService";
import { formatPrice } from "../../utils/format";

const periodLabel = (period) => ({
  monthly: "month",
  semester: "semester",
  academic_year: "academic year",
  other: "rental period",
}[period] ?? String(period ?? "").replaceAll("_", " "));

export default function ProviderListingPreviewPage() {
  const { listingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialLoad] = useState(() => {
    try {
      return {
        listing: getProviderListingById(DEMO_PROVIDER_ID, listingId),
        error: "",
      };
    } catch (cause) {
      return {
        listing: null,
        error: cause.message || "The listing could not be loaded from browser storage.",
      };
    }
  });
  const [listing, setListing] = useState(initialLoad.listing);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice ?? "");
  const [isSaving, setIsSaving] = useState(false);

  if (!listing) {
    const message = initialLoad.error || "This listing is not owned by the current demo provider.";
    return <div className="provider-page provider-empty-state" role={initialLoad.error ? "alert" : undefined}><h2>{initialLoad.error ? "Listing could not be loaded" : "Listing not found"}</h2><p>{message}</p><Link className="provider-primary-button" to="/provider/listings"><ArrowLeft size={16} /> Back to listings</Link></div>;
  }

  function changeStatus(status) {
    if (status === "archived" && !window.confirm(`Archive “${listing.name}”? Students will no longer see it in this browser's demo marketplace.`)) return;
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const updated = updateProviderListingStatus(DEMO_PROVIDER_ID, listing.id, status);
      setListing(updated);
      setNotice(status === "published"
        ? "Published in this browser's local demo marketplace only."
        : status === "archived"
          ? "Listing archived; existing enquiry history is preserved."
          : "Listing is now a draft and hidden from student discovery.");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="provider-page provider-listing-preview">
      <Link className="provider-back-link" to="/provider/listings"><ArrowLeft size={15} /> Back to listings</Link>
      {notice && <p className="provider-form-success" role="status">{notice}</p>}
      {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
      <header className="provider-listing-preview-header">
        <div>
          <p className="provider-eyebrow">LISTING PREVIEW · LOCAL DEMO</p>
          <h2>{listing.name}</h2>
          <p>{listing.propertyName} · {listing.location}</p>
        </div>
        <ProviderStatusBadge status={listing.status} />
      </header>
      <div className="provider-demo-banner" role="note"><p><strong>Preview only.</strong> Publishing makes this listing visible in the student marketplace in this browser. It is not publicly live, moderated, or verified.</p></div>
      <div className="provider-listing-preview-layout">
        <main>
          <section className="provider-listing-preview-section">
            <p className="provider-eyebrow">{listing.type} · {listing.school}</p>
            <h3>{listing.location}</h3>
            <p>{listing.description}</p>
            <dl className="provider-listing-preview-facts">
              <div><dt>Availability status</dt><dd>{listing.availabilityStatus === "unknown" ? "Not confirmed" : listing.availabilityStatus}</dd></div>
              <div><dt>Available from</dt><dd>{listing.availableFrom || "Not specified"}</dd></div>
              <div><dt>Last updated</dt><dd>{listing.lastUpdatedAt ? new Date(listing.lastUpdatedAt).toLocaleString() : "No update date recorded"}</dd></div>
            </dl>
          </section>
          <section className="provider-listing-preview-section">
            <h3>Property photos</h3>
            {listing.photos.length ? (
              <div className="provider-preview-photo-grid">
                {listing.photos.map((photo, index) => (
                  <div className="provider-preview-photo" key={photo.id ?? photo}>
                    <ListingImage
                      photo={photo}
                      alt={`${listing.propertyName}, demonstration photo ${index + 1}`}
                      className="provider-preview-photo-image"
                    />
                    {photo.isCover && <span>Cover photo</span>}
                  </div>
                ))}
              </div>
            ) : <p>No property photos have been added.</p>}
          </section>
          <section className="provider-listing-preview-section">
            <h3>Room offers</h3>
            {listing.roomOffers.length ? listing.roomOffers.map((offer) => (
              <article className="provider-preview-room" key={offer.id}>
                <header><strong>{offer.roomType}</strong><span>{offer.occupancy} {offer.occupancy === 1 ? "person" : "people"}</span></header>
                <p>{offer.description || "No room description provided."}</p>
                <strong>{formatPrice(offer.price)} / {periodLabel(offer.pricePeriod)}</strong>
                <small>{offer.availabilityStatus === "unknown" ? "Availability not confirmed" : `${offer.quantity} reported · ${offer.availabilityStatus}`}</small>
                {offer.deposit != null && <small>Deposit: {formatPrice(offer.deposit)}</small>}
                {offer.features && <p>{offer.features}</p>}
              </article>
            )) : <p>No room offers yet. Add one before publishing.</p>}
          </section>
          <section className="provider-listing-preview-section">
            <h3>Facilities and utilities</h3>
            <p>{listing.facilities.length ? listing.facilities.join(", ") : "No facilities specified."}</p>
            <p>{listing.utilities || "No utilities specified."}</p>
          </section>
          <section className="provider-listing-preview-section">
            <h3>House rules and contact</h3>
            <p>{listing.rules.length ? listing.rules.join(" · ") : "No house rules provided."}</p>
            <p>{listing.depositRequirements || "No deposit requirements specified."}</p>
            <p>Viewing preference: {listing.viewingPreference || "Not specified"}</p>
          </section>
        </main>
        <aside className="provider-listing-preview-actions">
          <h3>Listing actions</h3>
          <Link className="provider-outline-button" to={`/provider/listings/${listing.id}/edit`}><Pencil size={15} /> Edit listing</Link>
          {listing.status === "draft" && <button className="provider-primary-button" type="button" disabled={isSaving} onClick={() => changeStatus("published")}><Send size={15} /> {isSaving ? "Publishing…" : "Publish locally"}</button>}
          {listing.status === "published" && <>
            <Link className="provider-outline-button" to={`/properties/${listing.id}`}><ArrowUpRight size={15} /> Student view</Link>
            <button className="provider-outline-button" type="button" disabled={isSaving} onClick={() => changeStatus("draft")}>Unpublish to draft</button>
            <button className="provider-danger-button" type="button" disabled={isSaving} onClick={() => changeStatus("archived")}><Archive size={15} /> Archive listing</button>
          </>}
          {listing.status === "archived" && <button className="provider-primary-button" type="button" disabled={isSaving} onClick={() => changeStatus("draft")}><ArchiveRestore size={15} /> Reopen as draft</button>}
          <Link className="provider-subtle-link" to={`/provider/properties/${listing.propertyId}`}>View physical property</Link>
          <p>Last updated: {listing.lastUpdatedAt ? new Date(listing.lastUpdatedAt).toLocaleDateString() : "Not recorded"}</p>
        </aside>
      </div>
      <button className="provider-outline-button" type="button" onClick={() => navigate("/provider/listings")}>Return to listings</button>
    </div>
  );
}
