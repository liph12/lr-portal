import { createInertiaApp, router } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { configureEcho } from "@laravel/echo-react";
import { AppProvider } from "./providers/AppProvider";
import AppFeedback from "./components/utils/feedback/AppFeedback";
import { joinPresence, leavePresence, presenceAuthorizer } from "./helpers/presence";

configureEcho({
    broadcaster: "reverb",
    authorizer: presenceAuthorizer,
});

// Presence follows the session: join once signed in, leave as soon as a page has no user
// (sign-out, or being signed out for an inactive status).
router.on("navigate", (event) => {
    if (event.detail.page.props.auth) joinPresence();
    else leavePresence();
});

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
        return pages[`./Pages/${name}.tsx`];
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <AppProvider>
                <App {...props} />
                <AppFeedback />
            </AppProvider>
        );
    },
});
