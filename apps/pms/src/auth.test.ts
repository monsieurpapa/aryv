import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();
const getSession = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithPassword, signOut, getSession },
  }),
}));

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  signInWithPassword.mockReset();
  signOut.mockReset();
  getSession.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("connecter", () => {
  it("appelle signInWithPassword avec l'email et le mot de passe", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { connecter } = await import("./auth.js");

    await connecter("a@b.cd", "secret");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.cd",
      password: "secret",
    });
  });

  it("relance l'erreur Supabase en cas d'échec", async () => {
    signInWithPassword.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });
    const { connecter } = await import("./auth.js");

    await expect(connecter("a@b.cd", "mauvais")).rejects.toThrow(
      "Invalid login credentials",
    );
  });
});

describe("deconnecter", () => {
  it("appelle signOut", async () => {
    signOut.mockResolvedValue({ error: null });
    const { deconnecter } = await import("./auth.js");

    await deconnecter();

    expect(signOut).toHaveBeenCalledOnce();
  });
});

describe("jetonActuel", () => {
  it("renvoie le jeton de la session active", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "jwt-abc" } } });
    const { jetonActuel } = await import("./auth.js");

    expect(await jetonActuel()).toBe("jwt-abc");
  });

  it("renvoie undefined sans session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { jetonActuel } = await import("./auth.js");

    expect(await jetonActuel()).toBeUndefined();
  });
});

describe("garde des variables d'environnement (code quality review)", () => {
  it("lève une erreur claire quand VITE_SUPABASE_URL est manquant", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");

    await expect(import("./auth.js")).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it("lève une erreur claire quand VITE_SUPABASE_ANON_KEY est manquant", async () => {
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    await expect(import("./auth.js")).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/);
  });
});
