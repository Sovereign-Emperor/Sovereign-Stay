import { useState } from "react";
import { ArrowUpRight, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import PropertyImage from "./PropertyImage";
import { formatPrice } from "../utils/format";

/**
 * A reusable summary card linking one demonstration property to its detail page.
 *
 * @param {{ property: import("../data/properties").properties[number] }} props
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
          <PropertyImage
            photoId={property.photos[0]}
            alt={`Illustrative accommodation photo for ${property.name}`}
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
        <span className="photo-note-pill">ILLUSTRATIVE PHOTO</span>
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
          <span>Approx. {property.distanceKm} km to KTU</span>
          <span>{property.roomType}</span>
        </div>
        <p className="example-availability">Example room count: {property.availableRooms}</p>
        <div className="property-card-footer">
          <p><strong>{formatPrice(property.price)}</strong><span> / semester · example</span></p>
          <Link className="card-link" to={`/properties/${property.id}`} aria-label={`See details for ${property.name}`}>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
