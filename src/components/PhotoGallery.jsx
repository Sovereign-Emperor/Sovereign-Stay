import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import ListingImage from "./ListingImage";

/**
 * Accessible modal gallery for a property's illustrative photos.
 *
 * @param {{
 *   photos: Array<string | object>,
 *   propertyName: string,
 *   initialIndex: number,
 *   openerRef: { current: HTMLElement | null },
 *   onClose: () => void
 * }} props
 */
export default function PhotoGallery({
  photos,
  propertyName,
  initialIndex,
  openerRef,
  onClose,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [photoIndex, setPhotoIndex] = useState(initialIndex);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    // Listen on the document so Escape still works if focus moves outside the dialog.
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const focusable = [...(focusableElements ?? [])];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (
        document.activeElement === dialogRef.current ||
        !dialogRef.current?.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [onClose, openerRef]);

  function showPhoto(index) {
    setPhotoIndex((index + photos.length) % photos.length);
  }

  return (
    <div
      className="lightbox"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="lightbox-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${propertyName} photo gallery`}
        tabIndex={-1}
      >
        <button
          className="lightbox-close"
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close gallery"
        >
          <X size={23} />
        </button>
        <button
          className="lightbox-arrow lightbox-prev"
          onClick={() => showPhoto(photoIndex - 1)}
          aria-label="Previous photo"
        >
          <ChevronLeft size={26} />
        </button>
        <figure>
          <ListingImage
            photo={photos[photoIndex]}
            width={1800}
            alt={`${propertyName}, illustrative photo ${photoIndex + 1}`}
            loading="eager"
            className="lightbox-image"
          />
          <figcaption>
            {(photoIndex + 1).toString().padStart(2, "0")} / {photos.length.toString().padStart(2, "0")}
            <span>PHOTO FOR ILLUSTRATION</span>
          </figcaption>
        </figure>
        <button
          className="lightbox-arrow lightbox-next"
          onClick={() => showPhoto(photoIndex + 1)}
          aria-label="Next photo"
        >
          <ChevronRight size={26} />
        </button>
      </section>
    </div>
  );
}
