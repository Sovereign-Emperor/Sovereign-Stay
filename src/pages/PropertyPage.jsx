import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Check, Clock3, MapPin, ShieldCheck, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ListingEnquiryForm from "../components/ListingEnquiryForm";
import ListingImage from "../components/ListingImage";
import PhotoGallery from "../components/PhotoGallery";
import WhatsAppLink from "../components/WhatsAppLink";
import BookingRequestPanel from "../components/BookingRequestPanel";
import { isExplicitSupabaseMode } from "../data/supabaseClient";
import { useListingById } from "../hooks/useListings";
import { formatPrice } from "../utils/format";

const pricePeriodLabel = (period) => ({
  monthly: "month",
  semester: "semester",
  academic_year: "academic year",
  other: "rental period",
}[period] ?? String(period ?? "period").replaceAll("_", " "));

export default function PropertyPage() {
  const { id } = useParams();
  const { listing: property, isLoading, error, retry } = useListingById(id);
  const [activePhoto, setActivePhoto] = useState(null);
  const galleryOpenerRef = useRef(null);
  const closeGallery = useCallback(() => setActivePhoto(null), []);

  function openGallery(index, event) {
    galleryOpenerRef.current = event.currentTarget;
    setActivePhoto(index);
  }

  if (isLoading) {
    return <main className="not-found container">    <p role="status">Loading listing…</p></main>;
  }

  if (error) {
    return <main className="not-found container"><p role="alert">We could not load this listing from the accommodation service.</p><button className="button button-dark" type="button" onClick={retry}>Try again</button><Link className="button button-dark" to="/">Back to all places</Link></main>;
  }

  if (!property) {
    return <main className="not-found container"><span className="eyebrow">NOT FOUND</span><h1>This place is off the map.</h1><p>It may have moved, or the link may be incorrect.</p><Link className="button button-dark" to="/"><ArrowLeft size={17} /> Back to all places</Link></main>;
  }

  const photoIndex = activePhoto === null ? -1 : activePhoto;
  const showPhoto = (index) => setActivePhoto((index + property.photos.length) % property.photos.length);

  return (
    <main className="property-page">
      <div className="container property-container">
        <Link className="back-link" to="/"><ArrowLeft size={16} /> All places</Link>
        <div className="detail-heading">
          <div><p className="eyebrow">{property.type} <span className="detail-dot">·</span> {property.area || property.location}{property.isDemo && <> <span className="detail-dot">·</span> DEMO LISTING</>}</p><h1>{property.name}</h1><p className="detail-address"><MapPin size={16} />{property.location}{Number.isFinite(property.distanceKm) && <><span>·</span>approximately {property.distanceKm} km from KTU</>}</p></div>
          <button type="button" className="share-button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); window.alert("Property link copied."); } catch { window.prompt("Copy this property link:", window.location.href); } }}><ArrowUpRight size={16} /> Share</button>
        </div>
        <div className="gallery-grid">
          <button className="gallery-main" disabled={property.photos.length === 0} onClick={(event) => openGallery(0, event)} aria-label={`Open ${property.name} photo gallery`}>
            <ListingImage
              photo={property.photos[0]}
              width={1400}
              alt={`${property.name}, illustrative main photo`}
              loading="eager"
              className="gallery-photo"
            />
            <span className="gallery-label"><span>01</span> / {property.photos.length.toString().padStart(2, "0")} <span className="gallery-label-caption">{property.photos[0]?.isLocal ? "LOCAL DEMO PHOTO" : "PHOTOS FOR ILLUSTRATION"}</span></span>
          </button>
          {property.photos.slice(1, 5).map((photo, index) => (
            <button className={`gallery-tile gallery-tile-${index + 1}`} key={photo.id ?? photo} onClick={(event) => openGallery(index + 1, event)} aria-label={`Open photo ${index + 2} of ${property.name}`}>
              <ListingImage
                photo={photo}
                alt={`${property.name}, illustrative photo ${index + 2}`}
                className="gallery-photo"
              />
            </button>
          ))}
          {property.photos.length > 0 && <button className="gallery-all-button" onClick={(event) => openGallery(0, event)}>View all photos <ArrowUpRight size={14} /></button>}
        </div>

        <div className="detail-layout">
          <div className="detail-main">
            <section className="detail-summary">
              <div><p className="eyebrow">{property.school || "Student accommodation"}</p><h2>{property.roomType}{property.isDemo && <> <span>·</span> demo listing</>}</h2><p className="summary-type">{property.type} in {property.area || property.location}</p>{property.propertyName && <p className="summary-type">Physical property: {property.propertyName}</p>}</div>
              <div className="host-avatar" aria-hidden="true">SS</div>
            </section>
            <div className="detail-facts">
              <div><BedDouble size={20} /><span><strong>{property.roomOffers.length} room options</strong><small>Listed on this advertisement</small></span></div>
              <div><Users size={20} /><span><strong>{property.availableRooms || "Quantity not reported"} {property.isDemo ? "reported rooms" : "rooms listed"}</strong><small>{property.isDemo ? "Provider-reported demo data" : "Provider-submitted room offer quantities"}</small></span></div>
              <div><Clock3 size={20} /><span><strong>{property.availabilityStatus === "unknown" ? "Not confirmed" : property.availabilityStatus}</strong><small>{property.isDemo ? "No real-time availability feed" : "Confirm current status with provider"}</small></span></div>
            </div>
            <section className="detail-section">
              <p className="eyebrow">THE FEELING</p><h3>A good place to land.</h3><p className="detail-description">{property.description}</p>
              <div className="highlights-list">{property.highlights.map((highlight) => <span key={highlight}><Check size={16} />{highlight}</span>)}</div>
            </section>
            <section className="detail-section" aria-labelledby="student-room-offers-heading">
              <p className="eyebrow">ROOM OPTIONS</p><h3 id="student-room-offers-heading">Prices and room types</h3>
              {property.roomOffers.length ? <div className="student-room-offers">{property.roomOffers.map((offer) => (
                <article key={offer.id}>
                  <div><h4>{offer.roomTypeLabel ?? offer.roomType}</h4><p>{offer.occupancy} {offer.occupancy === 1 ? "person" : "people"} · {offer.quantity ?? offer.exampleRoomCount ?? "Quantity not reported"} {property.isDemo ? "reported room(s)" : "room(s) listed"}</p></div>
                  <strong>{formatPrice(offer.price)} <span>/ {pricePeriodLabel(offer.pricePeriod)}</span></strong>
                  <p>{offer.description || "No room description provided."}</p>
                  <small>Availability: {offer.availabilityStatus === "unknown" ? "not confirmed" : offer.availabilityStatus}</small>
                  {offer.deposit != null && <small>Deposit: {formatPrice(offer.deposit)}</small>}
                  {offer.features && <p>{offer.features}</p>}
                </article>
              ))}</div> : <p>No room options have been added to this listing yet.</p>}
            </section>
            <section className="detail-section">
              <p className="eyebrow">THE GOOD STUFF</p><h3>What’s included</h3>
              <div className="facilities-grid">{property.facilities.map((facility) => <span key={facility}><Check size={16} />{facility}</span>)}</div>
            </section>
            <section className="detail-section rules-section">
              <p className="eyebrow">A FEW HOUSE NOTES</p><h3>Good to know</h3>
              <div className="house-rules">{property.rules.map((rule) => <span key={rule}><ShieldCheck size={16} />{rule}</span>)}</div>
              <p className="availability-note"><Clock3 size={15} /> {property.isDemo ? "Local demo listing. No live availability or property verification is provided." : "Availability reflects provider-submitted records and is not a real-time guarantee."}</p>
            </section>
            <section className="detail-section location-section">
              <p className="eyebrow">THE NEIGHBOURHOOD</p><h3>Easy to find your way.</h3>
              <p className="detail-description"><MapPin size={16} />{property.location}{Number.isFinite(property.distanceKm) && <> <span>·</span> approximately {property.distanceKm} km from KTU</>}</p>
              {property.property && <p className="detail-description">{[property.property.address, property.property.area, property.property.city, property.property.region].filter(Boolean).join(", ")}</p>}
              <a className="map-placeholder" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location}, Koforidua, Ghana`)}`} target="_blank" rel="noreferrer">
                <span className="map-grid-pattern" /><span className="map-pin"><MapPin size={20} fill="currentColor" /></span><span className="map-label">{property.area}<small>Koforidua, Ghana</small></span><span className="map-open">Open map <ArrowUpRight size={14} /></span>
              </a>
              <p className="demo-map-note">Approximate area shown. Open the map to explore the neighbourhood.</p>
            </section>
          </div>
          <aside className="enquiry-card">
            <p className="eyebrow">A PLACE TO CALL YOURS</p>
            <p className="enquiry-price">{property.price != null ? <><strong>{formatPrice(property.price)}</strong><span> / {pricePeriodLabel(property.pricePeriod)}</span></> : <strong>Price not provided</strong>}</p>
            <p className="enquiry-small">{property.isDemo ? "Example price · local demo" : "Provider-submitted price · confirm before committing"}</p>
            <div className="availability-box"><span className="availability-indicator" /><span><strong>{property.availabilityStatus === "unknown" ? "Availability not confirmed" : property.availabilityStatus}</strong><small>Not real-time or verified</small></span></div>
            {isExplicitSupabaseMode && !property.isDemo && <BookingRequestPanel listing={property} />}
            <ListingEnquiryForm listingId={property.id} listingName={property.name} />
            {property.isDemo && <WhatsAppLink propertyName={property.name} className="listing-whatsapp-link">Ask about real options</WhatsAppLink>}
            {property.isDemo && <div className="listing-updated"><Clock3 size={14} /> Local demo listing<span>NOT VERIFIED</span></div>}
          </aside>
        </div>
        <div className="detail-bottom-cta"><p>Found your kind of place?</p><Link to="/" className="text-link">Explore more stays <ArrowRight size={16} /></Link></div>
      </div>

      {activePhoto !== null && (
        <PhotoGallery
          photos={property.photos}
          propertyName={property.name}
          initialIndex={activePhoto}
          openerRef={galleryOpenerRef}
          onClose={closeGallery}
        />
      )}
    </main>
  );
}
