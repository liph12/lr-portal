import { ReactNode, useMemo, useState } from "react";
import { Alert, Box, Grid, Skeleton, Tooltip, Typography } from "@mui/material";
import { SendRounded, TollRounded } from "@mui/icons-material";
import { Deferred, Link, useForm } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import SectionTitle from "../../../components/utils/SectionTitle";
import SectionCard from "../../../components/cards/SectionCard";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import StatusChip from "../../../components/utils/StatusChip";
import ConfirmDialog from "../../../components/utils/ConfirmDialog";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import DataTable from "../../../components/utils/tables/DataTable";
import SmsLayout from "../../../components/sms/SmsLayout";
import RecipientPicker, {
    SmsGroup,
    SmsPerson,
} from "../../../components/sms/RecipientPicker";
import { formatDateTime } from "../../../helpers/formatDate";
import { formatCount } from "../../../helpers/formatNumber";
import { parseNumbers, smsLength } from "../../../helpers/smsParts";

interface Blast {
    id: number;
    sender: string;
    message: string;
    groups: string[];
    custom_numbers: number;
    recipients: number;
    parts: number;
    credits: number;
    charged: boolean;
    status: "queued" | "sending" | "sent" | "partial" | "failed";
    sent: number;
    failed: number;
    error: string | null;
    created_at: string;
}

interface SmsIndexProps {
    // The roles one can text, with how many people in reach have a mobile number (nationwide for an SMS manager, else the
    // teams / sub-teams they lead).
    groups: SmsGroup[];
    manages: boolean;
    // Own credits (team leaders pay per message); null = sent on the company's Semaphore balance.
    balance: number | null;
    maxParts: number;
    configured: boolean;
    history: Blast[];
    // SMS managers: the company's Semaphore balance (loaded after the page).
    company?: { balance: number | null; error: string | null } | null;
    // Search results for "Add a person" (partial reload with ?people_q=); `members` (one group's people) is read by the picker.
    peopleOptions?: SmsPerson[];
}

const STATUS_LABEL: Record<Blast["status"], string> = {
    queued: "Queued",
    sending: "Sending",
    sent: "Sent",
    partial: "Partly sent",
    failed: "Failed",
};
const STATUS_TONE: Record<Blast["status"], string> = {
    queued: "pending",
    sending: "pending",
    sent: "valid",
    partial: "resigned",
    failed: "invalid",
};

// SMS Manager › Send SMS: one message to whole groups (by role) and / or typed-in numbers, sent through Semaphore; the
// messages sent and how they went below.
function SmsIndex({
    groups,
    manages,
    balance,
    maxParts,
    configured,
    history,
    company,
    peopleOptions,
}: SmsIndexProps) {
    const form = useForm<{
        message: string;
        groups: string[];
        numbers: string;
    }>({ message: "", groups: [], numbers: "" });
    const [people, setPeople] = useState<SmsPerson[]>([]);
    const [confirming, setConfirming] = useState(false);
    const length = smsLength(form.data.message);
    const numbers = useMemo(
        () => parseNumbers(form.data.numbers),
        [form.data.numbers],
    );
    // Each number once: people sharing a number, or typed in as well, count once (as the server sends them).
    const recipients = new Set([
        ...people.map((p) => p.mobile),
        ...numbers.valid,
    ]).size;
    const credits = recipients * length.parts;
    const tooLong = length.parts > maxParts;
    const short = balance !== null && credits > balance;
    const columns: GridColDef<Blast>[] = [
        {
            field: "created_at",
            headerName: "Sent",
            width: 160,
            valueFormatter: (v: string) => formatDateTime(v),
        },
        ...(manages
            ? [
                  {
                      field: "sender",
                      headerName: "By",
                      width: 160,
                  } as GridColDef<Blast>,
              ]
            : []),
        {
            field: "message",
            headerName: "Message",
            flex: 1,
            minWidth: 220,
            renderCell: ({ row }) => (
                <Tooltip title={row.message}>
                    <Typography
                        variant="body2"
                        noWrap
                        sx={{ color: "var(--lr-text-body)" }}
                    >
                        {row.message}
                    </Typography>
                </Tooltip>
            ),
        },
        {
            field: "groups",
            headerName: "To",
            width: 200,
            sortable: false,
            valueGetter: (_v, row) =>
                [
                    ...row.groups,
                    row.custom_numbers
                        ? `${row.custom_numbers} typed-in`
                        : null,
                ]
                    .filter(Boolean)
                    .join(", "),
        },
        {
            field: "recipients",
            headerName: "Numbers",
            type: "number",
            width: 100,
        },
        { field: "credits", headerName: "Credits", type: "number", width: 90 },
        {
            field: "status",
            headerName: "Status",
            width: 170,
            renderCell: ({ row }) => (
                <Tooltip
                    title={
                        row.error ??
                        (row.status === "partial" || row.status === "sent"
                            ? `${row.sent} sent · ${row.failed} failed`
                            : "")
                    }
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            height: "100%",
                        }}
                    >
                        <StatusChip status={STATUS_TONE[row.status]}>
                            {STATUS_LABEL[row.status]}
                        </StatusChip>
                        {row.failed > 0 && (
                            <Typography
                                variant="caption"
                                sx={{ color: "var(--lr-error)" }}
                            >
                                {row.failed} failed
                            </Typography>
                        )}
                    </Box>
                </Tooltip>
            ),
        },
    ];

    return (
        <Box>
            {!configured && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    SMS sending isn't set up yet: the Semaphore API key is
                    missing (SEMAPHORE_API_KEY). Messages can be written but
                    won't go out.
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                        }}
                    >
                        <SectionCard
                            title="1. Recipients"
                            subtitle="Add whole groups, then remove or add people one by one — or type mobile numbers."
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 3,
                                }}
                            >
                                <RecipientPicker
                                    groups={groups}
                                    picked={form.data.groups}
                                    people={people}
                                    onChange={(list, picked) => {
                                        setPeople(list);
                                        form.setData("groups", picked);
                                    }}
                                    options={peopleOptions}
                                    error={
                                        (
                                            form.errors as Partial<
                                                Record<"people", string>
                                            >
                                        ).people ??
                                        form.errors.groups ??
                                        null
                                    }
                                />

                                <Box>
                                    <FieldLabel text="Add mobile numbers" />
                                    <StyledTextField
                                        name="numbers"
                                        value={form.data.numbers}
                                        error={form.errors.numbers ?? null}
                                        handleChange={(e) =>
                                            form.setData(
                                                "numbers",
                                                e.target.value,
                                            )
                                        }
                                        props={{
                                            multiline: true,
                                            minRows: 2,
                                            placeholder:
                                                "09171234567, 0918 765 4321 — separated by commas, spaces or new lines",
                                        }}
                                    />
                                    {form.data.numbers.trim() && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                mt: 0.75,
                                                color: numbers.invalid.length
                                                    ? "var(--lr-error)"
                                                    : "var(--lr-text-secondary)",
                                            }}
                                        >
                                            {formatCount(numbers.valid.length)}{" "}
                                            {numbers.valid.length === 1
                                                ? "number"
                                                : "numbers"}
                                            {numbers.invalid.length > 0 &&
                                                ` · not mobile numbers: ${numbers.invalid.slice(0, 5).join(", ")}${numbers.invalid.length > 5 ? "…" : ""}`}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </SectionCard>

                        <SectionCard
                            title="2. Message"
                            subtitle="What everyone on the list receives."
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 3,
                                }}
                            >
                                <Box>
                                    <FieldLabel text="Message" required />
                                    <StyledTextField
                                        name="message"
                                        value={form.data.message}
                                        error={form.errors.message ?? null}
                                        handleChange={(e) =>
                                            form.setData(
                                                "message",
                                                e.target.value,
                                            )
                                        }
                                        props={{
                                            multiline: true,
                                            minRows: 5,
                                            placeholder: "Write your message…",
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            mt: 0.75,
                                            color: tooLong
                                                ? "var(--lr-error)"
                                                : "var(--lr-text-secondary)",
                                        }}
                                    >
                                        {length.length} / {length.limit}{" "}
                                        characters · {length.parts} SMS{" "}
                                        {length.parts === 1 ? "part" : "parts"}
                                        {tooLong && ` — at most ${maxParts}`}
                                        {length.unicode &&
                                            " · emoji or special characters make each part shorter (70)"}
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        flexWrap: "wrap",
                                        pt: 2,
                                        borderTop: "1px solid var(--lr-border)",
                                    }}
                                >
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                color: "var(--lr-text-primary)",
                                            }}
                                        >
                                            {recipients
                                                ? `${formatCount(recipients)} ${recipients === 1 ? "number" : "numbers"}`
                                                : "No recipients yet"}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: short
                                                    ? "var(--lr-error)"
                                                    : "var(--lr-text-secondary)",
                                            }}
                                        >
                                            {formatCount(credits)} credits
                                            {balance !== null &&
                                                ` of your ${formatCount(balance)}`}
                                            {short && " — not enough credits"}
                                        </Typography>
                                    </Box>
                                    <StyledButton
                                        variant="contained"
                                        endIcon={<SendRounded />}
                                        loading={form.processing}
                                        disabled={
                                            !form.data.message.trim() ||
                                            !recipients ||
                                            tooLong ||
                                            short ||
                                            numbers.invalid.length > 0
                                        }
                                        onClick={() => setConfirming(true)}
                                        sx={{
                                            px: 3,
                                            backgroundColor:
                                                "var(--lr-primary)",
                                            color: "var(--lr-on-primary)",
                                            ":hover": {
                                                backgroundColor:
                                                    "var(--lr-primary-hover)",
                                            },
                                            "&.Mui-disabled": {
                                                backgroundColor:
                                                    "var(--lr-surface-container)",
                                                color: "var(--lr-text-secondary)",
                                            },
                                        }}
                                    >
                                        Send
                                    </StyledButton>
                                </Box>
                            </Box>
                        </SectionCard>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <SectionCard
                        title={manages ? "Company balance" : "Your credits"}
                        subtitle={
                            manages
                                ? "Semaphore credits left"
                                : "1 credit = 1 SMS part to 1 number"
                        }
                    >
                        <Box>
                            {manages ? (
                                <Deferred
                                    data="company"
                                    fallback={
                                        <Skeleton
                                            variant="text"
                                            width={120}
                                            height={48}
                                        />
                                    }
                                >
                                    <Typography
                                        sx={{
                                            fontSize: 32,
                                            fontWeight: 700,
                                            color: "var(--lr-primary)",
                                        }}
                                    >
                                        {company?.balance != null
                                            ? formatCount(company.balance)
                                            : "—"}
                                    </Typography>
                                    {company?.error && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "var(--lr-text-secondary)",
                                            }}
                                        >
                                            {company.error}
                                        </Typography>
                                    )}
                                </Deferred>
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: 32,
                                        fontWeight: 700,
                                        color: "var(--lr-primary)",
                                    }}
                                >
                                    {formatCount(balance ?? 0)}
                                </Typography>
                            )}
                            <Link
                                href="/sms/credits"
                                style={{ textDecoration: "none" }}
                            >
                                <StyledButton
                                    variant="outlined"
                                    size="small"
                                    startIcon={<TollRounded />}
                                    sx={{
                                        mt: 1.5,
                                        color: "var(--lr-primary)",
                                        borderColor: "var(--lr-outline)",
                                    }}
                                >
                                    {manages
                                        ? "Credit requests"
                                        : "Request credits"}
                                </StyledButton>
                            </Link>
                        </Box>
                    </SectionCard>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
                <SectionTitle
                    title="Sent messages"
                    subtitle={
                        manages
                            ? "Everyone's, newest first."
                            : "Yours, newest first. Credits of numbers that failed are returned."
                    }
                />
                <DataTable
                    rows={history}
                    columns={columns}
                    getRowId={(r) => r.id}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    aria-label="Sent messages"
                />
            </Box>

            <ConfirmDialog
                open={confirming}
                title={`Send to ${formatCount(recipients)} ${recipients === 1 ? "number" : "numbers"}?`}
                message={`${length.parts} SMS ${length.parts === 1 ? "part" : "parts"} each — ${formatCount(credits)} credits${balance === null ? " from the company's Semaphore balance" : " from your credits"}. Texts can't be taken back once sent.`}
                confirmLabel="Send now"
                tone="primary"
                onConfirm={() => {
                    setConfirming(false);
                    form.transform((d) => ({
                        ...d,
                        people: people.map((p) => p.id),
                    }));
                    form.post("/sms", {
                        preserveScroll: true,
                        onSuccess: () => (form.reset(), setPeople([])),
                    });
                }}
                onClose={() => setConfirming(false)}
            />
        </Box>
    );
}

SmsIndex.layout = (page: ReactNode) => <SmsLayout children={page} />;

export default SmsIndex;
