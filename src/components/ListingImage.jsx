import PropertyImage from "./PropertyImage";
import ProviderStoredImage from "./provider/ProviderStoredImage";

/** Render either a catalogue image ID or a browser-persisted property photo. */
export default function ListingImage({ photo, alt, width = 900, loading = "lazy", className = "" }) {
  if (photo && typeof photo === "object" && photo.isLocal) {
    return <ProviderStoredImage photo={photo} alt={alt} className={className} />;
  }
  if (!photo) {
    return (
      <div className={`property-image property-image-fallback ${className}`} role="img" aria-label={`${alt} — no photo added`}>
        <span>No photo added</span>
      </div>
    );
  }
  return <PropertyImage photoId={photo} alt={alt} width={width} loading={loading} className={className} />;
}
