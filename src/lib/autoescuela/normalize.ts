export function normalize(str: string | null | undefined): string {
  return str
    ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    : "";
}
