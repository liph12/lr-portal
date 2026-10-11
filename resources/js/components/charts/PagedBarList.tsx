import { ComponentProps, useMemo, useState } from "react";
import { Box, InputAdornment, Pagination, TextField, Typography } from "@mui/material";
import { SearchRounded } from "@mui/icons-material";
import BarList from "./BarList";
import { formatCount } from "../../helpers/formatNumber";

type PagedBarListProps = ComponentProps<typeof BarList> & {
    pageSize?: number;
    // Placeholder of the search box above the list (e.g. "Search countries"); "Search" if left out.
    searchLabel?: string;
};

// A BarList shown a page at a time (long lists like countries or partners); bars keep one scale across pages.
export default function PagedBarList({ items: all, pageSize = 10, searchLabel = "Search", ...props }: PagedBarListProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    // Matched by name; the bars keep the full list's scale so a found row reads the same as before.
    const term = search.trim().toLowerCase();
    const items = useMemo(() => (term ? all.filter((i) => i.name.toLowerCase().includes(term)) : all), [all, term]);
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(page, pages);
    const start = (current - 1) * pageSize;
    const max = Math.max(...all.map((i) => i.value), 0);

    return (
        // Fills the card; the page buttons sit at the bottom so paged cards side by side line up.
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {all.length > pageSize && (
                <TextField
                    size="small"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder={searchLabel}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />
                                </InputAdornment>
                            ),
                        },
                        htmlInput: { "aria-label": searchLabel },
                    }}
                    sx={{
                        mb: 2,
                        "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 },
                        "& fieldset": { border: "none" },
                    }}
                />
            )}
            <BarList {...props} items={items.slice(start, start + pageSize)} max={max} emptyText={term ? `Nothing matches “${search.trim()}”.` : props.emptyText} />
            {items.length > pageSize && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: "auto", pt: 2.5, flexWrap: "wrap" }}>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {formatCount(start + 1)}–{formatCount(Math.min(start + pageSize, items.length))} of {formatCount(items.length)}
                    </Typography>
                    <Pagination size="small" count={pages} page={current} onChange={(_, p) => setPage(p)} siblingCount={0} />
                </Box>
            )}
        </Box>
    );
}
