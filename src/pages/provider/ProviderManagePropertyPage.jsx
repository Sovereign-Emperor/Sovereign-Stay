import { ArrowLeft, BedDouble, Building2, MapPin, Megaphone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ProviderListingDetailCard from "../../components/provider/ProviderListingDetailCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderPropertyById } from "../../services/providerDashboardService";
import PropertyImage from "../../components/PropertyImage";

export default function ProviderManagePropertyPage() {
  const { propertyId } = useParams();
  const property = getProviderPropertyById(DEMO_PROVIDER_ID, propertyId);

  if (!property) {
    return (
      <div className="provider-page provider-placeholder">
        <p className="provider-eyebrow">PROPERTY NOT FOUND</p>
        <h2>This example is not in your workspace.</h2>
        <p>The property may not exist or may belong to a different demo provider.</p>
        <Link className="provider-primary-button" to="/provider/properties">
          <ArrowLeft size={16} /> Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="provider-page provider-property-detail-page">
      <Link className="provider-back-link" to="/provider/properties">
        <ArrowLeft size={15} /> Back to properties
      </Link>

      <header className="provider-property-detail-heading">
        <div>
          <p className="provider-eyebrow">PROPERTY OVERVIEW · DEMO</p>
          <h2>{property.name}</h2>
          <p><MapPin size={16} aria-hidden="true" /> {property.location}</p>
        </div>
        <span className="provider-property-demo-state">Read-only demo</span>
      </header>

      <div className="provider-demo-banner" role="note">
        <p>
          <strong>Demonstration property.</strong> Names, photos, pricing, room counts, and listing
          statuses are illustrative. Property creation, editing, and saved changes are not enabled.
        </p>
      </div>

      <section className="provider-property-detail-summary" aria-label="Property information">
        <div
          className="provider-property-detail-gallery"
          role="group"
          aria-label="Illustrative property photos"
        >
          {property.photos.length > 0 ? (
            property.photos.slice(0, 4).map((photoId, index) => (
              <PropertyImage
                key={`${photoId}-${index}`}
                photoId={photoId}
                alt={`Illustrative photo ${index + 1} for ${property.name}`}
                width={index === 0 ? 1000 : 500}
              />
            ))
          ) : (
            <div className="provider-property-no-image">No illustrative photos in this demo.</div>
          )}
        </div>
        <div className="provider-property-detail-facts">
          <div>
            <span className="provider-detail-fact-icon"><Building2 size={18} /></span>
            <span><small>Property type</small><strong>{property.type}</strong></span>
          </div>
          <div>
            <span className="provider-detail-fact-icon"><Megaphone size={18} /></span>
            <span>
              <small>Associated listings</small>
              <strong>{property.listingCount}</strong>
            </span>
          </div>
          <div>
            <span className="provider-detail-fact-icon"><BedDouble size={18} /></span>
            <span>
              <small>Room offers</small>
              <strong>{property.roomOfferCount}</strong>
            </span>
          </div>
          <div className="provider-detail-location">
            <span className="provider-detail-fact-icon"><MapPin size={18} /></span>
            <span><small>Location</small><strong>{property.location}</strong></span>
          </div>
        </div>
      </section>

      <section className="provider-property-listings" aria-labelledby="property-listings-heading">
        <div className="provider-section-heading">
          <div>
            <p className="provider-eyebrow">ADVERTISEMENT RECORDS</p>
            <h2 id="property-listings-heading">Listings for this property</h2>
          </div>
          <span>{property.listingCount} {property.listingCount === 1 ? "listing" : "listings"}</span>
        </div>

        {property.listings.length ? (
          <div className="provider-listing-detail-grid">
            {property.listings.map((listing) => (
              <ProviderListingDetailCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="provider-empty-state">
            <Megaphone size={24} aria-hidden="true" />
            <h3>No listings are linked to this property</h3>
            <p>Listing creation is deferred and no changes can be saved here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
