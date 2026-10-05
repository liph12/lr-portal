import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, IconButton, Link as MuiLink } from "@mui/material";
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
}

// Browsers often report an empty MIME type for .doc/.docx, so the extension is checked too.
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_SIZE_MB = 10;
const MAX_FILES = 10;
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

export default function UploadPOTForm({ value, onChange, error }: UploadPOTFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const previews = useMemo(
        () => value.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
        [value],
    );
    useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews]);

    const addFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        setLocalError(null);

        const existing = new Set(value.map(fileKey));
        const accepted: File[] = [];

        for (const file of Array.from(fileList)) {
            if (ACCEPTED_EXTENSIONS.indexOf(extensionOf(file)) === -1) {
                setLocalError("Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.");
                continue;
            }
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                setLocalError(`${file.name} is over ${MAX_SIZE_MB}MB.`);
                continue;
            }
            if (!existing.has(fileKey(file))) accepted.push(file);
        }

        const next = [...value, ...accepted];
        if (next.length > MAX_FILES) {
            setLocalError(`You can upload up to ${MAX_FILES} files.`);
        }
        if (accepted.length) onChange(next.slice(0, MAX_FILES));
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
                    JPG, PNG, WEBP, PDF, DOC or DOCX · up to {MAX_SIZE_MB}MB each, {MAX_FILES} files max
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
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
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
