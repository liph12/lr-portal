import { Box, Typography } from "@mui/material";
import { LoginRounded, NorthEastRounded } from "@mui/icons-material";
import UserAvatar from "../user/UserAvatar";
import UserStatusChip from "../user/UserStatusChip";
import StyledButton from "../StyledButton";
import { UserStatus } from "../../../types/app-data-types";

export interface UserSearchItem {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    agent_id: number | null;
    role_id: number | null;
    role_label: string | null;
    status: UserStatus;
    can_impersonate: boolean;
}

interface UserSearchResultProps {
    user: UserSearchItem;
    active: boolean;
    isSelf: boolean;
    onHover: () => void;
    onOpen: (path: string) => void;
    onSignInAs: (user: UserSearchItem) => void;
}

// A person in the navbar search: opens their profile; role and status are shown, edited in Management.
export default function UserSearchResult({ user, active, isSelf, onHover, onOpen, onSignInAs }: UserSearchResultProps) {
    const profile = user.agent_id ? `/agents/${user.agent_id}` : null;

    return (
        <Box
            role="option"
            aria-selected={active}
            aria-disabled={!profile}
            onMouseEnter={onHover}
            onClick={() => profile && onOpen(profile)}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1,
                flexWrap: { xs: "wrap", sm: "nowrap" },
                cursor: profile ? "pointer" : "default",
                backgroundColor: active ? "var(--lr-surface-container)" : "transparent",
            }}
        >
            <UserAvatar name={user.name} src={user.avatar} size={32} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", fontWeight: 500 }}>
                    {user.name}
                    {isSelf && (
                        <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 0.75 }}>
                            (you)
                        </Typography>
                    )}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: "var(--lr-text-secondary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                    {user.email}
                    {!profile && " · no agent profile"}
                </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: { xs: 5.5, sm: 0 } }}>
                <Typography
                    component="span"
                    variant="caption"
                    sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 99,
                        fontWeight: 500,
                        color: "var(--lr-primary)",
                        backgroundColor: "var(--lr-primary-soft)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {user.role_label ?? "No role"}
                </Typography>
                <UserStatusChip status={user.status} />
                {user.can_impersonate && (
                    <StyledButton
                        size="small"
                        variant="outlined"
                        startIcon={<LoginRounded sx={{ fontSize: 16 }} />}
                        aria-label={`Sign in as ${user.name}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSignInAs(user);
                        }}
                        sx={{ py: 0.25, px: 1.25, minWidth: 0, fontSize: 12, color: "var(--lr-primary)", borderColor: "var(--lr-outline)", whiteSpace: "nowrap" }}
                    >
                        Sign in
                    </StyledButton>
                )}
                {profile && <NorthEastRounded sx={{ fontSize: 16, color: "var(--lr-text-secondary)" }} />}
            </Box>
        </Box>
    );
}
