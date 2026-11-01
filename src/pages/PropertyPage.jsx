import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Check, ChevronLeft, ChevronRight, Clock3, MapPin, ShieldCheck, Users, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import WhatsAppLink from "../components/WhatsAppLink";
import { imageUrl, properties } from "../data/properties";
import { formatPrice } from "../utils/format";

export default function PropertyPage() {
  const { id } = useParams();
  const property = properties.find((item) => item.id === id);
  const [activePhoto, setActivePhoto] = useState(null);

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
          <div><p className="eyebrow">{property.type} <span className="detail-dot">·</span> {property.area} <span className="detail-dot">·</span> DEMO LISTING</p><h1>{property.name}</h1><p className="detail-address"><MapPin size={16} />{property.location}<span>·</span>approximately {property.distanceKm} km from KTU</p></div>
          <button type="button" className="share-button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); window.alert("Property link copied."); } catch { window.prompt("Copy this property link:", window.location.href); } }}><ArrowUpRight size={16} /> Share</button>
        </div>
        <div className="gallery-grid">
          <button className="gallery-main" onClick={() => setActivePhoto(0)} aria-label="Open photo gallery">
            <img src={imageUrl(property.photos[0], 1400)} alt={`${property.name}, main view`} />
            <span className="gallery-label"><span>01</span> / {property.photos.length.toString().padStart(2, "0")} <span className="gallery-label-caption">PHOTOS FOR ILLUSTRATION</span></span>
          </button>
          {property.photos.slice(1, 5).map((photo, index) => (
            <button className={`gallery-tile gallery-tile-${index + 1}`} key={photo} onClick={() => setActivePhoto(index + 1)} aria-label={`Open photo ${index + 2}`}>
              <img src={imageUrl(photo, 900)} alt={`${property.name}, view ${index + 2}`} />
            </button>
          ))}
          <button className="gallery-all-button" onClick={() => setActivePhoto(0)}>View all photos <ArrowUpRight size={14} /></button>
        </div>

        <div className="detail-layout">
          <div className="detail-main">
            <section className="detail-summary">
              <div><p className="eyebrow">{property.school}</p><h2>{property.roomType} <span>·</span> example listing</h2><p className="summary-type">{property.type} in {property.area}</p></div>
              <div className="host-avatar" aria-hidden="true">SS</div>
            </section>
            <div className="detail-facts">
              <div><BedDouble size={20} /><span><strong>{property.roomType}</strong><small>Room arrangement</small></span></div>
              <div><Users size={20} /><span><strong>{property.availableRooms} rooms shown</strong><small>Example count only</small></span></div>
              <div><Clock3 size={20} /><span><strong>Not verified</strong><small>No live availability data</small></span></div>
            </div>
            <section className="detail-section">
              <p className="eyebrow">THE FEELING</p><h3>A good place to land.</h3><p className="detail-description">{property.description}</p>
              <div className="highlights-list">{property.highlights.map((highlight) => <span key={highlight}><Check size={16} />{highlight}</span>)}</div>
            </section>
            <section className="detail-section">
              <p className="eyebrow">THE GOOD STUFF</p><h3>What’s included</h3>
              <div className="facilities-grid">{property.facilities.map((facility) => <span key={facility}><Check size={16} />{facility}</span>)}</div>
            </section>
            <section className="detail-section rules-section">
              <p className="eyebrow">A FEW HOUSE NOTES</p><h3>Good to know</h3>
              <div className="house-rules">{property.rules.map((rule) => <span key={rule}><ShieldCheck size={16} />{rule}</span>)}</div>
              <p className="availability-note"><Clock3 size={15} /> This demonstration does not represent real availability or a verified property.</p>
            </section>
            <section className="detail-section location-section">
              <p className="eyebrow">THE NEIGHBOURHOOD</p><h3>Easy to find your way.</h3>
              <p className="detail-description"><MapPin size={16} />{property.location} <span>·</span> approximately {property.distanceKm} km from KTU</p>
              <a className="map-placeholder" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location}, Koforidua, Ghana`)}`} target="_blank" rel="noreferrer">
                <span className="map-grid-pattern" /><span className="map-pin"><MapPin size={20} fill="currentColor" /></span><span className="map-label">{property.area}<small>Koforidua, Ghana</small></span><span className="map-open">Open map <ArrowUpRight size={14} /></span>
              </a>
              <p className="demo-map-note">Approximate area shown. Open the map to explore the neighbourhood.</p>
            </section>
          </div>
          <aside className="enquiry-card">
            <p className="eyebrow">A PLACE TO CALL YOURS</p>
            <p className="enquiry-price"><strong>{formatPrice(property.price)}</strong><span> / semester</span></p>
            <p className="enquiry-small">Example price · not a live offer</p>
            <div className="availability-box"><span className="availability-indicator" /><span><strong>Example: {property.availableRooms} rooms</strong><small>Not live or verified</small></span></div>
            <WhatsAppLink propertyName={property.name} className="enquiry-button">Ask about real options</WhatsAppLink>
            <p className="enquiry-reassurance"><ShieldCheck size={15} /> It’s okay to ask questions before you visit.</p>
            <div className="listing-updated"><Clock3 size={14} /> Demonstration data only<span>NOT VERIFIED</span></div>
          </aside>
        </div>
        <div className="detail-bottom-cta"><p>Found your kind of place?</p><Link to="/" className="text-link">Explore more stays <ArrowRight size={16} /></Link></div>
      </div>

      {activePhoto !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Property photo gallery" onClick={() => setActivePhoto(null)} onKeyDown={(event) => { if (event.key === "Escape") setActivePhoto(null); }}>
          <button className="lightbox-close" onClick={() => setActivePhoto(null)} aria-label="Close gallery"><X size={23} /></button>
          <button className="lightbox-arrow lightbox-prev" onClick={(event) => { event.stopPropagation(); showPhoto(photoIndex - 1); }} aria-label="Previous photo"><ChevronLeft size={26} /></button>
          <figure onClick={(event) => event.stopPropagation()}><img src={imageUrl(property.photos[photoIndex], 1800)} alt={`${property.name}, gallery image ${photoIndex + 1}`} /><figcaption>{(photoIndex + 1).toString().padStart(2, "0")} / {property.photos.length.toString().padStart(2, "0")} <span>PHOTO FOR ILLUSTRATION</span></figcaption></figure>
          <button className="lightbox-arrow lightbox-next" onClick={(event) => { event.stopPropagation(); showPhoto(photoIndex + 1); }} aria-label="Next photo"><ChevronRight size={26} /></button>
        </div>
      )}
    </main>
  );
}
