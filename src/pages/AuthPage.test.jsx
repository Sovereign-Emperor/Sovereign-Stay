import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authService = vi.hoisted(() => ({
  registerWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithEmail: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock("../services/authService", () => authService);

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ configured: true, loading: false, user: null, error: null }),
}));

import AuthPage from "./AuthPage";

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains that signup email delivery is rate-limited", async () => {
    authService.registerWithEmail.mockRejectedValue({
      status: 429,
      message: "email rate limit exceeded",
    });

    render(
      <MemoryRouter initialEntries={["/auth/register"]}>
        <Routes>
          <Route path="/auth/:mode" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Example Student" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "student@example.test" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "A-long-demo-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /email sending is temporarily rate-limited.*wait before trying again/i,
    );
    expect(authService.registerWithEmail).toHaveBeenCalledOnce();
  });

  it("sends an immediately signed-in provider to provider onboarding", async () => {
    authService.registerWithEmail.mockResolvedValue({
      user: { id: "provider-user" },
      session: { access_token: "test-session" },
    });

    render(
      <MemoryRouter initialEntries={["/auth/register"]}>
        <Routes>
          <Route path="/auth/:mode" element={<AuthPage />} />
          <Route path="/provider/onboarding" element={<h1>Provider onboarding</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Example Provider" },
    });
    fireEvent.change(screen.getByLabelText("I am joining as"), {
      target: { value: "provider" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "provider@example.test" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "A-long-demo-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("heading", { name: "Provider onboarding" })).toBeInTheDocument();
    expect(authService.registerWithEmail).toHaveBeenCalledOnce();
  });
});
