import { ArrowUpRight, BedDouble, MapPin, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/format";
import PropertyImage from "../PropertyImage";
import ProviderStoredImage from "./ProviderStoredImage";
import ProviderStatusBadge from "./ProviderStatusBadge";

/**
 * A provider-facing summary of one physical demo property and its listings.
 *
 * @param {{ property: object }} props Aggregated property view model.
 */
export default function ProviderPropertyCard({ property }) {
  return (
    <article className="provider-property-card">
      <Link
        className="provider-property-image"
        to={`/provider/properties/${property.id}`}
        aria-label={`View details for ${property.name}`}
      >
        {property.photos[0] ? (
          property.photos[0].isLocal ? (
            <ProviderStoredImage
              photo={property.photos[0]}
              alt={`Property photo for ${property.name}`}
            />
          ) : (
            <PropertyImage
              photoId={property.photos[0]}
              alt={`Illustrative accommodation photo for ${property.name}`}
              width={520}
              loading="lazy"
            />
          )
        ) : (
          <span className="provider-property-no-image">No property photo</span>
        )}
        <span className="provider-image-demo-label">{property.isDemo ? "DEMO PROPERTY" : "LOCAL DEMO"}</span>
      </Link>
      <div className="provider-property-content">
        <div className="provider-property-title-row">
          <div>
            <p className="provider-property-type">{property.type}</p>
            <h3>{property.name}</h3>
          </div>
          <div className="provider-property-statuses" aria-label="Listing statuses">
            {property.statuses.map((status) => (
              <ProviderStatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
        <p className="provider-property-location">
          <MapPin size={15} aria-hidden="true" />
          {property.location}
        </p>
        <div className="provider-property-facts">
          <span>
            <Megaphone size={15} aria-hidden="true" />
            {property.listingCount} {property.listingCount === 1 ? "listing" : "listings"}
          </span>
          <span className="provider-property-room-count">
            <BedDouble size={15} aria-hidden="true" />
            {property.roomOfferCount} room {property.roomOfferCount === 1 ? "offer" : "offers"}
          </span>
        </div>
        <div className="provider-property-price">
          {property.startingPrice === null ? (
            <span>
              {property.roomOfferCount > 0
                ? "See room offers for pricing"
                : "No room pricing listed"}
            </span>
          ) : (
            <span>
              Starts at <strong>{formatPrice(property.startingPrice)}</strong> /{" "}
              {property.startingPricePeriod.replaceAll("_", " ")}
            </span>
          )}
        </div>
        <div className="provider-property-footer">
          <span>{property.isDemo ? "Example property · demo data" : "Saved in this browser"}</span>
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
