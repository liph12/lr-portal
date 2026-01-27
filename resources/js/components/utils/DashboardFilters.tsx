import StyledButton from "./StyledButton";
import StyledTextField from "./StyledTextField";
import StyledTextFieldPrimary from "./StyledTextFieldPrimary";
import StyledAutocomplete from "./StyledAutocomplete";
import KeyboardTabIcon from "@mui/icons-material/KeyboardTab";
import { Box, Divider, Container, Stack, TextField } from "@mui/material";

export default function DashboardFilters() {
    return (
        <>
            <Box sx={{ height: "100%", borderLeft: "1px solid #ddd" }}>
                <Box sx={{ pt: 1, px: 2 }}>
                    <StyledButton
                        startIcon={<KeyboardTabIcon />}
                        size="small"
                        variant="text"
                        sx={{
                            borderBottom: "3px solid transparent",
                            borderRadius: 0,
                            color: "#777",
                        }}
                    >
                        Filters
                    </StyledButton>
                </Box>
                <Divider />
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
