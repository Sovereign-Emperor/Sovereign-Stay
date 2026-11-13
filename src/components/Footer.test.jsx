import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { contactDetails } = vi.hoisted(() => ({
  contactDetails: { email: "", whatsappNumber: "" },
}));

vi.mock("../config", () => ({
  contactDetails,
}));

vi.mock("../data/supabaseClient", () => ({
  isExplicitSupabaseMode: true,
}));

import Footer from "./Footer";

describe("Footer", () => {
  beforeEach(() => {
    contactDetails.email = "";
    contactDetails.whatsappNumber = "";
  });

  it("does not show placeholder contact or social links when no contact is configured", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText("Contact details are being set up.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sovereignstay\.demo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();
  });

  it("shows a safe WhatsApp link when a public number is configured", () => {
    contactDetails.whatsappNumber = "233553912380";
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const whatsappLink = screen.getByRole("link", { name: /message sovereign stay on whatsapp/i });
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/233553912380");
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText("Contact details are being set up.")).not.toBeInTheDocument();
  });
});
