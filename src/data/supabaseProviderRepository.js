import { getSupabaseClient } from "./supabaseClient";

const LISTING_FIELDS = "id, property_id, name, description, accommodation_category, status, created_at, updated_at, published_at, location_summary, nearby_institution, availability_status, available_from, included_utilities, house_rules, deposit_requirements, contact_preference, viewing_preference";

async function getClient() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Provider data requires a configured Supabase project.");
  return client;
}

export async function submitProviderListingForReview(listingId) {
  const client = await getClient();
  const { error } = await client.rpc("submit_listing_for_review", {
    p_listing_id: listingId,
  });
  if (error) throw error;
}

export async function archiveProviderListing(listingId) {
  const client = await getClient();
  const { error } = await client.rpc("archive_provider_listing", {
    p_listing_id: listingId,
  });
  if (error) throw error;
}

export async function getProviderWorkspaces() {
  const client = await getClient();
  const { data, error } = await client
    .from("provider_business_memberships")
    .select("provider_business_id, membership_role, provider_businesses(id, display_name, verification_status)")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((membership) => ({
    id: membership.provider_business_id,
    role: membership.membership_role,
    business: Array.isArray(membership.provider_businesses)
      ? membership.provider_businesses[0]
      : membership.provider_businesses,
  }));
}

export async function getProviderWorkspaceRecords() {
  const client = await getClient();
  const workspaces = await getProviderWorkspaces();
  const businessIds = workspaces.map(({ id }) => id);
  const { data: facilityData, error: facilityError } = await client
    .from("facilities")
    .select("display_name")
    .order("display_name");
  if (facilityError) throw facilityError;
  const facilities = (facilityData ?? []).map(({ display_name: displayName }) => displayName);
  if (!businessIds.length) return { workspaces, properties: [], listings: [], enquiries: [], bookings: [], facilities };

  const [propertyResult, enquiryResult, bookingResult] = await Promise.all([
    client.from("properties")
      .select("id, provider_business_id, location_id, name, property_type, description, verification_status, created_at, updated_at, locations(label, area, city, region)")
      .in("provider_business_id", businessIds)
      .order("updated_at", { ascending: false }),
    client.from("enquiries")
      .select("id, provider_business_id, listing_id, status, created_at")
      .in("provider_business_id", businessIds),
    client.from("bookings")
      .select("id, provider_business_id, listing_id, status, created_at")
      .in("provider_business_id", businessIds),
  ]);
  if (propertyResult.error) throw propertyResult.error;
  if (enquiryResult.error) throw enquiryResult.error;
  if (bookingResult.error) throw bookingResult.error;
  const propertyRecords = propertyResult.data ?? [];
  let properties = propertyRecords;
  if (propertyRecords.length) {
    const { data: addressData, error: addressError } = await client.rpc(
      "get_authorized_property_addresses",
      { p_property_ids: propertyRecords.map(({ id }) => id) },
    );
    if (addressError) throw addressError;
    const addressesByPropertyId = new Map(
      (addressData ?? []).map(({ property_id: id, exact_address: address }) => [id, address]),
    );
    properties = propertyRecords.map((property) => ({
      ...property,
      address: addressesByPropertyId.get(property.id) ?? "",
    }));
  }
  const propertyIds = properties.map(({ id }) => id);
  let listings = [];
  if (propertyIds.length) {
    const { data, error } = await client.from("listings")
        .select(`${LISTING_FIELDS}, properties!inner(provider_business_id, name), listing_rooms(id, label, description, price_amount, currency, pricing_period, occupancy, available_quantity, is_active, deposit_amount, features, availability_status, room_types(display_name)), listing_facilities(facilities(display_name)), listing_media(id, processing_status, is_cover, sort_order)`)
      .in("property_id", propertyIds)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    listings = data ?? [];
  }
  return {
    workspaces,
    properties,
    listings,
    enquiries: enquiryResult.data ?? [],
    bookings: bookingResult.data ?? [],
    facilities,
  };
}

export async function getProviderProperties() {
  return (await getProviderWorkspaceRecords()).properties;
}

export async function saveProviderProperty(values, propertyId = null) {
  const client = await getClient();
  const { data, error } = await client.rpc("save_provider_property", {
    p_values: values,
    p_property_id: propertyId,
  });
  if (error) throw error;
  return data;
}

export async function saveProviderListing(listingId, values, offers, publishing) {
  const client = await getClient();
  const roomRecords = offers.map((offer) => ({
    id: offer.id ?? null,
    roomType: offer.roomType,
    description: offer.description,
    occupancy: Number(offer.occupancy),
    quantity: Number(offer.quantity),
    price: Number(offer.price),
    period: offer.period,
    deposit: offer.deposit == null ? "" : String(offer.deposit),
    availabilityStatus: offer.availabilityStatus,
    features: offer.features,
  }));
  const { data, error } = await client.rpc("save_provider_listing", {
    p_listing_id: listingId,
    p_values: {
      ...values,
      houseRules: String(values.houseRules ?? "").split(/\r?\n/).map((part) => part.trim()).filter(Boolean),
    },
    p_rooms: roomRecords,
    p_facility_names: values.facilityNames ?? [],
    p_submit_for_review: publishing,
  });
  if (error) throw error;
  return data;
}

export async function uploadListingMedia(listingId, files) {
  if (!files.length) return [];
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name}: use a JPG, PNG, or WebP image up to 5 MB.`);
    }
  }

  const client = await getClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) {
    throw new Error("A signed-in provider account is required to upload listing images.");
  }

  const uploadedPaths = [];
  const mediaRows = files.map((file, index) => {
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${listingId}/${crypto.randomUUID()}.${extension}`;
    return {
      listing_id: listingId,
      kind: "image",
      storage_bucket: "listing-media",
      storage_path: path,
      sort_order: index,
      is_cover: index === 0,
      alt_text: file.name,
      uploaded_by: userData.user.id,
      processing_status: "pending",
      file,
    };
  });

  try {
    for (const row of mediaRows) {
      const { error: uploadError } = await client.storage.from("listing-media").upload(
        row.storage_path,
        row.file,
        { contentType: row.file.type, upsert: false },
      );
      if (uploadError) throw uploadError;
      uploadedPaths.push(row.storage_path);
    }

    const { data, error: metadataError } = await client.from("listing_media")
      .insert(mediaRows.map(({ file: _file, ...row }) => row))
      .select("id");
    if (metadataError) throw metadataError;
    return (data ?? []).map(({ id }) => id);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await client.storage.from("listing-media").remove(uploadedPaths);
      if (cleanupError) {
        const message = error instanceof Error ? error.message : "The listing photos could not be uploaded.";
        throw new Error(`${message} Uploaded photo cleanup failed: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

export async function processPendingListingMedia(listingId) {
  const client = await getClient();
  const { data: media, error: mediaError } = await client.from("listing_media")
    .select("id")
    .eq("listing_id", listingId)
    .in("processing_status", ["pending", "processing"])
    .order("sort_order");
  if (mediaError) throw mediaError;

  for (const { id } of media ?? []) {
    const { data, error } = await client.functions.invoke("listing-media-process", {
      body: { mediaId: id },
    });
    if (error) {
      throw new Error(`Photo processing failed. The photo remains private; retry from this listing. ${error.message}`);
    }
    if (data?.status !== "ready") {
      throw new Error("The photo processor did not confirm the image is ready. The photo remains private.");
    }
  }

  return media?.length ?? 0;
}

export async function requestProviderListingEdit(listingId) {
  const client = await getClient();
  const { error } = await client.rpc("request_provider_listing_edit", {
    p_listing_id: listingId,
  });
  if (error) throw error;
}
