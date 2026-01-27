import ClientForm from "./forms/ClientForm";
import ProjectSaleForm from "./forms/ProjectSaleForm";
import { CreateSaleHandler } from "../../types";

export default function CreateProjectSaleStepperContent(
    props: CreateSaleHandler
) {
    switch (props.step) {
        case 0:
            return <ClientForm {...props} />;
        case 1:
            return <ProjectSaleForm {...props} />;
    }
}
