import StyledTextField from "../StyledTextField";
import { Grid, FormHelperText } from "@mui/material";
import { ClientForm as ClientFormTypes } from "../../../types/app-data-types";
import { AutoCompleteValue, CreateSaleHandler } from "../../../types";
import StyledAutocomplete from "../StyledAutocomplete";
import { countries } from "../../../app-data";
import { useForm } from "@inertiajs/react";

const labelSx = {
    color: "#5f6368",
    fontWeight: 500,
    mb: 0.5,
    ml: 0.5,
};

// Plain text fields that share the same change handler
const TEXT_FIELDS: {
    name: keyof ClientFormTypes;
    label: string;
    type?: string;
    size?: number;
}[] = [
    { name: "client_firstname", label: "Client Firstname" },
    { name: "client_middlename", label: "Client Middlename" },
    { name: "client_lastname", label: "Client Lastname" },
    { name: "client_email", label: "Client Email" },
    { name: "client_mobile", label: "Client Mobile" },
    { name: "client_birthdate", label: "Client Birthdate", type: "date" },
];

export default function ClientForm({ salesSources }: CreateSaleHandler) {
    const { data, setData } = useForm<ClientFormTypes>({
        client_firstname: "",
        client_middlename: "",
        client_lastname: "",
        client_email: "",
        client_mobile: "",
        client_birthdate: "",
        client_gender: {
            id: 1,
            label: "Male",
        },
        client_country: {
            id: "PH",
            label: "Philippines",
        },
        client_address: "",
    });

    const handleChangeTextField = (e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.target.name as keyof ClientFormTypes;
        setData(key, e.target.value);
    };

    const handleChangeGender = (v: AutoCompleteValue) =>
        setData("client_gender", v);

    const handleChangeCountry = (v: AutoCompleteValue) =>
        setData("client_country", v);

    return (
        <Grid container spacing={2}>
            {TEXT_FIELDS.map((field) => (
                <Grid key={field.name} size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText sx={labelSx}>{field.label}</FormHelperText>
                    <StyledTextField
                        type={field.type}
                        name={field.name}
                        value={data[field.name] as string}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
            ))}

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FormHelperText sx={labelSx}>Client Gender</FormHelperText>
                <StyledAutocomplete
                    options={[
                        { id: 1, label: "Male" },
                        { id: 2, label: "Female" },
                    ]}
                    value={data.client_gender}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="client_gender"
                            value={data.client_gender?.label ?? null}
                        />
                    )}
                    onChange={(_, v) => {
                        if (v) handleChangeGender(v);
                    }}
                    isOptionEqualToValue={(option, value) =>
                        value === undefined || option.id === value.id
                    }
                />
            </Grid>

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FormHelperText sx={labelSx}>Client Country</FormHelperText>
                <StyledAutocomplete
                    options={countries}
                    value={data.client_country}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="client_country"
                            value={data.client_country?.label ?? null}
                        />
                    )}
                    onChange={(_, v) => {
                        if (v) handleChangeCountry(v);
                    }}
                    isOptionEqualToValue={(option, value) =>
                        value === undefined || option.id === value.id
                    }
                />
            </Grid>

            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                <FormHelperText sx={labelSx}>Client Address</FormHelperText>
                <StyledTextField
                    name="client_address"
                    value={data.client_address}
                    handleChange={handleChangeTextField}
                    props={{
                        multiline: true,
                        rows: 3,
                    }}
                />
            </Grid>
        </Grid>
    );
}
