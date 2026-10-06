import { supabase } from "@/integrations/supabase/client";

/** Regla binaria: un profesor está bloqueado si no tiene fecha_vencimiento o si hoy es posterior a ella.
 *  Administradores y oficina nunca se bloquean. */
export async function isAccountExpired(userId: string): Promise<boolean> {
  const [{ data: p, error }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("fecha_vencimiento").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (error) throw error;
  if ((roles ?? []).some((r) => r.role === "admin" || r.role === "admin_oficina")) return false;
  if (!p?.fecha_vencimiento) return true;
  // Válida hasta el final del día de vencimiento (hora local).
  return new Date() > new Date(`${p.fecha_vencimiento}T23:59:59`);
}
