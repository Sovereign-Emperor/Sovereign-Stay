/**
 * Format a whole-number accommodation price as Ghanaian cedis.
 *
 * @param {number} price Price amount in GHS.
 * @returns {string} A localized currency label.
 */
export const formatPrice = (price) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(price);
