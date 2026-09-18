import * as React from "react";
import type { AppData, Lesson, SkillKey, SkillLevel, Student } from "./types";
import { initialData } from "./mock";

const STORAGE_KEY = "autoescuela-tracker-v1";

interface StoreValue {
  data: AppData;
  hydrated: boolean;
  addStudent: (input: { name: string; phone: string }) => Student;
  addLesson: (
    studentId: string,
    input: { date: string; zone: string; topics: string[]; notes: string },
  ) => void;
  setSkill: (studentId: string, skill: SkillKey, level: SkillLevel) => void;
  addZone: (zone: string) => void;
}

const StoreContext = React.createContext<StoreValue | null>(null);

const AVATAR_COLORS = [
  "oklch(0.62 0.17 250)",
  "oklch(0.6 0.16 25)",
  "oklch(0.62 0.15 150)",
  "oklch(0.65 0.15 70)",
  "oklch(0.6 0.16 320)",
];

const uid = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<AppData>(initialData);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw) as AppData);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, hydrated]);

  const value = React.useMemo<StoreValue>(
    () => ({
      data,
      hydrated,
      addStudent: ({ name, phone }) => {
        const student: Student = {
          id: uid(),
          name,
          phone,
          startDate: new Date().toISOString(),
          avatarColor:
            AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ??
            "oklch(0.62 0.17 250)",
          skills: {
            volante: "rojo",
            pedales: "rojo",
            marchas: "rojo",
            observacion: "rojo",
            glorietas: "rojo",
            estacionamiento: "rojo",
          },
          lessons: [],
        };
        setData((d) => ({ ...d, students: [...d.students, student] }));
        return student;
      },
      addLesson: (studentId, input) => {
        setData((d) => ({
          ...d,
          students: d.students.map((s) => {
            if (s.id !== studentId) return s;
            const lesson: Lesson = {
              id: uid(),
              number: s.lessons.length + 1,
              ...input,
            };
            return { ...s, lessons: [...s.lessons, lesson] };
          }),
        }));
      },
      setSkill: (studentId, skill, level) => {
        setData((d) => ({
          ...d,
          students: d.students.map((s) =>
            s.id === studentId ? { ...s, skills: { ...s.skills, [skill]: level } } : s,
          ),
        }));
      },
      addZone: (zone) => {
        setData((d) =>
          d.zones.includes(zone) ? d : { ...d, zones: [...d.zones, zone] },
        );
      },
    }),
    [data, hydrated],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
