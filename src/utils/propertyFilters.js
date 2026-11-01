/**
 * Validate optional minimum and maximum prices entered in the discovery filters.
 *
 * @param {{ minPrice?: string | number, maxPrice?: string | number }} filters
 * @returns {string | null} A message for the user, or null when the range is valid.
 */
export function validatePriceRange({ minPrice = "", maxPrice = "" }) {
  const minimum = minPrice == null || minPrice === "" ? null : Number(minPrice);
  const maximum = maxPrice == null || maxPrice === "" ? null : Number(maxPrice);

  if (minimum !== null && !Number.isFinite(minimum)) {
    return "Enter a valid minimum price.";
  }

  if (minimum !== null && minimum < 0) {
    return "Minimum price must be zero or more.";
  }

  if (maximum !== null && !Number.isFinite(maximum)) {
    return "Enter a valid maximum price.";
  }

  if (maximum !== null && maximum < 0) {
    return "Maximum price must be zero or more.";
  }

  if (minimum !== null && maximum !== null && minimum > maximum) {
    return "Minimum price cannot be greater than maximum price.";
  }

  return null;
}

/**
 * Return the listings that match all active discovery filters.
 * Invalid price ranges intentionally return no matches; the page should show
 * the validation message instead of presenting that result as a genuine zero.
 *
 * @template {{ name: string, location: string, school: string, area: string, roomType: string, price: number, facilities: string[] }} T
 * @param {T[]} listings
 * @param {{ query?: string, school?: string, area?: string, roomType?: string, minPrice?: string | number, maxPrice?: string | number, facility?: string }} filters
 * @returns {T[]}
 */
export function filterProperties(listings, filters) {
  if (validatePriceRange(filters)) {
    return [];
  }

  const query = filters.query?.trim().toLowerCase() ?? "";
  const minimum =
    filters.minPrice == null || filters.minPrice === "" ? null : Number(filters.minPrice);
  const maximum =
    filters.maxPrice == null || filters.maxPrice === "" ? null : Number(filters.maxPrice);

  return listings.filter((property) => {
    const searchableText = `${property.name} ${property.location}`.toLowerCase();

    return (
      (!query || searchableText.includes(query)) &&
      (!filters.school || property.school === filters.school) &&
      (!filters.area || property.area === filters.area) &&
      (!filters.roomType || property.roomType === filters.roomType) &&
      (minimum === null || property.price >= minimum) &&
      (maximum === null || property.price <= maximum) &&
      (!filters.facility || property.facilities.includes(filters.facility))
    );
  });
}
