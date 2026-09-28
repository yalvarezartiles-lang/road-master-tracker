import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getAgendaTool from "./tools/get-agenda";
import listStudentsTool from "./tools/list-students";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "autopilot-progress",
  title: "AutoPilot Progress",
  version: "0.1.0",
  instructions: "Herramientas protegidas para consultar los alumnos y la agenda diaria visibles para el usuario conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getAgendaTool, listStudentsTool],
});