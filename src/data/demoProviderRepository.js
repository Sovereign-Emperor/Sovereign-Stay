import { demoUsers } from "./properties";
import { getDemoListingsForProperty, getDemoPropertiesForProvider } from "./demoPropertyRepository";

export const DEMO_PROVIDER_ID = "demo-provider-a";

/**
 * Read the example provider and only the demonstration listings
 * connected to that provider. This module is a local fixture boundary, not
 * authentication or an authorization check.
 *
 * @param {string} providerId Demo provider identifier.
 * @returns {{ provider: object, properties: object[], listings: object[], enquiries: object[] } | null}
 */
export function getDemoProviderWorkspace(providerId) {
  const provider = demoUsers.find((user) => user.id === providerId);

  if (!provider || !provider.isDemo) {
    return null;
  }

  const properties = getDemoPropertiesForProvider(providerId);
  const listings = properties.flatMap(({ id }) => getDemoListingsForProperty(id));
  return { provider, properties, listings, enquiries: [] };
}
