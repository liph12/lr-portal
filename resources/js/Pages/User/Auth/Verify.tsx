import { useState } from "react";
import Grid from "@mui/material/Grid";
import {
  Box,
  Typography,
  TextField,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  Link,
} from "@mui/material";
import StyledButton from "../../../components/utils/StyledButton";

/* ================= STEPS ================= */
const steps = [
  "Basic Information",
  "Contacts & Socials",
  "Complete Address",
  "Personal Background",
];

/* ================= CUSTOM STEP ICON ================= */
function CustomStepIcon(props: any) {
  const { active, icon } = props;
  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#d32f2f" : "#c4c4c4",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {icon}
    </Box>
  );
}

/* ================= COMPONENT ================= */
export default function CreateAccount() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: { xs: 2, md: 4 },
        py: 4,
      }}
    >
      {/* ===== CARD / DIVISION ===== */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1000,
          maxHeight: "90vh",
          backgroundColor: "#fff",
          borderRadius: 3,
          boxShadow: 6,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ===== HEADER ===== */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={{ xs: 3, md: 6 }}
          py={3}
          borderBottom="1px solid #e0e0e0"
        >
          <Box component="img" src="/assets/lr-logo.svg" sx={{ height: 50 }} />
          <Typography fontSize={14}>
            Already have an account?{" "}
            <Link href="/login" underline="always" sx={{ color: "#d32f2f" }}>
              Sign in here
            </Link>
          </Typography>
        </Box>

        {/* ===== SCROLLABLE CONTENT (STEP + FORM) ===== */}
        <Box
          sx={{
            px: { xs: 3, md: 6 },
            py: 4,
            overflowY: "auto",
            flexGrow: 1,
          }}
        >
          {/* ===== TITLE ===== */}
          <Box textAlign="center" mb={5}>
            <Typography variant="h4" fontWeight={600}>
              Create Account
            </Typography>
          </Box>

          {/* ===== STEPPER ===== */}
          <Box mb={6}>
            <Stepper
              activeStep={activeStep}
              alternativeLabel
              sx={{
                "& .MuiStepConnector-line": {
                  borderColor: "#e0e0e0",
                  borderTopWidth: 1,
                },
              }}
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel StepIconComponent={CustomStepIcon}>
                    <Typography
                      fontSize={14}
                      fontWeight={activeStep === index ? 600 : 400}
                      color={activeStep === index ? "#000" : "#9e9e9e"}
                    >
                      {label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* ===== FORM ===== */}
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                First Name <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="First Name"
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Middle Name <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Middle Name"
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Last Name <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Last Name"
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Sex <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                select
                fullWidth
                defaultValue=""
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              >
                <MenuItem value="">Select Sex</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Date of Birth <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                type="date"
                fullWidth
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Marital Status <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                select
                fullWidth
                defaultValue=""
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              >
                <MenuItem value="">Select Status</MenuItem>
                <MenuItem value="single">Single</MenuItem>
                <MenuItem value="married">Married</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Citizenship <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Citizenship"
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={14} mb={1}>
                Nationality <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Nationality"
                sx={{ backgroundColor: "#ededed", borderRadius: 1, "& fieldset": { border: "none" } }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* ===== BUTTONS (STICKY AT BOTTOM) ===== */}
        <Box
          px={{ xs: 3, md: 6 }}
          py={3}
          borderTop="1px solid #e0e0e0"
          display="flex"
          justifyContent="center"
          gap={3}
        >
          <StyledButton
            variant="outlined"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => prev - 1)}
            sx={{ px: 5, borderColor: "#cfcfcf", color: "#777" }}
          >
            ← BACK
          </StyledButton>

          <StyledButton
            variant="contained"
            onClick={() => setActiveStep((prev) => prev + 1)}
            sx={{ px: 5, backgroundColor: "#d32f2f", "&:hover": { backgroundColor: "#b71c1c" } }}
          >
            NEXT →
          </StyledButton>
        </Box>
      </Box>
    </Box>
  );
}
