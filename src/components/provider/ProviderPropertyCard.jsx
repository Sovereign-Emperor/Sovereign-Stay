import { ArrowUpRight, BedDouble, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/format";
import PropertyImage from "../PropertyImage";
import ProviderStatusBadge from "./ProviderStatusBadge";

/**
 * A provider-facing summary of one demo listing.
 *
 * @param {{ property: object }} props Dashboard listing view model.
 */
export default function ProviderPropertyCard({ property }) {
  return (
    <article className="provider-property-card">
      <Link
        className="provider-property-image"
        to={`/properties/${property.id}`}
        aria-label={`Preview ${property.name}`}
      >
        <PropertyImage
          photoId={property.photos[0]}
          alt={`Illustrative accommodation photo for ${property.name}`}
          width={520}
          loading="lazy"
        />
        <span className="provider-image-demo-label">DEMO PHOTO</span>
      </Link>
      <div className="provider-property-content">
        <div className="provider-property-title-row">
          <div>
            <p className="provider-property-type">{property.type}</p>
            <h3>{property.name}</h3>
          </div>
          <ProviderStatusBadge status={property.status} />
        </div>
        <p className="provider-property-location">
          <MapPin size={15} aria-hidden="true" />
          {property.location}
        </p>
        <div className="provider-property-facts">
          <span>
            <BedDouble size={15} aria-hidden="true" />
            {property.roomOfferCount} room {property.roomOfferCount === 1 ? "offer" : "offers"}
          </span>
          <span>
            Starts at <strong>{formatPrice(property.startingPrice)}</strong> /{" "}
            {property.startingPricePeriod.replaceAll("_", " ")}
          </span>
        </div>
        <div className="provider-property-footer">
          <span>Example listing · not a live offer</span>
          <Link
            className="provider-manage-link"
            to={`/provider/properties/${property.id}`}
            aria-label={`Manage ${property.name}`}
          >
            Manage <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
