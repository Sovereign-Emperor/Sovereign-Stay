const DATABASE_NAME = "sovereign-stay-provider-data";
const DATABASE_VERSION = 1;
const IMAGE_STORE_NAME = "property-images";

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(
      new Error("This browser does not support local image storage. Try a current browser."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      new Error(`Could not open local image storage: ${request.error?.message ?? "unknown error"}`),
    );
    request.onblocked = () => reject(
      new Error("Local image storage is blocked by another open tab. Close older Sovereign Stay tabs and retry."),
    );
  });
}

async function runImageTransaction(mode, operation) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, mode);
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    let result;

    try {
      result = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      database.close();
      resolve(result && typeof result === "object" && "result" in result ? result.result : result);
    };
    transaction.onerror = () => {
      database.close();
      reject(
        new Error(`Could not update local image storage: ${transaction.error?.message ?? "unknown error"}`),
      );
    };
    transaction.onabort = () => {
      database.close();
      reject(
        new Error(`Local image storage transaction was cancelled: ${transaction.error?.message ?? "unknown error"}`),
      );
    };
  });
}

function createPhotoId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `property-photo-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

/**
 * Persist the selected photo blobs separately from small property metadata.
 *
 * @param {string} propertyId Physical property identifier.
 * @param {Array<{ file: Blob, name?: string, fileName?: string, isCover?: boolean }>} images
 * @returns {Promise<Array<{ id: string, name: string, type: string, size: number, sortOrder: number, isCover: boolean }>>}
 */
export async function savePropertyImages(propertyId, images) {
  const media = images.map((image, index) => {
    if (!(image.file instanceof Blob)) {
      throw new Error("A selected property photo is no longer readable. Select it again and retry.");
    }

    return {
      id: createPhotoId(),
      propertyId,
      file: image.file,
      name: image.name ?? image.fileName ?? image.file.name ?? `Property photo ${index + 1}`,
      type: image.file.type,
      size: image.file.size,
      sortOrder: index,
      isCover: Boolean(image.isCover),
    };
  });

  if (media.length > 0 && !media.some(({ isCover }) => isCover)) {
    media[0].isCover = true;
  }

  if (media.length > 0) {
    await runImageTransaction("readwrite", (store) => {
      media.forEach((image) => {
        store.put({ id: image.id, propertyId, blob: image.file });
      });
    });
  }

  return media.map(({ id, name, type, size, sortOrder, isCover }) => ({
    id,
    name,
    type,
    size,
    sortOrder,
    isCover,
  }));
}

/** Load the local file data used to prefill the editable photo picker. */
export async function getPropertyImages(media = []) {
  if (media.length === 0) return [];

  const storedImages = await runImageTransaction("readonly", (store) => store.getAll());

  const imagesById = new Map(storedImages.map((image) => [image.id, image]));
  return media
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((photo) => {
      const storedImage = imagesById.get(photo.id);
      if (!storedImage?.blob) {
        throw new Error(`The saved photo "${photo.name}" could not be found in local browser storage.`);
      }

      const file = new File([storedImage.blob], photo.name, { type: photo.type });
      return { ...photo, file };
    });
}

/** Return the stored blob for a property thumbnail or detail photo. */
export async function getPropertyImageBlob(photoId) {
  const record = await runImageTransaction("readonly", (store) => store.get(photoId));
  return record?.blob ?? null;
}

/** Remove image blobs that are no longer referenced by a property record. */
export async function deletePropertyImages(photoIds) {
  if (photoIds.length === 0) return;

  await runImageTransaction("readwrite", (store) => {
    photoIds.forEach((photoId) => store.delete(photoId));
  });
}
