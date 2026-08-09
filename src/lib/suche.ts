/**
 * Zerlegt eine Sucheingabe in einzelne Wörter für PostgREST-Filter.
 *
 * Kommas und Klammern trennen dort die einzelnen Bedingungen und werden deshalb
 * entfernt. Mehrere Wörter müssen alle zutreffen, damit „Max Mustermann" den
 * richtigen Treffer findet und nicht jeden Max und jeden Mustermann.
 */
export function suchWoerter(suche: string): string[] {
  return suche
    .replace(/[,()\\"]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
}
