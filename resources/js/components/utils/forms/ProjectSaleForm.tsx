import StyledTextField from "../StyledTextField";
import { Grid, FormHelperText } from "@mui/material";
import { CreateSaleHandler } from "../../../types";
import { propertyTypes, condoTypes, commissionStatus } from "../../../appdata";
import { AutoCompleteValue } from "../../../types";
import { ProjectForm } from "../../../types/app-data-types";
import StyledAutocomplete from "../StyledAutocomplete";
import { useForm } from "@inertiajs/react";

const PROPERTIES = {
    CONDO: 1,
    HOUSE_AND_LOT: 10,
    TOWNHOUSE: 11,
    LOT_ONLY: 12,
};

const makePaymentTerms = () => {
    const MONTHS = 48;
    const terms = [
        {
            id: 0,
            label: "Cash",
        },
    ];

    let i = 0;

    while (i < MONTHS) {
        i++;

        terms.push({
            id: i,
            label: `${i} Month${i > 1 ? "s" : ""}`,
        });
    }

    return terms;
};

const PAYMENT_TERMS = makePaymentTerms();

export default function ProjectSaleForm({ salesSources }: CreateSaleHandler) {
    const developers: AutoCompleteValue[] = salesSources.map((d) => ({
        id: d.id,
        label: d.name,
    }));
    const { data, setData } = useForm<ProjectForm>({
        developer: null,
        unit_no: "",
        unit_type: {
            id: 1,
            label: "Studio",
        },
        floor_area: "0.00",
        lot_area: "0.00",
        property_type: {
            id: 1,
            label: "Condominiums",
        },
        total_contract_price: "0.00",
        reservation_date: "",
        payment_terms: {
            id: 12,
            label: "12 Months",
        },
        remarks: "",
        commission_status: {
            id: 1,
            label: "Unclaimed",
        },
    });

    const handleChangeTextField = (e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.target.name as keyof ProjectForm;
        const value = e.target.value;

        setData(key, value);
    };

    const handleChangePropertyType = (v: AutoCompleteValue) =>
        setData("property_type", v);

    const handleChangePaymentTerms = (v: AutoCompleteValue) =>
        setData("payment_terms", v);

    const handleChangeCommissionStatus = (v: AutoCompleteValue) =>
        setData("commission_status", v);

    const handleChangeUnitType = (v: AutoCompleteValue) =>
        setData("unit_type", v);

    const handleChangeDeveloper = (v: AutoCompleteValue) =>
        setData("developer", v);

    return (
        <>
            <Grid container spacing={2}>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Developer</FormHelperText>
                    <StyledAutocomplete
                        options={developers}
                        value={data.developer}
                        renderInput={(params) => (
                            <StyledTextField
                                params={params}
                                placeholder="Select Developer"
                                name="developer"
                                value={data.developer?.label ?? null}
                            />
                        )}
                        onChange={(_, v) => {
                            handleChangeDeveloper(v);
                        }}
                        isOptionEqualToValue={(option, value) =>
                            value === undefined || option.id === value.id
                        }
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>
                        Unit No. / Block and Lot No.
                    </FormHelperText>
                    <StyledTextField
                        name="unit_no"
                        value={data.unit_no}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Property Type</FormHelperText>
                    <StyledAutocomplete
                        options={propertyTypes}
                        value={data.property_type}
                        renderInput={(params) => (
                            <StyledTextField
                                params={params}
                                name="property_type"
                                value={data.property_type?.label ?? null}
                            />
                        )}
                        onChange={(_, v) => {
                            handleChangePropertyType(v);
                        }}
                        isOptionEqualToValue={(option, value) =>
                            value === undefined || option.id === value.id
                        }
                    />
                </Grid>
                {data.property_type && (
                    <>
                        {data.property_type.id === PROPERTIES.CONDO && (
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <FormHelperText>Unit Type</FormHelperText>
                                <StyledAutocomplete
                                    options={condoTypes}
                                    value={data.unit_type}
                                    renderInput={(params) => (
                                        <StyledTextField
                                            params={params}
                                            name="unit_type"
                                            value={
                                                data.unit_type?.label ?? null
                                            }
                                        />
                                    )}
                                    onChange={(_, v) => {
                                        handleChangeUnitType(v);
                                    }}
                                    isOptionEqualToValue={(option, value) =>
                                        value === undefined ||
                                        option.id === value.id
                                    }
                                />
                            </Grid>
                        )}
                        {(data.property_type.id === PROPERTIES.HOUSE_AND_LOT ||
                            data.property_type.id === PROPERTIES.TOWNHOUSE ||
                            data.property_type.id === PROPERTIES.CONDO) && (
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <FormHelperText>
                                    Floor Area (sqm)
                                </FormHelperText>
                                <StyledTextField
                                    name="floor_area"
                                    value={data.floor_area}
                                    handleChange={handleChangeTextField}
                                />
                            </Grid>
                        )}
                        {(data.property_type.id === PROPERTIES.HOUSE_AND_LOT ||
                            data.property_type.id === PROPERTIES.LOT_ONLY ||
                            data.property_type.id === PROPERTIES.TOWNHOUSE) && (
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <FormHelperText>Lot Area (sqm)</FormHelperText>
                                <StyledTextField
                                    name="lot_area"
                                    value={data.lot_area}
                                    handleChange={handleChangeTextField}
                                />
                            </Grid>
                        )}
                    </>
                )}
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Total Contract Price</FormHelperText>
                    <StyledTextField
                        name="total_contract_price"
                        value={data.total_contract_price}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Reservation Date</FormHelperText>
                    <StyledTextField
                        type="date"
                        name="reservation_date"
                        value={data.reservation_date}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Payment Terms</FormHelperText>
                    <StyledAutocomplete
                        options={PAYMENT_TERMS}
                        value={data.payment_terms}
                        renderInput={(params) => (
                            <StyledTextField
                                params={params}
                                name="payment_terms"
                                value={data.payment_terms?.label ?? null}
                            />
                        )}
                        onChange={(_, v) => {
                            handleChangePaymentTerms(v);
                        }}
                        isOptionEqualToValue={(option, value) =>
                            value === undefined || option.id === value.id
                        }
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Remarks / Notes</FormHelperText>
                    <StyledTextField
                        name="remarks"
                        value={data.remarks}
                        handleChange={handleChangeTextField}
                    />
                </Grid>
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FormHelperText>Commission Status</FormHelperText>
                    <StyledAutocomplete
                        options={commissionStatus}
                        value={data.commission_status}
                        renderInput={(params) => (
                            <StyledTextField
                                params={params}
                                name="commission_status"
                                value={data.commission_status?.label ?? null}
                                handleChange={handleChangeTextField}
                            />
                        )}
                        onChange={(_, v) => {
                            handleChangeCommissionStatus(v);
                        }}
                        isOptionEqualToValue={(option, value) =>
                            value === undefined || option.id === value.id
                        }
                    />
                </Grid>
            </Grid>
        </>
    );
}
