import { describe, expect, it } from "vitest";
import {
  isPaymentFeatureEnabled,
  validateSupabaseConfiguration,
} from "./supabaseConfiguration";

describe("Supabase configuration validation", () => {
  it("reports missing or partial public configuration without echoing values", () => {
    expect(validateSupabaseConfiguration("", "")).toMatch(/not configured/i);
    expect(validateSupabaseConfiguration("https://project.supabase.co", "")).toMatch(/key is missing/i);
    expect(validateSupabaseConfiguration("", "public-key")).toMatch(/URL is missing/i);
  });

  it("accepts HTTPS project URLs and rejects malformed or credential-bearing URLs", () => {
    expect(validateSupabaseConfiguration(
      " https://project.supabase.co ",
      "publishable-key",
    )).toBe("");
    expect(validateSupabaseConfiguration("not a URL", "publishable-key")).toMatch(/invalid/i);
    expect(validateSupabaseConfiguration(
      "https://user:password@project.supabase.co",
      "publishable-key",
    )).toMatch(/credentials/i);
    expect(validateSupabaseConfiguration(
      "https://project.supabase.co?token=hidden",
      "publishable-key",
    )).toMatch(/query parameters/i);
  });

  it("allows HTTP only for local development hosts", () => {
    expect(validateSupabaseConfiguration(
      "http://127.0.0.1:54321",
      "publishable-key",
      { allowLocalHttp: true },
    )).toBe("");
    expect(validateSupabaseConfiguration(
      "http://project.example",
      "publishable-key",
      { allowLocalHttp: true },
    )).toMatch(/HTTPS/i);
    expect(validateSupabaseConfiguration(
      "http://localhost:54321",
      "publishable-key",
    )).toMatch(/HTTPS/i);
  });

  it("enables checkout UI only for an explicitly enabled Supabase deployment", () => {
    expect(isPaymentFeatureEnabled("supabase", "true")).toBe(true);
    expect(isPaymentFeatureEnabled("supabase", "false")).toBe(false);
    expect(isPaymentFeatureEnabled("demo", "true")).toBe(false);
    expect(isPaymentFeatureEnabled("supabase", undefined)).toBe(false);
  });
});
