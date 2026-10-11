import { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";

export interface ServerPage<R> {
    data: R[];
    total: number;
    page: number;
    per_page: number;
}

export type TableFilters = Record<string, string | number | null | undefined>;

const SEARCH_DEBOUNCE_MS = 300;

// Drives a server-paged DataTable from Inertia: page, sort, search and filters live in the URL query and
// are applied with a partial reload of just `prop`, so the rest of the page (and its layout) stays put.
export default function useServerTable<R>(prop: string, page: ServerPage<R>, filters: TableFilters) {
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState(String(filters.q ?? ""));
    const first = useRef(true);

    const visit = (changes: TableFilters) => {
        const query = Object.fromEntries(
            Object.entries({ ...filters, page: page.page, per_page: page.per_page, ...changes }).filter(([, v]) => v !== "" && v !== null && v !== undefined),
        );

        router.get(window.location.pathname, query, {
            only: [prop, "filters"],
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const timer = window.setTimeout(() => visit({ q: search.trim(), page: 1 }), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
        // Only the typed term should trigger this; filters/page are read fresh inside visit().
    }, [search]);

    const paginationModel: GridPaginationModel = { page: page.page - 1, pageSize: page.per_page };
    const sortModel: GridSortModel = filters.sort ? [{ field: String(filters.sort), sort: filters.dir === "desc" ? "desc" : "asc" }] : [];

    return {
        loading,
        search,
        setSearch,
        // Spread onto <DataTable>.
        gridProps: {
            rows: page.data,
            rowCount: page.total,
            loading,
            paginationMode: "server" as const,
            sortingMode: "server" as const,
            paginationModel,
            sortModel,
            onPaginationModelChange: (m: GridPaginationModel) => visit({ page: m.pageSize !== page.per_page ? 1 : m.page + 1, per_page: m.pageSize }),
            onSortModelChange: (m: GridSortModel) => visit({ sort: m[0]?.field ?? "", dir: m[0]?.sort ?? "", page: 1 }),
        },
        setFilter: (key: string, value: string | number | null) => visit({ [key]: value ?? "", page: 1 }),
    };
}
