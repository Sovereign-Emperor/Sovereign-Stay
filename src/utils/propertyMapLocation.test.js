import { describe, expect, it } from "vitest";
import { getPropertyMapDetails } from "./propertyMapLocation";

describe("getPropertyMapDetails", () => {
  it("uses the listing's structured area instead of assuming every place is in Koforidua", () => {
    expect(getPropertyMapDetails({
      area: "Weija",
      city: "Accra",
      region: "Greater Accra",
      location: "Accra Ghana",
    })).toEqual({
      query: "Weija, Accra, Greater Accra, Ghana",
      areaLabel: "Weija",
      regionLabel: "Accra, Greater Accra, Ghana",
    });
  });

  it("falls back to the listing's public location when structured data is missing", () => {
    expect(getPropertyMapDetails({
      area: "",
      city: "",
      region: "",
      location: "Adweso, Koforidua",
    })).toEqual({
      query: "Adweso, Koforidua, Ghana",
      areaLabel: "Adweso, Koforidua",
      regionLabel: "Ghana",
    });
  });
});
