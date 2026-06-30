import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Connexion paresseuse à Supabase : le serveur peut démarrer sans les
 * variables d'environnement nécessaires (utile en dev local tant que
 * l'auth n'est pas activée) — le client n'est construit qu'au premier
 * appel, et mis en cache pour les suivants. Factorisé car auth.ts (client
 * anon) et utilisateurs.ts (client service-role, D13) suivaient le même
 * motif avec deux variables d'env différentes.
 */
export function lazySupabaseClient(
  urlVar: string,
  keyVar: string,
): () => SupabaseClient {
  let instance: SupabaseClient | undefined;
  return () => {
    if (!instance) {
      const url = process.env[urlVar];
      const key = process.env[keyVar];
      if (!url || !key) {
        throw new Error(`${urlVar} / ${keyVar} manquants`);
      }
      instance = createClient(url, key);
    }
    return instance;
  };
}
