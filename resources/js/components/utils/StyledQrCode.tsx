import { forwardRef, useMemo } from "react";
import { buildQrArt, QrEyes, QrLevel, QrShape } from "../../helpers/qrArt";

interface StyledQrCodeProps {
    value: string;
    // CSS size of the drawing; the viewBox scales it.
    size?: number | string;
    shape?: QrShape;
    eyes?: QrEyes;
    level?: QrLevel;
    // Quiet zone in modules.
    margin?: number;
    // Dark and light colours stay literal: a camera needs real contrast whatever the theme. "transparent" leaves no background.
    color?: string;
    background?: string;
    // The finder "eyes" in their own colour; defaults to `color`.
    eyeColor?: string;
    // A picture laid over the middle (level H, modules under it left out) and its width ÷ height.
    logo?: string;
    logoRatio?: number;
    label?: string;
}

// A QR code in a chosen style — square, rounded or dotted modules, three kinds of eyes, any colours — as an SVG that can be
// exported as it is shown (helpers/qrExport.ts). Renders nothing when the value can't be encoded.
const StyledQrCode = forwardRef<SVGSVGElement, StyledQrCodeProps>(function StyledQrCode(
    { value, size = 200, shape = "square", eyes = "rounded", level = "M", margin = 2, color = "#202124", background = "#ffffff", eyeColor, logo, logoRatio = 1, label = "QR code" },
    ref,
) {
    const art = useMemo(() => {
        try {
            return buildQrArt(value, { shape, eyes, level, margin, logo: !!logo, logoRatio });
        } catch {
            return null;
        }
    }, [value, shape, eyes, level, margin, logo, logoRatio]);

    if (!art) return null;

    return (
        <svg ref={ref} role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${art.side} ${art.side}`} shapeRendering="geometricPrecision" style={{ display: "block" }}>
            {background !== "transparent" && <rect width={art.side} height={art.side} fill={background} />}
            <path d={art.eyeRings} fill={eyeColor ?? color} fillRule="evenodd" />
            <path d={art.eyeCentres} fill={eyeColor ?? color} />
            <path d={art.modules} fill={color} fillRule="evenodd" />
            {logo && art.logoBox && <image href={logo} x={art.logoBox.x} y={art.logoBox.y} width={art.logoBox.w} height={art.logoBox.h} preserveAspectRatio="xMidYMid meet" />}
        </svg>
    );
});

export default StyledQrCode;
