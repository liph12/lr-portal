import { ReactNode, useState } from "react";
import { Box, Grid, Link as MuiLink, Typography } from "@mui/material";
import {
    CheckRounded,
    CloseRounded,
    OpenInNewRounded,
    SendRounded,
} from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import SectionTitle from "../../../components/utils/SectionTitle";
import SectionCard from "../../../components/cards/SectionCard";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import StatusChip from "../../../components/utils/StatusChip";
import FormDialog from "../../../components/utils/forms/FormDialog";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import UploadPOTForm from "../../../components/utils/forms/UploadPOTForm";
import UploadHeading from "../../../components/utils/forms/UploadHeading";
import DataTable from "../../../components/utils/tables/DataTable";
import PersonCell from "../../../components/utils/tables/PersonCell";
import SmsLayout from "../../../components/sms/SmsLayout";
import { formatDate, formatDateTime } from "../../../helpers/formatDate";
import { formatCount } from "../../../helpers/formatNumber";

type Status = "pending" | "approved" | "disapproved";

interface CreditRequest {
    id: number;
    user_id: number;
    name: string;
    avatar: string | null;
    credits: number;
    credits_granted: number | null;
    proof_of_payment: string;
    notes: string | null;
    status: Status;
    remarks: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
}

interface SmsCreditsProps {
    // An SMS manager reviews everyone's requests; anyone else sees their own.
    manages: boolean;
    balance: number;
    ledger: {
        id: number;
        change: number;
        reason: "purchase" | "send" | "refund";
        created_at: string;
    }[];
    requests: CreditRequest[];
    maxFileKb: number;
}

const STATUS: Record<Status, [string, string]> = {
    pending: ["pending", "Waiting"],
    approved: ["valid", "Approved"],
    disapproved: ["invalid", "Disapproved"],
};
const REASON: Record<string, string> = {
    purchase: "Credits bought",
    send: "Message sent",
    refund: "Returned (failed numbers)",
};
const primary = {
    px: 3,
    backgroundColor: "var(--lr-primary)",
    color: "var(--lr-on-primary)",
    ":hover": { backgroundColor: "var(--lr-primary-hover)" },
    "&.Mui-disabled": {
        backgroundColor: "var(--lr-surface-container)",
        color: "var(--lr-text-secondary)",
    },
};

// Buying credits: how many, and the proof of payment (any payment method).
function RequestForm({ maxFileKb }: { maxFileKb: number }) {
    const form = useForm<{
        credits: string;
        proof_of_payment: File | null;
        notes: string;
    }>({ credits: "", proof_of_payment: null, notes: "" });
    const [compressing, setCompressing] = useState(false);

    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                form.post("/sms/credits", {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => form.reset(),
                });
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
            <Box sx={{ maxWidth: 240 }}>
                <FieldLabel text="Credits" required />
                <StyledTextField
                    type="number"
                    name="credits"
                    value={form.data.credits}
                    error={form.errors.credits ?? null}
                    handleChange={(e) =>
                        form.setData("credits", e.target.value)
                    }
                    props={{
                        placeholder: "e.g. 1000",
                        slotProps: { htmlInput: { min: 1, step: 1 } },
                    }}
                />
            </Box>
            <UploadPOTForm
                value={form.data.proof_of_payment}
                onChange={(file) => form.setData("proof_of_payment", file)}
                error={form.errors.proof_of_payment ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={setCompressing}
                fileNoun="proof of payment"
                instructions={
                    <UploadHeading
                        title="Proof of payment"
                        text="a screenshot or photo of your payment receipt — any payment method."
                        required
                    />
                }
            />
            <Box>
                <FieldLabel text="Notes (optional)" />
                <StyledTextField
                    name="notes"
                    value={form.data.notes}
                    error={form.errors.notes ?? null}
                    handleChange={(e) => form.setData("notes", e.target.value)}
                    props={{ multiline: true, minRows: 2 }}
                />
            </Box>
            <Box>
                <StyledButton
                    type="submit"
                    variant="contained"
                    endIcon={<SendRounded />}
                    loading={form.processing}
                    disabled={
                        compressing ||
                        !form.data.credits ||
                        !form.data.proof_of_payment
                    }
                    sx={primary}
                >
                    Request credits
                </StyledButton>
            </Box>
        </Box>
    );
}

// SMS Manager › Credits: one's balance and its movements, buying credits with a proof of payment; an SMS manager approves or
// disapproves everyone's requests here.
function SmsCredits({
    manages,
    balance,
    ledger,
    requests,
    maxFileKb,
}: SmsCreditsProps) {
    const [approving, setApproving] = useState<CreditRequest | null>(null);
    const [disapproving, setDisapproving] = useState<CreditRequest | null>(
        null,
    );
    const approve = useForm<{ credits: string }>({ credits: "" });
    const reject = useForm<{ reason: string }>({ reason: "" });
    const closeApprove = () => (
        setApproving(null),
        approve.reset(),
        approve.clearErrors()
    );
    const closeReject = () => (
        setDisapproving(null),
        reject.reset(),
        reject.clearErrors()
    );

    const columns: GridColDef<CreditRequest>[] = [
        ...(manages
            ? [
                  {
                      field: "name",
                      headerName: "Requested by",
                      flex: 1,
                      minWidth: 200,
                      renderCell: ({ row }) => (
                          <PersonCell name={row.name} avatar={row.avatar} />
                      ),
                  } as GridColDef<CreditRequest>,
              ]
            : []),
        {
            field: "created_at",
            headerName: "Requested",
            width: 160,
            valueFormatter: (v: string) => formatDateTime(v),
        },
        {
            field: "credits",
            headerName: "Credits",
            type: "number",
            width: 110,
            valueGetter: (_v, row) => row.credits_granted ?? row.credits,
        },
        {
            field: "proof_of_payment",
            headerName: "Proof",
            width: 110,
            sortable: false,
            renderCell: ({ row }) => (
                <MuiLink
                    href={row.proof_of_payment}
                    target="_blank"
                    rel="noopener"
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: "var(--lr-primary)",
                    }}
                >
                    Open <OpenInNewRounded sx={{ fontSize: 14 }} />
                </MuiLink>
            ),
        },
        {
            field: "status",
            headerName: "Status",
            flex: 1,
            minWidth: 200,
            renderCell: ({ row }) => (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        height: "100%",
                        lineHeight: 1.3,
                    }}
                >
                    <Box>
                        <StatusChip status={STATUS[row.status][0]}>
                            {STATUS[row.status][1]}
                        </StatusChip>
                    </Box>
                    {(row.remarks || row.reviewed_by) && (
                        <Typography
                            variant="caption"
                            noWrap
                            sx={{ color: "var(--lr-text-secondary)" }}
                        >
                            {[
                                row.reviewed_by && `by ${row.reviewed_by}`,
                                row.reviewed_at && formatDate(row.reviewed_at),
                                row.remarks,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </Typography>
                    )}
                </Box>
            ),
        },
        ...(manages
            ? [
                  {
                      field: "actions",
                      headerName: "",
                      width: 230,
                      sortable: false,
                      renderCell: ({ row }) =>
                          row.status === "pending" && (
                              <Box
                                  sx={{
                                      display: "flex",
                                      gap: 1,
                                      alignItems: "center",
                                      height: "100%",
                                  }}
                              >
                                  <StyledButton
                                      size="small"
                                      variant="contained"
                                      startIcon={<CheckRounded />}
                                      onClick={() => (
                                          setApproving(row),
                                          approve.setData(
                                              "credits",
                                              String(row.credits),
                                          )
                                      )}
                                      sx={{ ...primary, px: 1.5 }}
                                  >
                                      Approve
                                  </StyledButton>
                                  <StyledButton
                                      size="small"
                                      startIcon={<CloseRounded />}
                                      onClick={() => setDisapproving(row)}
                                      sx={{ color: "var(--lr-error)" }}
                                  >
                                      Disapprove
                                  </StyledButton>
                              </Box>
                          ),
                  } as GridColDef<CreditRequest>,
              ]
            : []),
    ];

    return (
        <Box>
            {/* An SMS manager sends on the company's balance: only the requests to review. */}
            {!manages && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <SectionCard
                            title="Your credits"
                            subtitle="Ready to use"
                        >
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: 32,
                                        fontWeight: 700,
                                        color: "var(--lr-primary)",
                                    }}
                                >
                                    {formatCount(balance)}
                                </Typography>
                                {ledger.length > 0 && (
                                    <Box
                                        component="ul"
                                        sx={{
                                            listStyle: "none",
                                            m: 0,
                                            mt: 2,
                                            p: 0,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 1,
                                        }}
                                    >
                                        {ledger.slice(0, 8).map((l) => (
                                            <Box
                                                component="li"
                                                key={l.id}
                                                sx={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "var(--lr-text-body)",
                                                    }}
                                                >
                                                    {REASON[l.reason] ??
                                                        l.reason}
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{
                                                            ml: 1,
                                                            color: "var(--lr-text-secondary)",
                                                        }}
                                                    >
                                                        {formatDate(
                                                            l.created_at,
                                                        )}
                                                    </Typography>
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color:
                                                            l.change > 0
                                                                ? "var(--lr-success)"
                                                                : "var(--lr-text-primary)",
                                                    }}
                                                >
                                                    {l.change > 0 ? "+" : ""}
                                                    {formatCount(l.change)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </SectionCard>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <SectionCard
                            title="Request credits"
                            subtitle="Pay with any method, then send the proof here. The credits are added once your payment is confirmed."
                        >
                            <RequestForm maxFileKb={maxFileKb} />
                        </SectionCard>
                    </Grid>
                </Grid>
            )}

            <Box sx={{ mt: manages ? 0 : 4 }}>
                <SectionTitle
                    title={manages ? "Credit requests" : "Your requests"}
                    subtitle={
                        manages
                            ? "Waiting ones first. Check the proof of payment, then approve the credits."
                            : undefined
                    }
                />
                <DataTable
                    rows={requests}
                    columns={columns}
                    getRowId={(r) => r.id}
                    getRowHeight={() => 64}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    aria-label="Credit requests"
                />
            </Box>

            <FormDialog
                open={approving !== null}
                title={`Approve ${approving?.name ?? "these"} credits?`}
                submitLabel="Approve"
                processing={approve.processing}
                onSubmit={() =>
                    approving &&
                    approve.post(`/sms/credits/${approving.id}/approve`, {
                        preserveScroll: true,
                        onSuccess: closeApprove,
                    })
                }
                onClose={closeApprove}
            >
                <Typography
                    variant="body2"
                    sx={{ color: "var(--lr-text-secondary)" }}
                >
                    They asked for {formatCount(approving?.credits ?? 0)}{" "}
                    credits. Give fewer if the payment covers less.
                </Typography>
                <div>
                    <FieldLabel text="Credits to add" required />
                    <StyledTextField
                        type="number"
                        name="credits"
                        value={approve.data.credits}
                        error={approve.errors.credits ?? null}
                        handleChange={(e) =>
                            approve.setData("credits", e.target.value)
                        }
                        props={{
                            slotProps: { htmlInput: { min: 1, step: 1 } },
                        }}
                    />
                </div>
            </FormDialog>

            <FormDialog
                open={disapproving !== null}
                title={`Disapprove ${disapproving?.name ?? "this"} credit request?`}
                submitLabel="Disapprove"
                processing={reject.processing}
                onSubmit={() =>
                    disapproving &&
                    reject.post(`/sms/credits/${disapproving.id}/disapprove`, {
                        preserveScroll: true,
                        onSuccess: closeReject,
                    })
                }
                onClose={closeReject}
            >
                <Typography
                    variant="body2"
                    sx={{ color: "var(--lr-text-secondary)" }}
                >
                    No credits are added. They'll see your reason.
                </Typography>
                <div>
                    <FieldLabel text="Reason" required />
                    <StyledTextField
                        name="reason"
                        value={reject.data.reason}
                        error={reject.errors.reason ?? null}
                        handleChange={(e) =>
                            reject.setData("reason", e.target.value)
                        }
                        props={{
                            multiline: true,
                            minRows: 3,
                            placeholder: "e.g. The payment couldn't be found.",
                        }}
                    />
                </div>
            </FormDialog>
        </Box>
    );
}

SmsCredits.layout = (page: ReactNode) => <SmsLayout children={page} />;

export default SmsCredits;
