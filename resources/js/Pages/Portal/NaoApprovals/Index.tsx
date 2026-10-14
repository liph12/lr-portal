import { ReactNode, useEffect, useRef, useState } from "react";
import { Box, ButtonBase, Container, Link as MuiLink, Tooltip, Typography } from "@mui/material";
import { CheckRounded, CloseRounded, OpenInNewRounded } from "@mui/icons-material";
import { router, useForm } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import StatusChip from "../../../components/utils/StatusChip";
import ConfirmDialog from "../../../components/utils/ConfirmDialog";
import FormDialog from "../../../components/utils/forms/FormDialog";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import FilterAutocomplete, { FilterOption } from "../../../components/utils/tables/FilterAutocomplete";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { formatDate } from "../../../helpers/formatDate";
import { formatCount } from "../../../helpers/formatNumber";

type Status = "pending" | "approved" | "disapproved";

interface SubmissionRow {
    id: number;
    avatar: string | null;
    name: string | null;
    email: string | null;
    mobile: string | null;
    branch: string | null;
    team_name: string | null;
    sub_team_name: string | null;
    sponsor_id: number | null;
    sponsor_name: string | null;
    status: Status;
    attended_on: string | null;
    submitted_at: string | null;
    proof: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    remarks: string | null;
}

interface NaoApprovalsProps {
    submissions: ServerPage<SubmissionRow>;
    filters: TableFilters & { status: Status | "all"; team_id: number | null; sub_team_id: number | null; person: number | null };
    counts: Record<Status | "all", number>;
    // Filter choices: the teams / sub-teams (labelled by unit manager) of the agents in reach, and the picked person.
    groups: { teams: FilterOption[]; sub_teams: (FilterOption & { team_id: number })[] };
    person: FilterOption | null;
    // Sponsor / agent typeahead (partial reload with ?person_q=).
    personOptions?: FilterOption[];
    // Back office: nationwide; anyone else: their branches (secretary), the team / sub-team they lead, their recruits.
    scope: { everyone: true } | { everyone: false; branches: string[]; leads: boolean };
}

const TABS: { value: Status | "all"; label: string; tone: string }[] = [
    { value: "pending", label: "Waiting for approval", tone: "pending" },
    { value: "approved", label: "Approved", tone: "valid" },
    { value: "disapproved", label: "Disapproved", tone: "invalid" },
    { value: "all", label: "All", tone: "inactive" },
];

const STATUS_LABELS: Record<Status, string> = { pending: "Waiting", approved: "Approved", disapproved: "Disapproved" };
const TONES: Record<Status, string> = { pending: "pending", approved: "valid", disapproved: "invalid" };
const isImage = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

function subtitle(scope: NaoApprovalsProps["scope"]): string {
    if (scope.everyone) return "Face-to-face NAO attendances nationwide, including those sent on the old system. Check each proof, then approve or disapprove.";
    const parts = [
        scope.branches.length ? `agents of the ${scope.branches.join(", ")} branch${scope.branches.length > 1 ? "es" : ""}` : null,
        scope.leads ? "the members of the team or sub-team you lead" : null,
        "the agents you sponsored",
    ].filter(Boolean);
    return `Face-to-face NAO attendances sent by ${parts.join(", ").replace(/, ([^,]*)$/, " and $1")}. Check each proof, then approve or disapprove.`;
}

// NAO approvals: face-to-face New Agents Orientation attendances sent from onboarding (proof + date). Approving completes
// the agent's NAO; disapproving needs a reason, which the agent sees, and sends them back to the NAO step.
function NaoApprovals({ submissions, filters, counts, scope, groups, person, personOptions }: NaoApprovalsProps) {
    const table = useServerTable("submissions", submissions, filters, ["counts", "person"]);
    const [searchingPerson, setSearchingPerson] = useState(false);
    const personTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(personTimer.current), []);
    const searchPerson = (text: string) => {
        clearTimeout(personTimer.current);
        if (text.trim().length < 2) return;
        personTimer.current = setTimeout(() => {
            setSearchingPerson(true);
            router.reload({ only: ["personOptions"], data: { person_q: text.trim() }, preserveUrl: true, async: true, onFinish: () => setSearchingPerson(false) });
        }, 250);
    };
    const subTeams = filters.team_id ? groups.sub_teams.filter((s) => s.team_id === filters.team_id) : groups.sub_teams;
    const [approving, setApproving] = useState<SubmissionRow | null>(null);
    const [disapproving, setDisapproving] = useState<SubmissionRow | null>(null);
    const reject = useForm<{ reason: string }>({ reason: "" });
    const showSponsor = scope.everyone || scope.branches.length > 0 || scope.leads;

    const closeReject = () => {
        setDisapproving(null);
        reject.reset();
        reject.clearErrors();
    };

    const columns: GridColDef<SubmissionRow>[] = [
        {
            field: "name",
            headerName: "Agent",
            flex: 1.4,
            minWidth: 220,
            renderCell: ({ row }) => <PersonCell name={row.name ?? `Agent #${row.id}`} secondary={[row.mobile, row.email].filter(Boolean).join(" · ") || undefined} avatar={row.avatar} />,
        },
        {
            field: "branch",
            headerName: "Branch / team",
            flex: 1.1,
            minWidth: 180,
            renderCell: ({ row }) => <PersonCell hideAvatar name={row.branch ?? "No branch"} secondary={[row.team_name, row.sub_team_name].filter(Boolean).join(" / ") || "No team"} />,
        },
        ...(showSponsor
            ? [
                  {
                      field: "sponsor",
                      headerName: "Sponsor",
                      flex: 1,
                      minWidth: 160,
                      sortable: false,
                      valueGetter: (_: unknown, row: SubmissionRow) => row.sponsor_name ?? (row.sponsor_id ? `Member #${row.sponsor_id}` : "—"),
                  } as GridColDef<SubmissionRow>,
              ]
            : []),
        // The default sort (newest first) — a column field, or the grid would reset the sort and reload.
        { field: "attended_on", headerName: "NAO date", width: 120, valueGetter: (_, row) => (row.attended_on ? formatDate(row.attended_on) : "—") },
        {
            field: "proof",
            headerName: "Proof",
            width: 110,
            sortable: false,
            renderCell: ({ row }) =>
                row.proof ? (
                    <MuiLink href={row.proof} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--lr-primary)", fontSize: 14 }}>
                        {isImage(row.proof) ? (
                            <Box component="img" src={row.proof} alt="Proof of attendance" sx={{ width: 44, height: 44, objectFit: "cover", borderRadius: 1, border: "1px solid var(--lr-border)" }} />
                        ) : (
                            <>
                                View <OpenInNewRounded sx={{ fontSize: 16 }} />
                            </>
                        )}
                    </MuiLink>
                ) : (
                    "—"
                ),
        },
        {
            field: "reviewed_at",
            headerName: "Approval",
            flex: 1.2,
            minWidth: 240,
            renderCell: ({ row }) =>
                row.status === "pending" ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <StyledButton size="small" variant="outlined" startIcon={<CheckRounded />} onClick={() => setApproving(row)} sx={{ py: 0.25, color: "var(--lr-success)", borderColor: "var(--lr-outline)" }}>
                            Approve
                        </StyledButton>
                        <StyledButton size="small" variant="outlined" startIcon={<CloseRounded />} onClick={() => setDisapproving(row)} sx={{ py: 0.25, color: "var(--lr-error)", borderColor: "var(--lr-outline)" }}>
                            Disapprove
                        </StyledButton>
                    </Box>
                ) : (
                    <Tooltip title={row.remarks ?? ""} disableHoverListener={!row.remarks}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                            <StatusChip status={TONES[row.status]}>{STATUS_LABELS[row.status]}</StatusChip>
                            <PersonCell hideAvatar name={row.reviewed_by ?? "—"} secondary={row.status === "disapproved" && row.remarks ? row.remarks : row.reviewed_at ? formatDate(row.reviewed_at) : undefined} />
                        </Box>
                    </Tooltip>
                ),
        },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <SectionTitle title="NAO Approvals" subtitle={subtitle(scope)} />

            <Box role="tablist" aria-label="Approval status" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {TABS.map((t) => {
                    const active = filters.status === t.value;
                    return (
                        <ButtonBase
                            key={t.value}
                            role="tab"
                            aria-selected={active}
                            onClick={() => table.setFilter("status", t.value)}
                            sx={{
                                px: 2,
                                py: 0.75,
                                borderRadius: 99,
                                fontSize: 14,
                                whiteSpace: "nowrap",
                                fontWeight: active ? 600 : 500,
                                color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                                backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)",
                            }}
                        >
                            {t.label}
                            <StatusChip status={t.tone} sx={{ ml: 1, height: 20, lineHeight: "20px", px: 1, fontFamily: "Google Sans Code, monospace" }}>
                                {formatCount(counts[t.value])}
                            </StatusChip>
                        </ButtonBase>
                    );
                })}
            </Box>

            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder="Search by agent name or email"
                filters={
                    <>
                        {groups.teams.length > 1 && (
                            <FilterAutocomplete
                                label="Teams"
                                value={groups.teams.find((t) => t.value === filters.team_id) ?? null}
                                options={groups.teams}
                                // A unit manager of another team no longer applies.
                                onChange={(o) => table.setFilters({ team_id: o?.value ?? "", sub_team_id: o && groups.sub_teams.some((s) => s.value === filters.sub_team_id && s.team_id === o.value) ? filters.sub_team_id : "" })}
                            />
                        )}
                        {subTeams.length > 1 && (
                            <FilterAutocomplete
                                label="Unit managers"
                                value={groups.sub_teams.find((s) => s.value === filters.sub_team_id) ?? null}
                                options={subTeams}
                                onChange={(o) => table.setFilter("sub_team_id", o?.value ?? null)}
                                width={240}
                            />
                        )}
                        <FilterAutocomplete
                            label="Sponsors / agents"
                            value={person}
                            options={personOptions ?? []}
                            onChange={(o) => table.setFilter("person", o?.value ?? null)}
                            onSearch={searchPerson}
                            loading={searchingPerson}
                            width={240}
                        />
                    </>
                }
            />
            <DataTable {...table.gridProps} columns={columns} getRowHeight={() => 64} aria-label="NAO attendances" />

            <ConfirmDialog
                open={approving !== null}
                title={`Approve ${approving?.name ?? "this agent"}'s NAO attendance?`}
                message={`Attended on ${approving?.attended_on ? formatDate(approving.attended_on) : "—"}. Their NAO is marked complete (100%). This is recorded with your name.`}
                confirmLabel="Approve"
                tone="primary"
                onConfirm={() => {
                    if (approving) router.post(`/nao-approvals/${approving.id}/approve`, {}, { preserveScroll: true });
                    setApproving(null);
                }}
                onClose={() => setApproving(null)}
            />

            <FormDialog
                open={disapproving !== null}
                title={`Disapprove ${disapproving?.name ?? "this agent"}'s NAO attendance?`}
                submitLabel="Disapprove"
                processing={reject.processing}
                onSubmit={() => disapproving && reject.post(`/nao-approvals/${disapproving.id}/disapprove`, { preserveScroll: true, onSuccess: closeReject })}
                onClose={closeReject}
            >
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    They'll be asked to send another proof or watch the New Agents Webinar, and they'll see your reason.
                </Typography>
                <div>
                    <FieldLabel text="Reason" required />
                    <StyledTextField
                        name="reason"
                        value={reject.data.reason}
                        error={reject.errors.reason ?? null}
                        handleChange={(e) => reject.setData("reason", e.target.value)}
                        props={{ multiline: true, minRows: 3, placeholder: "e.g. The photo doesn't show the orientation, or the date doesn't match." }}
                    />
                </div>
            </FormDialog>
        </Container>
    );
}

NaoApprovals.layout = (page: ReactNode) => <AppLayout children={page} />;

export default NaoApprovals;
