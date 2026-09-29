import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolBranding {
  schoolId: string;
  schoolName: string;
  schoolLogo: string; // data URL derivada del fichero guardado
  primaryColor: string; // HEX
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

export function SchoolLogo({ className = "h-10 max-w-24" }: { className?: string }) {
  const { schoolLogo, schoolName } = useSchool();
  if (!schoolLogo) return null;
  return <img src={schoolLogo} alt={schoolName ? `Logo de ${schoolName}` : "Logo de la autoescuela"} className={`shrink-0 object-contain ${className}`} />;
}

interface BrandingValue extends SchoolBranding {
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULTS: SchoolBranding = { schoolId: "", schoolName: "", schoolLogo: "", primaryColor: "" };

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
        .select("id, nombre_comercial, logo_url, primary_color")
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

  // El color de la autoescuela genera una interfaz pastel con contraste oscuro.
  React.useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      const color = branding.primaryColor;
      root.style.setProperty("--background", `color-mix(in srgb, ${color} 10%, white)`);
      root.style.setProperty("--card", `color-mix(in srgb, ${color} 5%, white)`);
      root.style.setProperty("--card-foreground", "oklch(0.278 0.033 256.848)");
      root.style.setProperty("--foreground", "oklch(0.278 0.033 256.848)");
      root.style.setProperty("--primary", `color-mix(in srgb, ${color} 68%, white)`);
      root.style.setProperty("--primary-foreground", "oklch(0.21 0.034 264.665)");
      root.style.setProperty("--secondary", `color-mix(in srgb, ${color} 20%, white)`);
      root.style.setProperty("--secondary-foreground", "oklch(0.278 0.033 256.848)");
      root.style.setProperty("--muted", `color-mix(in srgb, ${color} 13%, white)`);
      root.style.setProperty("--accent", `color-mix(in srgb, ${color} 24%, white)`);
      root.style.setProperty("--accent-foreground", "oklch(0.278 0.033 256.848)");
      root.style.setProperty("--border", `color-mix(in srgb, ${color} 30%, white)`);
      root.style.setProperty("--input", `color-mix(in srgb, ${color} 28%, white)`);
      root.style.setProperty("--ring", `color-mix(in srgb, ${color} 72%, white)`);
    } else {
      ["--background", "--card", "--card-foreground", "--foreground", "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--accent", "--accent-foreground", "--border", "--input", "--ring"].forEach((property) => root.style.removeProperty(property));
    }
  }, [branding.primaryColor]);

  const value = React.useMemo(() => ({ ...branding, loading, refresh }), [branding, loading, refresh]);
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = React.useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool debe usarse dentro de SchoolProvider");
  return ctx;
}
