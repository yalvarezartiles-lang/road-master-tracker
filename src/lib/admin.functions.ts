import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface NewAccount {
  email: string;
  password: string;
  fullName: string;
  apellidos?: string;
  dni?: string;
  role: "admin" | "admin_oficina" | "profesor";
  autoescuelaId?: string | null;
}

function validateAccount(input: NewAccount): NewAccount {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const fullName = String(input.fullName ?? "").trim();
  const role = input.role === "admin" ? "admin" : input.role === "admin_oficina" ? "admin_oficina" : "profesor";
  if (!email.includes("@")) throw new Error("Email no válido");
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
  if (!fullName) throw new Error("El nombre es obligatorio");
  const apellidos = String(input.apellidos ?? "").trim();
  const dni = String(input.dni ?? "").trim().toUpperCase();
  const autoescuelaId = input.autoescuelaId ? String(input.autoescuelaId) : null;
  return { email, password, fullName, apellidos, dni, role, autoescuelaId };
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
    .upsert({ id: userId, full_name: input.fullName, apellidos: input.apellidos ?? "", dni: input.dni ?? "", email: input.email, autoescuela_id: input.autoescuelaId ?? null });
  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: input.role }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(roleError.message);

  return { id: userId };
}

async function getCaller(context: { supabase: any; userId: string }) {
  const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const list = (roles ?? []).map((r: any) => r.role);
  const { data: p } = await context.supabase.from("profiles").select("autoescuela_id").eq("id", context.userId).maybeSingle();
  const isAdmin = list.includes("admin");
  const isOffice = list.includes("admin_oficina");
  if (!isAdmin && !isOffice) throw new Error("No tienes permiso para hacer esto");
  return { isAdmin, isOffice, autoescuelaId: (p?.autoescuela_id ?? null) as string | null };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a } = await supabaseAdmin.from("autoescuelas").select("id").order("created_at").limit(1).maybeSingle();
    let autoescuelaId = a?.id ?? null;
    if (!autoescuelaId) {
      const { data: n, error } = await supabaseAdmin.from("autoescuelas").insert({ nombre_comercial: "Mi autoescuela" }).select("id").single();
      if (error) throw new Error(error.message);
      autoescuelaId = n.id;
    }
    await createAccount({ ...data, autoescuelaId });
    return { ok: true };
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await getCaller(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, apellidos, dni, email, created_at, autoescuela_id")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    if (rolesError) throw new Error(rolesError.message);
    return (profiles ?? []).map((p: any) => ({
      ...p,
      role: (() => {
        const rs = (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role);
        return rs.includes("admin") ? "admin" : rs.includes("admin_oficina") ? "admin_oficina" : "profesor";
      })(),
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
    // Solo el Super Administrador puede crear cuentas
    await assertAdmin(context);
    if (data.role !== "admin" && !data.autoescuelaId) {
      throw new Error("Elige la autoescuela");
    }
    await createAccount(data);
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const caller = await getCaller(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!caller.isAdmin) {
      const { data: target } = await supabaseAdmin.from("profiles").select("autoescuela_id").eq("id", data.userId).maybeSingle();
      const { data: tr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
      if (!target || target.autoescuela_id !== caller.autoescuelaId || (tr ?? []).some((r: any) => r.role !== "profesor"))
        throw new Error("Solo puedes eliminar profesores de tu autoescuela");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAutoescuelas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await getCaller(context);
    const { data, error } = await context.supabase.from("autoescuelas").select("id, nombre_comercial").order("nombre_comercial");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; nombre_comercial: string }[];
  });

export const createAutoescuela = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nombre: string }) => {
    const nombre = String(input.nombre ?? "").trim();
    if (!nombre) throw new Error("El nombre es obligatorio");
    return { nombre };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("autoescuelas").insert({ nombre_comercial: data.nombre });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Super admin: alumnos archivados de todas las autoescuelas. */
export const listArchivedStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("students")
      .select("id, name, apellidos, dni, autoescuela_id")
      .eq("archivado", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string; apellidos: string; dni: string; autoescuela_id: string | null }[];
  });

/** Super admin: borrado físico definitivo de un alumno archivado. */
export const purgeStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) => ({ studentId: String(input.studentId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: st } = await supabaseAdmin.from("students").select("archivado").eq("id", data.studentId).maybeSingle();
    if (!st) throw new Error("Alumno no encontrado");
    if (!st.archivado) throw new Error("Solo se pueden eliminar alumnos archivados");
    const { data: ls } = await supabaseAdmin.from("lessons").select("id").eq("student_id", data.studentId);
    const ids = (ls ?? []).map((l) => l.id);
    if (ids.length) await supabaseAdmin.from("lesson_whiteboards").delete().in("lesson_id", ids);
    await supabaseAdmin.from("lessons").delete().eq("student_id", data.studentId);
    await supabaseAdmin.from("agenda_diaria").delete().eq("student_id", data.studentId);
    const { error } = await supabaseAdmin.from("students").delete().eq("id", data.studentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
