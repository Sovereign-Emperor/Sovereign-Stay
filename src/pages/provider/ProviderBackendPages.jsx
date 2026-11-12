import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProviderWorkspaceRecords, saveProviderProperty, saveProviderListing, submitProviderListingForReview, archiveProviderListing, uploadListingMedia } from "../../data/supabaseProviderRepository";

const EMPTY_PROPERTY = { name: "", type: "", description: "", region: "", city: "", area: "", address: "" };
const EMPTY_OFFER = { roomType: "", description: "", occupancy: "1", quantity: "1", price: "", period: "semester", deposit: "", availabilityStatus: "unknown", features: "" };
const one = (value) => Array.isArray(value) ? value[0] ?? null : value ?? null;

export function ProviderBackendDashboard() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setRecords(await getProviderWorkspaceRecords()); setError(""); }
    catch (cause) { setError(cause.message || "Provider workspace could not be loaded."); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const listings = records?.listings ?? [];
  const properties = records?.properties ?? [];
  const enquiries = records?.enquiries ?? [];
  const bookings = records?.bookings ?? [];
  const providerReportedRooms = listings.filter(({ status }) => status === "published")
    .flatMap(({ listing_rooms: rooms = [] }) => rooms)
    .filter((room) => ["available", "limited"].includes(room.availability_status) &&
      Number(room.available_quantity ?? 0) > 0).length;
  const recentActivity = [
    ...listings.map((listing) => ({ id: `listing-${listing.id}`, label: `Listing “${listing.name}” updated`, date: listing.updated_at })),
    ...enquiries.map((enquiry) => ({ id: `enquiry-${enquiry.id}`, label: `New enquiry for listing ${enquiry.listing_id}`, date: enquiry.created_at })),
    ...bookings.map((booking) => ({ id: `booking-${booking.id}`, label: `Booking request changed to ${booking.status}`, date: booking.created_at })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  const metrics = [
    ["Properties", properties.length],
    ["Listings", listings.length],
    ["Published", listings.filter(({ status }) => status === "published").length],
    ["Drafts", listings.filter(({ status }) => status === "draft").length],
    ["Provider-reported room offers", providerReportedRooms],
    ["New enquiries", enquiries.filter(({ status }) => status === "new").length],
    ["Booking requests", bookings.filter(({ status }) => status === "requested").length],
  ];
  return <div className="provider-page">
    <header className="provider-welcome-row"><div><p className="provider-eyebrow">SUPABASE PROVIDER WORKSPACE</p><h2>Manage your accommodation</h2><p>Records below are loaded from your authorized provider business.</p></div><Link className="provider-primary-button" to="/provider/properties/new">Add property</Link></header>
    <div className="provider-demo-banner"><p><strong>Server-enforced access.</strong> Database membership and row policies scope records. New listing submissions require moderator approval before student discovery.</p></div>
    {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
    <section className="admin-metrics">{metrics.map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</section>
    {!records?.workspaces.length && records && <div className="provider-empty-state"><h3>No provider business is linked to this account</h3><p>Complete provider onboarding before creating properties.</p><Link className="provider-primary-button" to="/provider/onboarding">Set up provider workspace</Link></div>}
    <section className="provider-section"><div className="provider-section-heading"><h2>Your properties</h2><Link className="provider-subtle-link" to="/provider/properties">Manage properties</Link></div>
      {properties.length ? <div className="provider-listing-grid">{properties.slice(0, 6).map((property) => <article className="provider-listing-card" key={property.id}><h3>{property.name}</h3><p>{one(property.locations)?.label ?? property.property_type}</p><Link to={`/provider/properties/${property.id}`}>Open property</Link></article>)}</div> : <p>No properties have been added to this provider business.</p>}
    </section>
    <section className="provider-quick-actions"><div className="provider-quick-action-grid"><Link to="/provider/listings/new"><strong>Create a listing</strong><small>Save a draft or request moderator review.</small></Link><Link to="/provider/enquiries"><strong>Open enquiry inbox</strong><small>Review messages associated with your listings.</small></Link><Link to="/provider/bookings"><strong>Manage booking requests</strong><small>Accept or reject student requests.</small></Link></div></section>
    <section className="provider-section"><div className="provider-section-heading"><h2>Recent activity</h2></div>
      {recentActivity.length ? <ul className="provider-activity-list">{recentActivity.map((item) => <li key={item.id}><span>{item.label}</span><time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time></li>)}</ul> : <p>No recent activity is recorded for this workspace.</p>}
    </section>
  </div>;
}

export function ProviderBackendProperties() {
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setProperties((await getProviderWorkspaceRecords()).properties); setError(""); }
    catch (cause) { setError(cause.message || "Properties could not be loaded."); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <div className="provider-page">
    <header className="provider-page-intro"><div><p className="provider-eyebrow">SUPABASE RECORDS</p><h2>Your properties</h2><p>Each physical property can hold multiple advertisements.</p></div><Link className="provider-primary-button" to="/provider/properties/new">Add property</Link></header>
    {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
    {properties.length ? <div className="provider-listing-grid">{properties.map((property) => <article className="provider-listing-card" key={property.id}><h3>{property.name}</h3><p>{one(property.locations)?.label ?? property.property_type}</p><p>{property.verification_status} · property status</p><Link to={`/provider/properties/${property.id}`}>Manage property</Link></article>)}</div> : !error && <div className="provider-empty-state"><h3>No properties yet</h3><Link className="provider-primary-button" to="/provider/properties/new">Add a property</Link></div>}
  </div>;
}

export function ProviderBackendPropertyForm() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY_PROPERTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!propertyId) return;
    let active = true;
    getProviderWorkspaceRecords().then(({ properties }) => {
      const property = properties.find(({ id }) => id === propertyId);
      if (!property) throw new Error("Property not found in your provider business.");
      const location = one(property.locations) ?? {};
      if (active) setValues({ name: property.name, type: property.property_type, description: property.description ?? "", region: location.region ?? "", city: location.city ?? "", area: location.area ?? "", address: property.address ?? "" });
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [propertyId]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const id = await saveProviderProperty(values, propertyId ?? null);
      navigate(`/provider/properties/${id}`, { replace: true });
    } catch (cause) { setError(cause.message || "Property could not be saved."); }
    finally { setBusy(false); }
  }
  return <div className="provider-page"><Link to="/provider/properties">← Properties</Link><header className="provider-page-intro"><div><p className="provider-eyebrow">SUPABASE PROVIDER BUSINESS</p><h2>{propertyId ? "Edit property" : "Add property"}</h2><p>Property ownership is determined by your authenticated business membership.</p></div></header>
    {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
    <form className="provider-property-form" onSubmit={submit}>{[
      ["name", "Property name"], ["type", "Accommodation type"], ["region", "Region"], ["city", "City or town"], ["area", "Area"], ["address", "Street address"],
    ].map(([field, label]) => <label className="provider-form-field" key={field}>{label}<input required={field !== "address"} value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
      <label className="provider-form-field provider-form-field-wide">Description<textarea value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} /></label>
      <button className="provider-primary-button" disabled={busy}>{busy ? "Saving…" : "Save property"}</button>
    </form>
  </div>;
}

export function ProviderBackendPropertyDetail() {
  const { propertyId } = useParams();
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getProviderWorkspaceRecords().then((data) => { if (active) setRecords(data); }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [propertyId]);
  const property = records?.properties.find(({ id }) => id === propertyId);
  const listings = records?.listings.filter(({ property_id: id }) => id === propertyId) ?? [];
  if (error) return <div className="provider-page" role="alert">{error}</div>;
  if (!records) return <div className="provider-page" role="status">Loading property…</div>;
  if (!property) return <div className="provider-page provider-empty-state"><h2>Property not found</h2><p>This property is not owned by a provider business you manage.</p></div>;
  return <div className="provider-page"><Link to="/provider/properties">← Properties</Link><header className="provider-page-intro"><div><p className="provider-eyebrow">PHYSICAL PROPERTY</p><h2>{property.name}</h2><p>{one(property.locations)?.label} · {property.verification_status}</p></div><Link className="provider-outline-button" to={`/provider/properties/${property.id}/edit`}>Edit property</Link></header><section><h3>Associated listings and room offers</h3>{listings.map((listing) => <article className="provider-listing-card" key={listing.id}><h4>{listing.name} · {listing.status}</h4><p>{listing.listing_rooms?.length ?? 0} room offers</p><Link to={`/provider/listings/${listing.id}`}>Open listing</Link></article>)}{!listings.length && <p>No listings are linked to this property.</p>}</section></div>;
}

export function ProviderBackendListings() {
  const [records, setRecords] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const workspace = await getProviderWorkspaceRecords();
      setRecords(workspace.listings);
      setWorkspaces(workspace.workspaces);
      setError("");
    }
    catch (cause) { setError(cause.message || "Listings could not be loaded."); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function archive(id) {
    if (!window.confirm("Archive this listing? Students will no longer discover it.")) return;
    setBusy(true);
    try { await archiveProviderListing(id); await load(); }
    catch (cause) { setError(cause.message || "Listing could not be archived."); }
    finally { setBusy(false); }
  }
  return <div className="provider-page"><header className="provider-page-intro"><div><p className="provider-eyebrow">SUPABASE MARKETPLACE</p><h2>Your listings</h2><p>Only moderator-approved listings are visible to students.</p></div><Link className="provider-primary-button" to="/provider/listings/new">Create listing</Link></header>
    {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
    {records.length ? <div className="provider-listing-grid">{records.map((listing) => {
      const businessId = one(listing.properties)?.provider_business_id;
      const membership = workspaces.find(({ id }) => id === businessId);
      return <article className="provider-listing-card" key={listing.id}><h3>{listing.name}</h3><p>{one(listing.properties)?.name} · {listing.status}</p><p>Updated {new Date(listing.updated_at).toLocaleString()}</p><Link to={`/provider/listings/${listing.id}`}>Preview listing</Link>{["draft", "rejected"].includes(listing.status) && <Link to={`/provider/listings/${listing.id}/edit`}>Edit listing</Link>}{membership && ["owner", "manager"].includes(membership.role) && listing.status !== "archived" && <button type="button" disabled={busy} onClick={() => archive(listing.id)}>Archive</button>}</article>;
    })}</div> : !error && <div className="provider-empty-state"><h3>No listings yet</h3><Link className="provider-primary-button" to="/provider/listings/new">Create a listing</Link></div>}
  </div>;
}

export function ProviderBackendListingForm() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [values, setValues] = useState({ propertyId: "", name: "", description: "", accommodationCategory: "", locationSummary: "", institution: "", availableFrom: "", availabilityStatus: "unknown", facilityNames: [], utilities: "", houseRules: "", depositRequirements: "", contactPreference: "enquiry", viewingPreference: "" });
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [offers, setOffers] = useState([]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getProviderWorkspaceRecords().then(({ properties: nextProperties, listings, facilities: nextFacilities }) => {
      if (!active) return;
      setProperties(nextProperties);
      setFacilityOptions(nextFacilities);
      const listing = listings.find(({ id }) => id === listingId);
      if (listingId && !listing) throw new Error("Listing not found in your provider business.");
      if (listing) {
        setValues({
          propertyId: listing.property_id, name: listing.name, description: listing.description,
          accommodationCategory: listing.accommodation_category ?? "",
          locationSummary: listing.location_summary ?? "", institution: listing.nearby_institution ?? "",
          availableFrom: listing.available_from ?? "", availabilityStatus: listing.availability_status,
          facilityNames: (listing.listing_facilities ?? []).map((item) => one(item.facilities)?.display_name).filter(Boolean),
          utilities: listing.included_utilities ?? "", houseRules: (listing.house_rules ?? []).join("\n"),
          depositRequirements: listing.deposit_requirements ?? "", contactPreference: listing.contact_preference,
          viewingPreference: listing.viewing_preference,
        });
        setOffers((listing.listing_rooms ?? []).filter((room) => room.is_active !== false).map((room) => ({
          id: room.id, roomType: room.label || one(room.room_types)?.display_name || "",
          description: room.description, occupancy: String(room.occupancy),
          quantity: String(room.available_quantity ?? ""), price: String(room.price_amount),
          period: room.pricing_period === "month" ? "monthly" : room.pricing_period,
          deposit: room.deposit_amount == null ? "" : String(room.deposit_amount),
          availabilityStatus: room.availability_status, features: room.features,
        })));
      } else if (nextProperties[0]) setValues((current) => ({ ...current, propertyId: nextProperties[0].id }));
    }).catch((cause) => { if (active) setError(cause.message || "Listing form data could not be loaded."); });
    return () => { active = false; };
  }, [listingId]);

  function setField(field, value) { setValues((current) => ({ ...current, [field]: value })); }
  function updateOffer(index, field, value) { setOffers((current) => current.map((offer, i) => i === index ? { ...offer, [field]: value } : offer)); }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const requestReview = event.nativeEvent.submitter?.value === "review";
    if (requestReview && offers.length === 0) { setError("Add at least one room offer before requesting review."); return; }
    setBusy(true); setError("");
    try {
      const id = await saveProviderListing(listingId ?? null, values, offers, false);
      await uploadListingMedia(id, files);
      if (requestReview) await submitProviderListingForReview(id);
      navigate(`/provider/listings/${id}`, { replace: true, state: { notice: requestReview ? "Listing submitted for moderator review." : "Draft saved to Supabase." } });
    } catch (cause) { setError(cause.message || "Listing could not be saved."); }
    finally { setBusy(false); }
  }

  const updateArray = (field, value) => setValues((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  return <div className="provider-page"><Link to="/provider/listings">← Listings</Link><header className="provider-page-intro"><div><p className="provider-eyebrow">SUPABASE LISTING EDITOR</p><h2>{listingId ? "Edit listing" : "Create listing"}</h2><p>Review approval is required before students can find a new listing.</p></div></header>
    {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
    <form className="provider-listing-form" onSubmit={submit}>
      <label className="provider-form-field">Physical property<select required value={values.propertyId} onChange={(event) => setField("propertyId", event.target.value)}>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
      <label className="provider-form-field">Listing headline<input required maxLength={200} value={values.name} onChange={(event) => setField("name", event.target.value)} /></label>
      <label className="provider-form-field">Accommodation category<input required value={values.accommodationCategory} onChange={(event) => setField("accommodationCategory", event.target.value)} /></label>
      <label className="provider-form-field">Location summary<input required value={values.locationSummary} onChange={(event) => setField("locationSummary", event.target.value)} /></label>
      <label className="provider-form-field">Nearby institution<input value={values.institution} onChange={(event) => setField("institution", event.target.value)} /></label>
      <label className="provider-form-field">Description<textarea required value={values.description} onChange={(event) => setField("description", event.target.value)} /></label>
      <label className="provider-form-field">Available from<input type="date" value={values.availableFrom} onChange={(event) => setField("availableFrom", event.target.value)} /></label>
      <label className="provider-form-field">Availability<select value={values.availabilityStatus} onChange={(event) => setField("availabilityStatus", event.target.value)}>{["unknown", "available", "limited", "unavailable"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="provider-form-field">Included utilities<textarea value={values.utilities} onChange={(event) => setField("utilities", event.target.value)} /></label>
      <label className="provider-form-field">House rules, one per line<textarea value={values.houseRules} onChange={(event) => setField("houseRules", event.target.value)} /></label>
      <label className="provider-form-field">Deposit requirements<input value={values.depositRequirements} onChange={(event) => setField("depositRequirements", event.target.value)} /></label>
      <label className="provider-form-field">Contact preference<select value={values.contactPreference} onChange={(event) => setField("contactPreference", event.target.value)}>{["enquiry", "phone", "whatsapp"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="provider-form-field">Viewing preference<input value={values.viewingPreference} onChange={(event) => setField("viewingPreference", event.target.value)} /></label>
      <fieldset className="provider-form-field provider-form-field-wide"><legend>Facilities</legend>{facilityOptions.map((label) => <label key={label}><input type="checkbox" checked={values.facilityNames.includes(label)} onChange={() => updateArray("facilityNames", label)} /> {label}</label>)}</fieldset>
      <section className="provider-form-field-wide"><h3>Room offers</h3>{offers.map((offer, index) => <fieldset className="provider-listing-card" key={offer.id ?? index}><legend>Room option {index + 1}</legend>
        <label>Room type<input required value={offer.roomType} onChange={(event) => updateOffer(index, "roomType", event.target.value)} placeholder="e.g. 2 in a room" /></label>
        <label>Description<input value={offer.description} onChange={(event) => updateOffer(index, "description", event.target.value)} /></label>
        <label>Occupancy<input type="number" min="1" step="1" required value={offer.occupancy} onChange={(event) => updateOffer(index, "occupancy", event.target.value)} /></label>
        <label>Quantity<input type="number" min="0" step="1" required value={offer.quantity} onChange={(event) => updateOffer(index, "quantity", event.target.value)} /></label>
        <label>Price (GHS)<input type="number" min="0.01" step="0.01" required value={offer.price} onChange={(event) => updateOffer(index, "price", event.target.value)} /></label>
        <label>Rental period<select value={offer.period} onChange={(event) => updateOffer(index, "period", event.target.value)}>{["monthly", "semester", "academic_year", "other"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Deposit (GHS)<input type="number" min="0" step="0.01" value={offer.deposit} onChange={(event) => updateOffer(index, "deposit", event.target.value)} /></label>
        <label>Availability<select value={offer.availabilityStatus} onChange={(event) => updateOffer(index, "availabilityStatus", event.target.value)}>{["unknown", "available", "limited", "unavailable"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Features<input value={offer.features} onChange={(event) => updateOffer(index, "features", event.target.value)} /></label>
        <button type="button" onClick={() => setOffers((current) => current.filter((_, i) => i !== index))}>Remove room offer</button>
      </fieldset>)}<button type="button" onClick={() => setOffers((current) => [...current, { ...EMPTY_OFFER }])}>Add room offer</button></section>
      <label className="provider-form-field provider-form-field-wide">Listing photos (JPG, PNG, WebP; up to 5 MB each)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles([...event.target.files])} /></label>
      <p className="provider-form-field-wide">Uploaded photos remain private and pending processing; this deployment has no image-processing pipeline, so public display is not enabled yet.</p>
      <div className="provider-form-actions"><button type="submit" value="save" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button><button type="submit" value="review" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button></div>
    </form>
  </div>;
}

export function ProviderBackendListingPreview() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getProviderWorkspaceRecords().then(({ listings }) => {
      const found = listings.find(({ id }) => id === listingId);
      if (!found) throw new Error("Listing not found in the provider workspace.");
      if (active) setListing(found);
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [listingId]);
  if (error) return <div className="provider-page" role="alert">{error}</div>;
  if (!listing) return <div className="provider-page" role="status">Loading listing preview…</div>;
  return <div className="provider-page"><header className="provider-page-intro"><div><p className="provider-eyebrow">PROVIDER PREVIEW · {listing.status.toUpperCase()}</p><h2>{listing.name}</h2><p>{one(listing.properties)?.name} · {listing.location_summary}</p></div>{["draft", "rejected"].includes(listing.status) && <Link className="provider-outline-button" to={`/provider/listings/${listing.id}/edit`}>Edit listing</Link>}</header><p>{listing.description}</p><section><h3>Room offers</h3>{listing.listing_rooms?.filter((room) => room.is_active !== false).map((room) => <article className="provider-listing-card" key={room.id}><strong>{room.label ?? one(room.room_types)?.display_name}</strong><p>GHS {room.price_amount} / {room.pricing_period} · {room.available_quantity ?? "Quantity not reported"}</p><p>{room.description}</p></article>)}</section><p>Listing publication requires administrator review. Current status: {listing.status}.</p></div>;
}
