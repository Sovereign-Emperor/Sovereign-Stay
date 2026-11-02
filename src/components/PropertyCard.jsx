import { useState } from "react";
import { ArrowUpRight, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import ListingImage from "./ListingImage";
import { formatPrice } from "../utils/format";

/**
 * A reusable summary card linking one demonstration property to its detail page.
 *
 * @param {{ property: import("../utils/listingViewModel").ListingViewModel }} props
 */
export default function PropertyCard({ property }) {
  // Saved state is intentionally temporary until the product has user accounts.
  const [saved, setSaved] = useState(false);

  return (
    <article className="property-card">
      <div className="property-card-image-wrap">
        <Link
          to={`/properties/${property.id}`}
          className="property-card-image-link"
          aria-label={`View ${property.name}`}
        >
          <ListingImage
            photo={property.photos[0]}
            alt={`Accommodation photo for ${property.name}`}
            width={760}
            loading="lazy"
            className="property-card-image"
          />
        </Link>
        <span className="demo-pill">DEMO LISTING</span>
        <button
          type="button"
          className={`save-button${saved ? " is-saved" : ""}`}
          aria-label={saved ? `Unsave ${property.name}` : `Save ${property.name}`}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="photo-note-pill">{property.photos[0]?.isLocal ? "LOCAL DEMO PHOTO" : "PHOTO FOR ILLUSTRATION"}</span>
      </div>
      <div className="property-card-content">
        <div className="property-card-heading">
          <div>
            <p className="eyebrow">{property.type}</p>
            <h3>
              <Link to={`/properties/${property.id}`}>{property.name}</Link>
            </h3>
          </div>
        </div>
        <p className="property-location"><MapPin size={15} />{property.location}</p>
        <div className="property-meta">
          <span>{Number.isFinite(property.distanceKm) ? `Approx. ${property.distanceKm} km to KTU` : "Distance not specified"}</span>
          <span>{property.roomType}</span>
        </div>
        <p className="example-availability">
          {property.availabilityStatus === "unknown"
            ? "Availability not confirmed"
            : `${property.availableRooms} reported room${property.availableRooms === 1 ? "" : "s"} · ${property.availabilityStatus}`}
        </p>
        <div className="property-card-footer">
          <p>{property.price != null ? <><strong>{formatPrice(property.price)}</strong><span> / {String(property.pricePeriod ?? "period").replaceAll("_", " ")} · demo</span></> : <strong>Price not provided</strong>}</p>
          <Link className="card-link" to={`/properties/${property.id}`} aria-label={`See details for ${property.name}`}>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
