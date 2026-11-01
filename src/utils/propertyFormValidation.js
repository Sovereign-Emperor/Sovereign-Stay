const requiredPropertyFields = [
  ["name", "Enter a property name."],
  ["type", "Choose an accommodation type."],
  ["region", "Enter a region."],
  ["city", "Enter a city."],
  ["area", "Enter an area or neighbourhood."],
];

/**
 * Validate required property form fields after trimming surrounding spaces.
 *
 * @param {Record<string, string>} values Current property form values.
 * @returns {Record<string, string>} Field-level validation messages.
 */
export function validatePropertyForm(values) {
  return Object.fromEntries(
    requiredPropertyFields
      .filter(([field]) => !values[field]?.trim())
      .map(([field, message]) => [field, message]),
  );
}
