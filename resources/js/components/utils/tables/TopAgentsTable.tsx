import { Avatar, Box, Typography } from "@mui/material";

const rows = [
    { name: "Gilbert and Marjorie Monecillo", totalSales: 10500000 },
    { name: "Angie Kay and Marc Godornes", totalSales: 10123412 },
    { name: "Jessa Jill and Leo Ross Torralba", totalSales: 9232413 },
];

const RANK_COLORS = ["#f9ab00", "#9aa0a6", "#c26401"];

export default function TopAgentsTable() {
    return (
        <Box sx={{ px: 1, py: 0.5 }}>
            {rows.map((r, k) => (
                <Box
                    key={r.name}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1,
                        py: 1,
                        borderRadius: 2,
                        ":hover": { backgroundColor: "var(--lr-surface-dim)" },
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            width: 16,
                            textAlign: "center",
                            fontWeight: 700,
                            color: RANK_COLORS[k] ?? "var(--lr-text-secondary)",
                        }}
                    >
                        {k + 1}
                    </Typography>
                    <Avatar
                        alt={r.name}
                        sx={{
                            height: 28,
                            width: 28,
                            fontSize: 12,
                            backgroundColor: "var(--lr-primary-soft)",
                            color: "var(--lr-primary)",
                        }}
                    >
                        {r.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--lr-text-body)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {r.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            fontFamily="Google Sans Code"
                            sx={{ color: "var(--lr-text-secondary)" }}
                        >
                            ₱{r.totalSales.toLocaleString()}
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
