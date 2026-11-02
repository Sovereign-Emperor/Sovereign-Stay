import { useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { facilities as facilityOptions } from "../../data/properties";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderDashboard } from "../../services/providerDashboardService";
import {
  getProviderListingById,
  ROOM_AVAILABILITY_STATUSES,
  ROOM_PRICING_PERIODS,
  saveProviderListing,
  updateProviderListingStatus,
  validateListingValues,
} from "../../services/providerListingService";

const blankOffer = () => ({
  roomType: "",
  description: "",
  occupancy: "1",
  quantity: "1",
  price: "",
  period: "semester",
  deposit: "",
  availabilityStatus: "unknown",
  features: "",
});

function formValuesFromListing(listing) {
  return {
    name: listing.name,
    propertyId: listing.propertyId,
    description: listing.description,
    propertyType: listing.type,
    locationSummary: listing.location,
    institution: listing.school === "Not institution-specific" ? "" : listing.school,
    availableFrom: listing.availableFrom ?? "",
    availabilityStatus: listing.availabilityStatus ?? "unknown",
    facilityNames: listing.facilities ?? [],
    utilities: listing.utilities ?? "",
    houseRules: (listing.rules ?? []).join("\n"),
    depositRequirements: listing.depositRequirements ?? "",
    contactPreference: listing.contactPreference ?? "enquiry",
    viewingPreference: listing.viewingPreference ?? "",
  };
}

function offersFromListing(listing) {
  return listing.roomOffers.map((offer) => ({
    id: offer.id,
    roomType: offer.roomType ?? offer.roomTypeLabel ?? "",
    description: offer.description ?? "",
    occupancy: String(offer.occupancy ?? 1),
    quantity: String(offer.quantity ?? offer.exampleRoomCount ?? 0),
    price: String(offer.price ?? ""),
    period: offer.period ?? offer.pricePeriod ?? "semester",
    deposit: offer.deposit == null ? "" : String(offer.deposit),
    availabilityStatus: offer.availabilityStatus ?? "unknown",
    features: offer.features ?? "",
    createdAt: offer.createdAt,
  }));
}

export default function ProviderListingFormPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const submitLock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState({});
  const [offerErrors, setOfferErrors] = useState([]);
  const [offers, setOffers] = useState(() => {
    if (!listingId) return [];
    try {
      const listing = getProviderListingById(DEMO_PROVIDER_ID, listingId);
      return listing ? offersFromListing(listing) : [];
    } catch {
      return [];
    }
  });
  const [values, setValues] = useState(() => {
    if (!listingId) {
      try {
        return { propertyId: getProviderDashboard(DEMO_PROVIDER_ID)?.properties[0]?.id ?? "", facilityNames: [], availabilityStatus: "unknown", contactPreference: "enquiry" };
      } catch {
        return { propertyId: "", facilityNames: [], availabilityStatus: "unknown", contactPreference: "enquiry" };
      }
    }
    try {
      const listing = getProviderListingById(DEMO_PROVIDER_ID, listingId);
      return listing ? formValuesFromListing(listing) : {};
    } catch {
      return {};
    }
  });
  let properties = [];
  let loadError = "";
  let existingListing = null;
  try {
    properties = getProviderDashboard(DEMO_PROVIDER_ID)?.properties ?? [];
    existingListing = listingId ? getProviderListingById(DEMO_PROVIDER_ID, listingId) : null;
  } catch (error) {
    loadError = error.message;
  }

  if (loadError || (listingId && !existingListing)) {
    return (
      <div className="provider-page provider-empty-state" role="alert">
        <h2>{loadError ? "Listing could not be loaded" : "Listing not found"}</h2>
        <p>{loadError || "This listing is not owned by the current demo provider."}</p>
        <Link className="provider-primary-button" to="/provider/listings"><ArrowLeft size={16} /> Back to listings</Link>
      </div>
    );
  }

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function updateOffer(index, field, value) {
    setOffers((current) => current.map((offer, offerIndex) =>
      offerIndex === index ? { ...offer, [field]: value } : offer));
    setOfferErrors([]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitLock.current) return;
    const mode = event.nativeEvent.submitter?.value ?? "save";
    const nextErrors = validateListingValues(values, offers, {
      publishing: mode === "publish",
    });
    setErrors(nextErrors);
    setOfferErrors(nextErrors.roomOffers ?? []);
    setSubmitError("");
    if (Object.keys(nextErrors).length) {
      const fieldOrder = [
        "name",
        "propertyId",
        "propertyType",
        "institution",
        "locationSummary",
        "description",
        "availableFrom",
      ];
      const firstField = fieldOrder.find((field) => nextErrors[field]);
      const firstInvalid = firstField
        ? event.currentTarget.querySelector(`[data-listing-field="${firstField}"]`)
        : nextErrors.roomOffers
          ? event.currentTarget.querySelector("[data-room-offer-field]")
          : null;
      firstInvalid?.focus();
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const saved = saveProviderListing(DEMO_PROVIDER_ID, listingId, values, offers, {
        publishing: mode === "publish",
      });
      if (mode === "draft") {
        updateProviderListingStatus(DEMO_PROVIDER_ID, saved.id, "draft");
      } else if (mode === "publish") {
        updateProviderListingStatus(DEMO_PROVIDER_ID, saved.id, "published");
      }
      navigate(`/provider/listings/${saved.id}`, {
        state: { notice: mode === "publish" ? "Listing published in this browser's demo marketplace." : "Listing saved in this browser's demo workspace." },
      });
    } catch (error) {
      setSubmitError(error.message || "The listing could not be saved.");
      submitLock.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="provider-page provider-listing-form-page">
      <Link className="provider-back-link" to={existingListing ? `/provider/listings/${listingId}` : "/provider/listings"}><ArrowLeft size={15} /> Cancel and return to listings</Link>
      <header className="provider-page-intro">
        <div><p className="provider-eyebrow">LISTING SETUP · LOCAL DEMO</p><h2>{existingListing ? "Edit listing" : "Create a listing"}</h2><p>Write an accurate offer. Drafts remain private to this local provider workspace.</p></div>
      </header>
      <div className="provider-demo-banner" role="note"><p><strong>Keep property and listing details separate.</strong> This advertisement links to one physical property. Publishing only changes visibility in this browser&apos;s demo workspace.</p></div>
      <form className="provider-listing-form" onSubmit={handleSubmit} noValidate>
        <section className="provider-form-section" aria-labelledby="listing-details-heading">
          <div className="provider-form-section-heading"><div><h3 id="listing-details-heading">Listing details</h3><p>Give students clear information they can compare.</p></div></div>
          <div className="provider-form-grid">
            <label className="provider-form-field provider-form-field-wide">Listing headline <span aria-hidden="true">*</span><input data-listing-field="name" required value={values.name ?? ""} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "listing-name-error" : undefined} />{errors.name && <span id="listing-name-error" className="provider-form-error">{errors.name}</span>}</label>
            <label className="provider-form-field provider-form-field-wide">Physical property <span aria-hidden="true">*</span>
              <select data-listing-field="propertyId" required value={values.propertyId ?? ""} onChange={(event) => updateField("propertyId", event.target.value)} aria-invalid={Boolean(errors.propertyId)} aria-describedby={errors.propertyId ? "listing-property-error" : undefined}>
                <option value="">Choose a property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name} · {property.location}</option>)}
              </select>{errors.propertyId && <span id="listing-property-error" className="provider-form-error">{errors.propertyId}</span>}
            </label>
            <label className="provider-form-field">Accommodation category <span aria-hidden="true">*</span>
              <select data-listing-field="propertyType" required value={values.propertyType ?? ""} onChange={(event) => updateField("propertyType", event.target.value)} aria-invalid={Boolean(errors.propertyType)} aria-describedby={errors.propertyType ? "listing-type-error" : undefined}>
                <option value="">Choose a category</option>{["Hostel", "Apartment", "Shared apartment", "Private room", "Guest house", "Other"].map((item) => <option key={item}>{item}</option>)}
              </select>{errors.propertyType && <span id="listing-type-error" className="provider-form-error">{errors.propertyType}</span>}
            </label>
            <label className="provider-form-field">Nearby institution <span aria-hidden="true">*</span><input data-listing-field="institution" required value={values.institution ?? ""} onChange={(event) => updateField("institution", event.target.value)} placeholder="e.g. Koforidua Technical University" aria-invalid={Boolean(errors.institution)} aria-describedby={errors.institution ? "listing-institution-error" : "institution-hint"} /><small id="institution-hint">Enter an institution name or “Not institution-specific”.</small>{errors.institution && <span id="listing-institution-error" className="provider-form-error">{errors.institution}</span>}</label>
            <label className="provider-form-field provider-form-field-wide">Location summary <span aria-hidden="true">*</span><input data-listing-field="locationSummary" required value={values.locationSummary ?? ""} onChange={(event) => updateField("locationSummary", event.target.value)} placeholder="Neighbourhood, city" aria-invalid={Boolean(errors.locationSummary)} aria-describedby={errors.locationSummary ? "listing-location-error" : undefined} />{errors.locationSummary && <span id="listing-location-error" className="provider-form-error">{errors.locationSummary}</span>}</label>
            <label className="provider-form-field provider-form-field-wide">Description <span aria-hidden="true">*</span><textarea data-listing-field="description" required rows="5" value={values.description ?? ""} onChange={(event) => updateField("description", event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "listing-description-error" : undefined} />{errors.description && <span id="listing-description-error" className="provider-form-error">{errors.description}</span>}</label>
          </div>
        </section>

        <section className="provider-form-section" aria-labelledby="listing-availability-heading">
          <div className="provider-form-section-heading"><div><h3 id="listing-availability-heading">Availability and facilities</h3><p>Do not mark rooms as available unless the details have been checked.</p></div></div>
          <div className="provider-form-grid">
            <label className="provider-form-field">Availability status
              <select value={values.availabilityStatus ?? "unknown"} onChange={(event) => updateField("availabilityStatus", event.target.value)}>{ROOM_AVAILABILITY_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>
            </label>
            <label className="provider-form-field">Available from (optional)<input data-listing-field="availableFrom" type="date" value={values.availableFrom ?? ""} onChange={(event) => updateField("availableFrom", event.target.value)} aria-invalid={Boolean(errors.availableFrom)} aria-describedby={errors.availableFrom ? "available-date-error" : undefined} />{errors.availableFrom && <span id="available-date-error" className="provider-form-error">{errors.availableFrom}</span>}</label>
            <label className="provider-form-field provider-form-field-wide">Included utilities<textarea rows="2" value={values.utilities ?? ""} onChange={(event) => updateField("utilities", event.target.value)} placeholder="e.g. Water, Wi-Fi (only if confirmed)" /></label>
            <fieldset className="provider-listing-facilities provider-form-field-wide">
              <legend>Property facilities and amenities</legend>
              <div>{facilityOptions.map(({ label }) => <label key={label}><input type="checkbox" checked={(values.facilityNames ?? []).includes(label)} onChange={(event) => updateField("facilityNames", event.target.checked ? [...(values.facilityNames ?? []), label] : (values.facilityNames ?? []).filter((item) => item !== label))} />{label}</label>)}</div>
            </fieldset>
          </div>
        </section>

        <section className="provider-form-section" aria-labelledby="room-offers-heading">
          <div className="provider-form-section-heading"><div><h3 id="room-offers-heading">Room offers and pricing</h3><p>Add one or more room types. A published listing needs at least one valid offer.</p></div><button className="provider-outline-button" type="button" onClick={() => setOffers((current) => [...current, blankOffer()])}><Plus size={15} /> Add room offer</button></div>
          {offerErrors.length > 0 && <div className="provider-form-error-banner" id="room-offers-errors" role="alert"><strong>Check room offer details</strong><ul>{offerErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          {offers.length === 0 ? <p className="provider-listing-no-offers">No room offers added. You can save a draft now and add prices later.</p> : offers.map((offer, index) => (
            <fieldset className="provider-room-offer-editor" key={offer.id ?? `new-room-${index}`}>
              <legend>Room offer {index + 1}</legend>
              <button className="provider-remove-room-offer" type="button" aria-label={`Remove room offer ${index + 1}`} onClick={() => setOffers((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
              <div className="provider-form-grid">
                <label className="provider-form-field">Room type <span aria-hidden="true">*</span><input data-room-offer-field required value={offer.roomType} onChange={(event) => updateOffer(index, "roomType", event.target.value)} placeholder="e.g. Single room" aria-invalid={offerErrors.some((item) => item.includes(`Room offer ${index + 1}: enter a room type`))} aria-describedby={offerErrors.length ? "room-offers-errors" : undefined} /></label>
                <label className="provider-form-field">Occupancy <span aria-hidden="true">*</span><input required type="number" min="1" step="1" value={offer.occupancy} onChange={(event) => updateOffer(index, "occupancy", event.target.value)} aria-invalid={!Number.isInteger(Number(offer.occupancy)) || Number(offer.occupancy) < 1} aria-describedby={offerErrors.length ? "room-offers-errors" : undefined} /></label>
                <label className="provider-form-field">Rooms reported <span aria-hidden="true">*</span><input required type="number" min="0" step="1" value={offer.quantity} onChange={(event) => updateOffer(index, "quantity", event.target.value)} aria-invalid={!Number.isInteger(Number(offer.quantity)) || Number(offer.quantity) < 0} aria-describedby={offerErrors.length ? "room-offers-errors" : undefined} /></label>
                <label className="provider-form-field">Price (GHS) <span aria-hidden="true">*</span><input required type="number" min="0.01" step="0.01" value={offer.price} onChange={(event) => updateOffer(index, "price", event.target.value)} aria-invalid={!Number.isFinite(Number(offer.price)) || Number(offer.price) <= 0} aria-describedby={offerErrors.length ? "room-offers-errors" : undefined} /></label>
                <label className="provider-form-field">Rental period <span aria-hidden="true">*</span><select required value={offer.period} onChange={(event) => updateOffer(index, "period", event.target.value)} aria-describedby={offerErrors.length ? "room-offers-errors" : undefined}>{ROOM_PRICING_PERIODS.map((period) => <option key={period} value={period}>{period.replaceAll("_", " ")}</option>)}</select></label>
                <label className="provider-form-field">Deposit (GHS, optional)<input type="number" min="0" step="0.01" value={offer.deposit} onChange={(event) => updateOffer(index, "deposit", event.target.value)} /></label>
                <label className="provider-form-field">Room availability<select value={offer.availabilityStatus} onChange={(event) => updateOffer(index, "availabilityStatus", event.target.value)}>{ROOM_AVAILABILITY_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>
                <label className="provider-form-field provider-form-field-wide">Room description<textarea rows="2" value={offer.description} onChange={(event) => updateOffer(index, "description", event.target.value)} /></label>
                <label className="provider-form-field provider-form-field-wide">Room features<textarea rows="2" value={offer.features} onChange={(event) => updateOffer(index, "features", event.target.value)} placeholder="e.g. Furnished, private bathroom" /></label>
              </div>
            </fieldset>
          ))}
        </section>

        <section className="provider-form-section" aria-labelledby="listing-rules-heading">
          <div className="provider-form-section-heading"><div><h3 id="listing-rules-heading">House rules and contact</h3><p>Share expectations and how students can follow up.</p></div></div>
          <div className="provider-form-grid">
            <label className="provider-form-field provider-form-field-wide">House rules<textarea rows="3" value={values.houseRules ?? ""} onChange={(event) => updateField("houseRules", event.target.value)} placeholder="One rule per line" /></label>
            <label className="provider-form-field provider-form-field-wide">Deposit requirements<textarea rows="2" value={values.depositRequirements ?? ""} onChange={(event) => updateField("depositRequirements", event.target.value)} /></label>
            <label className="provider-form-field">Preferred contact method<select value={values.contactPreference ?? "enquiry"} onChange={(event) => updateField("contactPreference", event.target.value)}><option value="enquiry">Local enquiry form</option><option value="phone">Phone follow-up</option><option value="either">Either</option></select></label>
            <label className="provider-form-field">Viewing preferences<textarea rows="2" value={values.viewingPreference ?? ""} onChange={(event) => updateField("viewingPreference", event.target.value)} placeholder="e.g. Weekday afternoons by arrangement" /></label>
          </div>
        </section>
        {submitError && <p className="provider-form-error-banner" role="alert">{submitError}</p>}
        <div className="provider-listing-form-actions">
          <Link className="provider-outline-button" to={existingListing ? `/provider/listings/${listingId}` : "/provider/listings"}>Cancel</Link>
          <button className="provider-outline-button" type="submit" value="draft" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save as draft"}</button>
          {existingListing?.status !== "published" && <button className="provider-primary-button" type="submit" value="publish" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save and publish locally"}</button>}
          {existingListing?.status === "published" && <button className="provider-primary-button" type="submit" value="save" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</button>}
        </div>
      </form>
    </div>
  );
}
