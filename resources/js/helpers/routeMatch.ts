export function isRouteActive(currentUrl: string, routePath: string) {
    return currentUrl === routePath || currentUrl.startsWith(routePath + "/");
}
