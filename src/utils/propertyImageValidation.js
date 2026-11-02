export const MAX_PROPERTY_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PROPERTY_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ACCEPTED_PROPERTY_IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;

export function getPropertyImageError(file) {
  if (!file || typeof file.name !== "string") {
    return "Select a readable JPG, JPEG, PNG, or WebP image.";
  }

  const hasAcceptedExtension = ACCEPTED_PROPERTY_IMAGE_EXTENSION.test(file.name);
  const hasAcceptedType = ACCEPTED_PROPERTY_IMAGE_TYPES.has(file.type);
  const hasMissingTypeWithSupportedExtension = !file.type && hasAcceptedExtension;

  if (!hasAcceptedExtension || (!hasAcceptedType && !hasMissingTypeWithSupportedExtension)) {
    return `${file.name}: choose a JPG, JPEG, PNG, or WebP image.`;
  }

  if (file.size > MAX_PROPERTY_IMAGE_SIZE_BYTES) {
    return `${file.name}: image must be 5 MB or smaller.`;
  }

  return "";
}
