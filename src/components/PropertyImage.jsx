import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { imageUrl } from "../data/properties";

/**
 * Display an illustrative property image and a local placeholder if it fails.
 *
 * @param {{
 *   photoId: string,
 *   alt: string,
 *   width?: number,
 *   loading?: "eager" | "lazy",
 *   className?: string,
 *   imageClassName?: string
 * }} props
 */
export default function PropertyImage({
  photoId,
  alt,
  width = 900,
  loading = "lazy",
  className = "",
  imageClassName = "",
}) {
  const src = imageUrl(photoId, width);
  const [failedSrc, setFailedSrc] = useState("");

  useEffect(() => {
    setFailedSrc("");
  }, [src]);

  const imageFailed = failedSrc === src;

  return (
    <div className={`property-image ${className}`}>
      {imageFailed ? (
        <div
          className="property-image-fallback"
          role="img"
          aria-label={alt ? `${alt} — image unavailable` : "Illustrative background image unavailable"}
        >
          <ImageOff size={22} aria-hidden="true" />
          <span>Photo unavailable</span>
        </div>
      ) : (
        <img
          className={imageClassName}
          src={src}
          alt={alt}
          loading={loading}
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}
