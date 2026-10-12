import { Box, Typography } from "@mui/material";
import FileLink from "./FileLink";
import { SaleDetail } from "./SaleDetailsForm";
import { isImageFile } from "../documentation/documentLabels";
import { isSlipSale } from "../../helpers/commissionSlip";

const str = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : String(v));

// A sale's files: the proof of transaction (project); the remittance and deposit slips (legacy rental and brokerage); or for
// sales encoded from a commission slip (brokerage, rental), the generated slip, proof of transaction, contract, deposit slip.
// Photos show inline (click for full size); PDFs and Word files open in a new tab.
export default function SaleFiles({ detail }: { detail: SaleDetail }) {
    const p = detail.property;
    const files =
        detail.category === "project"
            ? [{ label: "Proof of transaction", url: str(p.proof_of_transaction) }]
            : isSlipSale(detail)
              ? [
                    { label: detail.category === "rental" ? "Rent commission slip (generated)" : "Commission slip (generated)", url: str(p.remittance_slip) },
                    { label: "Proof of transaction", url: str(p.proof_of_transaction) },
                    { label: "Contract", url: str(p.contract) },
                    { label: "Deposit slip", url: str(p.deposit_slip) },
                ]
              : [
                    { label: "Remittance slip", url: str(p.remittance_slip) },
                    { label: "Deposit slip", url: str(p.deposit_slip) },
                ];

    return (
        <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--lr-text-secondary)", mb: 1.5 }}>Files</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: files.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr" }, gap: 1.5 }}>
                {files.map((f) =>
                    f.url && isImageFile(f.url) ? (
                        <Box
                            key={f.label}
                            component="a"
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: "block", border: "1px solid var(--lr-border)", borderRadius: 3, overflow: "hidden", backgroundColor: "var(--lr-surface-dim)", textDecoration: "none" }}
                        >
                            <Box component="img" src={f.url} alt={f.label} loading="lazy" sx={{ width: "100%", height: 260, objectFit: "contain", display: "block" }} />
                            <Typography variant="caption" component="div" sx={{ p: 1, color: "var(--lr-primary)", fontWeight: 500 }}>
                                {f.label} · open full size
                            </Typography>
                        </Box>
                    ) : (
                        <Box key={f.label} sx={{ p: 1.5, border: "1px solid var(--lr-border)", borderRadius: 3, display: "flex", alignItems: "center", gap: 1 }}>
                            <FileLink url={f.url} label={f.label} />
                        </Box>
                    ),
                )}
            </Box>
        </Box>
    );
}
