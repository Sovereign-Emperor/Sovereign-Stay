import { useEffect, useRef, useState } from "react";
import { ImagePlus, Image as ImageIcon, Star, Trash2 } from "lucide-react";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const ACCEPTED_FORMATS_LABEL = "JPG, JPEG, PNG, or WebP";

function getImageFileError(file) {
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.test(file.name);
  const hasAcceptedType = ACCEPTED_IMAGE_TYPES.has(file.type);
  const hasMissingTypeWithSupportedExtension = !file.type && hasAcceptedExtension;

  if (!hasAcceptedExtension || (!hasAcceptedType && !hasMissingTypeWithSupportedExtension)) {
    return `${file.name}: choose a JPG, JPEG, PNG, or WebP image.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${file.name}: image must be 5 MB or smaller.`;
  }

  return "";
}

/**
 * Select and locally preview property photos. This component does not upload
 * files or persist them outside the current browser session.
 */
export default function ProviderImageUpload() {
  const [images, setImages] = useState([]);
  const [coverImageId, setCoverImageId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const objectUrls = useRef(new Set());
  const nextImageId = useRef(0);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  function addFiles(fileList) {
    const incomingFiles = Array.from(fileList ?? []);
    const acceptedImages = [];
    const nextErrors = [];

    incomingFiles.forEach((file) => {
      const fileError = getImageFileError(file);

      if (fileError) {
        nextErrors.push(fileError);
        return;
      }

      let previewUrl = null;
      try {
        previewUrl = URL.createObjectURL(file);
        objectUrls.current.add(previewUrl);
      } catch {
        nextErrors.push(`${file.name}: preview could not be created, but the file was selected.`);
      }

      nextImageId.current += 1;
      acceptedImages.push({
        id: `property-image-${nextImageId.current}`,
        file,
        previewUrl,
      });
    });

    setImages((currentImages) => [...currentImages, ...acceptedImages]);
    if (acceptedImages.length > 0) {
      setCoverImageId((currentCoverId) => currentCoverId ?? acceptedImages[0].id);
    }
    setErrors(nextErrors);
  }

  function handleFileSelection(event) {
    addFiles(event.target.files);
    // Let providers select the same file again after removing it.
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeImage(imageId) {
    const removedImage = images.find((image) => image.id === imageId);
    if (removedImage?.previewUrl) {
      URL.revokeObjectURL(removedImage.previewUrl);
      objectUrls.current.delete(removedImage.previewUrl);
    }

    const updatedImages = images.filter((image) => image.id !== imageId);
    setImages(updatedImages);
    setCoverImageId((currentCoverId) =>
      currentCoverId === imageId ? updatedImages[0]?.id ?? null : currentCoverId,
    );
  }

  function handlePreviewError(image) {
    setImages((currentImages) =>
      currentImages.map((currentImage) =>
        currentImage.id === image.id
          ? { ...currentImage, previewFailed: true }
          : currentImage,
      ),
    );
    setErrors((currentErrors) => {
      const message = `${image.file.name}: the image preview could not be displayed.`;
      return currentErrors.includes(message) ? currentErrors : [...currentErrors, message];
    });
  }

  return (
    <section className="provider-form-section provider-photo-section" aria-labelledby="property-photos-heading">
      <div className="provider-form-section-heading">
        <span className="provider-form-section-icon" aria-hidden="true">
          <ImagePlus size={17} />
        </span>
        <div>
          <h3 id="property-photos-heading">Property photos</h3>
          <p>Clear photos help students evaluate accommodation before arranging a visit.</p>
        </div>
      </div>

      <p className="provider-photo-recommendation">
        Helpful photos include the exterior, a bedroom, bathroom, and shared spaces. Photos are
        optional and stay in this browser preview only.
      </p>

      <label
        className={`provider-photo-dropzone${isDragging ? " provider-photo-dropzone-active" : ""}`}
        htmlFor="property-photos"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <input
          className="sr-only"
          id="property-photos"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelection}
          aria-describedby="property-photo-guidance"
        />
        <span className="provider-photo-dropzone-icon" aria-hidden="true">
          <ImagePlus size={22} />
        </span>
        <span className="provider-photo-dropzone-title">Choose photos or drag them here</span>
        <span className="provider-photo-dropzone-guidance" id="property-photo-guidance">
          {ACCEPTED_FORMATS_LABEL} · Up to 5 MB per image
        </span>
      </label>

      {errors.length > 0 && (
        <ul className="provider-photo-errors" role="alert" aria-label="Photo selection errors">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}

      {images.length > 0 && (
        <div className="provider-photo-grid" aria-label="Selected property photos">
          {images.map((image) => {
            const isCover = image.id === coverImageId;

            return (
              <article className={`provider-photo-card${isCover ? " provider-photo-card-cover" : ""}`} key={image.id}>
                <div className="provider-photo-preview">
                  {image.previewUrl && !image.previewFailed ? (
                    <img
                      src={image.previewUrl}
                      alt={`Preview of ${image.file.name}`}
                      onError={() => handlePreviewError(image)}
                    />
                  ) : (
                    <div className="provider-photo-preview-fallback" role="img" aria-label={`Preview unavailable for ${image.file.name}`}>
                      <ImageIcon size={22} aria-hidden="true" />
                      <span>Preview unavailable</span>
                    </div>
                  )}
                  {isCover && <span className="provider-photo-cover-badge"><Star size={12} fill="currentColor" /> Cover photo</span>}
                </div>
                <div className="provider-photo-card-footer">
                  <span className="provider-photo-filename" title={image.file.name}>{image.file.name}</span>
                  <div className="provider-photo-actions">
                    {!isCover && (
                      <button
                        className="provider-photo-action"
                        type="button"
                        onClick={() => setCoverImageId(image.id)}
                        aria-label={`Set ${image.file.name} as cover photo`}
                      >
                        <Star size={14} aria-hidden="true" /> Cover
                      </button>
                    )}
                    <button
                      className="provider-photo-remove"
                      type="button"
                      onClick={() => removeImage(image.id)}
                      aria-label={`Remove ${image.file.name}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
