/**
 * API + Mercure URLs. Override via window.__SPEKTRUM_CONFIG__ before main.js loads if needed.
 */
/**
 * Local dev: REST API and Mercure hub can use different ports on the host.
 */
const DEFAULT_DEV_API = "http://127.0.0.1:9001";
const DEFAULT_DEV_MERCURE = "http://127.0.0.1:3000/.well-known/mercure";

const PROD_HOST = "spektrum.mbuelow.dev";
const PROD_API = "https://api.spektrum.mbuelow.dev";
const PROD_MERCURE = "https://api.spektrum.mbuelow.dev/.well-known/mercure";

export function getConfig() {
  const win = typeof window !== "undefined" ? window : {};
  const override = win.__SPEKTRUM_CONFIG__ || {};
  const host =
    typeof location !== "undefined" ? location.hostname : "";

  let apiBaseUrl = override.apiBaseUrl;
  let mercureUrl = override.mercureUrl;

  if (!apiBaseUrl) {
    apiBaseUrl = host === PROD_HOST ? PROD_API : DEFAULT_DEV_API;
  }
  if (!mercureUrl) {
    mercureUrl = host === PROD_HOST ? PROD_MERCURE : DEFAULT_DEV_MERCURE;
  }

  return {
    apiBaseUrl: String(apiBaseUrl).replace(/\/$/, ""),
    mercureUrl: String(mercureUrl).replace(/\/$/, ""),
  };
}
