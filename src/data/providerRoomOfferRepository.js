const STORAGE_KEY = "sovereign-stay:provider-room-offers:v1";

function readRecords() {
  let serialized;
  try {
    serialized = globalThis.localStorage?.getItem(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Could not read local room offers: ${error.message}`);
  }
  if (!serialized) return [];
  try {
    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) throw new TypeError("Saved room-offer data is not a list.");
    return records;
  } catch (error) {
    throw new Error(`Saved room-offer data could not be read: ${error.message}`);
  }
}

function writeRecords(records) {
  try {
    if (!globalThis.localStorage) throw new Error("Browser storage is unavailable.");
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    throw new Error(`Could not save local room offers: ${error.message}`);
  }
}

function createId(records) {
  let id;
  do {
    id = `room-local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  } while (records.some((record) => record.id === id));
  return id;
}

function normalize(offer) {
  const text = (value) => String(value ?? "").trim();
  return {
    roomType: text(offer.roomType),
    description: text(offer.description),
    occupancy: Number(offer.occupancy),
    quantity: Number(offer.quantity),
    price: Number(offer.price),
    currency: "GHS",
    period: offer.period,
    deposit: offer.deposit === "" ? null : Number(offer.deposit),
    availabilityStatus: offer.availabilityStatus,
    features: text(offer.features),
  };
}

export function getRoomOffersForListing(listingId) {
  return readRecords().filter((offer) => offer.listingId === listingId);
}

export function getRoomOffersForListings(listingIds) {
  const ids = new Set(listingIds);
  return readRecords().filter((offer) => ids.has(offer.listingId));
}

export function replaceListingRoomOffers(listingId, offers) {
  const records = readRecords();
  const previous = records.filter((offer) => offer.listingId === listingId);
  const nextOffers = offers.map((offer) => ({
    id: offer.id ?? createId([...records, ...offers]),
    listingId,
    ...normalize(offer),
    createdAt: offer.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  writeRecords([
    ...records.filter((offer) => offer.listingId !== listingId),
    ...nextOffers,
  ]);
  return { previous, offers: nextOffers };
}

export function deleteRoomOffersForListing(listingId) {
  const records = readRecords();
  writeRecords(records.filter((offer) => offer.listingId !== listingId));
}
