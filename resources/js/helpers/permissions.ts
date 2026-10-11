// A route/menu `permission` may be one name or a list of alternatives (any of them grants it).
export function hasAnyPermission(granted: string[] | undefined, required: string | string[] | undefined): boolean {
    if (!required) return true;
    const list = Array.isArray(required) ? required : [required];

    return list.some((p) => (granted ?? []).indexOf(p) !== -1);
}

export const RECORD_PERMISSIONS = ["record_sales", "record_international_sales"];
