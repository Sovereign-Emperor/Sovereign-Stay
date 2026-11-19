import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ListingReportForm from "./ListingReportForm";

const auth = { user: null, roles: [] };
const insert = vi.fn();
vi.mock("../auth/AuthProvider", () => ({ useOptionalAuth: () => auth }));
vi.mock("../data/supabaseClient", () => ({ getSupabaseClient: vi.fn(async () => ({ from: () => ({ insert }) })) }));

describe("ListingReportForm", () => {
  beforeEach(() => { auth.user = null; auth.roles = []; insert.mockReset(); });

  it("requires sign-in before exposing a reporting form", () => {
    render(<BrowserRouter><ListingReportForm listingId="listing-1" /></BrowserRouter>);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/login");
  });

  it("submits a student report to the protected report queue", async () => {
    auth.user = { id: "student-1" }; auth.roles = ["student"];
    insert.mockResolvedValue({ error: null });
    render(<BrowserRouter><ListingReportForm listingId="listing-1" /></BrowserRouter>);
    fireEvent.click(screen.getByText("Report this listing"));
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "Availability is misleading." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Report submitted");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ listing_id: "listing-1", reporter_user_id: "student-1" }));
  });
});
