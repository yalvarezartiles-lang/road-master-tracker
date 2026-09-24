import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppData, SkillKey, SkillLevel, Student } from "./types";
import type { NamedItem, SkillItem } from "./types";
import { fromDbLevel, toDbLevel } from "./types";

interface StoreValue {
  data: AppData;
  hydrated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  addStudent: (input: { name: string; phone: string }) => Promise<Student | null>;
  addLesson: (
    studentId: string,
    input: { date: string; zone: string; topics: string[]; notes: string; whiteboard?: string | null },
  ) => Promise<void>;
  setSkill: (studentId: string, skill: SkillKey, level: SkillLevel) => Promise<void>;
  addZone: (zone: string) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;
  addSkill: (name: string, block: number) => Promise<void>;
  setBlockGreen: (studentId: string, block: number) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

const AVATAR_COLORS = [
  "oklch(0.62 0.17 250)",
  "oklch(0.6 0.16 25)",
  "oklch(0.62 0.15 150)",
  "oklch(0.65 0.15 70)",
  "oklch(0.6 0.16 320)",
];

function parseSkills(raw: any): Record<SkillKey, SkillLevel> {
  const out: Record<SkillKey, SkillLevel> = {};
  for (const [k, v] of Object.entries(raw ?? {})) out[k] = fromDbLevel(v);
  return out;
}
function serialize(skills: Record<SkillKey, SkillLevel>) {
  return Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, toDbLevel(v)]));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<AppData>({ students: [], zones: [], skills: [] });
  const [hydrated, setHydrated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setLoading(false);
      setHydrated(true);
      return;
    }
    setLoading(true);
    const [studentsRes, lessonsRes, zonesRes, boardsRes, skillsRes] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: true }),
      supabase.from("lessons").select("*").order("number", { ascending: true }),
      supabase.from("zones").select("*").order("created_at", { ascending: true }),
      supabase.from("lesson_whiteboards").select("lesson_id, image"),
      supabase.from("skills").select("id, name, block").order("created_at", { ascending: true }),
    ]);
    const boards = new Map((boardsRes.data ?? []).map((b: any) => [b.lesson_id, b.image]));

    const lessons = lessonsRes.data ?? [];
    const students: Student[] = (studentsRes.data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? "",
      startDate: s.start_date,
      avatarColor: s.avatar_color,
      skills: parseSkills(s.skills),
      lessons: lessons
        .filter((l: any) => l.student_id === s.id)
        .map((l: any) => ({
          id: l.id,
          number: l.number,
          date: l.date,
          zone: l.zone ?? "",
          topics: l.topics ?? [],
          notes: l.notes ?? "",
          whiteboard: boards.get(l.id) ?? null,
        })),
    }));

    setData({
      students,
      zones: (zonesRes.data ?? []).map((z: any) => ({ id: z.id, name: z.name })),
      skills: (skillsRes.data ?? []).map((k: any) => ({ id: k.id, name: k.name, block: k.block })) as SkillItem[],
    });
    setLoading(false);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const value = React.useMemo<StoreValue>(
    () => ({
      data,
      hydrated,
      loading,
      refresh,
      addStudent: async ({ name, phone }) => {
        const { data: inserted, error } = await supabase
          .from("students")
          .insert({
            name,
            phone,
            avatar_color:
              AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ??
              "oklch(0.62 0.17 250)",
          })
          .select()
          .single();
        if (error || !inserted) return null;
        await refresh();
        return {
          id: inserted.id,
          name: inserted.name,
          phone: inserted.phone ?? "",
          startDate: inserted.start_date,
          avatarColor: inserted.avatar_color,
          skills: parseSkills(inserted.skills),
          lessons: [],
        };
      },
      addLesson: async (studentId, input) => {
        const student = data.students.find((s) => s.id === studentId);
        const { data: lesson, error } = await supabase.from("lessons").insert({
          student_id: studentId,
          number: (student?.lessons.length ?? 0) + 1,
          date: input.date,
          zone: input.zone,
          topics: input.topics,
          notes: input.notes,
        }).select("id").single();
        if (error || !lesson) throw new Error("No se pudo guardar la clase");
        if (input.whiteboard) {
          const { error: wErr } = await supabase
            .from("lesson_whiteboards")
            .insert({ lesson_id: lesson.id, image: input.whiteboard });
          if (wErr) throw new Error("Clase guardada, pero no la pizarra");
        }
        await refresh();
      },
      setSkill: async (studentId, skill, level) => {
        const student = data.students.find((s) => s.id === studentId);
        if (!student) return;
        const skills = { ...student.skills, [skill]: level };
        setData((d) => ({
          ...d,
          students: d.students.map((s) => (s.id === studentId ? { ...s, skills } : s)),
        }));
        const { error } = await supabase.from("students").update({ skills: serialize(skills) }).eq("id", studentId);
        if (error) throw new Error("No se pudo guardar la habilidad");
      },
      setBlockGreen: async (studentId, block) => {
        const student = data.students.find((s) => s.id === studentId);
        if (!student) return;
        const skills = { ...student.skills };
        data.skills.filter((k) => k.block === block).forEach((k) => (skills[k.id] = "verde"));
        setData((d) => ({
          ...d,
          students: d.students.map((s) => (s.id === studentId ? { ...s, skills } : s)),
        }));
        const { error } = await supabase.from("students").update({ skills: serialize(skills) }).eq("id", studentId);
        if (error) throw new Error("No se pudo guardar el bloque");
      },
      addZone: async (zone) => {
        if (data.zones.some((z) => z.name.toLowerCase() === zone.toLowerCase())) return;
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("zones").insert({ name: zone, profesor_id: u.user!.id });
        if (error) throw new Error("No se pudo añadir la zona");
        await refresh();
      },
      deleteZone: async (id) => {
        const { error } = await supabase.from("zones").delete().eq("id", id);
        if (error) throw new Error("No se pudo eliminar la zona");
        setData((d) => ({ ...d, zones: d.zones.filter((z) => z.id !== id) }));
      },
      addSkill: async (name, block) => {
        if (data.skills.some((k) => k.block === block && k.name.toLowerCase() === name.toLowerCase())) return;
        const { error } = await supabase.from("skills").insert({ name, block, profesor_id: null });
        if (error) throw new Error("Solo el administrador puede añadir habilidades");
        await refresh();
      },
      deleteSkill: async (id) => {
        const { error } = await supabase.from("skills").delete().eq("id", id);
        if (error) throw new Error("Solo el administrador puede borrar habilidades");
        setData((d) => ({ ...d, skills: d.skills.filter((k) => k.id !== id) }));
      },
      deleteStudent: async (studentId) => {
        const { error } = await supabase.from("students").delete().eq("id", studentId);
        if (error) throw new Error(error.message);
        setData((d) => ({ ...d, students: d.students.filter((s) => s.id !== studentId) }));
      },
    }),
    [data, hydrated, loading, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
