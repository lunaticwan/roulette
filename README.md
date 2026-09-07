# Roulette

A web application for custom roulette selection built with TypeScript, Vite, and Box2D-WASM.

## Features & Scripts

- `npm run dev`: Start local development server.
- `npm run build`: Build the web application and generate service worker assets.
- `npm run preview`: Preview the built application locally.
- `npm run test`: Run unit tests using Vitest.
- `npm run typecheck`: Run TypeScript type checking (`tsc --noEmit`).
- `npm run lint`: Run ESLint checks.
- `npm run format`: Format code with Prettier.

## GitHub Pages Deployment

If deployment fails with `Error: Failed to create deployment (status: 404)`, ensure GitHub Pages is properly configured to build and deploy using GitHub Actions:

1. Go to repository settings: **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Re-run or trigger the **Build and Deploy** workflow on push to `main` branch.
