import { useState } from "react";
import { ArrowUpRight, Heart, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { imageUrl } from "../data/properties";
import { formatPrice } from "../utils/format";

export default function PropertyCard({ property }) {
  const [saved, setSaved] = useState(false);

  return (
    <article className="property-card">
      <div className="property-card-image-wrap">
        <Link
          to={`/properties/${property.id}`}
          className="property-card-image-link"
          aria-label={`View ${property.name}`}
        >
          <img
            className="property-card-image"
            src={imageUrl(property.photos[0], 760)}
            alt={`${property.name} accommodation`}
            loading="lazy"
          />
        </Link>
        <span className="availability-pill">{property.availableRooms} rooms left</span>
        <button
          type="button"
          className={`save-button${saved ? " is-saved" : ""}`}
          aria-label={saved ? `Unsave ${property.name}` : `Save ${property.name}`}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        {property.featured && <span className="featured-pill">Popular</span>}
      </div>
      <div className="property-card-content">
        <div className="property-card-heading">
          <div>
            <p className="eyebrow">{property.type}</p>
            <h3>
              <Link to={`/properties/${property.id}`}>{property.name}</Link>
            </h3>
          </div>
          <span className="rating"><Star size={14} fill="currentColor" /> {property.rating}</span>
        </div>
        <p className="property-location"><MapPin size={15} />{property.location}</p>
        <div className="property-meta">
          <span>{property.distanceKm} km to KTU</span>
          <span>{property.roomType}</span>
        </div>
        <div className="property-card-footer">
          <p><strong>{formatPrice(property.price)}</strong><span> / semester</span></p>
          <Link className="card-link" to={`/properties/${property.id}`} aria-label={`See details for ${property.name}`}>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
