import { useMemo } from "react";
import QRCode from "qrcode";

interface DotsQrCodeProps {
    value: string;
    size?: number;
    // Dark and light colours stay literal: a camera needs real contrast whatever the theme.
    color?: string;
    background?: string;
    label?: string;
}

// Is (row, col) inside one of the three 7×7 finder patterns?
function inFinder(row: number, col: number, count: number): boolean {
    const near = (n: number) => n < 7;
    const far = (n: number) => n >= count - 7;
    return (near(row) && near(col)) || (near(row) && far(col)) || (far(row) && near(col));
}

// A QR code drawn as round dots, with rounded finder "eyes" in the corners, instead of plain squares.
// Dot radius 0.47 (of a module) is the smallest that a strict decoder (jsQR) still reads; phone cameras are more forgiving.
export default function DotsQrCode({ value, size = 150, color = "#202124", background = "#ffffff", label = "QR code" }: DotsQrCodeProps) {
    const { count, dots } = useMemo(() => {
        const modules = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
        const n = modules.size;
        const points: { r: number; c: number }[] = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (modules.get(r, c) && !inFinder(r, c, n)) {
                    points.push({ r, c });
                }
            }
        }
        return { count: n, dots: points };
    }, [value]);

    const quiet = 2;
    const side = count + quiet * 2;
    const eyes = [
        [quiet, quiet],
        [quiet, quiet + count - 7],
        [quiet + count - 7, quiet],
    ];

    return (
        <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${side} ${side}`} shapeRendering="geometricPrecision">
            <rect width={side} height={side} fill={background} />
            {eyes.map(([y, x]) => (
                <g key={`${y}-${x}`} fill={color}>
                    <path fillRule="evenodd" d={`M${x + 2} ${y}h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z`} />
                    <rect x={x + 2} y={y + 2} width={3} height={3} rx={1} />
                </g>
            ))}
            {dots.map((d) => (
                <circle key={`${d.r}-${d.c}`} cx={d.c + quiet + 0.5} cy={d.r + quiet + 0.5} r={0.47} fill={color} />
            ))}
        </svg>
    );
}
