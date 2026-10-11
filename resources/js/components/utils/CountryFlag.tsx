import { useState } from "react";
import { Box, BoxProps } from "@mui/material";

interface CountryFlagProps extends Omit<BoxProps, "children"> {
    // ISO 3166-1 alpha-2 (agents.country_code).
    code: string | null;
    country: string | null;
}

// A small flag image (emoji flags don't render on Windows) followed by the country name. Falls back to
// the code if the image can't load; nothing at all when the country is unknown.
export default function CountryFlag({ code, country, sx, ...props }: CountryFlagProps) {
    const [broken, setBroken] = useState(false);

    if (!country) return <Box component="span" sx={{ color: "var(--lr-text-secondary)" }}>—</Box>;

    return (
        <Box component="span" {...props} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minWidth: 0, ...sx }}>
            {code && !broken ? (
                <Box
                    component="img"
                    src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                    alt=""
                    loading="lazy"
                    onError={() => setBroken(true)}
                    sx={{ width: 20, height: 14, objectFit: "cover", borderRadius: "2px", boxShadow: "0 0 0 1px var(--lr-border)", flexShrink: 0 }}
                />
            ) : (
                code && (
                    <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: "var(--lr-text-secondary)" }}>
                        {code}
                    </Box>
                )
            )}
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {country}
            </Box>
        </Box>
    );
}
