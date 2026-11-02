const STORAGE_KEY = "sovereign-stay:provider-enquiries:v1";

function readRecords() {
  let serialized;
  try {
    serialized = globalThis.localStorage?.getItem(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Could not read local enquiries: ${error.message}`);
  }
  if (!serialized) return [];
  try {
    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) throw new TypeError("Saved enquiry data is not a list.");
    return records;
  } catch (error) {
    throw new Error(`Saved enquiry data could not be read: ${error.message}`);
  }
}

function writeRecords(records) {
  try {
    if (!globalThis.localStorage) throw new Error("Browser storage is unavailable.");
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    throw new Error(`Could not save local enquiries: ${error.message}`);
  }
}

function createId(records) {
  let id;
  do {
    id = `enquiry-local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  } while (records.some((record) => record.id === id));
  return id;
}

export function createEnquiryRecord(values) {
  const records = readRecords();
  const duplicate = records.find((record) =>
    record.listingId === values.listingId &&
    record.email.toLowerCase() === values.email.toLowerCase() &&
    record.message === values.message &&
    Date.now() - Date.parse(record.createdAt) < 30_000);
  if (duplicate) return { enquiry: duplicate, duplicate: true };

  const now = new Date().toISOString();
  const enquiry = {
    id: createId(records),
    ...values,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  writeRecords([...records, enquiry]);
  return { enquiry, duplicate: false };
}

export function getProviderEnquiries(providerId) {
  return readRecords().filter((enquiry) => enquiry.providerId === providerId);
}

export function getProviderEnquiry(providerId, enquiryId) {
  return getProviderEnquiries(providerId).find(({ id }) => id === enquiryId) ?? null;
}

export function updateEnquiryStatusRecord(providerId, enquiryId, status) {
  const records = readRecords();
  const index = records.findIndex(
    (record) => record.id === enquiryId && record.providerId === providerId,
  );
  if (index === -1) throw new Error("This enquiry could not be found in your provider inbox.");
  const updated = { ...records[index], status, updatedAt: new Date().toISOString() };
  const next = records.slice();
  next[index] = updated;
  writeRecords(next);
  return updated;
}
