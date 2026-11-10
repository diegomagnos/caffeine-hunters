import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  testIgnore: [],
  webServer: {
    ...config.webServer,
    command: "npm run preview:static",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  },
});
