import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import StyledButton from "../../../components/utils/StyledButton";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import AgentSalesView, { AgentSalesProps } from "../../../components/sales/AgentSalesView";

interface AgentSalesPageProps extends AgentSalesProps {
    agent: { id: number; name: string; avatar: string | null; area: string | null };
}

// One agent's sales one by one with their statistics (opened from the search bar or their profile).
function AgentSales({ agent, ...props }: AgentSalesPageProps) {
    return (
        <AgentSalesView
            {...props}
            basePath={`/agents/${agent.id}/sales`}
            title={`Sales of ${agent.name}`}
            subtitle="Client by client. Click a sale for its details and files."
            top={
                <Link href={`/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                    <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 2, px: 1, color: "var(--lr-primary)" }}>
                        Profile
                    </StyledButton>
                </Link>
            }
            header={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                    <UserAvatar name={agent.name} src={agent.avatar} size={44} />
                    <Box>
                        <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>{agent.name}</Typography>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {agent.area ?? "No area"}
                        </Typography>
                    </Box>
                </Box>
            }
        />
    );
}

AgentSales.layout = (page: ReactNode) => <AppLayout children={page} />;

export default AgentSales;
