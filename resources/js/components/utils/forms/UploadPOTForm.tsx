import { useRef, useState } from "react";
import { Box, Typography, IconButton, Link as MuiLink } from "@mui/material";
import {
    CloudUploadOutlined,
    InsertDriveFileOutlined,
    CloseRounded,
    CheckCircleRounded,
} from "@mui/icons-material";

interface UploadedFile {
    id: string;
    file: File;
    preview: string | null;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_MB = 10;
const POT_SAMPLE_URL = "https://leuteriorealty.com/admin/dashboard#";

export default function UploadPOTForm({
    onChange,
}: {
    onChange?: (files: File[]) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const emit = (next: UploadedFile[]) => onChange?.(next.map((f) => f.file));

    const addFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        setError(null);

        const accepted: UploadedFile[] = [];

        Array.from(fileList).forEach((file) => {
            if (!ACCEPTED.includes(file.type)) {
                setError("Only JPG, PNG, WEBP or PDF files are allowed.");
                return;
            }
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                setError(`Each file must be under ${MAX_SIZE_MB}MB.`);
                return;
            }
            accepted.push({
                id: `${file.name}-${file.size}-${Date.now()}`,
                file,
                preview: file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : null,
            });
        });

        if (accepted.length) {
            const next = [...files, ...accepted];
            setFiles(next);
            emit(next);
        }
    };

    const removeFile = (id: string) => {
        const target = files.find((f) => f.id === id);
        if (target?.preview) URL.revokeObjectURL(target.preview);
        const next = files.filter((f) => f.id !== id);
        setFiles(next);
        emit(next);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    return (
        <Box>
            {/* Instruction block */}
            <Box
                sx={{
                    backgroundColor: "#e8f0fe",
                    borderRadius: 2,
                    p: 2,
                    mb: 2.5,
                }}
            >
                <Typography
                    variant="body2"
                    sx={{ color: "#3c4043", lineHeight: 1.6 }}
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
                            color: "#1a73e8",
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
                    borderColor: dragOver ? "#1a73e8" : "#dadce0",
                    borderRadius: 3,
                    backgroundColor: dragOver ? "#f8fbff" : "#f8f9fa",
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "0.15s",
                    ":hover": {
                        borderColor: "#1a73e8",
                        backgroundColor: "#f8fbff",
                    },
                }}
            >
                <CloudUploadOutlined
                    sx={{ fontSize: 40, color: "#1a73e8", mb: 1 }}
                />
                <Typography
                    variant="body2"
                    sx={{ color: "#3c4043", fontWeight: 500 }}
                >
                    Drag &amp; drop your POT here, or click to browse
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: "#5f6368", display: "block", mt: 0.5 }}
                >
                    JPG, PNG, WEBP or PDF · up to {MAX_SIZE_MB}MB each
                </Typography>

                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept={ACCEPTED.join(",")}
                    onChange={(e) => addFiles(e.target.files)}
                />
            </Box>

            {error && (
                <Typography
                    variant="caption"
                    sx={{ color: "#d93025", mt: 1, display: "block", ml: 0.5 }}
                >
                    {error}
                </Typography>
            )}

            {/* File previews */}
            {files.length > 0 && (
                <Box
                    sx={{
                        mt: 2.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                    }}
                >
                    {files.map((f) => (
                        <Box
                            key={f.id}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1,
                                pr: 0.5,
                                border: "1px solid #e8eaed",
                                borderRadius: 2,
                                backgroundColor: "#fff",
                            }}
                        >
                            {f.preview ? (
                                <Box
                                    component="img"
                                    src={f.preview}
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
                                        backgroundColor: "#f1f3f4",
                                        flexShrink: 0,
                                    }}
                                >
                                    <InsertDriveFileOutlined
                                        sx={{ color: "#5f6368" }}
                                    />
                                </Box>
                            )}

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "#202124",
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {f.file.name}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "#5f6368" }}
                                >
                                    {(f.file.size / 1024 / 1024).toFixed(2)} MB
                                </Typography>
                            </Box>

                            <CheckCircleRounded
                                sx={{ color: "#1e8e3e", fontSize: 20 }}
                            />
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(f.id);
                                }}
                                sx={{ color: "#5f6368" }}
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
