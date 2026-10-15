import { useMemo } from "react";
import { FormHelperText, Grid, Link as MuiLink } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import { DeveloperProjectFieldValues, DeveloperProjectOption } from "../../../types/app-data-types";
import { AutoCompleteValue, FormErrors } from "../../../types";

interface DeveloperProjectFieldsProps {
    data: DeveloperProjectFieldValues;
    set: <K extends keyof DeveloperProjectFieldValues>(key: K, value: DeveloperProjectFieldValues[K]) => void;
    errors: FormErrors;
    developers: AutoCompleteValue[];
    projects: DeveloperProjectOption[];
    propertyTypes: AutoCompleteValue[];
    // A picked project's property type, when the form has one to fill in.
    onPropertyType?: (type: AutoCompleteValue) => void;
    // Project sales need a developer; on a rental it's optional (direct to owner).
    optional?: boolean;
    size?: { lg?: number; md?: number; xs?: number };
}

// A developer, then one of its projects from the catalogue — or the project's name typed when it isn't listed (developers with
// nothing on file go straight to typing). Shared by the project and rental sale forms.
export default function DeveloperProjectFields({ data, set, errors, developers, projects, propertyTypes, onPropertyType, optional = false, size = { lg: 3, md: 6, xs: 12 } }: DeveloperProjectFieldsProps) {
    const developerProjects = useMemo(() => projects.filter((p) => p.developer_id === data.developer?.id), [projects, data.developer?.id]);
    const projectOptions = useMemo(() => developerProjects.map((p) => ({ id: p.id, label: p.name })), [developerProjects]);
    const hasProjects = projectOptions.length > 0;

    const changeDeveloper = (developer: AutoCompleteValue | null) => {
        set("developer", developer);
        set("project", null);
        set("project_name", "");
        set("project_not_listed", developer !== null && !projects.some((p) => p.developer_id === developer.id));
    };
    const changeProject = (project: AutoCompleteValue | null) => {
        set("project", project);
        const typeId = developerProjects.find((p) => p.id === project?.id)?.project_property_type_id;
        const type = propertyTypes.find((t) => t.id === typeId);
        if (type) onPropertyType?.(type);
    };
    const toggleNotListed = () => {
        set("project_not_listed", !data.project_not_listed);
        set("project", null);
        set("project_name", "");
    };

    return (
        <>
            <Grid size={size}>
                <FieldLabel text={optional ? "Developer (optional)" : "Developer"} required={!optional} />
                <StyledAutocomplete
                    options={developers}
                    value={data.developer}
                    renderInput={(params) => <StyledTextField params={params} placeholder={optional ? "None — direct to owner" : "Search developer"} name="developer" error={errors.developer_id ?? errors.developer ?? null} />}
                    onChange={(_, v) => changeDeveloper(v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={size}>
                {data.project_not_listed ? (
                    <>
                        <FieldLabel text="Project Name" required={!optional || !!data.developer} />
                        <StyledTextField name="project_name" placeholder="Type the project name" value={data.project_name} error={errors.project_name ?? null} handleChange={(e) => set("project_name", e.target.value)} />
                    </>
                ) : (
                    <>
                        <FieldLabel text="Project" required={!optional || !!data.developer} />
                        <StyledAutocomplete
                            options={projectOptions}
                            value={data.project}
                            disabled={!data.developer}
                            noOptionsText="No matching project"
                            renderInput={(params) => (
                                <StyledTextField params={params} placeholder={data.developer ? "Search project" : optional ? "No developer — not needed" : "Select a developer first"} name="project" error={errors.developer_project_id ?? errors.project ?? null} />
                            )}
                            onChange={(_, v) => changeProject(v)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </>
                )}
                {data.developer && (
                    <FormHelperText sx={{ ml: 0.5 }}>
                        {!hasProjects && data.project_not_listed ? "No projects on file for this developer." : null}
                        {hasProjects && (
                            <MuiLink component="button" type="button" onClick={toggleNotListed} sx={{ fontSize: 12, color: "var(--lr-primary)", verticalAlign: "baseline" }}>
                                {data.project_not_listed ? "Choose from the project list" : "Project not listed?"}
                            </MuiLink>
                        )}
                    </FormHelperText>
                )}
            </Grid>
        </>
    );
}
