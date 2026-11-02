import { ArrowRight, MapPin, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/format";
import ProviderStatusBadge from "./ProviderStatusBadge";

export default function ProviderListingCard({ listing }) {
  const startingOffer = listing.roomOffers
    .filter((offer) => Number.isFinite(Number(offer.price)))
    .sort((first, second) => Number(first.price) - Number(second.price))[0];

  return (
    <article className="provider-listing-card">
      <header>
        <div>
          <p className="provider-eyebrow">LISTING · LOCAL DEMO</p>
          <h3>{listing.name}</h3>
        </div>
        <ProviderStatusBadge status={listing.status} />
      </header>
      <p className="provider-listing-card-location">
        <MapPin size={14} aria-hidden="true" />
        {listing.propertyName} · {listing.location}
      </p>
      <p className="provider-listing-card-description">{listing.description}</p>
      <div className="provider-listing-card-meta">
        <span>{listing.roomOffers.length} room {listing.roomOffers.length === 1 ? "offer" : "offers"}</span>
        <span>{startingOffer ? `${formatPrice(startingOffer.price)} / ${startingOffer.pricePeriod.replaceAll("_", " ")}` : "No pricing yet"}</span>
      </div>
      <footer>
        <span>{listing.lastUpdatedAt ? `Updated ${new Date(listing.lastUpdatedAt).toLocaleDateString()}` : "No update date recorded"}</span>
        <Link to={`/provider/listings/${listing.id}`} aria-label={`Preview ${listing.name}`}>
          Preview <ArrowRight size={14} />
        </Link>
        <Link to={`/provider/listings/${listing.id}/edit`} aria-label={`Edit ${listing.name}`}>
          Edit <Pencil size={14} />
        </Link>
      </footer>
    </article>
  );
}
