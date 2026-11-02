import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { GHANA_REGIONS } from "../../data/ghanaRegions";

function renderPropertyForm(path = "/provider/properties/new") {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.removeItem("sovereign-stay:provider-properties:v1");
  vi.restoreAllMocks();
});

describe("provider property creation form", () => {
  it("shows inline errors for every required field and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.click(screen.getByRole("button", { name: "Save property" }));

    expect(screen.getByText("Enter a property name.")).toBeInTheDocument();
    expect(screen.getByText("Choose an accommodation type.")).toBeInTheDocument();
    expect(screen.getByText("Select a region.")).toBeInTheDocument();
    expect(screen.getByText("Enter a city.")).toBeInTheDocument();
    expect(screen.getByText("Enter an area or neighbourhood.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Property name/)).toHaveFocus();
    expect(screen.getByLabelText(/Property name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("creates a browser-local property record after all required fields validate", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), " Example residence ");
    await user.selectOptions(screen.getByLabelText(/Accommodation type/), "Hostel");
    await user.selectOptions(screen.getByLabelText(/Region/), "Eastern");
    await user.type(screen.getByLabelText(/City/), "Koforidua");
    await user.type(screen.getByLabelText(/Area or neighbourhood/), "Poly Junction");
    await user.type(
      screen.getByLabelText(/Description/),
      "A student accommodation demonstration.",
    );
    await user.click(screen.getByRole("button", { name: "Save property" }));

    expect(screen.queryByText(/Enter a property name/)).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Example residence" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No listing or room offer was created.");
    const [property] = JSON.parse(localStorage.getItem("sovereign-stay:provider-properties:v1"));
    expect(property.id).toMatch(/^property-local-/);
    expect(property.ownerId).toBe("demo-provider-a");
    expect(property.city).toBe("Koforidua");
    expect(property.media).toEqual([]);
  }, 15000);

  it("prevents a rapid duplicate property submission", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), "One example property");
    await user.selectOptions(screen.getByLabelText(/Accommodation type/), "Hostel");
    await user.selectOptions(screen.getByLabelText(/Region/), "Eastern");
    await user.type(screen.getByLabelText(/City or town/), "Koforidua");
    await user.type(screen.getByLabelText(/Area or neighbourhood/), "Adweso");
    await user.dblClick(screen.getByRole("button", { name: "Save property" }));

    expect(await screen.findByRole("heading", { name: "One example property" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("sovereign-stay:provider-properties:v1"))).toHaveLength(1);
  });

  it("keeps a created property after the provider page is reloaded", async () => {
    const user = userEvent.setup();
    const rendered = renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), "Persistent demo property");
    await user.selectOptions(screen.getByLabelText(/Accommodation type/), "Apartment");
    await user.selectOptions(screen.getByLabelText(/Region/), "Ashanti");
    await user.type(screen.getByLabelText(/City or town/), "Kumasi");
    await user.type(screen.getByLabelText(/Area or neighbourhood/), "Ayeduase");
    await user.click(screen.getByRole("button", { name: "Save property" }));
    expect(await screen.findByRole("heading", { name: "Persistent demo property" })).toBeInTheDocument();

    rendered.unmount();
    renderPropertyForm("/provider/properties");
    expect(screen.getByRole("heading", { name: "Persistent demo property" })).toBeInTheDocument();
    expect(screen.getByText("4 properties")).toBeInTheDocument();
  });

  it("prefills, updates, and persists edits to an existing property", async () => {
    const user = userEvent.setup();
    const rendered = renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), "Editable local property");
    await user.selectOptions(screen.getByLabelText(/Accommodation type/), "Apartment");
    await user.selectOptions(screen.getByLabelText(/Region/), "Volta");
    await user.type(screen.getByLabelText(/City or town/), "Ho");
    await user.type(screen.getByLabelText(/Area or neighbourhood/), "Bankoe");
    await user.click(screen.getByRole("button", { name: "Save property" }));
    await screen.findByRole("heading", { name: "Editable local property" });
    const propertyId = JSON.parse(localStorage.getItem("sovereign-stay:provider-properties:v1"))[0].id;

    rendered.unmount();
    renderPropertyForm(`/provider/properties/${propertyId}/edit`);
    expect(await screen.findByLabelText(/Property name/)).toHaveValue("Editable local property");
    await user.clear(screen.getByLabelText(/Property name/));
    await user.type(screen.getByLabelText(/Property name/), "Updated local property");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "Updated local property" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("sovereign-stay:provider-properties:v1"))[0].name)
      .toBe("Updated local property");
  });

  it("prefills a fixture property and edits it without changing linked listings", async () => {
    const user = userEvent.setup();
    renderPropertyForm("/provider/properties/property-greenview/edit");

    expect(await screen.findByLabelText(/Property name/)).toHaveValue("Greenview Student Residences");
    expect(screen.getByLabelText(/Region/)).toHaveValue("Eastern");
    expect(screen.getByLabelText(/City or town/)).toHaveValue("Koforidua");
    await user.clear(screen.getByLabelText(/Property name/));
    await user.type(screen.getByLabelText(/Property name/), "Greenview physical property");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Greenview physical property" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listings for this property" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview listing" }))
      .toHaveAttribute("href", "/provider/listings/greenview-residences");
  });

  it("offers all sixteen Ghana regions from the reusable region catalogue", () => {
    renderPropertyForm();

    const regionSelect = screen.getByRole("combobox", { name: /Region/ });
    const options = Array.from(regionSelect.options);

    expect(options.map(({ value }) => value)).toEqual(["", ...GHANA_REGIONS]);
    expect(options[0]).toHaveTextContent("Select region");
    expect(GHANA_REGIONS).toHaveLength(16);
  });

  it("requires a selected region and focuses it when it is the first invalid field", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), "Example accommodation");
    await user.selectOptions(screen.getByLabelText(/Accommodation type/), "Hostel");
    await user.type(screen.getByLabelText(/City or town/), "Kumasi");
    await user.type(screen.getByLabelText(/Area or neighbourhood/), "Ayeduase");
    await user.click(screen.getByRole("button", { name: "Save property" }));

    expect(screen.getByText("Select a region.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Region/ })).toHaveFocus();
    expect(screen.getByRole("combobox", { name: /Region/ })).toHaveAttribute("aria-invalid", "true");
  });

  it("treats whitespace-only required fields as invalid and clears field errors after correction", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), "   ");
    await user.tab();
    expect(screen.getByText("Enter a property name.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Property name/));
    await user.type(screen.getByLabelText(/Property name/), "Cedar House");
    expect(screen.queryByText("Enter a property name.")).not.toBeInTheDocument();
  });

  it("returns to the properties page when Cancel is selected", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.click(screen.getByRole("link", { name: "Cancel", exact: true }));
    expect(screen.getByRole("heading", { name: "Manage your properties" })).toBeInTheDocument();
  });
});
