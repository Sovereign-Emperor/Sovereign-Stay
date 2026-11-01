import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HomePage from "./HomePage";

describe("HomePage price validation", () => {
  it("loads demo listings through the service and searches them by name", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: "View Greenview Student Residences" });
    fireEvent.change(screen.getByLabelText("Search by property name or location"), {
      target: { value: "Hilltop" },
    });

    expect(await screen.findByRole("link", { name: "View Hilltop Court Hostel" })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "View Greenview Student Residences" }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows a helpful error instead of a zero-result message for an invalid range", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Minimum semester price in GHS"), {
      target: { value: "4000" },
    });
    fireEvent.change(screen.getByLabelText("Maximum semester price in GHS"), {
      target: { value: "2000" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Minimum price cannot be greater than maximum price.",
    );
    expect(screen.getByRole("heading", { name: "Check your price range" })).toBeInTheDocument();
    expect(screen.queryByText(/0 places found/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No places found just yet." })).not.toBeInTheDocument();
  });

  it("rejects negative values and recovers when the user corrects the range", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Minimum semester price in GHS"), {
      target: { value: "-100" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Minimum price must be zero or more.");

    fireEvent.change(screen.getByLabelText("Minimum semester price in GHS"), {
      target: { value: "1000" },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
