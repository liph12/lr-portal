import { ReactNode } from "react";
import { Box, InputAdornment, TextField } from "@mui/material";
import { SearchRounded } from "@mui/icons-material";

interface TableToolbarProps {
    search: string;
    onSearch: (value: string) => void;
    placeholder: string;
    // Filters (selects) shown after the search box.
    filters?: ReactNode;
    // Primary action, right-aligned (e.g. "New team").
    action?: ReactNode;
}

export default function TableToolbar({ search, onSearch, placeholder, filters, action }: TableToolbarProps) {
    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2 }}>
            <TextField
                size="small"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={placeholder}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRounded fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />
                            </InputAdornment>
                        ),
                    },
                    htmlInput: { "aria-label": placeholder },
                }}
                sx={{
                    flex: { xs: "1 1 100%", sm: "0 1 320px" },
                    "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 },
                    "& fieldset": { border: "none" },
                }}
            />
            {filters}
            {action && <Box sx={{ ml: { sm: "auto" } }}>{action}</Box>}
        </Box>
    );
}
