import { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { ArrowForwardRounded, GroupsRounded, OndemandVideoRounded } from "@mui/icons-material";

interface NaoChoiceProps {
    onAttended: () => void;
    onWebinar: () => void;
    disabled?: boolean;
}

function ChoiceCard({ icon, title, text, onClick, disabled }: { icon: ReactNode; title: string; text: string; onClick: () => void; disabled?: boolean }) {
    return (
        <ButtonBase
            onClick={onClick}
            disabled={disabled}
            sx={{
                flex: 1,
                minWidth: 240,
                p: 3,
                borderRadius: 3,
                textAlign: "left",
                alignItems: "flex-start",
                flexDirection: "column",
                gap: 1.5,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
                transition: "border-color 150ms ease, background-color 150ms ease",
                ":hover": { borderColor: "var(--lr-primary)", backgroundColor: "var(--lr-primary-soft-hover)" },
                ":focus-visible": { outline: "2px solid var(--lr-primary)", outlineOffset: 2 },
            }}
        >
            <Box sx={{ width: 48, height: 48, borderRadius: 2, display: "grid", placeItems: "center", color: "var(--lr-primary)", backgroundColor: "var(--lr-primary-soft)" }}>{icon}</Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: "var(--lr-text-primary)" }}>{title}</Typography>
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", flex: 1 }}>
                {text}
            </Typography>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--lr-primary)", fontWeight: 500, fontSize: 14 }}>
                Continue <ArrowForwardRounded fontSize="small" />
            </Box>
        </ButtonBase>
    );
}

// Did they already attend a New Agents Orientation face to face? Yes → proof for the sponsor; No → the webinar.
export default function NaoChoice({ onAttended, onWebinar, disabled }: NaoChoiceProps) {
    return (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <ChoiceCard
                icon={<GroupsRounded />}
                title="Yes, I attended"
                text="I already finished the New Agents Orientation in person (face to face). I'll upload a photo, selfie or screenshot as proof and the date."
                onClick={onAttended}
                disabled={disabled}
            />
            <ChoiceCard
                icon={<OndemandVideoRounded />}
                title="No, not yet"
                text="I'll watch the New Agents Webinar here. I can stop any time — it remembers where I left off."
                onClick={onWebinar}
                disabled={disabled}
            />
        </Box>
    );
}
