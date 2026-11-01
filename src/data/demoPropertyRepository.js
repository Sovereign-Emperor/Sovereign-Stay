import { demoProperties } from "./demoProperties";
import { demoListings } from "./properties";

export { demoProperties };

/**
 * Return the physical properties owned by a demo provider.
 *
 * @param {string} providerId Demo provider identifier.
 * @returns {typeof demoProperties}
 */
export function getDemoPropertiesForProvider(providerId) {
  return demoProperties.filter((property) => property.ownerId === providerId);
}

/**
 * Return listings attached to one property.
 *
 * @param {string} propertyId Physical property identifier.
 * @returns {typeof demoListings}
 */
export function getDemoListingsForProperty(propertyId) {
  return demoListings.filter((listing) => listing.propertyId === propertyId);
}
