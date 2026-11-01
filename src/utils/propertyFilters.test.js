import { describe, expect, it } from "vitest";
import { filterProperties, validatePriceRange } from "./propertyFilters";

const properties = [
  {
    id: "greenview-residences",
    name: "Greenview Student Residences",
    location: "Poly Junction, Koforidua",
    area: "Poly Junction",
    school: "Koforidua Technical University",
    roomType: "2 in a room",
    price: 2800,
    facilities: ["Wi-Fi", "Water"],
  },
  {
    id: "hilltop-court",
    name: "Hilltop Court Hostel",
    location: "Oyoko, Koforidua",
    area: "Oyoko",
    school: "Koforidua Technical University",
    roomType: "4 in a room",
    price: 1950,
    facilities: ["Water", "Kitchen"],
  },
];

describe("filterProperties", () => {
  it("searches property names and locations without case sensitivity", () => {
    expect(filterProperties(properties, { query: "HILLTOP" }).map(({ id }) => id)).toEqual([
      "hilltop-court",
    ]);
    expect(filterProperties(properties, { query: "poly junction" }).map(({ id }) => id)).toEqual([
      "greenview-residences",
    ]);
  });

  it("applies minimum and maximum prices together with room and facility filters", () => {
    const matches = filterProperties(properties, {
      minPrice: "2000",
      maxPrice: "3000",
      roomType: "2 in a room",
      facility: "Wi-Fi",
    });

    expect(matches.map(({ id }) => id)).toEqual(["greenview-residences"]);
  });

  it("returns all listings when no filters are selected", () => {
    expect(filterProperties(properties, {})).toHaveLength(properties.length);
  });

  it("does not return misleading matches for an invalid price range", () => {
    expect(filterProperties(properties, { minPrice: "4000", maxPrice: "2000" })).toEqual([]);
    expect(filterProperties(properties, { minPrice: "-1" })).toEqual([]);
  });
});

describe("validatePriceRange", () => {
  it("accepts empty bounds and a valid inclusive range", () => {
    expect(validatePriceRange({})).toBeNull();
    expect(validatePriceRange({ minPrice: "", maxPrice: "0" })).toBeNull();
    expect(validatePriceRange({ minPrice: "2000", maxPrice: "3000" })).toBeNull();
  });

  it("rejects negative and non-numeric prices", () => {
    expect(validatePriceRange({ minPrice: "-1" })).toMatch(/zero or more/i);
    expect(validatePriceRange({ maxPrice: "-5" })).toMatch(/zero or more/i);
    expect(validatePriceRange({ minPrice: "not a price" })).toMatch(/valid minimum price/i);
  });

  it("rejects a minimum price greater than the maximum", () => {
    expect(validatePriceRange({ minPrice: "3000", maxPrice: "2000" })).toMatch(
      /cannot be greater than/i,
    );
  });
});
