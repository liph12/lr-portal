import { ReactNode, useMemo, useState } from "react";
import { Container, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import RecordSaleStepperLayout from "../../../../components/layouts/RecordSaleStepperLayout";
import ClientForm from "../../../../components/utils/forms/ClientForm";
import ProjectSaleForm from "../../../../components/utils/forms/ProjectSaleForm";
import UploadPOTForm from "../../../../components/utils/forms/UploadPOTForm";
import {
    DeveloperProjectOption,
    ProjectSaleFormData,
    PropertyTypeOption,
    SalesSource,
} from "../../../../types/app-data-types";
import { FormErrors } from "../../../../types";
import { useRecordSaleSteps } from "../../../../app-data";
import { showsFloorArea, showsLotArea, showsUnitType } from "../../../../helpers/projectSaleFields";

interface ProjectProps {
    developers: SalesSource[];
    projects: DeveloperProjectOption[];
    propertyTypes: PropertyTypeOption[];
    maxFileKb: number;
}

// Which step owns each server-side field, so a failed submit lands on the step to fix.
const STEP_FIELDS: string[][] = [
    ["client_firstname", "client_middlename", "client_lastname", "client_email", "client_mobile", "client_birthdate", "client_gender", "client_country", "client_address"],
    ["developer", "developer_id", "project", "developer_project_id", "project_name", "unit_no", "property_type", "project_property_type_id", "unit_type", "floor_area", "lot_area", "total_contract_price", "reservation_date", "payment_terms", "remarks", "commission_status"],
    ["proof_of_transaction"],
];

const REQUIRED: Record<number, [keyof ProjectSaleFormData, string][]> = {
    0: [
        ["client_firstname", "Enter the client's first name."],
        ["client_lastname", "Enter the client's last name."],
        ["client_mobile", "Enter the client's mobile number."],
        ["client_country", "Select the client's country."],
    ],
    1: [
        ["developer", "Select a developer."],
        ["unit_no", "Enter the unit or block and lot number."],
        ["property_type", "Select a property type."],
        ["total_contract_price", "Enter the total contract price."],
        ["reservation_date", "Enter the reservation date."],
        ["payment_terms", "Select the payment terms."],
        ["commission_status", "Select the commission status."],
    ],
    2: [["proof_of_transaction", "Upload the proof of transaction."]],
};

const stepOfError = (key: string) =>
    STEP_FIELDS.findIndex((fields) => fields.some((f) => key === f || key.indexOf(`${f}.`) === 0));

const toAmount = (value: string) => value.replace(/,/g, "").trim();

function Project({ developers, projects, propertyTypes, maxFileKb }: ProjectProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [compressing, setCompressing] = useState(false);
    const developerOptions = useMemo(
        () => developers.map((d) => ({ id: d.id, label: d.name })),
        [developers],
    );
    const propertyTypeOptions = useMemo(
        () => propertyTypes.map((t) => ({ id: t.id, label: t.name })),
        [propertyTypes],
    );

    const form = useForm<ProjectSaleFormData>({
        client_firstname: "",
        client_middlename: "",
        client_lastname: "",
        client_email: "",
        client_mobile: "",
        client_birthdate: "",
        client_gender: null,
        client_country: { id: "PH", label: "Philippines" },
        client_address: "",
        developer: null,
        project: null,
        project_not_listed: false,
        project_name: "",
        unit_no: "",
        property_type: null,
        unit_type: { id: 1, label: "Studio" },
        floor_area: "",
        lot_area: "",
        total_contract_price: "",
        reservation_date: "",
        payment_terms: { id: 12, label: "12 Months" },
        remarks: "",
        commission_status: { id: 1, label: "Unclaimed" },
        proof_of_transaction: null,
    });
    const errors = form.errors as FormErrors;

    const setField = <K extends keyof ProjectSaleFormData>(key: K, value: ProjectSaleFormData[K]) => {
        form.setData((prev) => ({ ...prev, [key]: value }));
        if (errors[key as string]) form.clearErrors(key);
    };

    const validateStep = (step: number) => {
        const missing = (REQUIRED[step] ?? []).filter(([key]) => {
            const value = form.data[key];
            if (key === "total_contract_price") return !(Number(toAmount(value as string)) > 0);
            return value === null || value === "";
        });

        missing.forEach(([key, message]) => form.setError(key, message));

        // Either a catalogue project or, when it isn't listed, a typed name.
        let projectOk = true;
        if (step === 1 && form.data.developer) {
            if (form.data.project_not_listed && !form.data.project_name.trim()) {
                form.setError("project_name", "Enter the project name.");
                projectOk = false;
            } else if (!form.data.project_not_listed && !form.data.project) {
                form.setError("project", "Select a project.");
                projectOk = false;
            }
        }

        return missing.length === 0 && projectOk;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) setActiveStep((s) => s + 1);
    };

    const handleSubmit = () => {
        if (!validateStep(activeStep)) return;

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
            developer_id: d.developer?.id ?? "",
            developer_project_id: d.project_not_listed ? "" : (d.project?.id ?? ""),
            project_name: d.project_not_listed ? d.project_name.trim() : "",
            unit_no: d.unit_no,
            project_property_type_id: d.property_type?.id ?? "",
            unit_type: showsUnitType(d.property_type) ? (d.unit_type?.label ?? "") : "",
            floor_area: showsFloorArea(d.property_type) ? toAmount(d.floor_area) : "",
            lot_area: showsLotArea(d.property_type) ? toAmount(d.lot_area) : "",
            total_contract_price: toAmount(d.total_contract_price),
            reservation_date: d.reservation_date,
            payment_terms: d.payment_terms?.label ?? "",
            remarks: d.remarks,
            commission_status: d.commission_status?.label ?? "",
            proof_of_transaction: d.proof_of_transaction,
        }));

        form.post("/superadmin/dashboard/record-sale/project", {
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
                Record Project Sale
            </Typography>
            <RecordSaleStepperLayout
                steps={useRecordSaleSteps}
                activeStep={activeStep}
                onBack={() => setActiveStep((s) => Math.max(0, s - 1))}
                onNext={handleNext}
                onSubmit={handleSubmit}
                processing={form.processing}
                busy={compressing}
                uploadPercentage={form.progress?.percentage}
            >
                {activeStep === 0 && <ClientForm data={form.data} setData={setField} errors={errors} />}
                {activeStep === 1 && (
                    <ProjectSaleForm
                        data={form.data}
                        setData={setField}
                        errors={errors}
                        developers={developerOptions}
                        projects={projects}
                        propertyTypes={propertyTypeOptions}
                    />
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

Project.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Project;
