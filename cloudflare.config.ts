import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "jamie-parr",
    "compatibilityDate": "2026-11-01",
    "observability": {
      "enabled": true
    },
    "assets": {
      "notFoundHandling": "single-page-application"
    }
  }
});
