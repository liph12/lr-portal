import { Box, Typography } from "@mui/material";
import { PlaceRounded } from "@mui/icons-material";

// Says which branch every count on the page is limited to (an office secretary's, or a clicked one).
export default function AreaOnlyNote({ area }: { area: string }) {
    return (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, mb: 2, borderRadius: 99, backgroundColor: "var(--lr-primary-soft)" }}>
            <PlaceRounded sx={{ fontSize: 18, color: "var(--lr-primary)" }} aria-hidden />
            <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                Counting only the <strong>{area}</strong> branch
            </Typography>
        </Box>
    );
}
