import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { demoProperties } from "../../data/demoPropertyRepository";
import { demoListings } from "../../data/properties";
import {
  buildProviderPropertyViewModels,
  filterProviderProperties,
} from "../../services/providerDashboardService";
import { formatPrice } from "../../utils/format";

function renderProviderRoute(path) {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("provider property management", () => {
  it("searches property names and combines search with listing-status filters", async () => {
    const user = userEvent.setup();
    renderProviderRoute("/provider/properties");

    const summary = screen.getByRole("region", { name: "Property summary" });
    expect(summary).toHaveTextContent("Total properties");
    expect(summary).toHaveTextContent("With active listings");
    expect(summary).toHaveTextContent("With draft listings");
    expect(summary).toHaveTextContent("3");
    expect(summary).toHaveTextContent("0");
    expect(screen.getByText("3 properties")).toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "Search properties" });
    await user.type(search, "Hilltop");

    expect(screen.getByRole("heading", { name: "Hilltop Court Hostel" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Greenview Student Residences" })).not.toBeInTheDocument();
    expect(screen.getByText("1 property")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Listing status"),
      "draft",
    );
    expect(screen.getByRole("heading", { name: "Hilltop Court Hostel" })).toBeInTheDocument();
    expect(screen.getByText("1 property")).toBeInTheDocument();
  });

  it("shows a filtered empty state and clears active filters", async () => {
    const user = userEvent.setup();
    renderProviderRoute("/provider/properties");

    await user.selectOptions(screen.getByLabelText("Listing status"), "published");
    expect(screen.getByRole("heading", { name: "No properties match these filters" })).toBeInTheDocument();
    expect(screen.getByText("0 properties")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(screen.getByRole("heading", { name: "Greenview Student Residences" })).toBeInTheDocument();
    expect(screen.getByText("3 properties")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search properties" }), {
      target: { value: "No matching place" },
    });
    expect(screen.getByRole("heading", { name: "No properties match these filters" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(screen.getByText("3 properties")).toBeInTheDocument();
  });

  it("keeps properties normalized and supports multiple listings for one property", () => {
    const propertyIds = new Set(demoProperties.map(({ id }) => id));
    expect(demoListings.every((listing) => propertyIds.has(listing.propertyId))).toBe(true);
    expect(demoProperties.every((property) => property.ownerId.startsWith("demo-provider-"))).toBe(true);

    const originalListing = demoListings.find(({ id }) => id === "greenview-residences");
    const physicalProperty = demoProperties.find(
      ({ id }) => id === originalListing.propertyId,
    );
    const secondListing = {
      ...originalListing,
      id: "greenview-second-ad",
      name: "Greenview alternate room listing",
      status: "published",
      rooms: originalListing.rooms.map((room) => ({
        ...room,
        id: "greenview-second-room",
        price: { ...room.price, period: "month" },
      })),
    };
    const [property] = buildProviderPropertyViewModels(
      [physicalProperty],
      [originalListing, secondListing],
    );

    expect(property.listingCount).toBe(2);
    expect(property.roomOfferCount).toBe(2);
    expect(property.listings.map(({ id }) => id)).toEqual([
      "greenview-residences",
      "greenview-second-ad",
    ]);
    expect(property.statuses).toEqual(["draft", "published"]);
    expect(property.startingPrice).toBeNull();
    expect(filterProviderProperties([property], { status: "published" })).toHaveLength(1);
  });

  it("shows linked listings, room offers, prices, and status on property details", () => {
    renderProviderRoute("/provider/properties/property-greenview");

    expect(
      screen.getByRole("heading", { level: 2, name: "Greenview Student Residences" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listings for this property" })).toBeInTheDocument();
    expect(screen.getByText("1 listing")).toBeInTheDocument();
    expect(screen.getByText("2 in a room")).toBeInTheDocument();
    expect(screen.getByText("2 people")).toBeInTheDocument();
    expect(screen.getByText(formatPrice(2800))).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View listing preview" })).toHaveAttribute(
      "href",
      "/properties/greenview-residences",
    );
  });

  it("renders a not-found state for an unknown provider property id", () => {
    renderProviderRoute("/provider/properties/unknown-property");

    expect(screen.getByRole("heading", { name: "This example is not in your workspace." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to properties" })).toHaveAttribute(
      "href",
      "/provider/properties",
    );
  });
});
