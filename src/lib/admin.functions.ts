import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface NewAccount {
  email: string;
  password: string;
  fullName: string;
  apellidos?: string;
  dni?: string;
  role: "admin" | "profesor";
}

function validateAccount(input: NewAccount): NewAccount {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const fullName = String(input.fullName ?? "").trim();
  const role = input.role === "admin" ? "admin" : "profesor";
  if (!email.includes("@")) throw new Error("Email no válido");
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
  if (!fullName) throw new Error("El nombre es obligatorio");
  const apellidos = String(input.apellidos ?? "").trim();
  const dni = String(input.dni ?? "").trim().toUpperCase();
  return { email, password, fullName, apellidos, dni, role };
}

async function countUsers() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  return data.users.length;
}

async function createAccount(input: NewAccount) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error) throw new Error(error.message);
  const userId = data.user!.id;

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, full_name: input.fullName, apellidos: input.apellidos ?? "", dni: input.dni ?? "", email: input.email });
  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: input.role }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(roleError.message);

  return { id: userId };
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo el administrador puede hacer esto");
}

/** Public: tells the sign-in page whether the very first admin still has to be created. */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { needsSetup: (await countUsers()) === 0 };
});

/** Public, but only works while the project has zero users. */
export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: Omit<NewAccount, "role">) =>
    validateAccount({ ...input, role: "admin" }),
  )
  .handler(async ({ data }) => {
    if ((await countUsers()) > 0) throw new Error("Ya existe una cuenta de administrador");
    await createAccount(data);
    return { ok: true };
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, apellidos, dni, email, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    if (rolesError) throw new Error(rolesError.message);
    return (profiles ?? []).map((p: any) => ({
      ...p,
      role:
        (roles ?? []).find((r: any) => r.user_id === p.id)?.role ?? "profesor",
    }));
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewAccount) => {
    const v = validateAccount(input);
    if (!v.apellidos || !v.dni) throw new Error("Apellidos y DNI son obligatorios");
    return v;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await createAccount(data);
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
