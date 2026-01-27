import StyledTextField from "../StyledTextField";
import { Grid, FormHelperText } from "@mui/material";
import { ClientForm as ClientFormTypes } from "../../../types/app-data-types";
import { AutoCompleteValue, CreateSaleHandler } from "../../../types";
import StyledAutocomplete from "../StyledAutocomplete";
import { countries } from "../../../appdata";
import { useForm } from "@inertiajs/react";

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
        const value = e.target.value;

        setData(key, value);
    };

    const handleChangeGender = (v: AutoCompleteValue) =>
        setData("client_gender", v);

    const handleChangeCountry = (v: AutoCompleteValue) =>
        setData("client_country", v);

    return (
        <>
            <Grid container spacing={2}>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Firstname</FormHelperText>
                    <StyledTextField
                        name="client_firstname"
                        value={data.client_firstname}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Middlename</FormHelperText>
                    <StyledTextField
                        name="client_middlename"
                        value={data.client_middlename}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Lastname</FormHelperText>
                    <StyledTextField
                        name="client_lastname"
                        value={data.client_lastname}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Email</FormHelperText>
                    <StyledTextField
                        name="client_email"
                        value={data.client_email}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Mobile</FormHelperText>
                    <StyledTextField
                        name="client_mobile"
                        value={data.client_mobile}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Birthdate</FormHelperText>
                    <StyledTextField
                        type="date"
                        name="client_birthdate"
                        value={data.client_birthdate}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Gender</FormHelperText>
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
                            handleChangeGender(v);
                        }}
                        isOptionEqualToValue={(option, value) =>
                            value === undefined || option.id === value.id
                        }
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Client Country</FormHelperText>
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
                            handleChangeCountry(v);
                        }}
                        isOptionEqualToValue={(option, value) =>
                            value === undefined || option.id === value.id
                        }
                    />
                </Grid>
                <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                    <FormHelperText>Client Address</FormHelperText>
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
        </>
    );
}
