import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deletePropertyImages, savePropertyImages } = vi.hoisted(() => ({
  deletePropertyImages: vi.fn(),
  savePropertyImages: vi.fn(),
}));

vi.mock("./propertyImageRepository", () => ({
  deletePropertyImages,
  savePropertyImages,
}));

import {
  createProviderPropertyRecord,
  deleteProviderPropertyRecord,
  getStoredProviderProperties,
  getStoredProviderProperty,
  updateProviderPropertyRecord,
} from "./providerPropertyRepository";

const STORAGE_KEY = "sovereign-stay:provider-properties:v1";
const propertyValues = {
  name: "Example accommodation",
  type: "Hostel",
  description: "A local example property.",
  region: "Eastern",
  city: "Koforidua",
  area: "Adweso",
  address: "",
  institution: "",
};

beforeEach(() => {
  localStorage.clear();
  savePropertyImages.mockImplementation(async (_propertyId, images) =>
    images.map((image, index) => ({
      id: `stored-photo-${index}`,
      name: image.name ?? image.file.name,
      type: image.file.type,
      size: image.file.size,
      sortOrder: index,
      isCover: Boolean(image.isCover),
    })),
  );
  deletePropertyImages.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("providerPropertyRepository", () => {
  it("creates unique provider-owned records and reads them within their owner scope", async () => {
    const first = await createProviderPropertyRecord("provider-a", propertyValues, []);
    const second = await createProviderPropertyRecord("provider-a", propertyValues, []);

    expect(first.id).toMatch(/^property-local-/);
    expect(first.id).not.toBe(second.id);
    expect(first.ownerId).toBe("provider-a");
    expect(getStoredProviderProperty("provider-a", first.id)).toEqual(first);
    expect(getStoredProviderProperty("provider-b", first.id)).toBeNull();
    expect(getStoredProviderProperties("provider-a")).toHaveLength(2);
    expect(first.media).toEqual([]);
  });

  it("updates fields and cover-photo metadata, then deletes only the selected record", async () => {
    const created = await createProviderPropertyRecord("provider-a", propertyValues, []);
    const file = new File(["photo"], "cover.jpg", { type: "image/jpeg" });
    const update = await updateProviderPropertyRecord(
      "provider-a",
      created.id,
      { ...propertyValues, name: "Renamed accommodation" },
      [{ file, name: file.name, isCover: true }],
    );

    expect(update.property.name).toBe("Renamed accommodation");
    expect(update.property.media[0]).toMatchObject({
      name: "cover.jpg",
      isCover: true,
      sortOrder: 0,
    });
    expect(getStoredProviderProperty("provider-a", created.id).name).toBe("Renamed accommodation");

    await deleteProviderPropertyRecord("provider-a", created.id);
    expect(getStoredProviderProperty("provider-a", created.id)).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([]);
    expect(deletePropertyImages).toHaveBeenCalledWith([]);
  });

  it("reports local-storage write failures and cleans up newly written image blobs", async () => {
    const file = new File(["photo"], "cover.jpg", { type: "image/jpeg" });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });

    await expect(
      createProviderPropertyRecord(
        "provider-a",
        propertyValues,
        [{ file, name: file.name, isCover: true }],
      ),
    ).rejects.toThrow("Could not save local properties");
    expect(deletePropertyImages).toHaveBeenCalledWith(["stored-photo-0"]);
  });

  it("does not delete another provider's property", async () => {
    const property = await createProviderPropertyRecord("provider-a", propertyValues, []);

    await expect(
      deleteProviderPropertyRecord("provider-b", property.id),
    ).rejects.toThrow("could not be found");
    expect(getStoredProviderProperty("provider-a", property.id)).toEqual(property);
  });
});
