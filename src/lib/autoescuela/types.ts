export type SkillKey = string;

export type SkillLevel = "rojo" | "amarillo" | "verde";

export interface NamedItem {
  id: string;
  name: string;
}

export const DEFAULT_TOPICS = [
  "Volante",
  "Pedales",
  "Marchas",
  "Glorietas",
  "Aparcamiento",
  "Observación",
  "Incorporaciones",
  "Cambios de carril",
  "Marcha atrás",
  "Autovía",
];

export const NOTE_PRESETS = [
  "Buena progresión, más segura al volante.",
  "Necesita mejorar la observación en cruces.",
  "Le cuesta coordinar embrague y acelerador.",
  "Muy nerviosa/o en glorietas, repetir la próxima clase.",
  "Clase muy completa, lista/o para zona de examen.",
];

export interface Lesson {
  id: string;
  number: number;
  date: string; // ISO
  zone: string;
  topics: string[];
  notes: string;
  whiteboard?: string | null;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  startDate: string; // ISO
  avatarColor: string;
  skills: Record<SkillKey, SkillLevel>;
  lessons: Lesson[];
}

export interface AppData {
  students: Student[];
  zones: string[];
}
