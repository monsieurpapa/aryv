import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DEV_MODE = !url || !anonKey;

// Mode développement local : quand les variables Supabase ne sont pas
// renseignées, on simule une session gérant afin que l'API (AUTH_ENFORCED=false)
// soit accessible sans Supabase. Ne jamais utiliser en production.
const DEV_SESSION = { access_token: "dev-gerant" } as const;
const mockSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: DEV_SESSION }, error: null }),
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      setTimeout(() => cb("SIGNED_IN", DEV_SESSION), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: () => Promise.resolve({ error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getClaims: () => Promise.resolve({ data: null, error: new Error("dev") }),
  },
} as const;

// persistSession + autoRefreshToken sont les valeurs par défaut du client
// Supabase — c'est exactement ce que D7/D10 demandent : une session de
// quart longue durée avec rafraîchissement silencieux en arrière-plan,
// sans dépendre de la disponibilité de Supabase à chaque requête.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = DEV_MODE ? mockSupabase : createClient(url!, anonKey!);

export async function connecter(email: string, motDePasse: string) {
  if (DEV_MODE) return;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (error) throw error;
}

export async function deconnecter() {
  await supabase.auth.signOut();
}

export async function jetonActuel(): Promise<string | undefined> {
  if (DEV_MODE) return DEV_SESSION.access_token;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
