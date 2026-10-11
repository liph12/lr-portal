import { ReactNode, useEffect, useState } from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { AddRounded, ErrorOutlineRounded } from "@mui/icons-material";
import { router, usePage } from "@inertiajs/react";
import AppLayout from "../../../../components/layouts/AppLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import FlashBanner from "../../../../components/utils/FlashBanner";
import StyledButton from "../../../../components/utils/StyledButton";
import SectionCard from "../../../../components/cards/SectionCard";
import RoleCard from "../../../../components/cards/RoleCard";
import PermissionsCard from "../../../../components/cards/PermissionsCard";
import RoleMembersCard from "../../../../components/cards/RoleMembersCard";
import RoleEditorForm from "../../../../components/utils/forms/RoleEditorForm";
import NewRoleDialog from "../../../../components/utils/forms/NewRoleDialog";
import { PermissionItem, RoleItem, RoleMembersPage, UserStatus } from "../../../../types/app-data-types";
import useAuthUser from "../../../../hooks/useAuthUser";
import { FormErrors } from "../../../../types";

interface RolesIndexProps {
    roles: RoleItem[];
    permissions: PermissionItem[];
    members: RoleMembersPage;
    statuses: UserStatus[];
    selectedRoleId: number | null;
}

function RolesIndex({ roles, permissions, members, statuses, selectedRoleId }: RolesIndexProps) {
    const authUser = useAuthUser();
    const [selectedId, setSelectedId] = useState<number | null>(selectedRoleId ?? roles[0]?.id ?? null);
    const [creating, setCreating] = useState(false);
    // Refused actions (deleting a built-in role, changing your own status, …) come back as shared validation errors.
    const pageErrors = usePage().props.errors as FormErrors;
    const roleError = pageErrors.role ?? pageErrors.status;

    useEffect(() => {
        if (selectedRoleId) setSelectedId(selectedRoleId);
    }, [selectedRoleId]);

    // Switch instantly, then fetch that role's first page of members (the server pages them).
    const selectRole = (id: number) => {
        setSelectedId(id);
        router.get("/superadmin/settings/roles", { role: id }, {
            only: ["members", "selectedRoleId"],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const selected = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle
                title="Roles & permissions"
                subtitle="Create roles such as Agent, Unit Manager or Team Leader and choose what each can do."
                action={
                    <StyledButton
                        variant="contained"
                        size="small"
                        startIcon={<AddRounded />}
                        onClick={() => setCreating(true)}
                        sx={{ px: 2, flexShrink: 0, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                    >
                        New role
                    </StyledButton>
                }
            />
            <FlashBanner />
            {roleError && (
                <Box
                    role="alert"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 3,
                        px: 2,
                        py: 1.25,
                        borderRadius: 3,
                        color: "var(--lr-error)",
                        backgroundColor: "var(--lr-error-soft)",
                    }}
                >
                    <ErrorOutlineRounded fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {roleError}
                    </Typography>
                </Box>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Typography
                        variant="caption"
                        component="h2"
                        sx={{ display: "block", color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3, mb: 1 }}
                    >
                        ROLES ({roles.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {roles.map((role) => (
                            <RoleCard
                                key={role.id}
                                role={role}
                                totalPermissions={permissions.length}
                                selected={role.id === selected?.id}
                                onSelect={() => selectRole(role.id)}
                            />
                        ))}
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {selected && (
                        <SectionCard
                            title={selected.label}
                            subtitle={
                                selected.is_system
                                    ? "Built-in role. It can be renamed but not deleted."
                                    : `${selected.users_count} ${selected.users_count === 1 ? "user has" : "users have"} this role.`
                            }
                        >
                            {/* Keyed by role and its saved state so switching roles or saving starts a fresh form. */}
                            <RoleEditorForm
                                key={`${selected.id}-${selected.label}-${selected.permission_ids.join(",")}-${permissions.length}`}
                                role={selected}
                                permissions={permissions}
                            />
                        </SectionCard>
                    )}
                    {selected && (
                        <SectionCard
                            title={`Members (${selected.users_count})`}
                            subtitle={`People who have the ${selected.label} role.`}
                        >
                            <RoleMembersCard role={selected} members={members} statuses={statuses} currentUserId={authUser?.id ?? null} />
                        </SectionCard>
                    )}
                    <SectionCard title="Permissions" subtitle="The actions you can grant to roles.">
                        <PermissionsCard permissions={permissions} selectedRoleId={selected?.id ?? null} />
                    </SectionCard>
                </Grid>
            </Grid>

            <NewRoleDialog
                open={creating}
                roles={roles}
                allPermissionIds={permissions.map((p) => p.id)}
                onClose={() => setCreating(false)}
            />
        </Container>
    );
}

RolesIndex.layout = (page: ReactNode) => <AppLayout children={page} />;

export default RolesIndex;
