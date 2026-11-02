import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import { formatPrice } from "../../utils/format";
import { createProviderProperty } from "../../services/providerDashboardService";

function renderProviderRoute(path = "/provider") {
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

describe("provider dashboard demo routes", () => {
  it("shows a newly created property in the overview and updates its total", async () => {
    await createProviderProperty("demo-provider-a", {
      name: "Latest local property",
      type: "Apartment",
      description: "",
      region: "Eastern",
      city: "Koforidua",
      area: "Adweso",
      address: "",
      institution: "",
    });
    renderProviderRoute();

    expect(screen.getByRole("region", { name: "Demo workspace summary" })).toHaveTextContent(
      "4",
    );
    expect(screen.getByRole("heading", { name: "Latest local property" })).toBeInTheDocument();
  });

  it("shows owner-scoped summary and recent demonstration properties", () => {
    renderProviderRoute();

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Demonstration workspace.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Greenview Student Residences" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hilltop Court Hostel" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Demo workspace summary" });
    expect(within(summary).getByText("Total properties")).toBeInTheDocument();
    expect(within(summary).getByText("Total listings")).toBeInTheDocument();
    expect(within(summary).getByText("Published listings")).toBeInTheDocument();
    expect(within(summary).getByText("Draft listings")).toBeInTheDocument();
    expect(within(summary).getByText("Available room offers")).toBeInTheDocument();
    expect(within(summary).getByText("New enquiries")).toBeInTheDocument();

    const greenviewCard = screen
      .getByRole("heading", { name: "Greenview Student Residences" })
      .closest("article");
    expect(within(greenviewCard).getByText("Poly Junction, Koforidua")).toBeInTheDocument();
    expect(within(greenviewCard).getByText("1 room offer")).toBeInTheDocument();
    expect(within(greenviewCard).getByText(formatPrice(2800))).toBeInTheDocument();
    expect(within(greenviewCard).getByText("Published")).toBeInTheDocument();
  });

  it("opens and closes the mobile provider navigation accessibly", async () => {
    const user = userEvent.setup();
    renderProviderRoute();

    const openButton = screen.getByRole("button", { name: "Open provider navigation" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    await user.click(openButton);

    const closeButton = within(screen.getByRole("banner")).getByRole("button", {
      name: "Close provider navigation",
    });
    expect(closeButton).toHaveAttribute("aria-expanded", "true");
    await user.click(closeButton);

    expect(screen.getByRole("button", { name: "Open provider navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens the property form and the functional local enquiries inbox", async () => {
    const user = userEvent.setup();
    renderProviderRoute();

    await user.click(
      screen.getByRole("link", {
        name: "Add a property Save a property in this browser's demo workspace",
      }),
    );
    expect(await screen.findByRole("heading", { level: 2, name: "Add a property" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Property name/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Cancel", exact: true }));
    const navigation = screen.getByRole("navigation", { name: "Provider navigation" });
    await user.click(within(navigation).getByRole("link", { name: "Enquiries" }));
    expect(await screen.findByRole("heading", { name: "No student enquiries yet" })).toBeInTheDocument();
    expect(screen.getByText(/Enquiries stay in this browser/)).toBeInTheDocument();
  });

  it("opens a read-only management view for an owned demo listing", async () => {
    const user = userEvent.setup();
    renderProviderRoute();

    await user.click(screen.getByRole("link", { name: "Manage Greenview Student Residences" }));
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Greenview Student Residences",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Browser-local demonstration workspace/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview listing" })).toHaveAttribute(
      "href", "/provider/listings/greenview-residences",
    );
  });

  it("keeps the existing marketplace reachable from the provider workspace", async () => {
    const user = userEvent.setup();
    renderProviderRoute();

    await user.click(screen.getByRole("link", { name: "Student marketplace" }));
    expect(await screen.findByLabelText("Search by property name or location")).toBeInTheDocument();
  });

  it("preserves the existing property detail and About routes", async () => {
    const user = userEvent.setup();
    renderProviderRoute("/properties/greenview-residences");

    expect(
      await screen.findByRole("heading", { name: "Greenview Student Residences" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "About us" }));
    expect(await screen.findByRole("heading", { name: /Finding home/ })).toBeInTheDocument();
  });
});
