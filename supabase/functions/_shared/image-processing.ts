import { Image } from "imagescript";

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 12_000_000;
const MAX_IMAGE_EDGE = 8_000;
const OUTPUT_IMAGE_EDGE = 2_000;

export class InvalidListingImageError extends Error {
  constructor(message = "Choose a valid JPG, PNG, or WebP image up to 5 MB.") {
    super(message);
    this.name = "InvalidListingImageError";
  }
}

type ImageDimensions = {
  width: number;
  height: number;
  format: "jpeg" | "png" | "webp";
};

function isBytes(bytes: Uint8Array, offset: number, values: number[]) {
  return values.every((value, index) => bytes[offset + index] === value);
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 24 ||
    !isBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    !isBytes(bytes, 12, [0x49, 0x48, 0x44, 0x52])
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    format: "png",
  };
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || !isBytes(bytes, 0, [0xff, 0xd8])) return null;

  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (frameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      return {
        height: view.getUint16(offset + 3),
        width: view.getUint16(offset + 5),
        format: "jpeg",
      };
    }
    offset += segmentLength;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 25 ||
    !isBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) ||
    !isBytes(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return null;
  }

  const read24LittleEndian = (offset: number) =>
    bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
  const chunk = String.fromCharCode(...bytes.slice(12, 16));

  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      width: read24LittleEndian(24) + 1,
      height: read24LittleEndian(27) + 1,
      format: "webp",
    };
  }

  if (chunk === "VP8 " && bytes.length >= 30 && isBytes(bytes, 23, [0x9d, 0x01, 0x2a])) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
      format: "webp",
    };
  }

  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    return {
      width: 1 + (bytes[21] & 0x3f) + ((bytes[22] & 0x0f) << 6),
      height: 1 + (bytes[22] >> 4) + (bytes[23] << 4) + ((bytes[24] & 0x03) << 12),
      format: "webp",
    };
  }

  return null;
}

function readImageDimensions(bytes: Uint8Array): ImageDimensions {
  const dimensions =
    readPngDimensions(bytes) ??
    readJpegDimensions(bytes) ??
    readWebpDimensions(bytes);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    throw new InvalidListingImageError("The selected file is not a supported image.");
  }
  if (
    dimensions.width > MAX_IMAGE_EDGE ||
    dimensions.height > MAX_IMAGE_EDGE ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    throw new InvalidListingImageError("The image dimensions are too large. Choose a smaller image.");
  }
  return dimensions;
}

export async function processListingImage(source: Uint8Array): Promise<Uint8Array> {
  if (source.byteLength === 0 || source.byteLength > MAX_LISTING_IMAGE_BYTES) {
    throw new InvalidListingImageError();
  }

  const dimensions = readImageDimensions(source);
  let image: Image;
  try {
    image = await Image.decode(source);
  } catch {
    throw new InvalidListingImageError("The selected file is damaged or could not be decoded.");
  }

  if (image.width !== dimensions.width || image.height !== dimensions.height) {
    throw new InvalidListingImageError("The image dimensions could not be verified.");
  }

  if (Math.max(image.width, image.height) > OUTPUT_IMAGE_EDGE) {
    image.contain(OUTPUT_IMAGE_EDGE, OUTPUT_IMAGE_EDGE);
  }

  let output = await image.encodeWebP({ quality: 78, effort: 2 });
  while (output.byteLength > MAX_LISTING_IMAGE_BYTES && Math.max(image.width, image.height) > 512) {
    image.scale(0.8);
    output = await image.encodeWebP({ quality: 72, effort: 1 });
  }

  if (output.byteLength > MAX_LISTING_IMAGE_BYTES) {
    throw new InvalidListingImageError("The processed image is still too large. Choose a simpler image.");
  }

  return output;
}
