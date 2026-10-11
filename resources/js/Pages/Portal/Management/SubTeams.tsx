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
import SubTeamDialog from "../../../components/utils/forms/SubTeamDialog";
import useAuthUser from "../../../hooks/useAuthUser";
import { SubTeamRow, TeamOption } from "../../../types/app-data-types";

interface SubTeamsProps {
    subTeams: SubTeamRow[];
    teams: TeamOption[];
    statuses: string[];
}

function SubTeams({ subTeams, teams, statuses }: SubTeamsProps) {
    const baseUrl = `/${useAuthUser()?.portal ?? "superadmin"}/management`;
    const [search, setSearch] = useState("");
    const [teamId, setTeamId] = useState("");
    const [status, setStatus] = useState("");
    const [editing, setEditing] = useState<SubTeamRow | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return subTeams.filter(
            (s) =>
                (!teamId || String(s.team_id) === teamId) &&
                (!status || s.status === status) &&
                (!term || s.name.toLowerCase().includes(term) || (s.leader_name ?? "").toLowerCase().includes(term)),
        );
    }, [subTeams, search, teamId, status]);

    const open = (subTeam: SubTeamRow | null) => {
        setEditing(subTeam);
        setDialogOpen(true);
    };

    const columns: GridColDef<SubTeamRow>[] = [
        {
            field: "name",
            headerName: "Sub-team",
            flex: 1.3,
            minWidth: 220,
            renderCell: ({ row }) => (
                <PersonCell
                    name={row.name}
                    secondary={`#${row.id}`}
                    picture={
                        <PhotoUploadButton url={`${baseUrl}/sub-teams/${row.id}/photo`} label={`Change photo of ${row.name}`}>
                            <UserAvatar name={row.name} src={row.logo} size={34} />
                        </PhotoUploadButton>
                    }
                />
            ),
        },
        { field: "team_name", headerName: "Team", flex: 1, minWidth: 160 },
        {
            field: "leader_name",
            headerName: "Leader",
            flex: 1.2,
            minWidth: 200,
            renderCell: ({ row }) => <PersonCell name={row.leader_name} avatar={row.leader_avatar} />,
        },
        { field: "members_count", headerName: "Active members", type: "number", width: 140 },
        {
            field: "status",
            headerName: "Status",
            width: 150,
            renderCell: ({ row }) => (
                <StatusMenu
                    status={row.status}
                    statuses={statuses}
                    url={`${baseUrl}/sub-teams/${row.id}/status`}
                    subject={row.name}
                    confirm={{ deactivated: "Every member's stint on this sub-team ends today. History is kept." }}
                />
            ),
        },
        {
            field: "actions",
            headerName: "",
            width: 64,
            sortable: false,
            renderCell: ({ row }) => (
                <Tooltip title="Edit sub-team">
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
                placeholder="Search sub-teams or leaders"
                filters={
                    <>
                        <FilterSelect label="Teams" value={teamId} options={teams.map((t) => ({ value: String(t.id), label: t.name }))} onChange={setTeamId} />
                        <FilterSelect label="Statuses" value={status} options={statuses.map((s) => ({ value: s, label: s }))} onChange={setStatus} />
                    </>
                }
                action={
                    <StyledButton
                        startIcon={<AddRounded />}
                        variant="contained"
                        onClick={() => open(null)}
                        sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                    >
                        New sub-team
                    </StyledButton>
                }
            />
            <DataTable
                rows={rows}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                getRowHeight={() => 60}
                aria-label="Sub-teams"
            />
            <SubTeamDialog open={dialogOpen} subTeam={editing} teams={teams} statuses={statuses} baseUrl={baseUrl} onClose={() => setDialogOpen(false)} />
        </>
    );
}

SubTeams.layout = (page: ReactNode) => <ManagementLayout children={page} />;

export default SubTeams;
