import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  accountId: "3ae4e11b2e8af979a4f8f9878b44ef54",
  worker: {
    "name": "jamie-parr",
    entrypoint: "./src/worker.js",
    env: {
      ASSETS: bindings.assets(),
      CONTACT_EMAIL: bindings.sendEmail({ destinationAddress: "jamieparr205@gmail.com" }),
      CONTACT_LIMIT: bindings.rateLimit({ namespace: "2026110401", simple: { limit: 3, period: 60 } })
    },
    "domains": ["jamieparr.dev", "www.jamieparr.dev"],
    "workersDev": false,
    "compatibilityDate": "2026-11-01",
    "observability": {
      "enabled": true
    },
    "assets": {
      // Unknown addresses get /404.html with a real 404 status, not the homepage.
      "notFoundHandling": "404-page",
      runWorkerFirst: ["/api/*"]
    }
  }
});
