import * as React from "react";

export interface SchoolBranding {
  schoolName: string;
  schoolLogo: string; // data URL (base64) o URL
  primaryColor: string; // HEX
}

export function SchoolLogo({ className = "h-10 max-w-24" }: { className?: string }) {
  const { schoolLogo, schoolName } = useSchool();
  if (!schoolLogo) return null;
  return <img src={schoolLogo} alt={schoolName ? `Logo de ${schoolName}` : "Logo de la autoescuela"} className={`shrink-0 object-contain ${className}`} />;
}

interface BrandingValue extends SchoolBranding {
  setBranding: (patch: Partial<SchoolBranding>) => void;
  reset: () => void;
}

const KEY = "school_branding";
const DEFAULTS: SchoolBranding = { schoolName: "", schoolLogo: "", primaryColor: "" };

const SchoolContext: React.Context<BrandingValue | null> =
  ((globalThis as any).__schoolBrandingContext ??= React.createContext<BrandingValue | null>(null));

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [branding, setState] = React.useState<SchoolBranding>(DEFAULTS);

  // Se lee tras montar para evitar desajustes de hidratación.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  // El color extraído del logo genera una interfaz pastel con contraste oscuro.
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

  const setBranding = React.useCallback((patch: Partial<SchoolBranding>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        throw new Error("No se pudo guardar (¿logo demasiado grande?)");
      }
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    localStorage.removeItem(KEY);
    setState(DEFAULTS);
  }, []);

  const value = React.useMemo(() => ({ ...branding, setBranding, reset }), [branding, setBranding, reset]);
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = React.useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool debe usarse dentro de SchoolProvider");
  return ctx;
}
