import { usePage } from "@inertiajs/react";
import { SharedProps } from "../types";

export default function useAuthUser() {
    return usePage<SharedProps>().props.auth;
}
