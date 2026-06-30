import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  // Sans ce garde, createClient() lève une erreur native cryptique
  // ("supabaseUrl is required") qui plante toute l'app avant même que
  // App.tsx puisse afficher quoi que ce soit — message actionnable à la
  // place, même esprit que D11 (compte orphelin → message clair, pas un 500).
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants — copiez apps/pms/.env.example vers .env et renseignez les valeurs Supabase.",
  );
}

// persistSession + autoRefreshToken sont les valeurs par défaut du client
// Supabase — c'est exactement ce que D7/D10 demandent : une session de
// quart longue durée avec rafraîchissement silencieux en arrière-plan,
// sans dépendre de la disponibilité de Supabase à chaque requête.
export const supabase = createClient(url, anonKey);

export async function connecter(email: string, motDePasse: string) {
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
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
