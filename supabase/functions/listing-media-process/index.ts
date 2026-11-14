import { createClient } from "@supabase/supabase-js";
import {
  InvalidListingImageError,
  processListingImage,
} from "../_shared/image-processing.ts";
import { canProcessListingMedia } from "../_shared/listing-media-authorization.ts";

const BUCKET = "listing-media";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH_PATTERN = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/i;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

async function readBoundedBody(request: Request, maximumBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function relationOne<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function roleKeys(rows: Array<{ roles: { role_key: string } | { role_key: string }[] | null }>) {
  return rows.map(({ roles }) => relationOne(roles)?.role_key).filter((role): role is string => Boolean(role));
}

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "A signed-in provider account is required." }, 401);
  }

  const bodyBytes = await readBoundedBody(request, 4_096);
  if (!bodyBytes) return jsonResponse({ error: "Request body is too large." }, 413);

  let body: { mediaId?: unknown };
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes));
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (!body || typeof body !== "object" || typeof body.mediaId !== "string" || !UUID_PATTERN.test(body.mediaId)) {
    return jsonResponse({ error: "A valid media ID is required." }, 400);
  }

  let processedPath = "";
  let originalPath = "";
  let mediaId = "";
  let serviceClient: ReturnType<typeof createClient> | null = null;
  try {
    const url = requiredEnvironment("SUPABASE_URL");
    const anonKey = requiredEnvironment("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "The signed-in account could not be verified." }, 401);
    }

    serviceClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [profileResult, roleResult, mediaResult] = await Promise.all([
      serviceClient.from("profiles").select("account_status").eq("id", userData.user.id).maybeSingle(),
      serviceClient.from("user_roles").select("roles!inner(role_key)").eq("user_id", userData.user.id),
      serviceClient.from("listing_media")
        .select("id, listing_id, storage_bucket, storage_path, processing_status")
        .eq("id", body.mediaId)
        .maybeSingle(),
    ]);
    if (profileResult.error || roleResult.error || mediaResult.error) {
      console.error("listing_media.authorization_lookup_failed", {
        profileCode: profileResult.error?.code,
        roleCode: roleResult.error?.code,
        mediaCode: mediaResult.error?.code,
      });
      return jsonResponse({ error: "Photo access could not be verified." }, 503);
    }
    const media = mediaResult.data;
    if (!profileResult.data || !media || media.storage_bucket !== BUCKET) {
      return jsonResponse({ error: "Photo not found for this account." }, 404);
    }

    const { data: listing, error: listingError } = await serviceClient
      .from("listings")
      .select("id, status, properties!inner(provider_business_id)")
      .eq("id", media.listing_id)
      .maybeSingle();
    if (listingError || !listing) {
      console.error("listing_media.listing_lookup_failed", { code: listingError?.code });
      return jsonResponse({ error: "The listing could not be verified." }, 503);
    }

    const property = relationOne(listing.properties);
    const isAdmin = roleKeys(roleResult.data ?? []).includes("admin");
    let membershipRole: string | null = null;
    if (!isAdmin && property?.provider_business_id) {
      const { data: membership, error: membershipError } = await serviceClient
        .from("provider_business_memberships")
        .select("membership_role")
        .eq("provider_business_id", property.provider_business_id)
        .eq("user_id", userData.user.id)
        .in("membership_role", ["owner", "manager", "editor"])
        .maybeSingle();
      if (membershipError) {
        console.error("listing_media.membership_lookup_failed", { code: membershipError.code });
        return jsonResponse({ error: "Photo access could not be verified." }, 503);
      }
      membershipRole = membership?.membership_role ?? null;
    }

    if (!canProcessListingMedia({
      userId: userData.user.id,
      accountStatus: profileResult.data.account_status,
      roles: roleKeys(roleResult.data ?? []),
      membershipRole,
      listingStatus: listing.status,
    })) {
      return jsonResponse({ error: "You do not have permission to process photos for this listing." }, 403);
    }
    if (media.processing_status === "ready") {
      return jsonResponse({ status: "ready", mediaId: media.id });
    }
    if (!PATH_PATTERN.test(media.storage_path) || !media.storage_path.startsWith(`${media.listing_id}/`)) {
      return jsonResponse({ error: "The stored photo path is invalid." }, 409);
    }
    if (!["pending", "processing"].includes(media.processing_status)) {
      return jsonResponse({ error: "This photo cannot be processed in its current state." }, 409);
    }

    originalPath = media.storage_path;
    mediaId = media.id;
    const { error: processingError } = await serviceClient
      .from("listing_media")
      .update({ processing_status: "processing" })
      .eq("id", media.id)
      .in("processing_status", ["pending", "processing"]);
    if (processingError) {
      console.error("listing_media.processing_state_failed", { code: processingError.code });
      return jsonResponse({ error: "The photo could not be prepared for processing." }, 503);
    }

    const { data: file, error: downloadError } = await serviceClient.storage
      .from(BUCKET)
      .download(originalPath);
    if (downloadError || !file) {
      await serviceClient.from("listing_media")
        .update({ processing_status: "rejected" })
        .eq("id", media.id);
      return jsonResponse({ error: "The uploaded photo could not be found." }, 422);
    }

    let processedBytes: Uint8Array;
    try {
      if (file.size > 5 * 1024 * 1024) throw new InvalidListingImageError();
      processedBytes = await processListingImage(new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof InvalidListingImageError) {
        const { error: rejectError } = await serviceClient.from("listing_media")
          .update({ processing_status: "rejected" })
          .eq("id", media.id);
        if (rejectError) console.error("listing_media.rejection_record_failed", { code: rejectError.code });
        const { error: removeError } = await serviceClient.storage.from(BUCKET).remove([originalPath]);
        if (removeError) console.error("listing_media.rejected_object_cleanup_failed", { code: removeError.name });
        return jsonResponse({ error: error.message }, 422);
      }
      throw error;
    }

    processedPath = `${media.listing_id}/${media.id}-${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await serviceClient.storage.from(BUCKET).upload(
      processedPath,
      processedBytes,
      { contentType: "image/webp", cacheControl: "31536000", upsert: true },
    );
    if (uploadError) {
      console.error("listing_media.processed_upload_failed", { code: uploadError.name });
      throw new Error("The processed photo could not be saved.");
    }

    const { data: updatedMedia, error: updateError } = await serviceClient
      .from("listing_media")
      .update({
        storage_bucket: BUCKET,
        storage_path: processedPath,
        processing_status: "ready",
      })
      .eq("id", media.id)
      .in("processing_status", ["pending", "processing"])
      .select("id")
      .maybeSingle();
    if (updateError || !updatedMedia) {
      const { data: currentMedia, error: currentError } = await serviceClient
        .from("listing_media")
        .select("processing_status, storage_path")
        .eq("id", media.id)
        .maybeSingle();
      if (!currentError && currentMedia?.processing_status === "ready") {
        if (processedPath !== currentMedia.storage_path) {
          const { error: cleanupError } = await serviceClient.storage.from(BUCKET).remove([processedPath]);
          if (cleanupError) console.error("listing_media.duplicate_object_cleanup_failed", { code: cleanupError.name });
        }
        return jsonResponse({ status: "ready", mediaId: media.id });
      }
      console.error("listing_media.ready_state_failed", { code: updateError?.code });
      throw new Error("The processed photo could not be published.");
    }

    if (originalPath !== processedPath) {
      const { error: cleanupError } = await serviceClient.storage.from(BUCKET).remove([originalPath]);
      if (cleanupError) {
        console.error("listing_media.original_object_cleanup_failed", { code: cleanupError.name });
      }
    }
    return jsonResponse({ status: "ready", mediaId: media.id });
  } catch (error) {
    console.error("listing_media.processing_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    if (serviceClient && mediaId) {
      const { data: currentMedia, error: currentError } = await serviceClient
        .from("listing_media")
        .select("processing_status")
        .eq("id", mediaId)
        .maybeSingle();
      if (!currentError && currentMedia?.processing_status === "processing") {
        if (processedPath && processedPath !== originalPath) {
          const { error: cleanupError } = await serviceClient.storage.from(BUCKET).remove([processedPath]);
          if (cleanupError) console.error("listing_media.failed_object_cleanup_failed", { code: cleanupError.name });
        }
        const { error: resetError } = await serviceClient.from("listing_media")
          .update({ processing_status: "pending" })
          .eq("id", mediaId)
          .eq("processing_status", "processing");
        if (resetError) console.error("listing_media.retry_state_reset_failed", { code: resetError.code });
      }
    }
    return jsonResponse({ error: "Photo processing failed. Retry from the provider listing manager." }, 503);
  }
});
