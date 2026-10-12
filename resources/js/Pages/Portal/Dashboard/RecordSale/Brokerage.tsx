import { ReactNode, useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import useSaleSteps from "../../../../hooks/useSaleSteps";
import SalesEncodingNotice from "../../../../components/utils/SalesEncodingNotice";
import { closedMessage } from "../../../../helpers/salesCutoff";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import RecordSaleStepperLayout from "../../../../components/layouts/RecordSaleStepperLayout";
import ClientForm from "../../../../components/utils/forms/ClientForm";
import BrokerageSaleForm from "../../../../components/utils/forms/BrokerageSaleForm";
import SaleDocumentsForm, { SaleDocument } from "../../../../components/utils/forms/SaleDocumentsForm";
import CommissionSlipPreview from "../../../../components/sales/CommissionSlipPreview";
import { BrokerageSaleFormData, PropertyTypeOption, SalesSource, SalesCutoffTimes, SalesEncodingState } from "../../../../types/app-data-types";
import { FormErrors } from "../../../../types";
import { useCommissionSaleSteps } from "../../../../app-data";
import { MEASUREMENT_KEYS, missingMeasurements, showsFloorArea, showsLotArea, showsUnitType } from "../../../../helpers/projectSaleFields";

interface BrokerageProps {
    encoding: SalesEncodingState;
    cutoffs: SalesCutoffTimes;
    brokerageAreas: SalesSource[];
    propertyTypes: PropertyTypeOption[];
    maxFileKb: number;
    brokers: { id: number; name: string }[];
    companyShareRates: number[];
    commissionRate: number;
}

// Which step owns each server-side field, so a failed submit lands on the step to fix.
const STEP_FIELDS: string[][] = [
    ["client_firstname", "client_middlename", "client_lastname", "client_email", "client_mobile", "client_birthdate", "client_gender", "client_country", "client_address"],
    [
        "brokerage_area", "brokerage_area_id", "unit_no", "property_type", "project_property_type_id", "unit_type", "floor_area", "lot_area", "remittance_date", "reservation_date",
        "commission_received", "company_share_rate", "closing_agent_id", "partner_agent_id", "signing_broker", "signing_broker_id", "property_owner", "payment_terms", "remarks", "commission_status",
    ],
    ["contract", "proof_of_transaction", "deposit_slip"],
];

const REQUIRED: Record<number, [keyof BrokerageSaleFormData, string][]> = {
    0: [
        ["client_firstname", "Enter the client's first name."],
        ["client_lastname", "Enter the client's last name."],
        ["client_mobile", "Enter the client's mobile number."],
        ["client_country", "Select the client's country."],
    ],
    1: [
        ["brokerage_area", "Select a brokerage area."],
        ["unit_no", "Enter the unit or block and lot number."],
        ["property_type", "Select a property type."],
        ["remittance_date", "Enter the remittance date."],
        ["commission_received", "Enter the amount of commission received."],
        ["signing_broker", "Select the signing broker."],
        ["property_owner", "Enter the property owner's name."],
        ["payment_terms", "Select the payment terms."],
        ["commission_status", "Select the commission status."],
    ],
    2: [
        ["contract", "Upload the contract."],
        ["proof_of_transaction", "Upload the proof of transaction."],
    ],
};

const AMOUNTS: (keyof BrokerageSaleFormData)[] = ["commission_received"];

const stepOfError = (key: string) =>
    STEP_FIELDS.findIndex((fields) => fields.some((f) => key === f || key.indexOf(`${f}.`) === 0));

const toAmount = (value: string) => value.replace(/,/g, "").trim();

function Brokerage({ brokerageAreas, propertyTypes, maxFileKb, encoding, cutoffs, brokers, companyShareRates, commissionRate }: BrokerageProps) {
    const [compressing, setCompressing] = useState<Record<SaleDocument, boolean>>({ contract: false, proof_of_transaction: false, deposit_slip: false });
    const brokerOptions = useMemo(() => brokers.map((b) => ({ id: b.id, label: b.name })), [brokers]);
    const propertyTypeOptions = useMemo(() => propertyTypes.map((t) => ({ id: t.id, label: t.name })), [propertyTypes]);
    const brokerageAreaOptions = useMemo(() => brokerageAreas.map((a) => ({ id: a.id, label: a.name })), [brokerageAreas]);

    const form = useForm<BrokerageSaleFormData>({
        client_firstname: "",
        client_middlename: "",
        client_lastname: "",
        client_email: "",
        client_mobile: "",
        client_birthdate: "",
        client_gender: null,
        client_country: { id: "PH", label: "Philippines" },
        client_address: "",
        brokerage_area: null,
        unit_no: "",
        property_type: null,
        unit_type: { id: 1, label: "Studio" },
        floor_area: "",
        lot_area: "",
        remittance_date: "",
        commission_received: "",
        company_share_rate: companyShareRates[0] ?? 15,
        closing_agent: null,
        partner_agent: null,
        signing_broker: null,
        property_owner: "",
        payment_terms: { id: 12, label: "12 Months" },
        commission_status: { id: 1, label: "Unclaimed" },
        remarks: "",
        contract: null,
        proof_of_transaction: null,
        deposit_slip: null,
    });
    const errors = form.errors as FormErrors;

    const setField = <K extends keyof BrokerageSaleFormData>(key: K, value: BrokerageSaleFormData[K]) => {
        form.setData((prev) => ({ ...prev, [key]: value }));
        if (errors[key as string]) form.clearErrors(key);
        // Pickers report their errors under the id the server checks.
        const idKey = ({ brokerage_area: "brokerage_area_id", signing_broker: "signing_broker_id", closing_agent: "closing_agent_id", partner_agent: "partner_agent_id" } as Record<string, string>)[key as string];
        if (idKey) form.clearErrors(idKey as keyof BrokerageSaleFormData);
    };

    const validateStep = (step: number) => {
        // Re-check from scratch so warnings that no longer apply (e.g. a field the property type dropped) go away.
        form.clearErrors(...(REQUIRED[step] ?? []).map(([key]) => key), ...(step === 1 ? [...MEASUREMENT_KEYS] : []));

        const missing = (REQUIRED[step] ?? []).filter(([key]) => {
            const value = form.data[key];
            if (AMOUNTS.indexOf(key) !== -1) return !(Number(toAmount(value as string)) > 0);
            return value === null || value === "";
        });

        if (step === 1) missing.push(...missingMeasurements(form.data));

        // The remittance date is the sale's date for the monthly cutoff.
        const closed = step === 1 && form.data.remittance_date ? closedMessage(form.data.remittance_date, cutoffs) : null;
        if (closed) missing.push(["remittance_date", closed]);

        missing.forEach(([key, message]) => form.setError(key, message));

        return missing.length === 0;
    };

    // What the commission slip prints, for its preview (the same keys the server takes on save).
    const slipFields = {
        client_firstname: form.data.client_firstname,
        client_middlename: form.data.client_middlename,
        client_lastname: form.data.client_lastname,
        brokerage_area_id: form.data.brokerage_area?.id,
        project_property_type_id: form.data.property_type?.id,
        remittance_date: form.data.remittance_date,
        commission_received: toAmount(form.data.commission_received),
        company_share_rate: form.data.company_share_rate,
        closing_agent_id: form.data.closing_agent?.id,
        partner_agent_id: form.data.partner_agent?.id,
        signing_broker_id: form.data.signing_broker?.id,
        property_owner: form.data.property_owner,
    };

    const { activeStep, setActiveStep, next, back, jumpTo, validateAll } = useSaleSteps(useCommissionSaleSteps.length, validateStep);
    const errorSteps = Object.keys(errors).map(stepOfError).filter((s, i, all) => s >= 0 && all.indexOf(s) === i);

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
            brokerage_area_id: d.brokerage_area?.id ?? "",
            unit_no: d.unit_no,
            project_property_type_id: d.property_type?.id ?? "",
            unit_type: showsUnitType(d.property_type) ? (d.unit_type?.label ?? "") : "",
            floor_area: showsFloorArea(d.property_type) ? toAmount(d.floor_area) : "",
            lot_area: showsLotArea(d.property_type) ? toAmount(d.lot_area) : "",
            remittance_date: d.remittance_date,
            commission_received: toAmount(d.commission_received),
            company_share_rate: d.company_share_rate,
            closing_agent_id: d.closing_agent?.id ?? "",
            partner_agent_id: d.partner_agent?.id ?? "",
            signing_broker_id: d.signing_broker?.id ?? "",
            property_owner: d.property_owner,
            payment_terms: d.payment_terms?.label ?? "",
            commission_status: d.commission_status?.label ?? "",
            remarks: d.remarks,
            contract: d.contract,
            proof_of_transaction: d.proof_of_transaction,
            deposit_slip: d.deposit_slip,
        }));

        form.post("/dashboard/record-sale/brokerage", {
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
                Record Brokerage Sale
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
                {activeStep === 0 && <ClientForm data={form.data} setData={setField} errors={errors} />}
                {activeStep > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                        <CommissionSlipPreview url="/dashboard/record-sale/brokerage/slip-preview" fields={slipFields} />
                    </Box>
                )}
                {activeStep === 1 && (
                    <BrokerageSaleForm
                        data={form.data}
                        setData={setField}
                        errors={errors}
                        brokerageAreas={brokerageAreaOptions}
                        propertyTypes={propertyTypeOptions}
                        brokers={brokerOptions}
                        commissionRate={commissionRate}
                        companyShareRates={companyShareRates}
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

Brokerage.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Brokerage;
