import { ReactNode, useMemo, useState } from "react";
import { Container, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import useSaleSteps from "../../../../hooks/useSaleSteps";
import SalesEncodingNotice from "../../../../components/utils/SalesEncodingNotice";
import { closedMessage } from "../../../../helpers/salesCutoff";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import RecordSaleStepperLayout from "../../../../components/layouts/RecordSaleStepperLayout";
import ClientForm from "../../../../components/utils/forms/ClientForm";
import InternationalSaleForm from "../../../../components/utils/forms/InternationalSaleForm";
import UploadPOTForm from "../../../../components/utils/forms/UploadPOTForm";
import { InternationalSaleFormData, PropertyTypeOption, SalesCutoffTimes, SalesEncodingState } from "../../../../types/app-data-types";
import { FormErrors } from "../../../../types";
import { useRecordSaleSteps } from "../../../../app-data";
import { MEASUREMENT_KEYS, missingMeasurements, showsFloorArea, showsLotArea, showsUnitType } from "../../../../helpers/projectSaleFields";

interface InternationalProps {
    encoding: SalesEncodingState;
    cutoffs: SalesCutoffTimes;
    propertyTypes: PropertyTypeOption[];
    maxFileKb: number;
}

// Which step owns each server-side field, so a failed submit lands on the step to fix.
const STEP_FIELDS: string[][] = [
    ["client_firstname", "client_middlename", "client_lastname", "client_email", "client_mobile", "client_birthdate", "client_age", "client_gender", "client_country", "client_address"],
    ["unit_no", "unit_quantity", "property_type", "project_property_type_id", "unit_type", "floor_area", "lot_area", "total_contract_price", "reservation_date", "remarks"],
    ["proof_of_transaction"],
];

const REQUIRED: Record<number, [keyof InternationalSaleFormData, string][]> = {
    0: [
        ["client_firstname", "Enter the client's first name."],
        ["client_lastname", "Enter the client's last name."],
        ["client_mobile", "Enter the client's mobile number."],
        ["client_country", "Select the client's country."],
    ],
    1: [
        ["unit_no", "Enter the unit number or property."],
        ["unit_quantity", "Enter the number of units."],
        ["property_type", "Select a property type."],
        ["total_contract_price", "Enter the total contract price."],
        ["reservation_date", "Enter the reservation date."],
    ],
    2: [["proof_of_transaction", "Upload the proof of transaction."]],
};

const AMOUNTS: (keyof InternationalSaleFormData)[] = ["unit_quantity", "total_contract_price"];

const stepOfError = (key: string) =>
    STEP_FIELDS.findIndex((fields) => fields.some((f) => key === f || key.indexOf(`${f}.`) === 0));

const toAmount = (value: string) => value.replace(/,/g, "").trim();

function International({ propertyTypes, maxFileKb, encoding, cutoffs }: InternationalProps) {
    const [compressing, setCompressing] = useState(false);
    const propertyTypeOptions = useMemo(() => propertyTypes.map((t) => ({ id: t.id, label: t.name })), [propertyTypes]);

    const form = useForm<InternationalSaleFormData>({
        client_firstname: "",
        client_middlename: "",
        client_lastname: "",
        client_email: "",
        client_mobile: "",
        client_birthdate: "",
        client_gender: null,
        client_country: { id: "PH", label: "Philippines" },
        client_address: "",
        client_age: "",
        unit_no: "",
        unit_quantity: "1",
        property_type: null,
        unit_type: { id: 1, label: "Studio" },
        floor_area: "",
        lot_area: "",
        total_contract_price: "",
        reservation_date: "",
        remarks: "",
        proof_of_transaction: null,
    });
    const errors = form.errors as FormErrors;

    const setField = <K extends keyof InternationalSaleFormData>(key: K, value: InternationalSaleFormData[K]) => {
        form.setData((prev) => ({ ...prev, [key]: value }));
        if (errors[key as string]) form.clearErrors(key);
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

        const closed = step === 1 && form.data.reservation_date ? closedMessage(form.data.reservation_date, cutoffs) : null;
        if (closed) missing.push(["reservation_date", closed]);

        missing.forEach(([key, message]) => form.setError(key, message));

        return missing.length === 0;
    };

    const { activeStep, setActiveStep, next, back, jumpTo, validateAll } = useSaleSteps(useRecordSaleSteps.length, validateStep);
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
            client_age: d.client_age ?? "",
            unit_no: d.unit_no,
            unit_quantity: toAmount(d.unit_quantity),
            project_property_type_id: d.property_type?.id ?? "",
            unit_type: showsUnitType(d.property_type) ? (d.unit_type?.label ?? "") : "",
            floor_area: showsFloorArea(d.property_type) ? toAmount(d.floor_area) : "",
            lot_area: showsLotArea(d.property_type) ? toAmount(d.lot_area) : "",
            total_contract_price: toAmount(d.total_contract_price),
            reservation_date: d.reservation_date,
            remarks: d.remarks,
            proof_of_transaction: d.proof_of_transaction,
        }));

        form.post("/dashboard/record-sale/international", {
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
                Record International Sale
            </Typography>
            <SalesEncodingNotice encoding={encoding} error={errors.sales_encoding ?? null} />
            <RecordSaleStepperLayout
                steps={useRecordSaleSteps}
                activeStep={activeStep}
                onBack={back}
                onNext={next}
                onStepClick={jumpTo}
                errorSteps={errorSteps}
                onSubmit={handleSubmit}
                processing={form.processing}
                busy={compressing}
                uploadPercentage={form.progress?.percentage}
                submitDisabled={!encoding.enabled}
            >
                {activeStep === 0 && <ClientForm data={form.data} setData={setField} errors={errors} withAge />}
                {activeStep === 1 && (
                    <InternationalSaleForm data={form.data} setData={setField} errors={errors} propertyTypes={propertyTypeOptions} />
                )}
                {activeStep === 2 && (
                    <UploadPOTForm
                        value={form.data.proof_of_transaction}
                        onChange={(file) => setField("proof_of_transaction", file)}
                        error={errors.proof_of_transaction ?? null}
                        maxFileKb={maxFileKb}
                        onCompressingChange={setCompressing}
                    />
                )}
            </RecordSaleStepperLayout>
        </Container>
    );
}

International.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default International;
