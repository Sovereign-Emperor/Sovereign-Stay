import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";

function renderPropertyForm(path = "/provider/properties/new") {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("provider property creation form", () => {
  it("shows inline errors for every required field and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Enter a property name.")).toBeInTheDocument();
    expect(screen.getByText("Choose an accommodation type.")).toBeInTheDocument();
    expect(screen.getByText("Enter a region.")).toBeInTheDocument();
    expect(screen.getByText("Enter a city.")).toBeInTheDocument();
    expect(screen.getByText("Enter an area or neighbourhood.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Property name/)).toHaveFocus();
    expect(screen.getByLabelText(/Property name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("validates all required fields and confirms valid demo details are not saved", async () => {
    const user = userEvent.setup();
    renderPropertyForm();

    await user.type(screen.getByLabelText(/Property name/), " Example residence ");
    await user.selectOptions(screen.getByLabelText(/Accommodation type/), "Hostel");
    await user.type(screen.getByLabelText(/Region/), "Eastern Region");
    await user.type(screen.getByLabelText(/City/), "Koforidua");
    await user.type(screen.getByLabelText(/Area or neighbourhood/), "Poly Junction");
    await user.type(
      screen.getByLabelText(/Description/),
      "A student accommodation demonstration.",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.queryByText(/Enter a property name/)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your details pass validation. This demo does not save properties, so nothing has been created.",
    );
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
