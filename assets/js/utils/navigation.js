import { AppConfig } from "../config.js";

export function redirectTo(routeName, replace = false) {
  const routePath = AppConfig.ROUTES[routeName];

  if (typeof routePath === "string") {
    console.log(
      `Redirecting to ${routeName} (${routePath}). Replace history: ${replace}`
    );
    if (replace) {
      window.location.replace(routePath);
    } else {
      window.location.assign(routePath);
    }
  } else {
    console.error(
      `Error redirecting: Route "${routeName}" not found in AppConfig.ROUTES.`
    );
  }
}

export function getQueryParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(paramName);
}

console.log("navigation.js loaded");
