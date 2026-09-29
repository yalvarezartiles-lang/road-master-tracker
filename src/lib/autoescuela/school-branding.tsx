import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolBranding {
  schoolId: string;
  schoolName: string;
  schoolLogo: string; // data URL derivada del fichero guardado
  primaryColor: string; // HEX
  secondaryColor: string; // HEX
  accentColor: string; // HEX
}

export const LOGO_BUCKET = "school-logos";

/** Descarga un logo del almacén privado y lo convierte en data URL (sin problemas de CORS al exportar la tarjeta). */
export async function loadLogoDataUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(path);
  if (error || !data) return "";
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(data);
  });
}

export function SchoolLogo({ className = "h-10 md:h-14 lg:h-16 max-w-40 md:max-w-56" }: { className?: string }) {
  const { schoolLogo, schoolName } = useSchool();
  if (!schoolLogo) return null;
  return <img src={schoolLogo} alt={schoolName ? `Logo de ${schoolName}` : "Logo de la autoescuela"} className={`w-auto shrink-0 object-contain ${className}`} />;
}

interface BrandingValue extends SchoolBranding {
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULTS: SchoolBranding = { schoolId: "", schoolName: "", schoolLogo: "", primaryColor: "", secondaryColor: "", accentColor: "" };

const SchoolContext: React.Context<BrandingValue | null> =
  ((globalThis as any).__schoolBrandingContext ??= React.createContext<BrandingValue | null>(null));

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [branding, setState] = React.useState<SchoolBranding>(DEFAULTS);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setState(DEFAULTS);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("autoescuela_id")
        .eq("id", auth.user.id)
        .maybeSingle();
      const schoolId = profile?.autoescuela_id ?? "";
      if (!schoolId) {
        setState(DEFAULTS);
        return;
      }
      const { data: school } = await supabase
        .from("autoescuelas")
        .select("id, nombre_comercial, logo_url, primary_color, secondary_color, accent_color")
        .eq("id", schoolId)
        .maybeSingle();
      if (!school) {
        setState(DEFAULTS);
        return;
      }
      const schoolLogo = school.logo_url ? await loadLogoDataUrl(school.logo_url) : "";
      setState({
        schoolId: school.id,
        schoolName: school.nombre_comercial ?? "",
        schoolLogo,
        primaryColor: school.primary_color ?? "",
        secondaryColor: school.secondary_color ?? "",
        accentColor: school.accent_color ?? "",
      });
    } catch {
      setState(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  // Fondo casi neutro (3%); principal para acciones; secundario y acento para estados y detalles.
  React.useEffect(() => {
    const root = document.documentElement;
    const props = ["--background", "--card", "--card-foreground", "--foreground", "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--accent", "--accent-foreground", "--border", "--input", "--ring", "--brand-secondary", "--brand-accent", "--chart-1", "--chart-2", "--chart-3"];
    if (!branding.primaryColor) return void props.forEach((p) => root.style.removeProperty(p));
    const p = branding.primaryColor;
    const s = branding.secondaryColor || p;
    const a = branding.accentColor || s;
    const dark = "oklch(0.278 0.033 256.848)";
    const set = (k: string, v: string) => root.style.setProperty(k, v);
    set("--background", `color-mix(in srgb, ${p} 3%, white)`);
    set("--card", "white");
    set("--card-foreground", dark);
    set("--foreground", dark);
    set("--primary", p);
    set("--primary-foreground", `oklch(from ${p} calc(l > 0.68 ? 0.2 : 0.99) 0 0)`);
    set("--secondary", `color-mix(in srgb, ${s} 22%, white)`);
    set("--secondary-foreground", dark);
    set("--muted", `color-mix(in srgb, ${p} 5%, white)`);
    set("--accent", `color-mix(in srgb, ${a} 18%, white)`);
    set("--accent-foreground", dark);
    set("--border", `color-mix(in srgb, ${p} 14%, oklch(0.93 0 0))`);
    set("--input", `color-mix(in srgb, ${p} 14%, oklch(0.93 0 0))`);
    set("--ring", p);
    set("--brand-secondary", s);
    set("--brand-accent", a);
    set("--chart-1", p);
    set("--chart-2", s);
    set("--chart-3", a);
  }, [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

  const value = React.useMemo(() => ({ ...branding, loading, refresh }), [branding, loading, refresh]);
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = React.useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool debe usarse dentro de SchoolProvider");
  return ctx;
}
