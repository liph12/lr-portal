import { Box } from "@mui/material";
import { SendRounded, TollRounded } from "@mui/icons-material";
import { Link, usePage } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import useAuthUser from "../../hooks/useAuthUser";

const TABS = [
    { name: "Send SMS", path: "/sms", icon: SendRounded },
    { name: "Credits", path: "/sms/credits", icon: TollRounded },
];

// Tabs for SMS Manager; Credits carries the waiting credit requests for an SMS manager.
export default function SmsNav() {
    const path = usePage().url.split("?")[0];
    const pending = useAuthUser()?.sms_credits?.pending ?? 0;

    return (
        <Box
            component="nav"
            aria-label="SMS Manager sections"
            sx={{ display: "flex", gap: 1, mb: 3 }}
        >
            {TABS.map((tab) => {
                const active = path === tab.path;
                const badge =
                    tab.path === "/sms/credits" && pending > 0 ? pending : null;
                return (
                    <Link
                        key={tab.path}
                        href={tab.path}
                        style={{ textDecoration: "none" }}
                        aria-current={active ? "page" : undefined}
                    >
                        <StyledButton
                            startIcon={<tab.icon />}
                            size="small"
                            variant="text"
                            sx={{
                                px: 2,
                                borderRadius: 99,
                                color: active
                                    ? "var(--lr-primary)"
                                    : "var(--lr-text-body)",
                                backgroundColor: active
                                    ? "var(--lr-primary-soft)"
                                    : "transparent",
                                fontWeight: active ? 600 : 500,
                            }}
                        >
                            {tab.name}
                            {badge && (
                                <Box
                                    component="span"
                                    aria-label={`${badge} waiting`}
                                    sx={{
                                        ml: 1,
                                        px: 0.75,
                                        minWidth: 20,
                                        borderRadius: 99,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        lineHeight: "18px",
                                        color: "var(--lr-on-accent)",
                                        backgroundColor: "var(--lr-accent)",
                                    }}
                                >
                                    {badge}
                                </Box>
                            )}
                        </StyledButton>
                    </Link>
                );
            })}
        </Box>
    );
}
