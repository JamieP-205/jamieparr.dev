import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "jamie-parr",
    "compatibilityDate": "2026-11-01",
    "observability": {
      "enabled": true
    },
    "assets": {
      // Unknown addresses get /404.html with a real 404 status, not the homepage.
      "notFoundHandling": "404-page"
    }
  }
});
