import { MouseEvent, ReactNode, useState } from "react";
import { ButtonBase, ListItemText, Menu, MenuItem } from "@mui/material";
import { ExpandMoreRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import StatusChip from "./StatusChip";
import ConfirmDialog from "./ConfirmDialog";

interface StatusMenuProps {
    status: string | null;
    statuses: string[];
    // PATCHed as { [field]: value }.
    url: string;
    field?: string;
    // Display names for values that aren't readable as-is (e.g. global_partner → "Global partner").
    labels?: Record<string, string>;
    subject: string;
    disabled?: boolean;
    // Statuses that need a confirm first, with what they will do.
    confirm?: Record<string, ReactNode>;
}

// A status chip that opens a menu of the other statuses.
export default function StatusMenu({ status, statuses, url, field = "status", labels = {}, subject, disabled = false, confirm = {} }: StatusMenuProps) {
    const label = (value: string | null) => (value ? (labels[value] ?? value) : "—");
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [pending, setPending] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const save = (next: string) => {
        setPending(null);
        router.patch(url, { [field]: next }, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        });
    };

    const choose = (next: string) => {
        setAnchor(null);
        if (next === status) return;
        confirm[next] ? setPending(next) : save(next);
    };

    return (
        <>
            <ButtonBase
                disabled={disabled || saving}
                aria-label={`Change ${field.replace("_", " ")} of ${subject}`}
                aria-haspopup="menu"
                onClick={(e: MouseEvent<HTMLElement>) => {
                    e.stopPropagation();
                    setAnchor(e.currentTarget);
                }}
                sx={{ borderRadius: 99, lineHeight: 1, alignSelf: "center", opacity: saving ? 0.6 : 1 }}
            >
                <StatusChip status={status} sx={{ pr: disabled ? 1.25 : 0.5 }}>
                    {label(status)}
                    {!disabled && <ExpandMoreRounded sx={{ fontSize: 16, ml: 0.25 }} />}
                </StatusChip>
            </ButtonBase>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                {statuses.map((s) => (
                    <MenuItem key={s} selected={s === status} onClick={() => choose(s)} sx={{ fontSize: 14, textTransform: "capitalize" }}>
                        <ListItemText primary={label(s)} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
                    </MenuItem>
                ))}
            </Menu>
            <ConfirmDialog
                open={pending !== null}
                title={`Set ${subject} to ${label(pending)}?`}
                message={pending ? confirm[pending] : null}
                confirmLabel={`Set to ${pending ? label(pending) : ""}`}
                onConfirm={() => pending && save(pending)}
                onClose={() => setPending(null)}
            />
        </>
    );
}
