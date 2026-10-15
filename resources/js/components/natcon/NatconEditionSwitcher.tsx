import { Box } from "@mui/material";
import { Link } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";

export interface NatconEditionOption {
    year: number;
    name: string;
    is_default: boolean;
}

interface NatconEditionSwitcherProps {
    editions: NatconEditionOption[];
    current: number;
    // The same page in another edition: "" (its cards), "/my-sales" or "/{board}".
    suffix?: string;
}

// NATCON 2026 · NATCON 2027 …: the same page for another edition (only shown when there's more than one).
export default function NatconEditionSwitcher({ editions, current, suffix = "" }: NatconEditionSwitcherProps) {
    if (editions.length < 2) return null;

    return (
        <Box component="nav" aria-label="NATCON editions" sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
            {editions.map((e) => {
                const active = e.year === current;
                return (
                    <Link key={e.year} href={`/natcon/${e.year}${suffix}`} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
                        <StyledButton
                            size="small"
                            variant="text"
                            sx={{
                                px: 2,
                                borderRadius: 99,
                                fontWeight: active ? 700 : 500,
                                color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                                backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface)",
                                border: "1px solid",
                                borderColor: active ? "var(--lr-primary)" : "var(--lr-border)",
                            }}
                        >
                            {e.name}
                        </StyledButton>
                    </Link>
                );
            })}
        </Box>
    );
}
