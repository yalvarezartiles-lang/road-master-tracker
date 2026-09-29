import * as React from "react";

export interface SchoolBranding {
  schoolName: string;
  schoolLogo: string; // data URL (base64) o URL
  primaryColor: string; // HEX
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

  // Color principal aplicado a toda la app mediante variables CSS.
  React.useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty("--primary", branding.primaryColor);
      root.style.setProperty("--ring", branding.primaryColor);
      root.style.setProperty("--primary-foreground", "oklch(0.99 0 0)");
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--primary-foreground");
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
