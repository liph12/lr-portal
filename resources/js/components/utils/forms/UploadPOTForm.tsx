import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, IconButton, LinearProgress, Link as MuiLink } from "@mui/material";
import { compressImage, isCompressibleImage } from "../../../helpers/compressImage";
import {
    CloudUploadOutlined,
    InsertDriveFileOutlined,
    PictureAsPdfOutlined,
    DescriptionOutlined,
    CloseRounded,
    CheckCircleRounded,
} from "@mui/icons-material";

interface UploadPOTFormProps {
    value: File[];
    onChange: (files: File[]) => void;
    error?: string | null;
    // Largest file PHP on this server will accept after compression.
    maxFileKb?: number;
    onCompressingChange?: (compressing: boolean) => void;
}

// Browsers often report an empty MIME type for .doc/.docx, so the extension is checked too.
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILES = 10;
const MAX_ORIGINAL_MB = 20;

// Original (pre-compression) size and identity, keyed by the compressed File the parent holds.
const originalSizes = new WeakMap<File, number>();
const originalKeys = new WeakMap<File, string>();
const formatMb = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MB`;
const POT_SAMPLE_URL = "https://leuteriorealty.com/admin/dashboard#";

const extensionOf = (file: File) => file.name.split(".").pop()?.toLowerCase() ?? "";
const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

function FileTypeIcon({ file }: { file: File }) {
    const ext = extensionOf(file);
    const Icon =
        ext === "pdf"
            ? PictureAsPdfOutlined
            : ext === "doc" || ext === "docx"
              ? DescriptionOutlined
              : InsertDriveFileOutlined;

    return <Icon sx={{ color: "var(--lr-text-secondary)" }} />;
}

const formatLimit = (kb: number) => (kb >= 1024 ? `${+(kb / 1024).toFixed(1)}MB` : `${kb}KB`);

export default function UploadPOTForm({
    value,
    onChange,
    error,
    maxFileKb = MAX_ORIGINAL_MB * 1024,
    onCompressingChange,
}: UploadPOTFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const previews = useMemo(
        () => value.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
        [value],
    );
    useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews]);

    const [compressing, setCompressing] = useState(0);
    // Compression is async; read the latest list when it finishes instead of the one captured at drop time.
    const valueRef = useRef(value);
    valueRef.current = value;

    useEffect(() => onCompressingChange?.(compressing > 0), [compressing, onCompressingChange]);

    const addFiles = async (fileList: FileList | null) => {
        if (!fileList) return;
        setLocalError(null);

        const existing = new Set(valueRef.current.map((f) => originalKeys.get(f) ?? fileKey(f)));
        const picked: File[] = [];

        for (const file of Array.from(fileList)) {
            if (ACCEPTED_EXTENSIONS.indexOf(extensionOf(file)) === -1) {
                setLocalError("Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.");
                continue;
            }
            if (file.size > MAX_ORIGINAL_MB * 1048576) {
                setLocalError(`${file.name} is ${formatMb(file.size)} — the limit is ${MAX_ORIGINAL_MB}MB per file.`);
                continue;
            }
            if (!existing.has(fileKey(file))) picked.push(file);
        }

        const room = MAX_FILES - valueRef.current.length;
        if (picked.length > room) setLocalError(`You can upload up to ${MAX_FILES} files.`);
        const toAdd = picked.slice(0, Math.max(0, room));
        if (!toAdd.length) return;

        setCompressing((n) => n + toAdd.length);
        const prepared = await Promise.all(
            toAdd.map(async (original) => {
                const file = isCompressibleImage(original) ? await compressImage(original) : original;
                originalSizes.set(file, original.size);
                originalKeys.set(file, fileKey(original));
                setCompressing((n) => n - 1);
                return file;
            }),
        );

        const tooBig = prepared.filter((f) => f.size > maxFileKb * 1024);
        if (tooBig.length) {
            setLocalError(
                `${tooBig[0].name} is ${formatMb(tooBig[0].size)} after compression — this server accepts up to ${formatLimit(maxFileKb)} per file.`,
            );
        }

        const accepted = prepared.filter((f) => f.size <= maxFileKb * 1024);
        if (accepted.length) onChange([...valueRef.current, ...accepted].slice(0, MAX_FILES));
    };

    const removeFile = (index: number) => {
        setLocalError(null);
        onChange(value.filter((_, i) => i !== index));
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    const shownError = localError ?? error;

    return (
        <Box>
            {/* Instruction block */}
            <Box
                sx={{
                    backgroundColor: "var(--lr-primary-soft)",
                    borderRadius: 2,
                    p: 2,
                    mb: 2.5,
                }}
            >
                <Typography
                    variant="body2"
                    sx={{ color: "var(--lr-text-body)", lineHeight: 1.6 }}
                >
                    <strong>Proof of Transaction</strong> (such as a photo
                    capture of a transaction document): Valid POT includes a
                    readable &amp; duly signed copy of a Term Sheet, Reservation
                    Agreement, Acknowledgement / Official Receipt, or Brokerage
                    / Rental remittance slip.{" "}
                    <MuiLink
                        href={POT_SAMPLE_URL}
                        target="_blank"
                        rel="noopener"
                        sx={{
                            color: "var(--lr-primary)",
                            fontWeight: 500,
                            textDecoration: "none",
                            ":hover": { textDecoration: "underline" },
                        }}
                    >
                        (VIEW POT SAMPLE)
                    </MuiLink>
                </Typography>
            </Box>

            {/* Drop zone */}
            <Box
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                sx={{
                    border: "2px dashed",
                    borderColor: dragOver ? "var(--lr-primary)" : "var(--lr-outline)",
                    borderRadius: 3,
                    backgroundColor: dragOver ? "var(--lr-primary-soft-hover)" : "var(--lr-surface-dim)",
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "0.15s",
                    ":hover": {
                        borderColor: "var(--lr-primary)",
                        backgroundColor: "var(--lr-primary-soft-hover)",
                    },
                }}
            >
                <CloudUploadOutlined
                    sx={{ fontSize: 40, color: "var(--lr-primary)", mb: 1 }}
                />
                <Typography
                    variant="body2"
                    sx={{ color: "var(--lr-text-body)", fontWeight: 500 }}
                >
                    Drag &amp; drop your POT here, or click to browse
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: "var(--lr-text-secondary)", display: "block", mt: 0.5 }}
                >
                    JPG, PNG, WEBP, PDF, DOC or DOCX · up to {MAX_ORIGINAL_MB}MB each, {MAX_FILES} files max · photos are compressed before upload
                </Typography>

                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    multiple
                    accept={ACCEPT_ATTR}
                    onChange={(e) => {
                        addFiles(e.target.files);
                        // Reset so picking the same file again after removing it still fires onChange.
                        e.target.value = "";
                    }}
                />
            </Box>

            {compressing > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <LinearProgress sx={{ borderRadius: 99 }} />
                    <Typography
                        variant="caption"
                        sx={{ color: "var(--lr-text-secondary)", display: "block", mt: 0.5 }}
                    >
                        Compressing {compressing} photo{compressing > 1 ? "s" : ""}…
                    </Typography>
                </Box>
            )}

            {shownError && (
                <Typography
                    role="alert"
                    variant="caption"
                    sx={{ color: "var(--lr-error)", mt: 1, display: "block", ml: 0.5 }}
                >
                    {shownError}
                </Typography>
            )}

            {/* File previews */}
            {value.length > 0 && (
                <Box
                    sx={{
                        mt: 2.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                    }}
                >
                    {value.map((file, index) => (
                        <Box
                            key={fileKey(file)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1,
                                pr: 0.5,
                                border: "1px solid var(--lr-border)",
                                borderRadius: 2,
                                backgroundColor: "var(--lr-surface)",
                            }}
                        >
                            {previews[index] ? (
                                <Box
                                    component="img"
                                    src={previews[index] ?? undefined}
                                    alt=""
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        objectFit: "cover",
                                        borderRadius: 1.5,
                                        flexShrink: 0,
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 1.5,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "var(--lr-surface-container)",
                                        flexShrink: 0,
                                    }}
                                >
                                    <FileTypeIcon file={file} />
                                </Box>
                            )}

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "var(--lr-text-primary)",
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {file.name}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "var(--lr-text-secondary)" }}
                                >
                                    {(originalSizes.get(file) ?? file.size) > file.size
                                        ? `${formatMb(originalSizes.get(file) ?? file.size)} → ${formatMb(file.size)} compressed`
                                        : formatMb(file.size)}
                                </Typography>
                            </Box>

                            <CheckCircleRounded
                                sx={{ color: "var(--lr-success-icon)", fontSize: 20 }}
                            />
                            <IconButton
                                size="small"
                                aria-label={`Remove ${file.name}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(index);
                                }}
                                sx={{ color: "var(--lr-text-secondary)" }}
                            >
                                <CloseRounded fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
