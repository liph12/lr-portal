import { ReactNode } from "react";
import { Container } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StatusChip from "../../../components/utils/StatusChip";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import MyTeamNav, { MyTeamGroup } from "../../../components/myteam/MyTeamNav";
import { formatDate } from "../../../helpers/formatDate";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";

interface Member {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    area: string | null;
    status: string;
    role: string | null;
    joined_at: string | null;
    sub_team_id?: number | null;
    sub_team_name?: string | null;
    is_leader: boolean;
}

interface MembersProps {
    group: MyTeamGroup;
    // The whole team (a team leader) rather than one sub-team.
    isTeam: boolean;
    // Paged on the server: a team can have thousands of members.
    members: ServerPage<Member>;
    memberCount: number;
    filters: TableFilters;
}

// My Team › Members: who is on the team (or sub-team) now — to look at. Adding members, moving them between sub-teams and
// creating sub-teams are Management's (superadmin / admin).
function Members({ group, isTeam, members, memberCount, filters }: MembersProps) {
    // Keeps ?team= / ?sub_team= on every page / search change.
    const table = useServerTable("members", members, { ...filters, [group.type === "team" ? "team" : "sub_team"]: group.id });

    const columns: GridColDef<Member>[] = [
        {
            field: "name",
            headerName: "Member",
            flex: 1.5,
            minWidth: 240,
            renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={row.is_leader ? `${group.type === "team" ? "Team leader" : "Unit manager"} · ${row.email}` : row.email} />,
        },
        { field: "role", headerName: "Role", width: 140, valueGetter: (_, row) => row.role ?? "—" },
        ...(group.type === "team"
            ? [
                  {
                      field: "sub_team_name",
                      headerName: "Sub-team",
                      flex: 1,
                      minWidth: 190,
                      sortable: false,
                      valueGetter: (_: unknown, row: Member) => row.sub_team_name ?? "—",
                  } as GridColDef<Member>,
              ]
            : []),
        { field: "area", headerName: "Branch", width: 150, valueGetter: (_, row) => row.area ?? "—" },
        { field: "joined_at", headerName: "Joined", width: 130, valueGetter: (_, row) => (row.joined_at ? formatDate(row.joined_at) : "—") },
        { field: "status", headerName: "Status", width: 120, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title={`My Team · ${group.name}`} subtitle={`${memberCount.toLocaleString()} active ${memberCount === 1 ? "member" : "members"}${group.team ? ` · sub-team of ${group.team}` : ""}`} />
            <MyTeamNav group={group} isTeam={isTeam} />
            <TableToolbar search={table.search} onSearch={table.setSearch} placeholder="Search members by name or email" />
            <DataTable
                {...table.gridProps}
                sortingMode="client"
                columns={columns.map((c) => ({ ...c, sortable: false }))}
                getRowHeight={() => 60}
                onRowClick={({ row }) => router.visit(`/agents/${row.id}`)}
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                aria-label="Members"
            />
        </Container>
    );
}

Members.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Members;
