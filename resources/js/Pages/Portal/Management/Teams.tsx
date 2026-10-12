import { ReactNode, useMemo, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { AddRounded, EditOutlined } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import ManagementLayout from "../../../components/layouts/ManagementLayout";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import FilterSelect from "../../../components/utils/tables/FilterSelect";
import PersonCell from "../../../components/utils/tables/PersonCell";
import StatusMenu from "../../../components/utils/StatusMenu";
import StyledButton from "../../../components/utils/StyledButton";
import PhotoUploadButton from "../../../components/utils/PhotoUploadButton";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import TeamDialog from "../../../components/utils/forms/TeamDialog";
import useCan from "../../../hooks/useCan";
import useAuthUser from "../../../hooks/useAuthUser";
import { TeamRow } from "../../../types/app-data-types";

interface TeamsProps {
    teams: TeamRow[];
    statuses: string[];
}

const DEACTIVATE_WARNING = "Every member's stint on this team ends today and its sub-teams are deactivated too. Team history is kept.";

function Teams({ teams, statuses }: TeamsProps) {
    const baseUrl = `/${useAuthUser()?.portal ?? "superadmin"}/management`;
    const can = useCan();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [editing, setEditing] = useState<TeamRow | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return teams.filter(
            (t) => (!status || t.status === status) && (!term || t.name.toLowerCase().includes(term) || (t.leader_name ?? "").toLowerCase().includes(term)),
        );
    }, [teams, search, status]);

    const open = (team: TeamRow | null) => {
        setEditing(team);
        setDialogOpen(true);
    };

    const columns: GridColDef<TeamRow>[] = [
        {
            field: "name",
            headerName: "Team",
            flex: 1.4,
            minWidth: 220,
            renderCell: ({ row }) => (
                <PersonCell
                    name={row.name}
                    secondary={`#${row.id}`}
                    avatar={row.logo}
                    picture={
                        can("edit_teams") ? (
                            <PhotoUploadButton url={`${baseUrl}/teams/${row.id}/photo`} label={`Change photo of ${row.name}`}>
                                <UserAvatar name={row.name} src={row.logo} size={34} />
                            </PhotoUploadButton>
                        ) : undefined
                    }
                />
            ),
        },
        {
            field: "leader_name",
            headerName: "Team leader",
            flex: 1.2,
            minWidth: 200,
            renderCell: ({ row }) => <PersonCell name={row.leader_name} avatar={row.leader_avatar} />,
        },
        { field: "members_count", headerName: "Active members", type: "number", width: 140 },
        { field: "sub_teams_count", headerName: "Sub-teams", type: "number", width: 110 },
        {
            field: "status",
            headerName: "Status",
            width: 150,
            renderCell: ({ row }) => (
                <StatusMenu status={row.status} statuses={statuses} url={`${baseUrl}/teams/${row.id}/status`} subject={row.name} confirm={{ deactivated: DEACTIVATE_WARNING }} disabled={!can("change_team_status")} />
            ),
        },
        {
            field: "actions",
            headerName: "",
            width: 64,
            sortable: false,
            renderCell: ({ row }) =>
                can("edit_teams") && (
                    <Tooltip title="Edit team">
                        <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => open(row)}>
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ),
        },
    ];

    return (
        <>
            <TableToolbar
                search={search}
                onSearch={setSearch}
                placeholder="Search teams or leaders"
                filters={<FilterSelect label="Statuses" value={status} options={statuses.map((s) => ({ value: s, label: s }))} onChange={setStatus} />}
                action={
                    can("edit_teams") && (
                        <StyledButton
                            startIcon={<AddRounded />}
                            variant="contained"
                            onClick={() => open(null)}
                            sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                        >
                            New team
                        </StyledButton>
                    )
                }
            />
            <DataTable
                rows={rows}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                getRowHeight={() => 60}
                aria-label="Teams"
            />
            <TeamDialog open={dialogOpen} team={editing} statuses={statuses} baseUrl={baseUrl} onClose={() => setDialogOpen(false)} />
        </>
    );
}

Teams.layout = (page: ReactNode) => <ManagementLayout children={page} />;

export default Teams;
