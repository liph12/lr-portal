import { ReactNode, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { EditRounded, LoginRounded, SwapHorizRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import ConfirmDialog from "../../../components/utils/ConfirmDialog";
import { GridColDef } from "@mui/x-data-grid";
import ManagementLayout from "../../../components/layouts/ManagementLayout";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import FilterSelect from "../../../components/utils/tables/FilterSelect";
import PersonCell from "../../../components/utils/tables/PersonCell";
import StatusMenu from "../../../components/utils/StatusMenu";
import CountryFlag from "../../../components/utils/CountryFlag";
import PhotoUploadButton from "../../../components/utils/PhotoUploadButton";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import TransferDialog from "../../../components/utils/forms/TransferDialog";
import DesignationDialog from "../../../components/utils/forms/DesignationDialog";
import DesignationBadges from "../../../components/utils/user/DesignationBadges";
import AgentDetailDrawer from "../../../components/utils/user/AgentDetailDrawer";
import useAuthUser from "../../../hooks/useAuthUser";
import useCan from "../../../hooks/useCan";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { AGENT_TYPE_LABELS, AgentRow, TeamOption } from "../../../types/app-data-types";
import { formatDate } from "../../../helpers/formatDate";

interface AgentsProps {
    agents: ServerPage<AgentRow>;
    filters: TableFilters;
    teams: TeamOption[];
    statuses: string[];
    agentTypes: string[];
    // area key => name
    areas: Record<string, string>;
}

// Who a manager may change (UserPolicy::updateStatus): superadmins anyone; admins all but admins and superadmins;
// anyone else given Management (e.g. staff) only the field roles.
const PROTECTED = { admin: ["superadmin", "admin"], other: ["superadmin", "admin", "staff"] };
const DORMANT_NOTE = "Inactive: no sale in 6 months since activation. They can still sign in; set Active to restart the 6 months.";
const SIGN_OUT_NOTE = "They're signed out right away and can't sign in until set back to active.";

function Agents({ agents, filters, teams, statuses, agentTypes, areas }: AgentsProps) {
    const me = useAuthUser();
    const baseUrl = `/${me?.portal ?? "superadmin"}/management`;
    const table = useServerTable("agents", agents, filters);
    const [transferring, setTransferring] = useState<AgentRow | null>(null);
    const [signingInAs, setSigningInAs] = useState<AgentRow | null>(null);
    const [designating, setDesignating] = useState<AgentRow | null>(null);
    const [viewing, setViewing] = useState<AgentRow | null>(null);
    const can = useCan();

    const canManage = (row: AgentRow) =>
        row.user_id !== me?.id && (!!me?.can.access_superadmin || (me?.portal === "admin" ? PROTECTED.admin : PROTECTED.other).indexOf(row.role ?? "") === -1);

    const columns: GridColDef<AgentRow>[] = [
        {
            field: "name",
            headerName: "Agent",
            flex: 1.5,
            minWidth: 240,
            renderCell: ({ row }) => (
                <PersonCell
                    name={row.name}
                    secondary={row.email}
                    picture={
                        canManage(row) && can("change_agent_status") ? (
                            <PhotoUploadButton url={`${baseUrl}/agents/${row.id}/photo`} label={`Change photo of ${row.name}`}>
                                <UserAvatar name={row.name} src={row.avatar} size={34} />
                            </PhotoUploadButton>
                        ) : undefined
                    }
                    avatar={row.avatar}
                    onOpen={() => setViewing(row)}
                />
            ),
        },
        {
            field: "agent_type",
            headerName: "Type",
            width: 160,
            renderCell: ({ row }) => (
                <StatusMenu
                    status={row.agent_type}
                    statuses={agentTypes}
                    labels={AGENT_TYPE_LABELS}
                    field="agent_type"
                    url={`${baseUrl}/agents/${row.id}/type`}
                    subject={row.name}
                    disabled={!canManage(row) || !can("edit_designation")}
                />
            ),
        },
        {
            field: "designation",
            headerName: "Designation",
            width: 210,
            sortable: false,
            // Unit Manager by rate / by dashboard and Broker, each from a date: changed in the dialog, never inline.
            renderCell: ({ row }) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", height: "100%" }}>
                    <DesignationBadges person={row} />
                    {row.unit_manager_by === "dashboard" && (
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }} title={row.unit_manager_since ? `Since ${formatDate(row.unit_manager_since)}` : undefined}>
                            UM by dashboard
                        </Typography>
                    )}
                    {canManage(row) && can("edit_designation") && (
                        <Tooltip title="Change designation">
                            <IconButton size="small" aria-label={`Change designation of ${row.name}`} onClick={() => setDesignating(row)}>
                                <EditRounded sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
        { field: "area", headerName: "Branch", width: 130, valueGetter: (_, row) => (row.area ? (areas[row.area] ?? row.area) : "Unassigned") },
        { field: "country", headerName: "Country", width: 170, renderCell: ({ row }) => <CountryFlag code={row.country_code} country={row.country} /> },
        { field: "role_label", headerName: "Role", width: 130, valueGetter: (_, row) => row.role_label ?? "—" },
        {
            field: "team_name",
            headerName: "Team / sub-team",
            flex: 1.2,
            minWidth: 200,
            renderCell: ({ row }) => <PersonCell name={row.team_name ?? "No team"} secondary={row.sub_team_name ?? undefined} hideAvatar />,
        },
        { field: "joined_at", headerName: "Joined team", width: 130, valueGetter: (_, row) => (row.joined_at ? formatDate(row.joined_at) : "—") },
        {
            field: "status",
            headerName: "Status",
            width: 150,
            renderCell: ({ row }) => (
                // Dormant agents show as inactive while their account stays active (they can still sign in).
                <Tooltip title={row.activity === "dormant" && row.account_status === "active" ? DORMANT_NOTE : ""}>
                    <span>
                        <StatusMenu
                            status={row.status}
                            statuses={statuses}
                            url={`${baseUrl}/agents/${row.id}/status`}
                            subject={row.name}
                            disabled={!canManage(row) || !can("change_agent_status")}
                            confirm={{ inactive: SIGN_OUT_NOTE, resigned: SIGN_OUT_NOTE, terminated: SIGN_OUT_NOTE }}
                        />
                    </span>
                </Tooltip>
            ),
        },
        {
            field: "actions",
            headerName: "",
            width: 96,
            sortable: false,
            renderCell: ({ row }) => (
                <>
                    {can("transfer_agents") && (
                        <Tooltip title="Transfer to another team">
                            <IconButton size="small" aria-label={`Transfer ${row.name}`} onClick={() => setTransferring(row)}>
                                <SwapHorizRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {me?.can.impersonate && row.role !== "superadmin" && row.status === "active" && (
                        <Tooltip title={`Sign in as ${row.name}`}>
                            <IconButton size="small" aria-label={`Sign in as ${row.name}`} onClick={() => setSigningInAs(row)}>
                                <LoginRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </>
            ),
        },
    ];

    return (
        <>
            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder="Search agents by name or email"
                filters={
                    <>
                        <FilterSelect label="Statuses" value={filters.status} options={statuses.map((s) => ({ value: s, label: s }))} onChange={(v) => table.setFilter("status", v)} />
                        <FilterSelect
                            label="Types"
                            value={filters.agent_type}
                            options={agentTypes.map((t) => ({ value: t, label: AGENT_TYPE_LABELS[t] ?? t }))}
                            onChange={(v) => table.setFilter("agent_type", v)}
                        />
                        <FilterSelect
                            label="Designations"
                            value={filters.designation}
                            options={[
                                { value: "um_dashboard", label: "UM by dashboard" },
                                { value: "um_rate", label: "UM by rate" },
                                { value: "broker", label: "Brokers" },
                            ]}
                            onChange={(v) => table.setFilter("designation", v)}
                        />
                        <FilterSelect
                            label="Membership"
                            hideAll
                            value={filters.team_id ? "with_team" : (filters.membership ?? "with_team")}
                            options={[
                                { value: "with_team", label: "With a team" },
                                { value: "no_team", label: "No team" },
                                { value: "any", label: "With or without a team" },
                            ]}
                            onChange={(v) => table.setFilters({ membership: v === "with_team" ? "" : v, team_id: v === "no_team" ? "" : (filters.team_id ?? "") })}
                        />
                        <FilterSelect
                            label="Registration"
                            hideAll
                            value={filters.registration ?? "complete"}
                            options={[
                                { value: "complete", label: "Fully registered" },
                                { value: "incomplete", label: "Not finished signing up" },
                                { value: "any", label: "Any registration step" },
                            ]}
                            onChange={(v) => table.setFilter("registration", v === "complete" ? "" : v)}
                        />
                        <FilterSelect label="Teams" value={filters.team_id} options={teams.map((t) => ({ value: String(t.id), label: t.name }))} onChange={(v) => table.setFilter("team_id", v)} />
                    </>
                }
            />
            <DataTable {...table.gridProps} columns={columns} getRowHeight={() => 60} aria-label="Agents" />
            <ConfirmDialog
                open={signingInAs !== null}
                title={`Sign in as ${signingInAs?.name ?? ""}?`}
                message="You'll see the portal exactly as they do. Everything you do is recorded as them and as you. Use the red banner to return to your own account."
                confirmLabel="Sign in as them"
                tone="primary"
                onConfirm={() => {
                    if (signingInAs) router.post(`/impersonate/${signingInAs.user_id}`);
                    setSigningInAs(null);
                }}
                onClose={() => setSigningInAs(null)}
            />
            <AgentDetailDrawer agent={viewing} onClose={() => setViewing(null)} />
            <DesignationDialog agent={designating} baseUrl={baseUrl} onClose={() => setDesignating(null)} />
            <TransferDialog
                open={transferring !== null}
                agent={transferring ? { id: transferring.id, name: transferring.name, email: transferring.email, avatar: transferring.avatar, team_name: transferring.team_name, sub_team_name: transferring.sub_team_name } : null}
                teams={teams}
                baseUrl={baseUrl}
                onClose={() => setTransferring(null)}
            />
        </>
    );
}

Agents.layout = (page: ReactNode) => <ManagementLayout children={page} />;

export default Agents;
