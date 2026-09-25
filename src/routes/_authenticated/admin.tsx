import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Loader2, Pencil, Shield, Trash2, Undo2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/lib/auth";
import { createAutoescuela, createTeamMember, deleteAutoescuela, deleteTeamMember, listArchivedStudents, listAutoescuelas, listTeam, purgeStudent, restoreStudentAdmin, setTeacherAutonomo, updateAutoescuela } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administración" },
      {
        name: "description",
        content: "Gestión de cuentas de profesores prácticas.",
      },
      { property: "og:title", content: "Administración" },
      {
        property: "og:description",
        content: "Crea y gestiona las cuentas del equipo docente.",
      },
    ],
  }),
  component: AdminPage,
});

interface Member {
  id: string;
  full_name: string;
  apellidos?: string;
  dni?: string;
  email: string;
  role: "admin" | "admin_oficina" | "profesor";
  autoescuela_id?: string | null;
  es_autonomo?: boolean;
}

const ROLE_LABEL = { admin: "Administrador", admin_oficina: "Oficina", profesor: "Profesor" } as const;

function fmtArchivado(iso: string | null) {
  if (!iso) return "Archivado (fecha desconocida)";
  return `Archivado el ${new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isOffice, loading: loadingUser } = useCurrentUser();
  const fetchSchools = useServerFn(listAutoescuelas);
  const addSchool = useServerFn(createAutoescuela);
  const [schools, setSchools] = React.useState<{ id: string; nombre_comercial: string }[]>([]);
  const [schoolId, setSchoolId] = React.useState("");
  const [newSchool, setNewSchool] = React.useState("");
  const fetchTeam = useServerFn(listTeam);
  const createMember = useServerFn(createTeamMember);
  const removeMember = useServerFn(deleteTeamMember);
  const toggleAutonomo = useServerFn(setTeacherAutonomo);
  const [autonomoBusy, setAutonomoBusy] = React.useState<string | null>(null);

  const [team, setTeam] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [apellidos, setApellidos] = React.useState("");
  const [dni, setDni] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "admin_oficina" | "profesor">("profesor");
  const [toDelete, setToDelete] = React.useState<Member | null>(null);
  const fetchArchived = useServerFn(listArchivedStudents);
  const purge = useServerFn(purgeStudent);
  const restoreAdmin = useServerFn(restoreStudentAdmin);
  const editSchool = useServerFn(updateAutoescuela);
  const removeSchool = useServerFn(deleteAutoescuela);
  const [editingSchool, setEditingSchool] = React.useState<{ id: string; nombre: string } | null>(null);
  const [schoolToDelete, setSchoolToDelete] = React.useState<{ id: string; nombre_comercial: string } | null>(null);
  const [archived, setArchived] = React.useState<{ id: string; name: string; apellidos: string; dni: string; autoescuela_id: string | null; fecha_archivado: string | null }[]>([]);
  const [toPurge, setToPurge] = React.useState<{ id: string; name: string; apellidos: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setTeam((await fetchTeam({})) as Member[]);
      const sc = await fetchSchools({});
      setSchools(sc);
      setSchoolId((cur) => cur || sc[0]?.id || "");
      setArchived(await fetchArchived({}));
    } catch {
      toast.error("No se pudo cargar el equipo");
    } finally {
      setLoading(false);
    }
  }, [fetchTeam]);

  React.useEffect(() => {
    if (loadingUser) return;
    if (!isAdmin) {
      navigate({ to: "/panel", replace: true });
      return;
    }
    void load();
  }, [isAdmin, isOffice, loadingUser, load, navigate]);

  const onCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addSchool({ data: { nombre: newSchool } });
      toast.success("Autoescuela creada");
      setNewSchool("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createMember({ data: { fullName, apellidos, dni, email, password, role, autoescuelaId: schoolId || null } });
      toast.success("Cuenta creada");
      setFullName("");
      setApellidos("");
      setDni("");
      setEmail("");
      setPassword("");
      setRole("profesor");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  };

  const onToggleAutonomo = async (m: Member, value: boolean) => {
    if (!!m.es_autonomo === value) return;
    setAutonomoBusy(m.id);
    try {
      await toggleAutonomo({ data: { userId: m.id, esAutonomo: value } });
      setTeam((prev) => prev.map((t) => (t.id === m.id ? { ...t, es_autonomo: value } : t)));
      toast.success(value ? "Ahora gestiona su propio horario" : "Ahora su horario lo lleva la oficina");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar");
    } finally {
      setAutonomoBusy(null);
    }
  };

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await removeMember({ data: { userId: toDelete.id } });
      toast.success("Cuenta eliminada");
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            to="/panel"
            className="flex size-12 items-center justify-center rounded-2xl border"
            aria-label="Volver"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Shield className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Administración</h1>
            <p className="text-sm text-muted-foreground">Cuentas del equipo</p>
          </div>
        </div>

        {isAdmin && (
          <section className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-5">
            <h2 className="text-lg font-bold">Autoescuelas ({schools.length})</h2>
            <ul className="mt-3 divide-y text-base">
              {schools.map((a) => (
                <li key={a.id} className="flex items-center gap-2 py-2">
                  {editingSchool?.id === a.id ? (
                    <>
                      <Input
                        value={editingSchool.nombre}
                        onChange={(e) => setEditingSchool({ id: a.id, nombre: e.target.value })}
                        className="h-12 flex-1 rounded-xl text-base"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        className="size-12 rounded-xl"
                        aria-label="Guardar nombre"
                        onClick={async () => {
                          try {
                            await editSchool({ data: { id: a.id, nombre: editingSchool.nombre } });
                            toast.success("Autoescuela actualizada");
                            setEditingSchool(null);
                            await load();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "No se pudo guardar");
                          }
                        }}
                      >
                        <Check className="size-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-12 rounded-xl" aria-label="Cancelar" onClick={() => setEditingSchool(null)}>
                        <X className="size-5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate font-semibold">{a.nombre_comercial}</span>
                      <Button variant="outline" size="icon" className="size-12 rounded-xl" aria-label={`Editar ${a.nombre_comercial}`} onClick={() => setEditingSchool({ id: a.id, nombre: a.nombre_comercial })}>
                        <Pencil className="size-5" />
                      </Button>
                      <Button variant="outline" size="icon" className="size-12 rounded-xl text-destructive" aria-label={`Eliminar ${a.nombre_comercial}`} onClick={() => setSchoolToDelete(a)}>
                        <Trash2 className="size-5" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={onCreateSchool} className="mt-4 flex gap-2">
              <Input value={newSchool} onChange={(e) => setNewSchool(e.target.value)} placeholder="Nombre comercial" required className="h-14 rounded-2xl text-base" />
              <Button type="submit" className="h-14 rounded-2xl px-5 text-base">Crear</Button>
            </form>
          </section>
        )}

        <section className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-5">
          <h2 className="text-lg font-bold">Crear cuenta de {isAdmin ? "usuario" : "profesor"}</h2>
          <form onSubmit={onCreate} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nm" className="text-base">
                Nombre
              </Label>
              <Input
                id="nm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-14 rounded-2xl text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap" className="text-base">Apellidos</Label>
              <Input id="ap" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required className="h-14 rounded-2xl text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dn" className="text-base">DNI</Label>
              <Input id="dn" value={dni} onChange={(e) => setDni(e.target.value.toUpperCase())} required placeholder="00000000A" className="h-14 rounded-2xl text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="em" className="text-base">
                Email
              </Label>
              <Input
                id="em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 rounded-2xl text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw" className="text-base">
                Contraseña
              </Label>
              <Input
                id="pw"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-14 rounded-2xl text-base"
              />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="sc" className="text-base">Autoescuela</Label>
                <select id="sc" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="h-14 w-full rounded-2xl border bg-background px-4 text-base">
                  {schools.map((a) => <option key={a.id} value={a.id}>{a.nombre_comercial}</option>)}
                </select>
              </div>
            )}
            {isAdmin && <div className="flex gap-2">
              {(["profesor", "admin_oficina", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`h-14 flex-1 rounded-2xl border-2 text-base font-semibold capitalize ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40"
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>}
            <Button
              type="submit"
              disabled={busy}
              className="h-16 w-full rounded-3xl text-lg font-extrabold"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <UserPlus className="size-6" />}
              Crear cuenta
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-5">
          <h2 className="text-lg font-bold">Alumnos archivados ({archived.length})</h2>
          <ul className="mt-3 divide-y">
            {archived.length === 0 && <li className="py-4 text-center text-muted-foreground">No hay alumnos archivados.</li>}
            {archived.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{[a.name, a.apellidos].filter(Boolean).join(" ")}</p>
                  <p className="text-sm font-semibold text-warning-foreground">
                    <span className="rounded-full bg-warning/20 px-2 py-0.5">{fmtArchivado(a.fecha_archivado)}</span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    DNI: {a.dni || "—"} · {schools.find((sc) => sc.id === a.autoescuela_id)?.nombre_comercial ?? "Sin autoescuela"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl"
                  onClick={async () => {
                    try {
                      await restoreAdmin({ data: { studentId: a.id } });
                      setArchived((l) => l.filter((x) => x.id !== a.id));
                      toast.success("Alumno recuperado");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "No se pudo recuperar");
                    }
                  }}
                >
                  <Undo2 className="size-5" /> Recuperar
                </Button>
                <Button variant="destructive" className="h-12 rounded-xl" onClick={() => setToPurge(a)}>
                  <Trash2 className="size-5" /> Eliminar permanentemente
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Equipo ({team.length})</h2>
          <ul className="space-y-3">
            {team.map((m) => (
              <li
                key={m.id}
                className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold">{[m.full_name, m.apellidos].filter(Boolean).join(" ") || m.email}{m.dni ? ` · ${m.dni}` : ""}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                    <span className="mt-1 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase">
                      {ROLE_LABEL[m.role]}{isAdmin && m.autoescuela_id ? ` · ${schools.find((a) => a.id === m.autoescuela_id)?.nombre_comercial ?? ""}` : ""}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${m.email}`}
                    onClick={() => setToDelete(m)}
                    className="size-14 shrink-0 rounded-2xl text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-6" />
                  </Button>
                </div>
                {m.role === "profesor" && (
                  <div className="mt-3 flex gap-2">
                    {([false, true] as const).map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        disabled={autonomoBusy === m.id}
                        onClick={() => void onToggleAutonomo(m, v)}
                        className={`h-12 flex-1 rounded-2xl border-2 text-sm font-semibold disabled:opacity-50 ${
                          !!m.es_autonomo === v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/40"
                        }`}
                      >
                        {v ? "Autónomo" : "Empleado"}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {team.length === 0 && (
              <li className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
                {loading ? "Cargando…" : "Todavía no hay cuentas."}
              </li>
            )}
          </ul>
        </section>
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.email} perderá el acceso a la aplicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-14 rounded-2xl text-base">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
              }}
              className="h-14 rounded-2xl bg-destructive text-base text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!toPurge} onOpenChange={(o) => !o && setToPurge(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán para siempre {toPurge?.name} {toPurge?.apellidos}, sus clases, firmas y pizarras. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-14 rounded-2xl text-base">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!toPurge) return;
                try {
                  await purge({ data: { studentId: toPurge.id } });
                  toast.success("Alumno eliminado definitivamente");
                  setToPurge(null);
                  setArchived(await fetchArchived({}));
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
                }
              }}
              className="h-14 rounded-2xl bg-destructive text-base text-white hover:bg-destructive/90"
            >
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!schoolToDelete} onOpenChange={(o) => !o && setSchoolToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">¿Eliminar la autoescuela "{schoolToDelete?.nombre_comercial}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Solo se puede eliminar si ya no tiene cuentas ni alumnos (tampoco archivados). Su agenda se borrará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-14 rounded-2xl text-base">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!schoolToDelete) return;
                try {
                  await removeSchool({ data: { id: schoolToDelete.id } });
                  toast.success("Autoescuela eliminada");
                  setSchoolToDelete(null);
                  setSchoolId("");
                  await load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
                }
              }}
              className="h-14 rounded-2xl bg-destructive text-base text-white hover:bg-destructive/90"
            >
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
