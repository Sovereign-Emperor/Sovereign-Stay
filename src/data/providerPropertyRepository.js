import { deletePropertyImages, savePropertyImages } from "./propertyImageRepository";

const STORAGE_KEY = "sovereign-stay:provider-properties:v1";

function getStorage() {
  try {
    if (!globalThis.localStorage) {
      throw new Error("Browser storage is not available.");
    }
    return globalThis.localStorage;
  } catch (error) {
    throw new Error(
      `Could not access local property storage: ${error.message ?? "storage is unavailable"}`,
    );
  }
}

function readRecords() {
  const storage = getStorage();
  let serialized;

  try {
    serialized = storage.getItem(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Could not read local properties: ${error.message}`);
  }

  if (!serialized) return [];

  try {
    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) throw new TypeError("The saved property data is not a list.");
    return records;
  } catch (error) {
    throw new Error(`Saved property data could not be read: ${error.message}`);
  }
}

function writeRecords(records) {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    throw new Error(
      `Could not save local properties: ${error.message ?? "browser storage is unavailable or full"}`,
    );
  }
}

function createPropertyId(existingRecords) {
  let id;
  do {
    const randomId = globalThis.crypto?.randomUUID?.();
    id = `property-local-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  } while (existingRecords.some((property) => property.id === id));
  return id;
}

function normalizePropertyValues(values) {
  return {
    name: values.name?.trim() ?? "",
    type: values.type?.trim() ?? "",
    description: values.description?.trim() ?? "",
    region: values.region?.trim() ?? "",
    city: values.city?.trim() ?? "",
    area: values.area?.trim() ?? "",
    address: values.address?.trim() ?? "",
    institution: values.institution?.trim() ?? "",
  };
}

export function getStoredProviderProperties(providerId) {
  return readRecords().filter((property) => property.ownerId === providerId);
}

export function getStoredProviderProperty(providerId, propertyId) {
  return getStoredProviderProperties(providerId)
    .find((property) => property.id === propertyId) ?? null;
}

/** Create one physical property and persist its photo blobs separately. */
export async function createProviderPropertyRecord(providerId, values, images) {
  const records = readRecords();
  const id = createPropertyId(records);
  const media = await savePropertyImages(id, images);
  const property = {
    id,
    ownerId: providerId,
    ...normalizePropertyValues(values),
    media,
    mediaManaged: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    writeRecords([...records, property]);
  } catch (error) {
    try {
      await deletePropertyImages(media.map(({ id: photoId }) => photoId));
    } catch (cleanupError) {
      throw new Error(`${error.message} Photo cleanup also failed: ${cleanupError.message}`);
    }
    throw error;
  }

  return property;
}

/** Update property details and replace its locally stored photo set. */
export async function updateProviderPropertyRecord(
  providerId,
  propertyId,
  values,
  images,
  baseProperty = null,
) {
  const records = readRecords();
  let currentIndex = records.findIndex(
    (property) => property.id === propertyId && property.ownerId === providerId,
  );
  if (currentIndex === -1 && (!baseProperty || baseProperty.ownerId !== providerId)) {
    throw new Error("This property could not be found in your provider workspace.");
  }

  const currentProperty = currentIndex === -1
    ? {
      id: propertyId,
      ownerId: providerId,
      name: baseProperty.name,
      type: baseProperty.type,
      description: baseProperty.description,
      region: baseProperty.region,
      city: baseProperty.city,
      area: baseProperty.area,
      address: baseProperty.address,
      institution: baseProperty.institution,
      media: [],
    }
    : records[currentIndex];
  if (currentIndex === -1) currentIndex = records.length;
  const media = await savePropertyImages(propertyId, images);
  const updatedProperty = {
    ...currentProperty,
    ...normalizePropertyValues(values),
    media,
    mediaManaged: images.length > 0 || Boolean(currentProperty.mediaManaged),
    updatedAt: new Date().toISOString(),
  };
  const updatedRecords = records.slice();
  updatedRecords[currentIndex] = updatedProperty;

  try {
    writeRecords(updatedRecords);
  } catch (error) {
    try {
      await deletePropertyImages(media.map(({ id }) => id));
    } catch (cleanupError) {
      throw new Error(`${error.message} Photo cleanup also failed: ${cleanupError.message}`);
    }
    throw error;
  }

  const warnings = [];
  try {
    await deletePropertyImages((currentProperty.media ?? []).map(({ id }) => id));
  } catch (error) {
    warnings.push(`The property was saved, but old photo data could not be cleaned up: ${error.message}`);
  }

  return { property: updatedProperty, warnings };
}

/** Delete only property data; callers must check listing dependencies first. */
export async function deleteProviderPropertyRecord(providerId, propertyId) {
  const records = readRecords();
  const property = records.find(
    (record) => record.id === propertyId && record.ownerId === providerId,
  );
  if (!property) {
    throw new Error("This property could not be found in your provider workspace.");
  }

  writeRecords(records.filter((record) => record.id !== propertyId));

  const warnings = [];
  try {
    await deletePropertyImages((property.media ?? []).map(({ id }) => id));
  } catch (error) {
    warnings.push(`The property was deleted, but its local photo data could not be cleaned up: ${error.message}`);
  }

  return { property, warnings };
}
