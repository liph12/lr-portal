import { ReactNode, useMemo, useState } from "react";
import { Container, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import useSaleSteps from "../../../../hooks/useSaleSteps";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import RecordSaleStepperLayout from "../../../../components/layouts/RecordSaleStepperLayout";
import ClientForm from "../../../../components/utils/forms/ClientForm";
import RentalSaleForm from "../../../../components/utils/forms/RentalSaleForm";
import SaleSlipsForm from "../../../../components/utils/forms/SaleSlipsForm";
import { PropertyTypeOption, RentalSaleFormData } from "../../../../types/app-data-types";
import { FormErrors } from "../../../../types";
import { useSlipSaleSteps } from "../../../../app-data";
import { MEASUREMENT_KEYS, missingMeasurements, showsFloorArea, showsLotArea, showsUnitType } from "../../../../helpers/projectSaleFields";

interface RentalProps {
    propertyTypes: PropertyTypeOption[];
    maxFileKb: number;
}

// Which step owns each server-side field, so a failed submit lands on the step to fix.
const STEP_FIELDS: string[][] = [
    ["client_firstname", "client_middlename", "client_lastname", "client_email", "client_mobile", "client_birthdate", "client_gender", "client_country", "client_address"],
    ["unit_no", "property_type", "project_property_type_id", "unit_type", "floor_area", "lot_area", "rental_rate", "total_contract_price", "reservation_date", "payment_terms", "remarks", "commission_status", "closing_agent_id", "partner_agent_id"],
    ["remittance_slip", "deposit_slip"],
];

const REQUIRED: Record<number, [keyof RentalSaleFormData, string][]> = {
    0: [
        ["client_firstname", "Enter the client's first name."],
        ["client_lastname", "Enter the client's last name."],
        ["client_mobile", "Enter the client's mobile number."],
        ["client_country", "Select the client's country."],
    ],
    1: [
        ["unit_no", "Enter the unit number or property address."],
        ["property_type", "Select a property type."],
        ["rental_rate", "Enter the monthly rental rate."],
        ["total_contract_price", "Enter the total contract price."],
        ["reservation_date", "Enter the reservation date."],
        ["payment_terms", "Select the lease term."],
        ["commission_status", "Select the commission status."],
    ],
    2: [["remittance_slip", "Upload the remittance slip."]],
};

const AMOUNTS: (keyof RentalSaleFormData)[] = ["rental_rate", "total_contract_price"];

const stepOfError = (key: string) =>
    STEP_FIELDS.findIndex((fields) => fields.some((f) => key === f || key.indexOf(`${f}.`) === 0));

const toAmount = (value: string) => value.replace(/,/g, "").trim();

function Rental({ propertyTypes, maxFileKb }: RentalProps) {
    const [compressing, setCompressing] = useState({ remittance_slip: false, deposit_slip: false });
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
        unit_type: { id: 1, label: "Studio" },
        floor_area: "",
        lot_area: "",
        rental_rate: "",
        total_contract_price: "",
        reservation_date: "",
        payment_terms: { id: 12, label: "12 Months" },
        commission_status: { id: 1, label: "Unclaimed" },
        closing_agent: null,
        partner_agent: null,
        remarks: "",
        deposit_slip: null,
        remittance_slip: null,
    });
    const errors = form.errors as FormErrors;

    const setField = <K extends keyof RentalSaleFormData>(key: K, value: RentalSaleFormData[K]) => {
        form.setData((prev) => ({ ...prev, [key]: value }));
        if (errors[key as string]) form.clearErrors(key);
        if (key === "closing_agent" || key === "partner_agent") form.clearErrors(`${key}_id` as keyof RentalSaleFormData);
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

        missing.forEach(([key, message]) => form.setError(key, message));

        return missing.length === 0;
    };

    const { activeStep, setActiveStep, next, back, jumpTo, validateAll } = useSaleSteps(useSlipSaleSteps.length, validateStep);
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
            unit_no: d.unit_no,
            project_property_type_id: d.property_type?.id ?? "",
            unit_type: showsUnitType(d.property_type) ? (d.unit_type?.label ?? "") : "",
            floor_area: showsFloorArea(d.property_type) ? toAmount(d.floor_area) : "",
            lot_area: showsLotArea(d.property_type) ? toAmount(d.lot_area) : "",
            rental_rate: toAmount(d.rental_rate),
            total_contract_price: toAmount(d.total_contract_price),
            reservation_date: d.reservation_date,
            payment_terms: d.payment_terms?.label ?? "",
            commission_status: d.commission_status?.label ?? "",
            closing_agent_id: d.closing_agent?.id ?? "",
            partner_agent_id: d.partner_agent?.id ?? "",
            remarks: d.remarks,
            remittance_slip: d.remittance_slip,
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
            <RecordSaleStepperLayout
                steps={useSlipSaleSteps}
                activeStep={activeStep}
                onBack={back}
                onNext={next}
                onStepClick={jumpTo}
                errorSteps={errorSteps}
                onSubmit={handleSubmit}
                processing={form.processing}
                busy={compressing.remittance_slip || compressing.deposit_slip}
                uploadPercentage={form.progress?.percentage}
            >
                {activeStep === 0 && <ClientForm data={form.data} setData={setField} errors={errors} />}
                {activeStep === 1 && (
                    <RentalSaleForm data={form.data} setData={setField} errors={errors} propertyTypes={propertyTypeOptions} />
                )}
                {activeStep === 2 && (
                    <SaleSlipsForm
                        remittanceSlip={form.data.remittance_slip}
                        depositSlip={form.data.deposit_slip}
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
