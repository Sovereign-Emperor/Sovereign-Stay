const STORAGE_KEY = "sovereign-stay:provider-listings:v1";

function readRecords() {
  let serialized;
  try {
    serialized = globalThis.localStorage?.getItem(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Could not read local listings: ${error.message}`);
  }
  if (!serialized) return [];

  try {
    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) throw new TypeError("Saved listing data is not a list.");
    return records;
  } catch (error) {
    throw new Error(`Saved listing data could not be read: ${error.message}`);
  }
}

function writeRecords(records) {
  try {
    if (!globalThis.localStorage) throw new Error("Browser storage is unavailable.");
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    throw new Error(`Could not save local listings: ${error.message}`);
  }
}

function createId(records) {
  let id;
  do {
    id = `listing-local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  } while (records.some((record) => record.id === id));
  return id;
}

function normalize(values) {
  const text = (value) => String(value ?? "").trim();
  return {
    name: text(values.name),
    propertyId: values.propertyId,
    description: text(values.description),
    propertyType: text(values.propertyType),
    locationSummary: text(values.locationSummary),
    institution: text(values.institution),
    availableFrom: values.availableFrom || "",
    availabilityStatus: values.availabilityStatus,
    facilityNames: Array.isArray(values.facilityNames) ? values.facilityNames : [],
    utilities: text(values.utilities),
    houseRules: text(values.houseRules),
    depositRequirements: text(values.depositRequirements),
    contactPreference: values.contactPreference,
    viewingPreference: text(values.viewingPreference),
  };
}

export function getStoredProviderListings(providerId) {
  return readRecords().filter((listing) => listing.ownerId === providerId);
}

export function getStoredProviderListing(providerId, listingId) {
  return getStoredProviderListings(providerId)
    .find((listing) => listing.id === listingId) ?? null;
}

export function getStoredListingOverrides() {
  return readRecords().filter((listing) => listing.isFixtureOverride);
}

export function createProviderListingRecord(providerId, values) {
  const records = readRecords();
  const now = new Date().toISOString();
  const listing = {
    id: createId(records),
    ownerId: providerId,
    ...normalize(values),
    status: "draft",
    isDemo: true,
    isFixtureOverride: false,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
  writeRecords([...records, listing]);
  return listing;
}

export function updateProviderListingRecord(providerId, listingId, values, baseListing) {
  const records = readRecords();
  const index = records.findIndex(
    (listing) => listing.id === listingId && listing.ownerId === providerId,
  );
  const existing = index === -1
    ? {
      id: listingId,
      ownerId: providerId,
      status: baseListing.status,
      createdAt: baseListing.createdAt ?? null,
      publishedAt: baseListing.publishedAt ?? null,
      isDemo: true,
      isFixtureOverride: true,
    }
    : records[index];
  const updated = {
    ...existing,
    ...normalize(values),
    updatedAt: new Date().toISOString(),
  };
  const next = records.slice();
  if (index === -1) next.push(updated);
  else next[index] = updated;
  writeRecords(next);
  return updated;
}

export function setProviderListingStatusRecord(providerId, listingId, status, baseListing) {
  const records = readRecords();
  const index = records.findIndex(
    (listing) => listing.id === listingId && listing.ownerId === providerId,
  );
  const existing = index === -1
    ? {
      ...baseListing,
      ownerId: providerId,
      isDemo: true,
      isFixtureOverride: true,
    }
    : records[index];
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    status,
    publishedAt: status === "published" ? (existing.publishedAt ?? now) : null,
    updatedAt: now,
  };
  const next = records.slice();
  if (index === -1) next.push(updated);
  else next[index] = updated;
  writeRecords(next);
  return updated;
}

export function deleteProviderListingRecord(providerId, listingId) {
  const records = readRecords();
  const listing = records.find(
    (record) => record.id === listingId && record.ownerId === providerId,
  );
  if (!listing) throw new Error("This listing could not be found in your provider workspace.");
  writeRecords(records.filter((record) => record.id !== listingId));
  return listing;
}
