import { Avatar, Box, Typography } from "@mui/material";
import { Diversity3Rounded, GroupsRounded, NorthEastRounded, PlaceRounded } from "@mui/icons-material";

export interface GroupSearchItem {
    type: "team" | "sub_team" | "area";
    id: number | string;
    name: string;
    detail: string | null;
    logo: string | null;
    url: string;
}

interface GroupSearchResultProps {
    group: GroupSearchItem;
    active: boolean;
    onHover: () => void;
    onOpen: (url: string) => void;
}

const ICONS = { team: GroupsRounded, sub_team: Diversity3Rounded, area: PlaceRounded };

export default function GroupSearchResult({ group, active, onHover, onOpen }: GroupSearchResultProps) {
    const Icon = ICONS[group.type];

    return (
        <Box
            role="option"
            aria-selected={active}
            onMouseEnter={onHover}
            onClick={() => onOpen(group.url)}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1,
                cursor: "pointer",
                backgroundColor: active ? "var(--lr-surface-container)" : "transparent",
            }}
        >
            <Avatar
                src={group.logo ?? undefined}
                alt=""
                sx={{ width: 28, height: 28, backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" }}
            >
                <Icon sx={{ fontSize: 18 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ color: "var(--lr-text-primary)" }}>
                    {group.name}
                </Typography>
                {group.detail && (
                    <Typography variant="caption" noWrap component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                        {group.detail}
                    </Typography>
                )}
            </Box>
            <NorthEastRounded sx={{ fontSize: 16, color: "var(--lr-text-secondary)" }} />
        </Box>
    );
}
