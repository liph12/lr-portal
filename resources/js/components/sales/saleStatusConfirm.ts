import { ElementType } from "react";
import { BlockRounded, CheckCircleRounded, DoNotDisturbOnRounded, HourglassTopRounded } from "@mui/icons-material";

// What setting a sale's status does, asked before every change in Sales validation (a stray click used to validate).
export const SALE_STATUS_CONFIRM: Record<string, string> = {
    valid: "It counts in reports, leaderboards and NATCON from now on. The change is kept in the sale's history.",
    pending: "It goes back to waiting for validation and stops counting until it's validated again.",
    invalid: "It stops counting in reports and leaderboards. The change is kept in the sale's history.",
    cancelled: "It stops counting in reports and leaderboards. The change is kept in the sale's history.",
};

// Confirmed with the primary button rather than the red one.
export const SALE_STATUS_SAFE = ["valid", "pending"];

// One icon per status, beside its colour, so it reads at a glance (and not by colour alone).
export const SALE_STATUS_ICONS: Record<string, ElementType> = { pending: HourglassTopRounded, valid: CheckCircleRounded, invalid: BlockRounded, cancelled: DoNotDisturbOnRounded };
