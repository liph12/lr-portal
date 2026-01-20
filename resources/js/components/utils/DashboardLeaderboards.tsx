import StyledButton from "./StyledButton";
import {
    ArrowDownwardRounded,
    LeaderboardRounded,
    ExpandMoreRounded,
    KeyboardArrowRightRounded,
} from "@mui/icons-material";
import { Box, Divider, IconButton, Typography } from "@mui/material";
import TopAgentsTable from "./tables/TopAgentsTable";

export default function DashboardLeaderboards() {
    return (
        <>
            <Box sx={{ height: "100%", borderLeft: "1px solid #ddd" }}>
                <Box sx={{ pt: 1, px: 2 }}>
                    <StyledButton
                        startIcon={<LeaderboardRounded />}
                        size="small"
                        variant="text"
                        color="inherit"
                        sx={{
                            borderBottom: "3px solid transparent",
                            borderRadius: 0,
                            color: "#777",
                        }}
                    >
                        Leaderboards
                    </StyledButton>
                </Box>
                <Divider />
                <Box>
                    <Box
                        sx={{
                            width: "100%",
                            height: "50vh",
                            position: "relative",
                        }}
                    >
                        <Box
                            sx={{
                                height: "100%",
                                overflowY: "auto",
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{ py: 1, px: 2, color: "#777" }}
                                >
                                    December 2025 Sales
                                </Typography>
                                <StyledButton
                                    startIcon={<ExpandMoreRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="error"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top Agents
                                </StyledButton>
                                <TopAgentsTable />
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top Teams
                                </StyledButton>
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top Teams / Recruits
                                </StyledButton>
                            </Box>
                            <Box>
                                <Typography
                                    component="div"
                                    variant="caption"
                                    sx={{ py: 1, px: 2, color: "#777" }}
                                >
                                    November 2025 Sales
                                </Typography>
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top 20 Agents
                                </StyledButton>
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top 20 Teams
                                </StyledButton>
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top 10 Agents (Brokerage)
                                </StyledButton>
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top 10 Agents / Developer
                                </StyledButton>
                                <StyledButton
                                    startIcon={<KeyboardArrowRightRounded />}
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="inherit"
                                    sx={{
                                        borderRadius: 0,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    Top 10 Developers
                                </StyledButton>
                            </Box>
                        </Box>
                        <IconButton
                            size="small"
                            color="error"
                            sx={{
                                position: "absolute",
                                left: "50%",
                                bottom: 10,
                                transform: "translateX(-50%)",
                                zIndex: 10,
                            }}
                        >
                            <ArrowDownwardRounded fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            </Box>
        </>
    );
}
