export function getPropertyMapDetails(property) {
  const area = property.area?.trim() || property.location?.trim() || "";
  const administrativeAreas = [property.city, property.region]
    .map((value) => value?.trim())
    .filter(Boolean);
  const searchAreas = [area, ...administrativeAreas].filter(Boolean);
  const regionLabel = [...administrativeAreas, "Ghana"].join(", ");

  return {
    query: [...(searchAreas.length ? searchAreas : [property.location]), "Ghana"]
      .filter(Boolean)
      .join(", "),
    areaLabel: area || "Location not provided",
    regionLabel,
  };
}
