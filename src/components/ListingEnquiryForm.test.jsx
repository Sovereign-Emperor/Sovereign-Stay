import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../data/supabaseClient", () => ({
  isExplicitSupabaseMode: true,
}));

vi.mock("../services/enquiryService", () => ({
  submitListingEnquiry: vi.fn(),
  submitAuthenticatedListingEnquiry: vi.fn(),
  validateEnquiry: vi.fn(() => ({})),
}));

import ListingEnquiryForm from "./ListingEnquiryForm";

function SignInLocation() {
  const location = useLocation();
  return <p>{location.state?.from ?? "No return path"}</p>;
}

describe("ListingEnquiryForm", () => {
  it("preserves the listing detail route when sending a signed-out user to sign in", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/properties/listing-1"]}>
        <Routes>
          <Route
            path="/properties/:id"
            element={<ListingEnquiryForm listingId="listing-1" listingName="Example listing" />}
          />
          <Route path="/auth/login" element={<SignInLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Sign in" }));

    expect(screen.getByText("/properties/listing-1")).toBeInTheDocument();
  });
});
