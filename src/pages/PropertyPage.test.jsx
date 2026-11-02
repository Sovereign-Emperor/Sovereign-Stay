import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PropertyPage from "./PropertyPage";

describe("PropertyPage", () => {
  it("loads a listing from the service and preserves its detail route", async () => {
    render(
      <MemoryRouter initialEntries={["/properties/greenview-residences"]}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Greenview Student Residences" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 in a room")).toBeInTheDocument();
    expect(screen.getByText("No real-time availability feed")).toBeInTheDocument();
    expect(screen.getByRole("link", {
      name: /enquire about real accommodation options via whatsapp/i,
    })).toHaveAttribute("target", "_blank");
  });

  it("shows the existing not-found state for an unknown listing id", async () => {
    render(
      <MemoryRouter initialEntries={["/properties/not-a-listing"]}>
        <Routes>
          <Route path="/properties/:id" element={<PropertyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "This place is off the map." })).toBeInTheDocument();
  });
});
