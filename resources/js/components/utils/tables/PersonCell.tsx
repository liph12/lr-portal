import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import UserAvatar from "../user/UserAvatar";

interface PersonCellProps {
    name: string | null;
    avatar?: string | null;
    secondary?: ReactNode;
    // Replaces the plain avatar, e.g. with a PhotoUploadButton around it.
    picture?: ReactNode;
    // Text only (e.g. a team name with its sub-team underneath).
    hideAvatar?: boolean;
    // Makes the name (and its second line) a button, e.g. to open the person's details.
    onOpen?: () => void;
}

// Avatar + name (+ a muted second line) for table cells.
export default function PersonCell({ name, avatar, secondary, picture, hideAvatar = false, onOpen }: PersonCellProps) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, py: 0.5 }}>
            {!hideAvatar && (picture ?? <UserAvatar name={name ?? "?"} src={avatar} size={30} />)}
            <Box
                {...(onOpen ? { component: "button", type: "button", onClick: onOpen, "aria-label": `Show details of ${name ?? "this person"}` } : {})}
                sx={{
                    minWidth: 0,
                    lineHeight: 1.3,
                    ...(onOpen && { p: 0, border: 0, background: "none", font: "inherit", textAlign: "left", cursor: "pointer", "&:hover .person-name": { color: "var(--lr-primary)", textDecoration: "underline" } }),
                }}
            >
                <Typography className="person-name" variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: "var(--lr-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name ?? "—"}
                </Typography>
                {secondary && (
                    <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {secondary}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
