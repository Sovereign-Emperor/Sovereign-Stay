import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

function renderRoute(path) {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("provider-to-student marketplace workflow", () => {
  it("creates and publishes a listing, accepts a student enquiry, then updates it in the provider inbox", async () => {
    const user = userEvent.setup();
    const providerView = renderRoute("/provider/listings/new");

    await user.type(screen.getByLabelText(/Listing headline/), "Adweso study room offer");
    await user.type(screen.getByLabelText(/Description/), "A clear local-demo room advertisement.");
    await user.selectOptions(screen.getByLabelText(/Accommodation category/), "Hostel");
    await user.type(screen.getByLabelText(/Nearby institution/), "Koforidua Technical University");
    await user.type(screen.getByLabelText(/Location summary/), "Adweso, Koforidua");
    await user.click(screen.getByRole("button", { name: "Add room offer" }));
    await user.type(screen.getByLabelText(/Room type/), "Single room");
    await user.clear(screen.getByLabelText(/Price \(GHS\)/));
    await user.type(screen.getByLabelText(/Price \(GHS\)/), "1500");
    await user.click(screen.getByRole("button", { name: "Save and publish locally" }));
    expect(await screen.findByRole("heading", { name: "Adweso study room offer" })).toBeInTheDocument();
    expect(screen.getByText("Published", { selector: ".provider-status-badge" })).toBeInTheDocument();
    expect(screen.getByText(/visible in the student marketplace in this browser/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Property photos" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Student view" }));
    expect(await screen.findByRole("heading", { name: "Adweso study room offer" })).toBeInTheDocument();
    expect(screen.getByText(/^Physical property:/)).toHaveTextContent("Greenview Student Residences");
    expect(screen.getByRole("heading", { name: "Prices and room types" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Your name/), "Student Example");
    await user.type(screen.getByLabelText(/Email address/), "student@example.test");
    await user.type(screen.getByLabelText(/Phone number/), "0201234567");
    await user.type(screen.getByLabelText(/Message/), "Could I arrange a viewing?");
    await user.click(screen.getByRole("button", { name: "Enquire about Adweso study room offer" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/saved in this browser demo/);

    providerView.unmount();
    renderRoute("/provider/enquiries");
    const openEnquiry = await screen.findByRole("link", { name: "Open enquiry from Student Example" });
    expect(screen.getByText(/Adweso study room offer/)).toBeInTheDocument();
    await user.click(openEnquiry);
    expect(await screen.findByRole("heading", { name: "Message from Student Example" })).toBeInTheDocument();
    expect(screen.getByText("Could I arrange a viewing?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark contacted" }));
    expect(screen.getByRole("status")).toHaveTextContent("Enquiry marked contacted.");
    expect(screen.getByLabelText("Status")).toHaveValue("in_progress");

    const inboxView = renderRoute("/provider");
    const metrics = screen.getByRole("region", { name: "Demo workspace summary" });
    const newEnquiryMetric = within(metrics).getByText("New enquiries").closest(".provider-metric-card");
    expect(within(newEnquiryMetric).getByText("0")).toBeInTheDocument();
    inboxView.unmount();
  }, 15_000);
});
