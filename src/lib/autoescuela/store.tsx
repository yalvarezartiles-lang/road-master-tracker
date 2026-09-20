import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppData, SkillKey, SkillLevel, Student } from "./types";
import { DEFAULT_ZONES } from "./types";

interface StoreValue {
  data: AppData;
  hydrated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  addStudent: (input: { name: string; phone: string }) => Promise<Student | null>;
  addLesson: (
    studentId: string,
    input: { date: string; zone: string; topics: string[]; notes: string },
  ) => Promise<void>;
  setSkill: (studentId: string, skill: SkillKey, level: SkillLevel) => Promise<void>;
  addZone: (zone: string) => Promise<void>;
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

const EMPTY_SKILLS: Record<SkillKey, SkillLevel> = {
  volante: "rojo",
  pedales: "rojo",
  marchas: "rojo",
  observacion: "rojo",
  glorietas: "rojo",
  estacionamiento: "rojo",
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<AppData>({ students: [], zones: DEFAULT_ZONES });
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
    const [studentsRes, lessonsRes, zonesRes] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: true }),
      supabase.from("lessons").select("*").order("number", { ascending: true }),
      supabase.from("zones").select("*").order("created_at", { ascending: true }),
    ]);

    const lessons = lessonsRes.data ?? [];
    const students: Student[] = (studentsRes.data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? "",
      startDate: s.start_date,
      avatarColor: s.avatar_color,
      skills: { ...EMPTY_SKILLS, ...(s.skills ?? {}) },
      lessons: lessons
        .filter((l: any) => l.student_id === s.id)
        .map((l: any) => ({
          id: l.id,
          number: l.number,
          date: l.date,
          zone: l.zone ?? "",
          topics: l.topics ?? [],
          notes: l.notes ?? "",
        })),
    }));

    setData({
      students,
      zones: (zonesRes.data ?? []).map((z: any) => z.name),
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
          skills: { ...EMPTY_SKILLS, ...((inserted.skills as any) ?? {}) },
          lessons: [],
        };
      },
      addLesson: async (studentId, input) => {
        const student = data.students.find((s) => s.id === studentId);
        await supabase.from("lessons").insert({
          student_id: studentId,
          number: (student?.lessons.length ?? 0) + 1,
          date: input.date,
          zone: input.zone,
          topics: input.topics,
          notes: input.notes,
        });
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
        await supabase.from("students").update({ skills }).eq("id", studentId);
      },
      addZone: async (zone) => {
        if (data.zones.includes(zone)) return;
        await supabase.from("zones").insert({ name: zone });
        await refresh();
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
