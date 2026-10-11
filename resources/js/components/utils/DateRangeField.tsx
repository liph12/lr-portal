import { MouseEvent, useState } from "react";
import { Box, ButtonBase, Divider, List, ListItemButton, ListItemText, Popover, Typography } from "@mui/material";
import { CalendarMonthOutlined, ExpandMoreRounded } from "@mui/icons-material";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { PickerDay, PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import dayjs, { Dayjs } from "dayjs";
import StyledButton from "./StyledButton";
import { formatDate } from "../../helpers/formatDate";

export interface DateRange {
    // "YYYY-MM-DD"
    from: string;
    to: string;
}

export interface DateRangePreset extends DateRange {
    label: string;
}

interface DateRangeFieldProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    presets?: DateRangePreset[];
    label?: string;
}

interface RangeDayProps extends PickerDayProps {
    rangeStart?: Dayjs | null;
    rangeEnd?: Dayjs | null;
    onHoverDay?: (day: Dayjs | null) => void;
}

const FORMAT = "YYYY-MM-DD";

// A calendar day that knows the range being picked: ends are filled, days between get a soft band.
function RangeDay({ rangeStart, rangeEnd, onHoverDay, day, outsideCurrentMonth, sx, ...props }: RangeDayProps) {
    const d = day as Dayjs;
    const isStart = !!rangeStart && d.isSame(rangeStart, "day");
    const isEnd = !!rangeEnd && d.isSame(rangeEnd, "day");
    const between = !!rangeStart && !!rangeEnd && d.isAfter(rangeStart, "day") && d.isBefore(rangeEnd, "day");

    return (
        <PickerDay
            {...props}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            selected={isStart || isEnd}
            onMouseEnter={() => onHoverDay?.(d)}
            sx={{
                ...(between && !outsideCurrentMonth
                    ? { borderRadius: 0, backgroundColor: "var(--lr-primary-soft)", color: "var(--lr-text-primary)", ":hover": { backgroundColor: "var(--lr-primary-soft-strong)" } }
                    : {}),
                "&.Mui-selected": { backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)" },
                "&.Mui-selected:hover, &.Mui-selected:focus": { backgroundColor: "var(--lr-primary-hover)" },
                ...sx,
            }}
        />
    );
}

const rangeLabel = (r: DateRange) => (r.from === r.to ? formatDate(r.from) : `${formatDate(r.from)} – ${formatDate(r.to)}`);

// One field for a date range: opens quick ranges and a calendar; click the first day, then the last.
export default function DateRangeField({ value, onChange, presets = [], label = "Date range" }: DateRangeFieldProps) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [start, setStart] = useState<Dayjs | null>(null);
    const [end, setEnd] = useState<Dayjs | null>(null);
    const [hover, setHover] = useState<Dayjs | null>(null);

    const open = (e: MouseEvent<HTMLElement>) => {
        setStart(dayjs(value.from, FORMAT));
        setEnd(dayjs(value.to, FORMAT));
        setHover(null);
        setAnchor(e.currentTarget);
    };

    const close = () => setAnchor(null);

    const apply = (range: DateRange) => {
        close();
        if (range.from !== value.from || range.to !== value.to) onChange(range);
    };

    const pick = (day: Dayjs | null) => {
        if (!day) return;
        // A complete range starts over; otherwise the second click closes it (in either order).
        if (!start || end) {
            setStart(day);
            setEnd(null);
        } else if (day.isBefore(start, "day")) {
            setEnd(start);
            setStart(day);
        } else {
            setEnd(day);
        }
    };

    // While choosing the end, preview the range up to the hovered day.
    const previewEnd = end ?? (start && hover && !hover.isBefore(start, "day") ? hover : null);
    const activePreset = presets.find((p) => p.from === value.from && p.to === value.to);

    return (
        <>
            <ButtonBase
                onClick={open}
                aria-haspopup="dialog"
                aria-label={`${label}: ${rangeLabel(value)}`}
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    pl: 1.5,
                    pr: 1,
                    py: 0.9,
                    borderRadius: 99,
                    fontSize: 14,
                    color: "var(--lr-text-primary)",
                    backgroundColor: "var(--lr-surface-container)",
                    ":hover": { backgroundColor: "var(--lr-surface-hover)" },
                    ":focus-visible": { outline: "2px solid var(--lr-primary)" },
                }}
            >
                <CalendarMonthOutlined fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />
                <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                    {activePreset ? (
                        <>
                            <strong>{activePreset.label}</strong>
                            <Box component="span" sx={{ color: "var(--lr-text-secondary)", display: { xs: "none", sm: "inline" } }}>
                                {" · "}
                                {rangeLabel(value)}
                            </Box>
                        </>
                    ) : (
                        rangeLabel(value)
                    )}
                </Box>
                <ExpandMoreRounded fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />
            </ButtonBase>

            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={close}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, border: "1px solid var(--lr-border)", maxWidth: "calc(100vw - 32px)" } } }}
            >
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" } }}>
                    {presets.length > 0 && (
                        <>
                            <List dense sx={{ minWidth: 160, py: 1, display: "flex", flexDirection: { xs: "row", sm: "column" }, overflowX: "auto" }}>
                                {presets.map((p) => (
                                    <ListItemButton
                                        key={p.label}
                                        selected={p === activePreset}
                                        onClick={() => apply(p)}
                                        sx={{ borderRadius: 2, mx: 0.5, flex: "0 0 auto" }}
                                    >
                                        <ListItemText primary={p.label} slotProps={{ primary: { sx: { fontSize: 14, whiteSpace: "nowrap" } } }} />
                                    </ListItemButton>
                                ))}
                            </List>
                            <Divider orientation="vertical" flexItem sx={{ borderColor: "var(--lr-border)", display: { xs: "none", sm: "block" } }} />
                        </>
                    )}

                    <Box>
                        <Typography variant="body2" sx={{ px: 3, pt: 2, color: "var(--lr-text-secondary)" }}>
                            {start && end ? (
                                <>
                                    <strong style={{ color: "var(--lr-text-primary)" }}>{formatDate(start.format(FORMAT))}</strong> –{" "}
                                    <strong style={{ color: "var(--lr-text-primary)" }}>{formatDate(end.format(FORMAT))}</strong>
                                </>
                            ) : start ? (
                                <>
                                    From <strong style={{ color: "var(--lr-text-primary)" }}>{formatDate(start.format(FORMAT))}</strong> — now pick the last day
                                </>
                            ) : (
                                "Pick the first day"
                            )}
                        </Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Box onMouseLeave={() => setHover(null)}>
                                <DateCalendar
                                    value={end ?? start}
                                    onChange={pick}
                                    referenceDate={start ?? dayjs()}
                                    slots={{ day: RangeDay }}
                                    slotProps={{ day: { rangeStart: start, rangeEnd: previewEnd, onHoverDay: setHover } as Partial<RangeDayProps> }}
                                />
                            </Box>
                        </LocalizationProvider>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 2, pb: 2 }}>
                            <StyledButton onClick={close} sx={{ color: "var(--lr-text-secondary)" }}>
                                Cancel
                            </StyledButton>
                            <StyledButton
                                variant="contained"
                                disabled={!start || !end}
                                onClick={() => start && end && apply({ from: start.format(FORMAT), to: end.format(FORMAT) })}
                                sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                            >
                                Apply
                            </StyledButton>
                        </Box>
                    </Box>
                </Box>
            </Popover>
        </>
    );
}
