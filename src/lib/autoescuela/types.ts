export type SkillKey = string;

export type SkillLevel = "rojo" | "amarillo" | "verde";

export interface NamedItem {
  id: string;
  name: string;
}

export interface SkillItem extends NamedItem {
  block: number;
}

export const SKILL_BLOCKS = [
  { id: 1, name: "Comprobaciones previas" },
  { id: 2, name: "Manejo de mandos" },
  { id: 3, name: "Progresión y circulación" },
  { id: 4, name: "Intersecciones y señales" },
  { id: 5, name: "Maniobras" },
  { id: 6, name: "Conducción autónoma" },
];

const LEVEL_ORDER: SkillLevel[] = ["rojo", "amarillo", "verde"];
export function fromDbLevel(v: unknown): SkillLevel {
  if (typeof v === "number") return LEVEL_ORDER[v] ?? "rojo";
  return LEVEL_ORDER.includes(v as SkillLevel) ? (v as SkillLevel) : "rojo";
}
export function toDbLevel(l: SkillLevel): number {
  return LEVEL_ORDER.indexOf(l);
}
export function nextLevel(l: SkillLevel): SkillLevel {
  return LEVEL_ORDER[(LEVEL_ORDER.indexOf(l) + 1) % 3]!;
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
  notasProfesor?: string;
  whiteboard?: string | null;
  matricula: string;
  horaInicio: string | null;
  horaFin: string | null;
  firmaAlumno: string | null;
  firmaProfesor: string | null;
  profesorId: string | null;
}

export interface Student {
  id: string;
  name: string;
  apellidos: string;
  dni: string;
  phone: string;
  seccion: string;
  startDate: string; // ISO
  avatarColor: string;
  skills: Record<SkillKey, SkillLevel>;
  lessons: Lesson[];
}

export interface AppData {
  students: Student[];
  zones: NamedItem[];
  skills: SkillItem[];
}
