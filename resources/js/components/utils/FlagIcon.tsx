import { useState } from "react";
import { Box } from "@mui/material";

// Just the flag (CountryFlag adds the name): for charts and lists that print the country themselves.
export default function FlagIcon({ code, title }: { code: string | null; title?: string }) {
    const [broken, setBroken] = useState(false);

    if (!code || broken) {
        return <Box component="span" sx={{ width: 20, height: 14, flexShrink: 0, borderRadius: "2px", backgroundColor: "var(--lr-surface-container)" }} />;
    }

    return (
        <Box
            component="img"
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt=""
            title={title}
            loading="lazy"
            onError={() => setBroken(true)}
            sx={{ width: 20, height: 14, flexShrink: 0, objectFit: "cover", borderRadius: "2px", boxShadow: "0 0 0 1px var(--lr-border)" }}
        />
    );
}
