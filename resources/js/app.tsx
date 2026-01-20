import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./providers/AppProvider";

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
        return pages[`./Pages/${name}.tsx`];
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <AppProvider>
                <App {...props} />
            </AppProvider>
        );
    },
});
