import { ReactNode, useState } from "react";
import { Container, MenuItem, TextField, Typography } from "@mui/material";
import { PersonAddRounded } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { router, useForm } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import StatusChip from "../../../components/utils/StatusChip";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import FormDialog from "../../../components/utils/forms/FormDialog";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import AgentPicker from "../../../components/utils/forms/AgentPicker";
import StyledTextField from "../../../components/utils/StyledTextField";
import MyTeamNav, { MyTeamGroup } from "../../../components/myteam/MyTeamNav";
import { formatDate } from "../../../helpers/formatDate";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { AgentOption } from "../../../types/app-data-types";

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
    canManage: boolean;
    // Paged on the server: a team can have thousands of members.
    members: ServerPage<Member>;
    memberCount: number;
    filters: TableFilters;
    subTeams: { id: number; name: string }[];
}

const selectSx = { minWidth: 160, "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 13 } };

function AddMemberDialog({ open, group, subTeams, onClose }: { open: boolean; group: MyTeamGroup; subTeams: MembersProps["subTeams"]; onClose: () => void }) {
    const form = useForm<{ agent: AgentOption | null; sub_team_id: number | "" }>({ agent: null, sub_team_id: "" });
    const errors = form.errors as Record<string, string>;

    const submit = () => {
        form.transform((d) => ({ agent_id: d.agent?.id ?? "", sub_team_id: d.sub_team_id }));
        form.post(`/my-team/teams/${group.id}/members`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    return (
        <FormDialog open={open} title={`Add a member to ${group.name}`} submitLabel="Add member" processing={form.processing} onSubmit={submit} onClose={onClose}>
            <div>
                <FieldLabel text="Agent" required />
                <AgentPicker name="agent" value={form.data.agent} onChange={(a) => form.setData("agent", a)} error={errors.agent_id ?? null} />
                <Typography variant="caption" component="p" sx={{ mt: 0.5, ml: 0.5, color: "var(--lr-text-secondary)" }}>
                    Only agents who aren't on a team yet can be added here; an admin transfers agents from other teams.
                </Typography>
            </div>
            <div>
                <FieldLabel text="Sub-team" />
                <StyledTextField
                    name="sub_team_id"
                    value={String(form.data.sub_team_id)}
                    error={errors.sub_team_id ?? null}
                    handleChange={(e) => form.setData("sub_team_id", e.target.value ? Number(e.target.value) : "")}
                    props={{
                        select: true,
                        children: [
                            <MenuItem key="none" value="">
                                No sub-team
                            </MenuItem>,
                            ...subTeams.map((s) => (
                                <MenuItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </MenuItem>
                            )),
                        ],
                    }}
                />
            </div>
        </FormDialog>
    );
}

// My Team › Members: who is on the team now. Team leaders can add agents without a team and move members
// between their sub-teams; unit managers see their sub-team's members.
function Members({ group, canManage, members, memberCount, filters, subTeams }: MembersProps) {
    // Keeps ?team= / ?sub_team= on every page / search change.
    const table = useServerTable("members", members, { ...filters, [group.type === "team" ? "team" : "sub_team"]: group.id });
    const [adding, setAdding] = useState(false);
    const [moving, setMoving] = useState<number | null>(null);

    const move = (member: Member, subTeamId: string) =>
        router.patch(`/my-team/teams/${group.id}/members/${member.id}`, { sub_team_id: subTeamId }, {
            preserveScroll: true,
            onStart: () => setMoving(member.id),
            onFinish: () => setMoving(null),
        });

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
                      renderCell: ({ row }) =>
                          canManage && subTeams.length > 0 ? (
                              <TextField
                                  select
                                  size="small"
                                  value={row.sub_team_id ? String(row.sub_team_id) : ""}
                                  disabled={moving === row.id}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => move(row, e.target.value)}
                                  slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": `Sub-team of ${row.name}` } }}
                                  sx={selectSx}
                              >
                                  <MenuItem value="">No sub-team</MenuItem>
                                  {subTeams.map((s) => (
                                      <MenuItem key={s.id} value={String(s.id)}>
                                          {s.name}
                                      </MenuItem>
                                  ))}
                              </TextField>
                          ) : (
                              row.sub_team_name ?? "—"
                          ),
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
            <MyTeamNav group={group} canManage={canManage} />
            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder="Search members by name or email"
                action={
                    canManage && (
                        <StyledButton
                            startIcon={<PersonAddRounded />}
                            variant="contained"
                            onClick={() => setAdding(true)}
                            sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                        >
                            Add member
                        </StyledButton>
                    )
                }
            />
            <DataTable
                {...table.gridProps}
                sortingMode="client"
                columns={columns.map((c) => ({ ...c, sortable: false }))}
                getRowHeight={() => 60}
                onRowClick={({ row }) => router.visit(`/agents/${row.id}`)}
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                aria-label="Members"
            />
            {canManage && <AddMemberDialog open={adding} group={group} subTeams={subTeams} onClose={() => setAdding(false)} />}
        </Container>
    );
}

Members.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Members;
