// "mark lawrince SARGADO" → "Mark Lawrince Sargado"; keeps the spaces the user is still typing.
export function titleCase(value: string): string {
    return value.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
