import { ReactNode, useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import useSaleSteps from "../../../../hooks/useSaleSteps";
import SalesEncodingNotice from "../../../../components/utils/SalesEncodingNotice";
import { closedMessage } from "../../../../helpers/salesCutoff";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import RecordSaleStepperLayout from "../../../../components/layouts/RecordSaleStepperLayout";
import ClientForm from "../../../../components/utils/forms/ClientForm";
import RentalSaleForm from "../../../../components/utils/forms/RentalSaleForm";
import SaleDocumentsForm, { SaleDocument } from "../../../../components/utils/forms/SaleDocumentsForm";
import CommissionSlipPreview from "../../../../components/sales/CommissionSlipPreview";
import { PropertyTypeOption, RentalSaleFormData, SalesCutoffTimes, SalesEncodingState } from "../../../../types/app-data-types";
import { FormErrors } from "../../../../types";
import { useCommissionSaleSteps } from "../../../../app-data";

interface RentalProps {
    encoding: SalesEncodingState;
    cutoffs: SalesCutoffTimes;
    propertyTypes: PropertyTypeOption[];
    maxFileKb: number;
    commissionRate: number;
    shareRate: number;
    durationUnits: string[];
}

// Which step owns each server-side field, so a failed submit lands on the step to fix.
const STEP_FIELDS: string[][] = [
    ["client_firstname", "client_middlename", "client_lastname", "client_email", "client_mobile", "client_birthdate", "client_gender", "client_country", "client_address"],
    [
        "unit_no", "property_type", "project_property_type_id", "property_size", "rental_rate", "duration_value", "duration_unit", "payment_terms", "remittance_date", "reservation_date",
        "commission_received", "commission_status", "closing_agent", "closing_agent_id", "unregistered_agent_name", "unregistered_agent_email", "unregistered_agent_mobile", "partner_agent_id", "remarks",
    ],
    ["contract", "proof_of_transaction", "deposit_slip"],
];

const REQUIRED: Record<number, [keyof RentalSaleFormData, string][]> = {
    0: [
        ["client_firstname", "Enter the client's first name."],
        ["client_lastname", "Enter the client's last name."],
        ["client_mobile", "Enter the client's mobile number."],
        ["client_country", "Select the client's country."],
    ],
    1: [
        ["unit_no", "Enter the unit address."],
        ["property_type", "Select a property type."],
        ["property_size", "Enter the size of the property."],
        ["rental_rate", "Enter the rate of rental."],
        ["duration_value", "Enter the duration."],
        ["remittance_date", "Enter the remittance date."],
        ["commission_received", "Enter the amount received."],
        ["commission_status", "Select the commission status."],
    ],
    2: [
        ["contract", "Upload the contract."],
        ["proof_of_transaction", "Upload the proof of transaction."],
    ],
};

const AMOUNTS: (keyof RentalSaleFormData)[] = ["property_size", "rental_rate", "duration_value", "commission_received"];

const stepOfError = (key: string) => STEP_FIELDS.findIndex((fields) => fields.some((f) => key === f || key.indexOf(`${f}.`) === 0));

const toAmount = (value: string) => value.replace(/,/g, "").trim();

function Rental({ propertyTypes, maxFileKb, encoding, cutoffs, commissionRate, shareRate, durationUnits }: RentalProps) {
    const [compressing, setCompressing] = useState<Record<SaleDocument, boolean>>({ contract: false, proof_of_transaction: false, deposit_slip: false });
    const propertyTypeOptions = useMemo(() => propertyTypes.map((t) => ({ id: t.id, label: t.name })), [propertyTypes]);

    const form = useForm<RentalSaleFormData>({
        client_firstname: "",
        client_middlename: "",
        client_lastname: "",
        client_email: "",
        client_mobile: "",
        client_birthdate: "",
        client_gender: null,
        client_country: { id: "PH", label: "Philippines" },
        client_address: "",
        unit_no: "",
        property_type: null,
        property_size: "",
        rental_rate: "",
        duration_value: "",
        duration_unit: durationUnits[1] ?? "months",
        remittance_date: "",
        commission_received: "",
        commission_status: { id: 1, label: "Unclaimed" },
        closing_agent: null,
        unregistered: false,
        unregistered_agent_name: "",
        unregistered_agent_email: "",
        unregistered_agent_mobile: "",
        partner_agent: null,
        remarks: "",
        contract: null,
        proof_of_transaction: null,
        deposit_slip: null,
    });
    const errors = form.errors as FormErrors;

    const setField = <K extends keyof RentalSaleFormData>(key: K, value: RentalSaleFormData[K]) => {
        form.setData((prev) => ({ ...prev, [key]: value }));
        if (errors[key as string]) form.clearErrors(key);
        // Pickers report their errors under the id the server checks.
        const idKey = ({ property_type: "project_property_type_id", closing_agent: "closing_agent_id", partner_agent: "partner_agent_id" } as Record<string, string>)[key as string];
        if (idKey) form.clearErrors(idKey as keyof RentalSaleFormData);
    };

    const validateStep = (step: number) => {
        form.clearErrors(...(REQUIRED[step] ?? []).map(([key]) => key), ...(step === 1 ? (["closing_agent", "unregistered_agent_name", "unregistered_agent_email"] as const) : []));

        const missing = (REQUIRED[step] ?? []).filter(([key]) => {
            const value = form.data[key];
            if (AMOUNTS.indexOf(key) !== -1) return !(Number(toAmount(value as string)) > 0);
            return value === null || value === "";
        });

        // The closing agent: picked, or (not yet in LR) their name and email.
        if (step === 1) {
            const d = form.data;
            if (!d.unregistered && !d.closing_agent) missing.push(["closing_agent", "Select the closing agent."]);
            if (d.unregistered && !d.unregistered_agent_name.trim()) missing.push(["unregistered_agent_name", "Enter the closing agent's name."]);
            if (d.unregistered && !d.unregistered_agent_email.trim()) missing.push(["unregistered_agent_email", "Enter their email — it links the sale once they sign up."]);
        }

        // The remittance date is the sale's date for the monthly cutoff.
        const closed = step === 1 && form.data.remittance_date ? closedMessage(form.data.remittance_date, cutoffs) : null;
        if (closed) missing.push(["remittance_date", closed]);

        missing.forEach(([key, message]) => form.setError(key, message));

        return missing.length === 0;
    };

    const { activeStep, setActiveStep, next, back, jumpTo, validateAll } = useSaleSteps(useCommissionSaleSteps.length, validateStep);
    const errorSteps = Object.keys(errors).map(stepOfError).filter((s, i, all) => s >= 0 && all.indexOf(s) === i);

    // What the rent commission slip prints, for its preview (the same keys the server takes on save).
    const slipFields = {
        client_firstname: form.data.client_firstname,
        client_middlename: form.data.client_middlename,
        client_lastname: form.data.client_lastname,
        unit_no: form.data.unit_no,
        project_property_type_id: form.data.property_type?.id,
        property_size: toAmount(form.data.property_size),
        rental_rate: toAmount(form.data.rental_rate),
        duration_value: toAmount(form.data.duration_value),
        duration_unit: form.data.duration_unit,
        remittance_date: form.data.remittance_date,
        commission_received: toAmount(form.data.commission_received),
        closing_agent_id: form.data.unregistered ? undefined : form.data.closing_agent?.id,
        unregistered_agent_name: form.data.unregistered ? form.data.unregistered_agent_name : undefined,
        partner_agent_id: form.data.partner_agent?.id,
    };

    const handleSubmit = () => {
        if (!validateAll()) return;

        form.transform((d) => ({
            client_firstname: d.client_firstname,
            client_middlename: d.client_middlename,
            client_lastname: d.client_lastname,
            client_email: d.client_email,
            client_mobile: d.client_mobile,
            client_birthdate: d.client_birthdate,
            client_gender: d.client_gender?.label ?? "",
            client_country: String(d.client_country?.id ?? ""),
            client_address: d.client_address,
            unit_no: d.unit_no,
            project_property_type_id: d.property_type?.id ?? "",
            property_size: toAmount(d.property_size),
            rental_rate: toAmount(d.rental_rate),
            duration_value: toAmount(d.duration_value),
            duration_unit: d.duration_unit,
            remittance_date: d.remittance_date,
            commission_received: toAmount(d.commission_received),
            commission_status: d.commission_status?.label ?? "",
            closing_agent_id: d.unregistered ? "" : (d.closing_agent?.id ?? ""),
            unregistered_agent_name: d.unregistered ? d.unregistered_agent_name : "",
            unregistered_agent_email: d.unregistered ? d.unregistered_agent_email : "",
            unregistered_agent_mobile: d.unregistered ? d.unregistered_agent_mobile : "",
            partner_agent_id: d.partner_agent?.id ?? "",
            remarks: d.remarks,
            contract: d.contract,
            proof_of_transaction: d.proof_of_transaction,
            deposit_slip: d.deposit_slip,
        }));

        form.post("/dashboard/record-sale/rental", {
            forceFormData: true,
            onError: (serverErrors) => {
                const steps = Object.keys(serverErrors).map(stepOfError).filter((s) => s >= 0);
                if (steps.length) setActiveStep(Math.min(...steps));
            },
        });
    };

    return (
        <Container sx={{ py: 3 }} maxWidth="lg">
            <Typography variant="h6" fontWeight="bold" textAlign="center">
                Record Rental Sale
            </Typography>
            <SalesEncodingNotice encoding={encoding} error={errors.sales_encoding ?? null} />
            <RecordSaleStepperLayout
                steps={useCommissionSaleSteps}
                activeStep={activeStep}
                onBack={back}
                onNext={next}
                onStepClick={jumpTo}
                errorSteps={errorSteps}
                onSubmit={handleSubmit}
                processing={form.processing}
                busy={compressing.contract || compressing.proof_of_transaction || compressing.deposit_slip}
                uploadPercentage={form.progress?.percentage}
                submitDisabled={!encoding.enabled}
            >
                {activeStep > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                        <CommissionSlipPreview url="/dashboard/record-sale/rental/slip-preview" fields={slipFields} />
                    </Box>
                )}
                {activeStep === 0 && <ClientForm data={form.data} setData={setField} errors={errors} />}
                {activeStep === 1 && (
                    <RentalSaleForm
                        data={form.data}
                        setData={setField}
                        errors={errors}
                        propertyTypes={propertyTypeOptions}
                        commissionRate={commissionRate}
                        shareRate={shareRate}
                        durationUnits={durationUnits}
                    />
                )}
                {activeStep === 2 && (
                    <SaleDocumentsForm
                        files={{ contract: form.data.contract, proof_of_transaction: form.data.proof_of_transaction, deposit_slip: form.data.deposit_slip }}
                        onChange={setField}
                        errors={errors}
                        maxFileKb={maxFileKb}
                        onCompressingChange={(field, value) => setCompressing((c) => (c[field] === value ? c : { ...c, [field]: value }))}
                    />
                )}
            </RecordSaleStepperLayout>
        </Container>
    );
}

Rental.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Rental;
