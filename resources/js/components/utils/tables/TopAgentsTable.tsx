import { Box, Typography, Avatar, Divider } from "@mui/material";

function createData(name: string, totalSlaes: number) {
    return { name, totalSlaes };
}

const rows = [
    createData("Gilbert and Marjorie Monecillo", 10500000),
    createData("Angie Kay and Marc Godornes", 10123412),
    createData("Jessa Jill and Leo Ross Torralba", 9232413),
];

export default function TopAgentsTable() {
    return (
        <Box sx={{ py: 1, px: 1 }}>
            {rows.map((r, k) => (
                <Box key={k}>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            my: 0.5,
                            alignItems: "center",
                        }}
                    >
                        <Avatar
                            src="https://test.com/img"
                            alt={r.name}
                            sx={{
                                height: 25,
                                width: 25,
                                fontSize: 12,
                            }}
                        />
                        <Box>
                            <Typography
                                variant="body2"
                                fontSize={12}
                                sx={{ color: "#777" }}
                            >
                                {r.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                fontFamily="Google Sans Code"
                            >
                                {r.totalSlaes.toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>
                    <Divider />
                </Box>
            ))}
        </Box>
    );
}
