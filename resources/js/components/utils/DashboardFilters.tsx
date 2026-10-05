import StyledButton from "./StyledButton";
import StyledTextField from "./StyledTextField";
import StyledTextFieldPrimary from "./StyledTextFieldPrimary";
import StyledAutocomplete from "./StyledAutocomplete";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { Box, Divider, Container, Stack, TextField } from "@mui/material";

export default function DashboardFilters() {
    return (
        <>
            <Box sx={{ height: "100%" }}>
                <Box sx={{ pt: 1.5, pb: 1, px: 2 }}>
                    <StyledButton
                        startIcon={<TuneRounded />}
                        size="small"
                        variant="text"
                        sx={{
                            px: 2,
                            cursor: "default",
                            color: "var(--lr-primary)",
                            backgroundColor: "var(--lr-primary-soft)",
                            ":hover": { backgroundColor: "var(--lr-primary-soft)" },
                        }}
                    >
                        Filters
                    </StyledButton>
                </Box>
                <Divider sx={{ borderColor: "var(--lr-border)" }} />
                <Container sx={{ py: 3 }}>
                    {/* <Stack gap={2}>
                        <StyledAutocomplete
                            options={["Current Year", "Last Year"]}
                            value="Current Year"
                            renderInput={(params) => (
                                <StyledTextFieldPrimary {...params} />
                            )}
                        />
                        <StyledAutocomplete
                            options={["Agent", "Team", "Sub-Team", "Area"]}
                            value="Agents"
                            renderInput={(params) => (
                                <StyledTextFieldPrimary
                                    {...params}
                                    label="Group by"
                                />
                            )}
                        />
                        <StyledAutocomplete
                            options={[
                                "All agents",
                                "Azela Honor",
                                "Marjorie & Gilbert Monecillo",
                            ]}
                            value="All teams"
                            renderInput={(params) => (
                                <StyledTextFieldPrimary
                                    {...params}
                                    label="Team"
                                />
                            )}
                        />
                    </Stack> */}
                </Container>
            </Box>
        </>
    );
}
