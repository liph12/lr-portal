import { PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, CircularProgress, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { AccountTreeRounded, AddRounded, CenterFocusStrongRounded, FitScreenRounded, RemoveRounded, UnfoldLessRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import GenealogyCard, { CARD_H, CARD_W, GenealogyNode } from "./GenealogyCard";
import { formatCount } from "../../helpers/formatNumber";

export interface GenealogyBranch {
    parent: number;
    offset: number;
    total: number;
    nodes: GenealogyNode[];
}

interface Loaded {
    nodes: GenealogyNode[];
    total: number;
    loading: boolean;
}

interface GenealogyTreeProps {
    root: GenealogyNode;
    firstPage: GenealogyBranch;
    openProfiles: boolean;
    // Recruits shown per opened card, and the steps to choose from (User::GENEALOGY_SIZES).
    perBranch: number;
    sizes: number[];
    // Saved to Preferences when the viewer has them; otherwise it only applies to this visit.
    canSaveSize: boolean;
    layout: Layout;
}

export type Layout = "vertical" | "horizontal";

// One box on the canvas: an agent's card, or the "show more" / "loading" slot at the end of a row of recruits.
interface Item {
    key: string;
    kind: "node" | "more" | "loading";
    node?: GenealogyNode;
    parent: number | null;
    more?: number;
    children: Item[];
    span: number;
    x: number;
    y: number;
}

// Between cards of the same level, and between levels — per layout.
const SIBLING_GAP = { vertical: 24, horizontal: 16 };
const LEVEL_GAP = { vertical: 72, horizontal: 72 };
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const PAD = 40;

const toggleSx = {
    "& .MuiToggleButton-root": { px: 1, py: 0.25, fontSize: 12, minWidth: 32, borderColor: "var(--lr-border)", color: "var(--lr-text-secondary)" },
    "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" },
};

const clamp = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

// `span` = room a subtree needs across the levels: width when top-down, height when left-to-right.
function measure(item: Item, o: Layout): number {
    const card = o === "vertical" ? CARD_W : CARD_H;
    const row = item.children.reduce((sum, c) => sum + measure(c, o), 0) + SIBLING_GAP[o] * Math.max(0, item.children.length - 1);
    item.span = Math.max(card, row);
    return item.span;
}

// Each subtree takes its recruits side by side (or stacked), with the parent centred on them one level up (or left).
function place(item: Item, start: number, depth: number, o: Layout) {
    const card = o === "vertical" ? CARD_W : CARD_H;
    const across = start + (item.span - card) / 2;
    const along = depth * ((o === "vertical" ? CARD_H : CARD_W) + LEVEL_GAP[o]);
    item.x = o === "vertical" ? across : along;
    item.y = o === "vertical" ? along : across;
    const row = item.children.reduce((sum, c) => sum + c.span, 0) + SIBLING_GAP[o] * Math.max(0, item.children.length - 1);
    let cursor = start + (item.span - row) / 2;
    for (const child of item.children) {
        place(child, cursor, depth + 1, o);
        cursor += child.span + SIBLING_GAP[o];
    }
}

function flatten(item: Item, out: Item[] = []): Item[] {
    out.push(item);
    item.children.forEach((c) => flatten(c, out));
    return out;
}

const slot = (kind: Item["kind"], parent: number, more?: number): Item => ({ key: `${kind}-${parent}`, kind, parent, more, children: [], span: 0, x: 0, y: 0 });

// The recruit tree on a canvas: drag to pan, wheel / pinch / buttons to zoom. Any card can be opened at any depth;
// its recruits load `limit` at a time, biggest downlines first (partial reloads of `branch`), and stay loaded when folded.
export default function GenealogyTree({ root, firstPage, openProfiles, perBranch, sizes, canSaveSize, layout: savedLayout }: GenealogyTreeProps) {
    const [loaded, setLoaded] = useState<Record<number, Loaded>>({ [root.id]: { nodes: firstPage.nodes, total: firstPage.total, loading: false } });
    const [limit, setLimit] = useState(perBranch);
    const [layout, setLayout] = useState<Layout>(savedLayout);
    const [open, setOpen] = useState<Record<number, boolean>>({ [root.id]: true });
    const [view, setView] = useState({ x: 0, y: PAD, k: 1 });
    const [dragging, setDragging] = useState(false);
    const viewport = useRef<HTMLDivElement>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinch = useRef<number | null>(null);

    // The next `limit` recruits after the ones already shown (biggest downlines first).
    const load = (parent: number) => {
        const offset = loaded[parent]?.nodes.length ?? 0;
        setLoaded((l) => ({ ...l, [parent]: { nodes: l[parent]?.nodes ?? [], total: l[parent]?.total ?? 0, loading: true } }));
        router.reload({
            only: ["branch"],
            data: { parent, offset, limit },
            preserveUrl: true,
            // Several branches may load at once; a sync visit would cancel the others.
            async: true,
            onSuccess: (response) => {
                const branch = response.props.branch as GenealogyBranch;
                setLoaded((l) => ({ ...l, [parent]: { nodes: [...(l[parent]?.nodes ?? []).slice(0, branch.offset), ...branch.nodes], total: branch.total, loading: false } }));
            },
            onError: () => setLoaded((l) => ({ ...l, [parent]: { ...l[parent], loading: false } })),
        });
    };

    const toggle = (node: GenealogyNode) => {
        const next = !open[node.id];
        setOpen((o) => ({ ...o, [node.id]: next }));
        if (next && !loaded[node.id]) load(node.id);
    };

    // A smaller number trims what's shown to the best few; a bigger one applies to the next card opened or "Show more".
    const changeLimit = (size: number) => {
        setLimit(size);
        setLoaded((l) => Object.fromEntries(Object.entries(l).map(([id, b]) => [id, { ...b, nodes: b.nodes.slice(0, size) }])));
        save({ genealogy_per_branch: size });
    };

    const changeLayout = (next: Layout) => {
        setLayout(next);
        save({ genealogy_layout: next });
    };

    const save = (data: Record<string, string | number>) => {
        if (canSaveSize) router.put("/settings/preferences/genealogy", data, { preserveScroll: true, preserveState: true, only: ["auth"] });
    };

    // `path` = the cards above, so a sponsor loop in the data can't draw a branch inside itself forever.
    const tree = useMemo(() => {
        const build = (node: GenealogyNode, parent: number | null, path: number[]): Item => {
            const branch = open[node.id] ? loaded[node.id] : undefined;
            const inPath = [...path, node.id];
            const children = branch ? branch.nodes.filter((n) => inPath.indexOf(n.id) === -1).map((n) => build(n, node.id, inPath)) : [];
            if (branch?.loading) children.push(slot("loading", node.id));
            else if (branch && branch.total > branch.nodes.length) children.push(slot("more", node.id, branch.total - branch.nodes.length));

            return { key: `node-${node.id}`, kind: "node", node, parent, children, span: 0, x: 0, y: 0 };
        };
        const top = build(root, null, []);
        measure(top, layout);
        place(top, 0, 0, layout);
        const items = flatten(top);

        return { top, items, width: Math.max(...items.map((i) => i.x)) + CARD_W, height: Math.max(...items.map((i) => i.y)) + CARD_H };
    }, [root, loaded, open, layout]);

    const size = () => ({ w: viewport.current?.clientWidth ?? 800, h: viewport.current?.clientHeight ?? 600 });

    // Keeps the point under the cursor (or between the fingers) in place while zooming.
    const zoomAt = useCallback((factor: number, px: number, py: number) => {
        setView((v) => {
            const k = clamp(v.k * factor);
            return { k, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) };
        });
    }, []);

    const zoomCentre = (factor: number) => {
        const { w, h } = size();
        zoomAt(factor, w / 2, h / 2);
    };

    // The whole open tree, centred across the levels and starting from the top card's edge.
    const fit = () => {
        const { w, h } = size();
        const k = clamp(Math.min((w - PAD * 2) / tree.width, (h - PAD * 2) / tree.height, 1));
        setView(layout === "vertical" ? { k, x: (w - tree.width * k) / 2, y: PAD } : { k, x: PAD, y: (h - tree.height * k) / 2 });
    };

    // The top card at full size: centred at the top (top-down) or at the left (left-to-right).
    const centre = () => {
        const { w, h } = size();
        setView(layout === "vertical" ? { k: 1, x: w / 2 - (tree.top.x + CARD_W / 2), y: PAD } : { k: 1, x: PAD, y: h / 2 - (tree.top.y + CARD_H / 2) });
    };

    const foldAll = () => setOpen({ [root.id]: true });

    // On arrival and whenever the layout flips, start from the top card.
    useEffect(() => centre(), [layout]);

    // Wheel and trackpad pinch (a ctrl+wheel) zoom; a native listener because React's wheel handler can't stop the page scrolling.
    useEffect(() => {
        const el = viewport.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - rect.left, e.clientY - rect.top);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [zoomAt]);

    // One pointer pans, two pinch-zoom. Buttons and links inside cards keep their clicks.
    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        pinch.current = null;
        setDragging(true);
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const previous = pointers.current.get(e.pointerId);
        if (!previous) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const points = Array.from(pointers.current.values());

        if (points.length === 1) {
            setView((v) => ({ ...v, x: v.x + e.clientX - previous.x, y: v.y + e.clientY - previous.y }));
            return;
        }
        const [a, b] = points;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.current && distance > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            zoomAt(distance / pinch.current, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
        }
        pinch.current = distance;
    };

    const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
        if (!pointers.current.size) setDragging(false);
    };

    const byKey = new Map(tree.items.map((i) => [i.key, i]));
    const links = tree.items
        .filter((i) => i.parent !== null)
        .map((i) => {
            const p = byKey.get(`node-${i.parent}`)!;
            const d =
                layout === "vertical"
                    ? `M ${p.x + CARD_W / 2} ${p.y + CARD_H} V ${p.y + CARD_H + LEVEL_GAP.vertical / 2} H ${i.x + CARD_W / 2} V ${i.y}`
                    : `M ${p.x + CARD_W} ${p.y + CARD_H / 2} H ${p.x + CARD_W + LEVEL_GAP.horizontal / 2} V ${i.y + CARD_H / 2} H ${i.x}`;
            return <path key={i.key} d={d} />;
        });

    const control = (title: string, onClick: () => void, icon: ReactNode) => (
        <Tooltip title={title} placement="left">
            <IconButton size="small" onClick={onClick} aria-label={title} sx={{ color: "var(--lr-text-primary)" }}>
                {icon}
            </IconButton>
        </Tooltip>
    );

    return (
        <Box
            ref={viewport}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            sx={{
                position: "relative",
                height: { xs: 520, md: 680 },
                overflow: "hidden",
                borderRadius: 3,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface-container)",
                // A dot grid that moves and scales with the tree, so panning reads as moving across a surface.
                backgroundImage: "radial-gradient(var(--lr-border) 1px, transparent 1px)",
                backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
                backgroundPosition: `${view.x}px ${view.y}px`,
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none",
                userSelect: "none",
            }}
        >
            <Box sx={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
                <Box
                    component="svg"
                    width={tree.width}
                    height={tree.height}
                    aria-hidden
                    sx={{ position: "absolute", left: 0, top: 0, overflow: "visible", fill: "none", stroke: "var(--lr-outline)", strokeWidth: 2 }}
                >
                    {links}
                </Box>
                {tree.items.map((item) => (
                    <Box key={item.key} sx={{ position: "absolute", left: item.x, top: item.y }}>
                        {item.kind === "node" && item.node && (
                            <GenealogyCard node={item.node} isRoot={item.node.id === root.id} expanded={!!open[item.node.id]} onToggle={() => toggle(item.node!)} openProfiles={openProfiles} />
                        )}
                        {item.kind === "more" && (
                            <ButtonBase
                                onClick={() => load(item.parent!)}
                                sx={{ width: CARD_W, height: CARD_H, borderRadius: 3, border: "1px dashed var(--lr-outline)", backgroundColor: "var(--lr-surface)", flexDirection: "column", gap: 0.5 }}
                            >
                                <Typography sx={{ fontWeight: 500, color: "var(--lr-primary)" }}>Show {formatCount(Math.min(limit, item.more ?? 0))} more</Typography>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {formatCount(item.more ?? 0)} not shown yet
                                </Typography>
                            </ButtonBase>
                        )}
                        {item.kind === "loading" && (
                            <Box sx={{ width: CARD_W, height: CARD_H, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed var(--lr-border)" }}>
                                <CircularProgress size={22} aria-label="Loading recruits" />
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>

            <Box
                onPointerDown={(e) => e.stopPropagation()}
                sx={{ position: "absolute", right: 12, top: 12, display: "flex", flexDirection: "column", alignItems: "center", p: 0.5, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)", cursor: "default" }}
            >
                {control("Zoom in", () => zoomCentre(1.25), <AddRounded fontSize="small" />)}
                <Typography variant="caption" sx={{ py: 0.25, color: "var(--lr-text-secondary)", fontFamily: "Google Sans Code" }}>
                    {Math.round(view.k * 100)}%
                </Typography>
                {control("Zoom out", () => zoomCentre(1 / 1.25), <RemoveRounded fontSize="small" />)}
                {control("Fit the whole tree", fit, <FitScreenRounded fontSize="small" />)}
                {control("Back to the top card", centre, <CenterFocusStrongRounded fontSize="small" />)}
                {control("Fold everything", foldAll, <UnfoldLessRounded fontSize="small" />)}
            </Box>

            <Box
                onPointerDown={(e) => e.stopPropagation()}
                sx={{ position: "absolute", left: 12, top: 12, display: "flex", alignItems: "center", gap: 1, pl: 1.5, pr: 0.5, py: 0.5, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)", cursor: "default" }}
            >
                <Typography variant="caption" id="genealogy-per-branch" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                    Recruits per card
                </Typography>
                <ToggleButtonGroup size="small" exclusive value={limit} onChange={(_, v: number | null) => v && changeLimit(v)} aria-labelledby="genealogy-per-branch" sx={toggleSx}>
                    {sizes.map((size) => (
                        <ToggleButton key={size} value={size}>
                            {size}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <ToggleButtonGroup size="small" exclusive value={layout} onChange={(_, v: Layout | null) => v && changeLayout(v)} aria-label="Layout" sx={toggleSx}>
                    <Tooltip title="Top to bottom">
                        <ToggleButton value="vertical" aria-label="Top to bottom">
                            <AccountTreeRounded sx={{ fontSize: 18 }} />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Left to right">
                        <ToggleButton value="horizontal" aria-label="Left to right">
                            <AccountTreeRounded sx={{ fontSize: 18, transform: "rotate(-90deg)" }} />
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
            </Box>

            <Typography variant="caption" sx={{ position: "absolute", left: 12, bottom: 10, color: "var(--lr-text-secondary)", pointerEvents: "none" }}>
                Drag to move · scroll or pinch to zoom · open a card to see its recruits, biggest downlines first
            </Typography>
        </Box>
    );
}
