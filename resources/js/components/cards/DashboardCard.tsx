import { Box, Typography } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { useHexToRGBA } from "../../helpers/hexToRgba";

export default function DashboardCard() {
    return (
        <Box sx={{ p: 2, borderRadius: 5, border: "1px solid #ddd" }}>
            <Box
                sx={{
                    backgroundColor: useHexToRGBA("#db5858", 0.1),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    width: "fit-content",
                    borderRadius: 3,
                    paddingY: 0.5,
                    paddingX: 1.5,
                    color: "#db5858",
                }}
            >
                <BarChartRoundedIcon fontSize="medium" />
                <Typography variant="body1">View Reports</Typography>
            </Box>
        </Box>
    );
}
