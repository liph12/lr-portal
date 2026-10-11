import { ChangeEvent, useMemo } from "react";
import { Grid, FormHelperText, Link as MuiLink } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import { DeveloperProjectOption, ProjectFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { commissionStatus } from "../../../app-data";
import { makePaymentTerms } from "../../../helpers/projectSaleFields";
import PropertyMeasurementFields from "./PropertyMeasurementFields";

interface ProjectSaleFormProps extends SaleStepProps<ProjectFields> {
    developers: AutoCompleteValue[];
    projects: DeveloperProjectOption[];
    propertyTypes: AutoCompleteValue[];
}

const PAYMENT_TERMS = makePaymentTerms();

const labelSx = {
    color: "var(--lr-text-secondary)",
    fontWeight: 500,
    mb: 0.5,
    ml: 0.5,
};

function Label({ text, required }: { text: string; required?: boolean }) {
    return (
        <FormHelperText sx={labelSx}>
            {text}
            {required && <span style={{ color: "var(--lr-error)" }}> *</span>}
        </FormHelperText>
    );
}

export default function ProjectSaleForm({
    data,
    setData,
    errors,
    developers,
    projects,
    propertyTypes,
}: ProjectSaleFormProps) {
    const developerProjects = useMemo(
        () => projects.filter((p) => p.developer_id === data.developer?.id),
        [projects, data.developer?.id],
    );
    const projectOptions = useMemo(
        () => developerProjects.map((p) => ({ id: p.id, label: p.name })),
        [developerProjects],
    );
    const hasProjects = projectOptions.length > 0;

    const handleChangeDeveloper = (developer: AutoCompleteValue | null) => {
        setData("developer", developer);
        setData("project", null);
        // Developers with nothing in the catalogue go straight to typing the project name.
        setData(
            "project_not_listed",
            developer !== null && !projects.some((p) => p.developer_id === developer.id),
        );
    };

    const handleChangeProject = (project: AutoCompleteValue | null) => {
        setData("project", project);
        const typeId = developerProjects.find((p) => p.id === project?.id)?.project_property_type_id;
        const type = propertyTypes.find((t) => t.id === typeId);
        if (type) setData("property_type", type);
    };

    const toggleNotListed = () => {
        setData("project_not_listed", !data.project_not_listed);
        setData("project", null);
        setData("project_name", "");
    };

    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof ProjectFields, e.target.value as never);

    const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Developer" required />
                <StyledAutocomplete
                    options={developers}
                    value={data.developer}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            placeholder="Search developer"
                            name="developer"
                            error={errors.developer_id ?? errors.developer ?? null}
                        />
                    )}
                    onChange={(_, v) => handleChangeDeveloper(v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                {data.project_not_listed ? (
                    <>
                        <Label text="Project Name" required />
                        <StyledTextField
                            name="project_name"
                            placeholder="Type the project name"
                            value={data.project_name}
                            error={errors.project_name ?? null}
                            handleChange={handleChangeTextField}
                        />
                    </>
                ) : (
                    <>
                        <Label text="Project" required />
                        <StyledAutocomplete
                            options={projectOptions}
                            value={data.project}
                            disabled={!data.developer}
                            noOptionsText="No matching project"
                            renderInput={(params) => (
                                <StyledTextField
                                    params={params}
                                    placeholder={data.developer ? "Search project" : "Select a developer first"}
                                    name="project"
                                    error={errors.developer_project_id ?? errors.project ?? null}
                                />
                            )}
                            onChange={(_, v) => handleChangeProject(v)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </>
                )}
                {data.developer && (
                    <FormHelperText sx={{ ml: 0.5 }}>
                        {!hasProjects && data.project_not_listed
                            ? "No projects on file for this developer."
                            : null}
                        {hasProjects && (
                            <MuiLink
                                component="button"
                                type="button"
                                onClick={toggleNotListed}
                                sx={{ fontSize: 12, color: "var(--lr-primary)", verticalAlign: "baseline" }}
                            >
                                {data.project_not_listed ? "Choose from the project list" : "Project not listed?"}
                            </MuiLink>
                        )}
                    </FormHelperText>
                )}
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Unit No. / Block and Lot No." required />
                <StyledTextField
                    name="unit_no"
                    value={data.unit_no}
                    error={errors.unit_no ?? null}
                    handleChange={handleChangeTextField}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Property Type" required />
                <StyledAutocomplete
                    options={propertyTypes}
                    value={data.property_type}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="property_type"
                            placeholder="Select property type"
                            error={errors.project_property_type_id ?? errors.property_type ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("property_type", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            <PropertyMeasurementFields data={data} setData={setData} errors={errors} />

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Total Contract Price" required />
                <StyledTextField
                    name="total_contract_price"
                    placeholder="0.00"
                    value={data.total_contract_price}
                    error={errors.total_contract_price ?? null}
                    handleChange={handleChangeTextField}
                    {...decimalProps}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Reservation Date" required />
                <StyledTextField
                    type="date"
                    name="reservation_date"
                    value={data.reservation_date}
                    error={errors.reservation_date ?? null}
                    handleChange={handleChangeTextField}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Payment Terms" required />
                <StyledAutocomplete
                    options={PAYMENT_TERMS}
                    value={data.payment_terms}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="payment_terms"
                            error={errors.payment_terms ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("payment_terms", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Commission Status" required />
                <StyledAutocomplete
                    options={commissionStatus}
                    value={data.commission_status}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="commission_status"
                            error={errors.commission_status ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("commission_status", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                <Label text="Remarks / Notes" />
                <StyledTextField
                    name="remarks"
                    value={data.remarks}
                    error={errors.remarks ?? null}
                    handleChange={handleChangeTextField}
                    props={{ multiline: true, rows: 2 }}
                />
            </Grid>
        </Grid>
    );
}
