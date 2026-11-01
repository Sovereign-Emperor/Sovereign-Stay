import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import { formatPrice } from "../../utils/format";

function renderProviderRoute(path = "/provider") {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("provider dashboard demo routes", () => {
  it("shows owner-scoped summary and recent demonstration properties", () => {
    renderProviderRoute();

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Demonstration workspace.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Greenview Student Residences" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hilltop Court Hostel" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Demo workspace summary" });
    expect(within(summary).getByText("Total properties")).toBeInTheDocument();
    expect(within(summary).getByText("Active listings")).toBeInTheDocument();
    expect(within(summary).getByText("Pending listings")).toBeInTheDocument();
    expect(within(summary).getByText("Total enquiries")).toBeInTheDocument();
    expect(within(summary).getByText("3")).toBeInTheDocument();
    expect(within(summary).getAllByText("0")).toHaveLength(2);
    expect(within(summary).getByText("6")).toBeInTheDocument();

    const greenviewCard = screen
      .getByRole("heading", { name: "Greenview Student Residences" })
      .closest("article");
    expect(within(greenviewCard).getByText("Poly Junction, Koforidua")).toBeInTheDocument();
    expect(within(greenviewCard).getByText("1 room offer")).toBeInTheDocument();
    expect(within(greenviewCard).getByText(formatPrice(2800))).toBeInTheDocument();
    expect(within(greenviewCard).getByText("Draft")).toBeInTheDocument();
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

  it("routes add-property and enquiry actions to honest placeholders", async () => {
    const user = userEvent.setup();
    renderProviderRoute();

    await user.click(
      screen.getByRole("link", {
        name: "Add a property Property creation is a demo placeholder",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Property creation is coming next." })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Review demo properties" }));
    const navigation = screen.getByRole("navigation", { name: "Provider navigation" });
    await user.click(within(navigation).getByRole("link", { name: "Enquiries" }));
    expect(await screen.findByRole("heading", { name: "Enquiry management is not connected yet." })).toBeInTheDocument();
    expect(screen.getByText(/There are no real student messages/)).toBeInTheDocument();
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
    expect(screen.getByText(/Management is read-only in this milestone/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View listing preview" })).toHaveAttribute(
      "href",
      "/properties/greenview-residences",
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
