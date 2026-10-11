import { ChangeEvent } from "react";
import { Grid, FormHelperText } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import { ClientFields } from "../../../types/app-data-types";
import { SaleStepProps } from "../../../types";
import { countries } from "../../../app-data";

const labelSx = {
    color: "var(--lr-text-secondary)",
    fontWeight: 500,
    mb: 0.5,
    ml: 0.5,
};

const GENDERS = [
    { id: 1, label: "Male" },
    { id: 2, label: "Female" },
];

const TEXT_FIELDS: {
    name: keyof ClientFields;
    label: string;
    type?: string;
    required?: boolean;
}[] = [
    { name: "client_firstname", label: "Client First Name", required: true },
    { name: "client_middlename", label: "Client Middle Name" },
    { name: "client_lastname", label: "Client Last Name", required: true },
    { name: "client_email", label: "Client Email", type: "email" },
    { name: "client_mobile", label: "Client Mobile", type: "tel", required: true },
    { name: "client_birthdate", label: "Client Birthdate", type: "date" },
];

function Label({ text, required }: { text: string; required?: boolean }) {
    return (
        <FormHelperText sx={labelSx}>
            {text}
            {required && <span style={{ color: "var(--lr-error)" }}> *</span>}
        </FormHelperText>
    );
}

interface ClientFormProps extends SaleStepProps<ClientFields> {
    // International sales also record the client's age.
    withAge?: boolean;
}

export default function ClientForm({ data, setData, errors, withAge = false }: ClientFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof ClientFields, e.target.value as never);

    return (
        <Grid container spacing={2}>
            {TEXT_FIELDS.map((field) => (
                <Grid key={field.name} size={{ lg: 3, md: 6, xs: 12 }}>
                    <Label text={field.label} required={field.required} />
                    <StyledTextField
                        type={field.type}
                        name={field.name}
                        value={data[field.name] as string}
                        error={errors[field.name] ?? null}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
            ))}

            {withAge && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <Label text="Client Age" />
                    <StyledTextField
                        name="client_age"
                        value={data.client_age ?? ""}
                        error={errors.client_age ?? null}
                        handleChange={handleChangeTextField}
                        props={{ slotProps: { htmlInput: { inputMode: "numeric" } } }}
                    />
                </Grid>
            )}

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Client Gender" />
                <StyledAutocomplete
                    options={GENDERS}
                    value={data.client_gender}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="client_gender"
                            error={errors.client_gender ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("client_gender", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Client Country" required />
                <StyledAutocomplete
                    options={countries}
                    value={data.client_country}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="client_country"
                            error={errors.client_country ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("client_country", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                <Label text="Client Address" />
                <StyledTextField
                    name="client_address"
                    value={data.client_address}
                    error={errors.client_address ?? null}
                    handleChange={handleChangeTextField}
                    props={{ multiline: true, rows: 3 }}
                />
            </Grid>
        </Grid>
    );
}
