import { DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
    value: File | null;
    onChange: (file: File | null) => void;
    error?: string | null;
    // Largest file PHP on this server will accept after compression.
    maxFileKb?: number;
    onCompressingChange?: (compressing: boolean) => void;
    // Replaces the proof-of-transaction guidance, for other documents (e.g. rental slips).
    instructions?: ReactNode;
    // Short name of the document for the drop zone, e.g. "remittance slip".
    fileNoun?: string;
}

// Browsers often report an empty MIME type for .doc/.docx, so the extension is checked too.
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_ORIGINAL_MB = 20;
const POT_SAMPLE_URL = "https://leuteriorealty.com/admin/dashboard#";

// Pre-compression size, keyed by the compressed File the parent holds.
const originalSizes = new WeakMap<File, number>();
const formatMb = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MB`;
const formatLimit = (kb: number) => (kb >= 1024 ? `${+(kb / 1024).toFixed(1)}MB` : `${kb}KB`);
const extensionOf = (file: File) => file.name.split(".").pop()?.toLowerCase() ?? "";

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

export default function UploadPOTForm({
    value,
    onChange,
    error,
    maxFileKb = MAX_ORIGINAL_MB * 1024,
    onCompressingChange,
    instructions,
    fileNoun = "POT",
}: UploadPOTFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [compressing, setCompressing] = useState(false);

    const preview = useMemo(
        () => (value && value.type.startsWith("image/") ? URL.createObjectURL(value) : null),
        [value],
    );
    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    useEffect(() => onCompressingChange?.(compressing), [compressing, onCompressingChange]);

    const selectFile = async (fileList: FileList | null) => {
        const original = fileList?.[0];
        if (!original) return;
        setLocalError(null);

        if (ACCEPTED_EXTENSIONS.indexOf(extensionOf(original)) === -1) {
            setLocalError("Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.");
            return;
        }
        if (original.size > MAX_ORIGINAL_MB * 1048576) {
            setLocalError(`${original.name} is ${formatMb(original.size)} — the limit is ${MAX_ORIGINAL_MB}MB.`);
            return;
        }

        setCompressing(true);
        const file = isCompressibleImage(original) ? await compressImage(original) : original;
        setCompressing(false);
        originalSizes.set(file, original.size);

        if (file.size > maxFileKb * 1024) {
            setLocalError(
                `${file.name} is ${formatMb(file.size)} after compression — this server accepts up to ${formatLimit(maxFileKb)}.`,
            );
            return;
        }

        onChange(file);
    };

    const removeFile = () => {
        setLocalError(null);
        onChange(null);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        selectFile(e.dataTransfer.files);
    };

    const shownError = localError ?? error;

    return (
        <Box>
            {/* Instruction block */}
            {instructions ?? (
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
            )}

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
                    {value ? "Drop a different file to replace it, or click to browse" : `Drag & drop your ${fileNoun} here, or click to browse`}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: "var(--lr-text-secondary)", display: "block", mt: 0.5 }}
                >
                    One file · JPG, PNG, WEBP, PDF, DOC or DOCX · up to {MAX_ORIGINAL_MB}MB · photos are compressed before upload
                </Typography>

                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept={ACCEPT_ATTR}
                    onChange={(e) => {
                        selectFile(e.target.files);
                        // Reset so picking the same file again after removing it still fires onChange.
                        e.target.value = "";
                    }}
                />
            </Box>

            {compressing && (
                <Box sx={{ mt: 1.5 }}>
                    <LinearProgress sx={{ borderRadius: 99 }} />
                    <Typography
                        variant="caption"
                        sx={{ color: "var(--lr-text-secondary)", display: "block", mt: 0.5 }}
                    >
                        Compressing photo…
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

            {value && (
                <Box
                    sx={{
                        mt: 2.5,
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
                    {preview ? (
                        <Box
                            component="img"
                            src={preview}
                            alt=""
                            sx={{ width: 44, height: 44, objectFit: "cover", borderRadius: 1.5, flexShrink: 0 }}
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
                            <FileTypeIcon file={value} />
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
                            {value.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {(originalSizes.get(value) ?? value.size) > value.size
                                ? `${formatMb(originalSizes.get(value) ?? value.size)} → ${formatMb(value.size)} compressed`
                                : formatMb(value.size)}
                        </Typography>
                    </Box>

                    <CheckCircleRounded sx={{ color: "var(--lr-success-icon)", fontSize: 20 }} />
                    <IconButton
                        size="small"
                        aria-label={`Remove ${value.name}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                        }}
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        <CloseRounded fontSize="small" />
                    </IconButton>
                </Box>
            )}
        </Box>
    );
}
