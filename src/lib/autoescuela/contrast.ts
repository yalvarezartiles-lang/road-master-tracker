/**
 * Utilidades de contraste calculadas en JavaScript.
 * Evita expresiones CSS no soportadas en navegadores móviles (Safari iOS no admite
 * operadores ternarios dentro de calc(), lo que invalidaba las variables de color).
 */

/** Convierte un color HEX (#rgb o #rrggbb) en componentes 0-255. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Luminancia relativa (0 = negro, 1 = blanco). */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const isLight = (hex: string) => luminance(hex) > 0.45;

/** Texto principal legible sobre el color dado. */
export const readableForeground = (hex: string) => (isLight(hex) ? "#1c1c22" : "#fafafa");

/** Texto secundario/atenuado legible sobre el color dado. */
export const readableMuted = (hex: string) => (isLight(hex) ? "#5c5c66" : "#c9c9d1");
