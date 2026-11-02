import { GHANA_REGIONS } from "../data/ghanaRegions";

const requiredPropertyFields = [
  ["name", "Enter a property name."],
  ["type", "Choose an accommodation type."],
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
  const errors = Object.fromEntries(
    requiredPropertyFields
      .filter(([field]) => !values[field]?.trim())
      .map(([field, message]) => [field, message]),
  );

  if (!GHANA_REGIONS.includes(values.region?.trim())) {
    errors.region = values.region?.trim()
      ? "Choose a region from the list."
      : "Select a region.";
  }

  return errors;
}
