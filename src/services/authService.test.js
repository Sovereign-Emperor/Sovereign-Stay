import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ supabase: null }));

vi.mock("../data/supabaseClient", () => ({
  getSupabaseClient() {
    return Promise.resolve(mocks.supabase);
  },
}));

import {
  createProviderBusiness,
  getCurrentProfile,
  getCurrentRoles,
  registerWithEmail,
  requestPasswordReset,
  signInWithEmail,
  signOut,
  updatePassword,
} from "./authService";

function createClient() {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" }, session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" }, session: {} }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: "business-1", error: null }),
    from: vi.fn((table) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "student-1", account_status: "active" },
                error: null,
              }),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [{ roles: { role_key: "student" } }],
            error: null,
          }),
        })),
      };
    }),
  };
}

describe("Supabase authentication service", () => {
  beforeEach(() => {
    mocks.supabase = createClient();
  });

  it("does not accept a client-assigned privilege during registration", async () => {
    await registerWithEmail({
      displayName: "Example Student",
      email: " student@example.test ",
      password: "A-long-demo-password-123",
      accountType: "admin",
    });

    expect(mocks.supabase.auth.signUp).toHaveBeenCalledWith({
      email: "student@example.test",
      password: "A-long-demo-password-123",
      options: {
        data: { display_name: "Example Student", account_type: "student" },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  });

  it("supports sign in, reset request, password update, and sign out", async () => {
    await signInWithEmail({ email: " student@example.test ", password: "Password123456" });
    await requestPasswordReset("student@example.test");
    await updatePassword("NewPassword123456");
    await signOut();

    expect(mocks.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.test",
      password: "Password123456",
    });
    expect(mocks.supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.test",
      { redirectTo: `${window.location.origin}/auth/reset` },
    );
    expect(mocks.supabase.auth.updateUser).toHaveBeenCalledWith({ password: "NewPassword123456" });
    expect(mocks.supabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it("requests provider membership only through the server-authorized onboarding RPC", async () => {
    await expect(createProviderBusiness("  Example Housing  ")).resolves.toBe("business-1");
    expect(mocks.supabase.rpc).toHaveBeenCalledWith("create_provider_business", {
      p_display_name: "Example Housing",
    });
  });

  it("loads only the current profile and role relationships", async () => {
    await expect(getCurrentProfile("student-1")).resolves.toMatchObject({
      id: "student-1",
      account_status: "active",
    });
    await expect(getCurrentRoles("student-1")).resolves.toEqual(["student"]);
    expect(mocks.supabase.from).toHaveBeenNthCalledWith(1, "profiles");
    expect(mocks.supabase.from).toHaveBeenNthCalledWith(2, "user_roles");
  });

  it("fails explicitly when Supabase configuration is missing", async () => {
    mocks.supabase = null;
    await expect(signInWithEmail({ email: "x@example.test", password: "password" }))
      .rejects.toThrow(/not configured/);
  });
});
