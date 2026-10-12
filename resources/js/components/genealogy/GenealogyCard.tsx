import { Box, ButtonBase, Typography } from "@mui/material";
import { AccountTreeRounded, ExpandMoreRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import UserAvatar from "../utils/user/UserAvatar";
import UserStatusChip from "../utils/user/UserStatusChip";
import DesignationBadges from "../utils/user/DesignationBadges";
import { formatDate } from "../../helpers/formatDate";
import { formatCount } from "../../helpers/formatNumber";
import { Designations, UserStatus } from "../../types/app-data-types";

export interface GenealogyNode extends Designations {
    id: number;
    name: string;
    avatar: string | null;
    role: string | null;
    status: UserStatus | null;
    area: string | null;
    team: string | null;
    sub_team: string | null;
    joined: string | null;
    recruits: number;
}

// Fixed size, so the canvas can lay the tree out before anything is drawn.
export const CARD_W = 280;
export const CARD_H = 152;

interface GenealogyCardProps {
    node: GenealogyNode;
    isRoot?: boolean;
    expanded: boolean;
    onToggle: () => void;
    // Profile and sales links (back office); everyone may open a card's own tree.
    openProfiles: boolean;
}

const linkSx = { fontSize: 12, fontWeight: 500, color: "var(--lr-primary)", textDecoration: "none" };

// One agent in the tree: who they are, where they sit, and a button that unfolds their direct recruits.
export default function GenealogyCard({ node, isRoot = false, expanded, onToggle, openProfiles }: GenealogyCardProps) {
    const group = [node.team, node.sub_team].filter(Boolean).join(" / ");

    return (
        <Box
            sx={{
                width: CARD_W,
                height: CARD_H,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: isRoot ? "var(--lr-primary)" : "var(--lr-border)",
                backgroundColor: isRoot ? "var(--lr-primary-soft)" : "var(--lr-surface)",
            }}
        >
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <UserAvatar name={node.name} src={node.avatar} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={node.name}>
                        {node.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.25 }}>
                        {node.role && (
                            <Typography component="span" variant="caption" sx={{ px: 0.75, borderRadius: 99, color: "var(--lr-primary)", backgroundColor: "var(--lr-surface-container)", fontWeight: 500 }}>
                                {node.role}
                            </Typography>
                        )}
                        <DesignationBadges person={node} />
                        {node.status && <UserStatusChip status={node.status} />}
                    </Box>
                    <Typography
                        variant="caption"
                        component="p"
                        sx={{ mt: 0.5, color: "var(--lr-text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                        {[node.area, group || "No team", node.joined ? `Joined ${formatDate(node.joined)}` : null].filter(Boolean).join(" · ")}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: "auto" }}>
                <ButtonBase
                    onClick={onToggle}
                    disabled={node.recruits === 0}
                    aria-expanded={node.recruits ? expanded : undefined}
                    sx={{
                        gap: 0.5,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 500,
                        color: node.recruits ? "var(--lr-primary)" : "var(--lr-text-secondary)",
                        border: "1px solid var(--lr-border)",
                        backgroundColor: "var(--lr-surface)",
                    }}
                >
                    {node.recruits ? `${formatCount(node.recruits)} ${node.recruits === 1 ? "recruit" : "recruits"}` : "No recruits"}
                    {node.recruits > 0 && <ExpandMoreRounded sx={{ fontSize: 18, transition: "transform 0.15s", transform: expanded ? "rotate(180deg)" : "none" }} />}
                </ButtonBase>
                <Box sx={{ flex: 1 }} />
                {!isRoot && (
                    <Link href={`/genealogy?agent=${node.id}`} style={{ ...linkSx, display: "inline-flex", alignItems: "center", gap: 4 }} title={`Open ${node.name}'s tree`}>
                        <AccountTreeRounded sx={{ fontSize: 16 }} />
                        Tree
                    </Link>
                )}
                {openProfiles && (
                    <>
                        <Link href={`/agents/${node.id}`} style={linkSx}>
                            Profile
                        </Link>
                        <Link href={`/agents/${node.id}/sales`} style={linkSx}>
                            Sales
                        </Link>
                    </>
                )}
            </Box>
        </Box>
    );
}
