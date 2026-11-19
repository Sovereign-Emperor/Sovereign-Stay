import { getSupabaseClient } from "./supabaseClient";
import { filterProperties } from "../utils/propertyFilters";

const LISTING_SELECT = `
  id, property_id, name, description, accommodation_category, status, published_at, created_at, updated_at,
  location_summary, nearby_institution, available_from, availability_status,
  included_utilities, house_rules, deposit_requirements, contact_preference,
  viewing_preference,
  properties!inner (
  id, location_id, name, property_type, description, verification_status,
    locations!inner (id, label, area, city, region, latitude, longitude)
  ),
  listing_institutions (institutions (name)),
  listing_rooms (
    id, label, description, price_amount, currency, pricing_period, occupancy,
    available_quantity, is_active, deposit_amount, features, availability_status,
    room_types (display_name),
    availability (status, available_quantity, last_confirmed_at)
  ),
  listing_media (
    id, kind, storage_bucket, storage_path, sort_order,
    is_cover, alt_text, processing_status
  ),
  listing_facilities (facilities (display_name))
`;

function one(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function mapListing(record, photos) {
  const property = one(record.properties);
  const location = one(property?.locations);
  const rooms = (record.listing_rooms ?? [])
    .filter((room) => room.is_active)
    .map((room) => {
      const currentAvailability = (room.availability ?? []).slice()
        .sort((a, b) => Date.parse(b.last_confirmed_at ?? 0) - Date.parse(a.last_confirmed_at ?? 0))[0];
      return {
        id: room.id,
        roomType: room.label || one(room.room_types)?.display_name || "Room option",
        roomTypeLabel: room.label || one(room.room_types)?.display_name || "Room option",
        occupancy: room.occupancy,
        price: Number(room.price_amount),
        currency: room.currency,
        period: room.pricing_period,
        pricePeriod: room.pricing_period,
        quantity: currentAvailability?.available_quantity ?? room.available_quantity,
        exampleRoomCount: currentAvailability?.available_quantity ?? room.available_quantity,
        availabilityStatus: currentAvailability?.status ?? room.availability_status ?? "unknown",
        description: room.description,
        deposit: room.deposit_amount == null ? null : Number(room.deposit_amount),
        features: room.features,
      };
    });
  const startingRoom = rooms.slice().sort((a, b) => a.price - b.price)[0];
  const facilities = (record.listing_facilities ?? [])
    .map((item) => one(item.facilities)?.display_name)
    .filter(Boolean);
  const images = photos
    .filter(({ listingId }) => listingId === record.id)
    .map(({ photo }) => photo)
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);
  const availability = rooms.some(({ availabilityStatus }) => availabilityStatus !== "unknown")
    ? rooms.find(({ availabilityStatus }) => availabilityStatus !== "unknown").availabilityStatus
    : "unknown";
  const propertyLocation = [location?.area, location?.city, location?.region]
    .filter(Boolean)
    .join(", ");

  return {
    id: record.id,
    propertyId: property?.id ?? record.property_id,
    propertyName: property?.name,
    ownerId: null,
    status: record.status,
    isDemo: false,
    providerVerificationStatus: "unverified",
    propertyVerificationStatus: property?.verification_status ?? "unverified",
    availabilityStatus: availability,
    lastUpdatedAt: record.updated_at,
    name: record.name,
    type: record.accommodation_category || property?.property_type || "Accommodation",
    location: record.location_summary || location?.label || propertyLocation || "Location not provided",
    area: location?.area ?? "",
    city: location?.city ?? "",
    region: location?.region ?? "",
    school: record.nearby_institution || ((record.listing_institutions ?? [])
      .map((item) => one(item.institutions)?.name)
      .filter(Boolean)[0]) || "",
    distanceKm: null,
    price: startingRoom?.price ?? null,
    pricePeriod: startingRoom?.pricePeriod ?? null,
    roomType: startingRoom?.roomType ?? "Room details not provided",
    availableRooms: rooms.reduce((total, room) => total + Number(room.quantity ?? 0), 0),
    roomOffers: rooms,
    facilities,
    description: record.description || property?.description || "",
    highlights: String(record.included_utilities || "").split(/[,;\n]/).map((text) => text.trim()).filter(Boolean),
    rules: record.house_rules ?? [],
    photos: images,
    property: {
      name: property?.name,
      area: location?.area ?? "",
      city: location?.city ?? "",
      region: location?.region ?? "",
      address: "",
    },
    availableFrom: record.available_from ?? "",
    contactPreference: record.contact_preference,
    viewingPreference: record.viewing_preference,
    depositRequirements: record.deposit_requirements,
  };
}

async function getPublishedListingRecords({ filters = {}, sortBy = "recommended", page = 1, pageSize = 12 } = {}) {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Supabase listing access is not configured.");
  const { data: matches, error: matchError } = await client.rpc("search_public_listings", {
    p_filters: filters,
    p_sort_by: sortBy,
    p_page: page,
    p_page_size: pageSize,
  });
  if (matchError) throw matchError;
  const ids = (matches ?? []).map(({ listing_id }) => listing_id);
  if (!ids.length) return { client, records: [], total: 0 };
  const { data: records, error } = await client.from("listings").select(LISTING_SELECT).in("id", ids);
  if (error) throw error;
  const recordsById = new Map((records ?? []).map((record) => [record.id, record]));
  return {
    client,
    records: ids.map((id) => recordsById.get(id)).filter(Boolean),
    total: Number(matches[0]?.total_count ?? 0),
  };
}

async function signListingPhotos(client, records, { coverOnly = false } = {}) {
  const media = records.flatMap((record) =>
    (record.listing_media ?? [])
      .filter((photo) => photo.kind === "image" && photo.processing_status === "ready")
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
      .slice(0, coverOnly ? 1 : undefined)
      .map((photo) => ({ listingId: record.id, ...photo })),
  );
  const signed = await Promise.all(media.map(async (photo) => {
    const { data, error } = await client.storage
      .from(photo.storage_bucket)
      .createSignedUrl(photo.storage_path, 60 * 30);
    if (error) throw error;
    return {
      listingId: photo.listingId,
      photo: {
        id: photo.id,
        url: data.signedUrl,
        alt: photo.alt_text || "Accommodation photo",
        sortOrder: photo.sort_order,
        isCover: photo.is_cover,
      },
    };
  }));
  return signed;
}

async function mapPublishedListings({ coverOnly = false, filters, sortBy, page, pageSize } = {}) {
  const { client, records, total } = await getPublishedListingRecords({ filters, sortBy, page, pageSize });
  const photos = await signListingPhotos(client, records, { coverOnly });
  return { items: records.map((record) => mapListing(record, photos)), total };
}

export async function searchSupabaseListings({ filters = {}, sortBy = "recommended", page = 1, pageSize = 12 }) {
  return mapPublishedListings({ coverOnly: true, filters, sortBy, page, pageSize });
}

export async function getSupabaseListingById(id) {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Supabase listing access is not configured.");
  const { data: record, error } = await client
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!record) return null;
  const photos = await signListingPhotos(client, [record]);
  return mapListing(record, photos);
}

export async function getSupabaseListingFilterOptions() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Supabase listing access is not configured.");
  const { data, error } = await client.rpc("public_listing_filter_options");
  if (error) throw error;
  return data;
}

export function filterSupabaseListings(listings, filters) {
  return filterProperties(listings, filters);
}
