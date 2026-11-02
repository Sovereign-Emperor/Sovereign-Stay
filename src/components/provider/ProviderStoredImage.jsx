import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getPropertyImageBlob } from "../../data/propertyImageRepository";

/**
 * Load one browser-persisted photo blob and release its object URL on cleanup.
 */
export default function ProviderStoredImage({ photo, alt, className = "" }) {
  const [imageUrl, setImageUrl] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setImageUrl("");
    setHasError(false);

    getPropertyImageBlob(photo.id)
      .then((blob) => {
        if (!blob) throw new Error("Saved photo data is missing.");
        objectUrl = URL.createObjectURL(blob);
        if (active) setImageUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setHasError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id]);

  return (
    <div className={`property-image ${className}`}>
      {!imageUrl || hasError ? (
        <div
          className="property-image-fallback"
          role="img"
          aria-label={`${alt} — image unavailable`}
        >
          <ImageOff size={22} aria-hidden="true" />
          <span>Photo unavailable</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={alt}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
