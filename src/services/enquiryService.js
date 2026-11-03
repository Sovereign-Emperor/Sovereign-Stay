import {
  createEnquiryRecord,
  getProviderEnquiries as readProviderEnquiries,
  getProviderEnquiry as readProviderEnquiry,
  updateEnquiryStatusRecord,
} from "../data/providerEnquiryRepository";
import {
  getMarketplaceListings as getPublishedListings,
  getProviderListingById,
} from "./providerListingService";
import { createSupabaseEnquiry } from "../data/supabaseEnquiryRepository";
import { isExplicitSupabaseMode } from "../data/supabaseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;
const ENQUIRY_STATUSES = ["new", "in_progress", "closed"];

export function validateEnquiry(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(values.email?.trim() ?? "")) errors.email = "Enter a valid email address.";
  if (!PHONE_PATTERN.test(values.phone?.trim() ?? "")) errors.phone = "Enter a valid phone number.";
  if (!values.message?.trim()) errors.message = "Add a message for the provider.";
  if (
    values.viewingDate &&
    Number.isNaN(Date.parse(`${values.viewingDate}T00:00:00`))
  ) {
    errors.viewingDate = "Enter a valid viewing date.";
  }
  return errors;
}

export function submitListingEnquiry(listingId, values) {
  const errors = validateEnquiry(values);
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors).join(" "));
  }
  const listing = getProviderListingByIdForPublic(listingId);
  if (!listing) throw new Error("This listing is no longer accepting enquiries.");
  return createEnquiryRecord({
    listingId,
    propertyId: listing.propertyId,
    providerId: listing.ownerId,
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    message: values.message.trim(),
    viewingDate: values.viewingDate || null,
  });
}

export async function submitAuthenticatedListingEnquiry(listingId, values, idempotencyKey) {
  const errors = validateEnquiry(values);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join(" "));
  if (!isExplicitSupabaseMode) throw new Error("Authenticated enquiries require explicit Supabase mode.");
  return createSupabaseEnquiry(listingId, values, idempotencyKey);
}

function getProviderListingByIdForPublic(listingId) {
  return getPublishedListings().find((listing) => listing.id === listingId) ?? null;
}

export function getProviderEnquiries(providerId, status = "") {
  return readProviderEnquiries(providerId)
    .map((enquiry) => ({
      enquiry,
      listing: getProviderListingById(providerId, enquiry.listingId),
    }))
    .filter(({ enquiry, listing }) =>
      listing?.ownerId === providerId && listing.propertyId === enquiry.propertyId)
    .filter(({ enquiry }) => !status || enquiry.status === status)
    .map(({ enquiry, listing }) => ({
      ...enquiry,
      listing,
    }))
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function getProviderEnquiry(providerId, enquiryId) {
  const enquiry = readProviderEnquiry(providerId, enquiryId);
  if (!enquiry) return null;
  const listing = getProviderListingById(providerId, enquiry.listingId);
  if (!listing || listing.propertyId !== enquiry.propertyId) return null;
  return { ...enquiry, listing };
}

export function updateProviderEnquiryStatus(providerId, enquiryId, status) {
  if (!ENQUIRY_STATUSES.includes(status)) {
    throw new Error("Choose a valid enquiry status.");
  }
  const enquiry = getProviderEnquiry(providerId, enquiryId);
  if (!enquiry) throw new Error("This enquiry could not be found in your provider inbox.");
  return updateEnquiryStatusRecord(providerId, enquiryId, status);
}
