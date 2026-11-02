import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  MapPin,
  Megaphone,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ProviderListingDetailCard from "../../components/provider/ProviderListingDetailCard";
import ProviderStoredImage from "../../components/provider/ProviderStoredImage";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import {
  deleteProviderProperty,
  getProviderPropertyById,
} from "../../services/providerDashboardService";
import PropertyImage from "../../components/PropertyImage";

function PropertyPhotos({ property }) {
  if (property.photos.length === 0) {
    return <div className="provider-property-no-image">No property photos have been added.</div>;
  }

  return property.photos.slice(0, 4).map((photo, index) => (
    photo.isLocal ? (
      <ProviderStoredImage
        key={photo.id}
        photo={photo}
        alt={`${photo.isCover ? "Cover photo" : `Property photo ${index + 1}`} for ${property.name}`}
      />
    ) : (
      <PropertyImage
        key={`${photo}-${index}`}
        photoId={photo}
        alt={`Illustrative photo ${index + 1} for ${property.name}`}
        width={index === 0 ? 1000 : 500}
      />
    )
  ));
}

export default function ProviderManagePropertyPage() {
  const { propertyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const dialogRef = useRef(null);
  const deleteButtonRef = useRef(null);
  let property;
  let propertyError = "";
  try {
    property = getProviderPropertyById(DEMO_PROVIDER_ID, propertyId);
  } catch (error) {
    propertyError = error.message;
  }

  useEffect(() => {
    if (!dialogOpen) return undefined;
    dialogRef.current?.focus();
  }, [dialogOpen]);

  function handleDialogKeyDown(event) {
    if (event.key === "Escape" && !isDeleting) {
      setDialogOpen(false);
      setTimeout(() => deleteButtonRef.current?.focus(), 0);
      return;
    }

    if (event.key !== "Tab") return;
    const buttons = dialogRef.current?.querySelectorAll("button:not(:disabled)");
    if (!buttons?.length) return;
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  }

  if (propertyError) {
    return (
      <div className="provider-page provider-placeholder" role="alert">
        <p className="provider-eyebrow">LOCAL STORAGE ERROR</p>
        <h2>Property details could not be loaded.</h2>
        <p>{propertyError}</p>
        <Link className="provider-primary-button" to="/provider/properties">
          <ArrowLeft size={16} /> Back to properties
        </Link>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="provider-page provider-placeholder">
        <p className="provider-eyebrow">PROPERTY NOT FOUND</p>
        <h2>This property is not in your workspace.</h2>
        <p>It may not exist or may belong to a different demo provider.</p>
        <Link className="provider-primary-button" to="/provider/properties">
          <ArrowLeft size={16} /> Back to properties
        </Link>
      </div>
    );
  }

  async function confirmDelete() {
    setIsDeleting(true);
    setDeleteError("");
    try {
      const result = await deleteProviderProperty(DEMO_PROVIDER_ID, property.id);
      navigate("/provider/properties", {
        state: {
          notice: `${property.name} was removed from this browser's demo workspace.`,
          warnings: result.warnings,
        },
      });
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="provider-page provider-property-detail-page">
      <Link className="provider-back-link" to="/provider/properties">
        <ArrowLeft size={15} /> Back to properties
      </Link>

      {location.state?.notice && (
        <div className="provider-form-success" role="status">
          <p>{location.state.notice}</p>
          {location.state.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}

      <header className="provider-property-detail-heading">
        <div>
          <p className="provider-eyebrow">PHYSICAL PROPERTY · {property.isDemo ? "EXAMPLE DATA" : "LOCAL DEMO"}</p>
          <h2>{property.name}</h2>
          <p><MapPin size={16} aria-hidden="true" /> {property.location}</p>
        </div>
        <div className="provider-property-detail-actions">
          <Link
            className="provider-outline-button"
            to={`/provider/properties/${property.id}/edit`}
          >
            <Pencil size={15} /> Edit property
          </Link>
          <button
            className="provider-danger-button"
            type="button"
            onClick={() => {
              setDeleteError("");
              setDialogOpen(true);
            }}
            aria-haspopup="dialog"
            ref={deleteButtonRef}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </header>

      <div className="provider-demo-banner" role="note">
        <p>
          <strong>Browser-local demonstration workspace.</strong> Saved property details and photos
          stay in this browser only. They are not connected to a provider account or backend.
          Listing and room-offer data remains separate.
        </p>
      </div>

      <section className="provider-property-detail-summary" aria-label="Property information">
        <div className="provider-property-detail-gallery" role="group" aria-label="Property photos">
          <PropertyPhotos property={property} />
        </div>
        <div className="provider-property-detail-facts">
          <div>
            <span className="provider-detail-fact-icon"><Building2 size={18} /></span>
            <span><small>Property type</small><strong>{property.type}</strong></span>
          </div>
          <div>
            <span className="provider-detail-fact-icon"><Megaphone size={18} /></span>
            <span><small>Associated listings</small><strong>{property.listingCount}</strong></span>
          </div>
          <div>
            <span className="provider-detail-fact-icon"><BedDouble size={18} /></span>
            <span><small>Room offers</small><strong>{property.roomOfferCount}</strong></span>
          </div>
          <div className="provider-detail-location">
            <span className="provider-detail-fact-icon"><MapPin size={18} /></span>
            <span><small>Location</small><strong>{property.location}</strong></span>
          </div>
        </div>
      </section>

      <section className="provider-property-information" aria-labelledby="property-information-heading">
        <div className="provider-section-heading">
          <div>
            <p className="provider-eyebrow">PROPERTY RECORD</p>
            <h2 id="property-information-heading">Information and location</h2>
          </div>
        </div>
        <dl>
          <div><dt>Description</dt><dd>{property.description || "No description provided."}</dd></div>
          <div><dt>Region</dt><dd>{property.region || "Not provided"}</dd></div>
          <div><dt>City or town</dt><dd>{property.city || "Not provided"}</dd></div>
          <div><dt>Area or neighbourhood</dt><dd>{property.area || "Not provided"}</dd></div>
          <div><dt>Street or address</dt><dd>{property.address || "Not provided"}</dd></div>
          <div><dt>Nearby institution</dt><dd>{property.institution || "Not provided"}</dd></div>
        </dl>
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
            <p>Create an advertisement and room options for this property when you are ready.</p>
          </div>
        )}
      </section>

      {dialogOpen && (
        <div className="provider-dialog-backdrop">
          <section
            className="provider-confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-property-title"
            aria-describedby="delete-property-description"
            tabIndex="-1"
            ref={dialogRef}
            onKeyDown={handleDialogKeyDown}
          >
            <p className="provider-eyebrow">DELETE PROPERTY</p>
            <h2 id="delete-property-title">Remove {property.name}?</h2>
            <p id="delete-property-description">
              This removes the property record and its locally stored photos from this browser.
              This action cannot be undone.
            </p>
            {property.listingCount > 0 && (
              <p className="provider-delete-dependency" role="note">
                This property has {property.listingCount} associated {property.listingCount === 1 ? "listing" : "listings"}
                {property.roomOfferCount > 0 ? ` and ${property.roomOfferCount} room ${property.roomOfferCount === 1 ? "offer" : "offers"}` : ""}.
                Handle those records first; they will not be deleted with the property.
              </p>
            )}
            {deleteError && <p className="provider-form-error-banner" role="alert">{deleteError}</p>}
            <div className="provider-dialog-actions">
              <button
                className="provider-outline-button"
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  deleteButtonRef.current?.focus();
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="provider-danger-button"
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting || property.listingCount > 0}
              >
                {isDeleting ? "Deleting…" : "Delete property"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
