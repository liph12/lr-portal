import { useId } from "react";
import { SvgIcon, SvgIconProps } from "@mui/material";

// The NATCON mark: a gold star on a curved swoosh, on a stand — the convention's trophy. Gold whatever the surrounding
// colour (menus colour other icons; this one keeps its own), so it reads on the white sidebar and the black NATCON pages.
export default function NatconTrophyIcon(props: SvgIconProps) {
    const id = useId().replace(/:/g, "");

    return (
        <SvgIcon viewBox="0 0 24 24" {...props}>
            <defs>
                <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f7d774" />
                    <stop offset="0.55" stopColor="#d9a82e" />
                    <stop offset="1" stopColor="#a8781c" />
                </linearGradient>
            </defs>
            {/* Star */}
            <path
                fill={`url(#${id}g)`}
                stroke="#6b4e12"
                strokeWidth="0.5"
                strokeLinejoin="round"
                d="M16.2 1.2 L17.6 4.6 L21.2 4.9 L18.5 7.3 L19.3 10.8 L16.2 9 L13.1 10.8 L13.9 7.3 L11.2 4.9 L14.8 4.6 Z"
            />
            {/* Swoosh, from the stand up to the star */}
            <path fill={`url(#${id}g)`} stroke="#6b4e12" strokeWidth="0.4" d="M8.4 19.6 C 4.9 15.2 6.6 9.4 13.3 8.6 C 9.6 10.7 8.5 14.6 10.9 19.6 Z" />
            {/* Stand */}
            <rect x="5.6" y="19.4" width="10" height="1.3" rx="0.4" fill="#d9a82e" />
            <rect x="4.6" y="20.6" width="12" height="2.4" rx="0.6" fill="#3a3a3a" />
            <rect x="7.2" y="21.2" width="6.8" height="1.2" rx="0.3" fill="#d9a82e" />
        </SvgIcon>
    );
}
