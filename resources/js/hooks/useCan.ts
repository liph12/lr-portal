import useAuthUser from "./useAuthUser";
import { hasAnyPermission } from "../helpers/permissions";

// `can("transfer_agents")`: whether the signed-in user holds a permission (the routes enforce the same; this only hides UI).
export default function useCan() {
    const permissions = useAuthUser()?.permissions;

    return (permission: string) => hasAnyPermission(permissions, permission);
}
