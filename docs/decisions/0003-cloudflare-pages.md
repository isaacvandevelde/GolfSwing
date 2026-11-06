# Static hosting on Cloudflare Pages

Date: 2026-11-06. Status: accepted; deployment verification follows the release.

## Decision

Publish the Next.js static export on Cloudflare Pages. The user authorized deployment after connecting the Cloudflare MCP. This supersedes the earlier local-only hosting restriction. Browser-first processing remains unchanged: selected videos and landmarks stay in the browser.

Next.js uses `output: "export"`; `npm run build` prepares the pinned MediaPipe files and writes the complete site to `out/`. Deploy only that directory. Do not upload the repository, local-data, secrets or personal clips as site assets.

## Tradeoffs and reversibility

Static hosting provides an HTTPS URL usable from iPhone Safari without a running PC or inference server. It cannot run Next.js server actions, request-dependent rendering or API routes. Those features are not used by this analyzer. The exported site can move to another static host without rewriting the analyzer.

Workers Static Assets is Cloudflare's general recommendation for new apps and offers a path to server-side features. Pages was selected for the explicitly agreed static deployment. A full Next.js server adapter and cloud inference are unnecessary for this release. Revisit hosting only if an actual server workload is chosen.

## Build settings

- Production branch: `main`
- Build command: `npm run build` (includes MediaPipe preparation)
- Output directory: `out`
- Node version: `24`
- No runtime secrets, database, authentication, video storage or cloud inference.

`next start` cannot serve an exported application and is intentionally removed. Use `npm run dev` for local development; the production output requires a static web server.

## Validation

Run existing tests, formatting, type checks and the static build. Check published HTML, JavaScript, model and WASM responses over HTTPS. Real iPhone clip decoding, analysis speed and Safari stability still require device testing; hosting checks do not establish biomechanics accuracy.

References: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports), [Cloudflare Pages static Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

## Deployment correction: existing Worker

The dashboard setup created a `golfswing` Worker with a GitHub build trigger, rather than a Pages project. The first cloud build compiled successfully, but its bare `npx wrangler deploy` automatically migrated the build checkout to OpenNext. That adapter requires standalone server output and failed on `.next/standalone/.next/server/pages-manifest.json` because this application exports static files.

Retain the existing Worker and GitHub connection, serving the same static export via Workers Static Assets. `wrangler.jsonc` specifies only the Worker name, the existing compatibility date, and `assets.directory: "./out"`. No server entrypoint, adapter, inference backend or upload path is introduced. The build trigger uses `npm run build` followed by `npx wrangler@4.158.0 deploy`; the deployment tool version matches the failing build and is pinned to avoid unrelated upgrades. Future pushes to `main` rebuild and publish this site.

This supersedes the Pages-specific hosting setup above. The processing architecture and portable static output stay unchanged. Verify the packaging with `npx wrangler@4.158.0 deploy --dry-run`, then verify the cloud build and published assets. [Automatic configuration](https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/) explains why an explicit configuration prevents unwanted framework migration.
