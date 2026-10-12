import { ReactNode, useState } from "react";
import { Box, Container, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ChevronRightRounded, PersonRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import AgentPicker from "../../../components/utils/forms/AgentPicker";
import GenealogyTree, { GenealogyBranch, Layout } from "../../../components/genealogy/GenealogyTree";
import { GenealogyNode } from "../../../components/genealogy/GenealogyCard";
import useAuthUser from "../../../hooks/useAuthUser";
import { AgentOption } from "../../../types/app-data-types";

interface GenealogyProps {
    root: GenealogyNode | null;
    upline: { id: number; name: string }[];
    firstBranch: GenealogyBranch | null;
    ownId: number | null;
    canPick: boolean;
    roles: string[];
    perBranch: number;
    sizes: number[];
    canSaveSize: boolean;
    layout: Layout;
}

const ROLE_LABELS: Record<string, string> = { team_leader: "Team leaders", unit_manager: "Unit managers", agent: "Agents" };

const toggleSx = {
    "& .MuiToggleButton-root": { textTransform: "none", px: 1.5, py: 0.5, fontSize: 13, borderColor: "var(--lr-border)", color: "var(--lr-text-secondary)" },
    "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" },
};

// Genealogy: the recruit network as a tree of cards. Everyone sees their own downline; the back office and office
// secretaries can pick a team leader, unit manager or agent within reach and open theirs.
function Genealogy({ root, upline, firstBranch, ownId, canPick, roles, perBranch, sizes, canSaveSize, layout }: GenealogyProps) {
    const auth = useAuthUser();
    const [role, setRole] = useState("");
    const openProfiles = !!auth?.portal;
    const isOwn = !!root && root.id === ownId;

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <SectionTitle
                title="Genealogy"
                subtitle={isOwn ? "Your recruits and theirs, level by level. Open a card to see who they brought in." : "The recruit network, level by level. Open a card to see who they brought in."}
            />

            {canPick && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
                    <ToggleButtonGroup size="small" exclusive value={role} onChange={(_, v: string | null) => v !== null && setRole(v)} aria-label="Account type" sx={toggleSx}>
                        <ToggleButton value="">Everyone</ToggleButton>
                        {roles.map((r) => (
                            <ToggleButton key={r} value={r}>
                                {ROLE_LABELS[r] ?? r}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                    <Box sx={{ flex: "1 1 280px", maxWidth: 420 }}>
                        <AgentPicker
                            name="genealogy_agent"
                            value={null}
                            placeholder="Find a team leader, unit manager or agent"
                            searchUrl="/genealogy/search"
                            params={role ? { role } : undefined}
                            describe={(o) => {
                                const n = o as unknown as GenealogyNode;
                                return [n.role, n.area].filter(Boolean).join(" · ");
                            }}
                            onChange={(agent: AgentOption | null) => agent && router.get("/genealogy", { agent: agent.id })}
                        />
                    </Box>
                    {ownId && !isOwn && (
                        <Link href="/genealogy" style={{ textDecoration: "none" }}>
                            <StyledButton size="small" variant="outlined" startIcon={<PersonRounded />} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                                My tree
                            </StyledButton>
                        </Link>
                    )}
                </Box>
            )}

            {!canPick && ownId && !isOwn && (
                <Link href="/genealogy" style={{ textDecoration: "none" }}>
                    <StyledButton size="small" variant="outlined" startIcon={<PersonRounded />} sx={{ mb: 2, color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                        Back to my tree
                    </StyledButton>
                </Link>
            )}

            {upline.length > 0 && (
                <Box component="nav" aria-label="Sponsors above" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mr: 0.5 }}>
                        Sponsored by
                    </Typography>
                    {upline.map((u, i) => (
                        <Box key={u.id} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                            {i > 0 && <ChevronRightRounded sx={{ fontSize: 16, color: "var(--lr-text-secondary)" }} aria-hidden />}
                            <Link href={`/genealogy?agent=${u.id}`} style={{ fontSize: 14, color: "var(--lr-primary)", textDecoration: "none" }}>
                                {u.name}
                            </Link>
                        </Box>
                    ))}
                </Box>
            )}

            {root && firstBranch ? (
                <GenealogyTree key={root.id} root={root} firstPage={firstBranch} openProfiles={openProfiles} perBranch={perBranch} sizes={sizes} canSaveSize={canSaveSize} layout={layout} />
            ) : (
                <Box sx={{ p: 4, textAlign: "center", border: "1px dashed var(--lr-border)", borderRadius: 3 }}>
                    <Typography sx={{ color: "var(--lr-text-secondary)" }}>Find a team leader, unit manager or agent above to open their tree.</Typography>
                </Box>
            )}
        </Container>
    );
}

Genealogy.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Genealogy;
