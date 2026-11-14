import { describe, expect, it } from "vitest";
import { Image } from "imagescript";
import {
  InvalidListingImageError,
  MAX_LISTING_IMAGE_BYTES,
  processListingImage,
} from "./image-processing";

describe("processListingImage", () => {
  it("decodes and re-encodes supported images as display-ready WebP", async () => {
    const source = await new Image(8, 6).encodePNG();
    const processed = await processListingImage(source);
    const decoded = await Image.decode(processed);

    expect(String.fromCharCode(...processed.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...processed.slice(8, 12))).toBe("WEBP");
    expect(decoded.width).toBe(8);
    expect(decoded.height).toBe(6);
  });

  it("rejects content with an image MIME claim but no supported image bytes", async () => {
    await expect(processListingImage(new TextEncoder().encode("not an image")))
      .rejects.toBeInstanceOf(InvalidListingImageError);
  });

  it("rejects oversized payloads before decoding", async () => {
    await expect(processListingImage(new Uint8Array(MAX_LISTING_IMAGE_BYTES + 1)))
      .rejects.toThrow("Choose a valid JPG, PNG, or WebP image up to 5 MB.");
  });

  it("rejects oversized PNG dimensions before allocating the decoded bitmap", async () => {
    const header = new Uint8Array(24);
    header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    header.set([0x49, 0x48, 0x44, 0x52], 12);
    new DataView(header.buffer).setUint32(16, 20_000);
    new DataView(header.buffer).setUint32(20, 20_000);

    await expect(processListingImage(header))
      .rejects.toThrow("The image dimensions are too large. Choose a smaller image.");
  });
});
