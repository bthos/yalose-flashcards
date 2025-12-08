---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

## HEADERS

## TECH STACK

*   Vite
*   GitHub Pages
*   Vercel
*   Puppeteer

## PROJECT DOCUMENTATION & CONTEXT SYSTEM

*   `BRANCH_PROTECTION.md`

## WORKFLOW & RELEASE RULES

*   Current Branch Strategy: `dev` -> `qa` -> `main`
*   Environments: QA (`/qa/` subdirectory) and Production (root). When moving to Vercel, these become:
    *   `main`: Production (`yalose-flashcards.vercel.app`)
    *   `qa`: Preview (QA) (`yalose-flashcards-qa.vercel.app` or custom)
    *   `dev`: Preview (Auto-generated preview URLs)
    *   PRs: Preview (Auto-generated per PR)
*   Environments (Vercel): Production and Preview.
*   Vercel Environments:
    *   Production: `main` branch only.
    *   Preview: `dev`, `qa` branches, and all PRs.
*   When migrating to Vercel, the following steps should be followed:
    1.  **Vercel Project Setup**: Create a Vercel account/project and link the `yalose-flashcards` repository. Configure the project as a Vite application with the following build settings:
        *   Build Command: `npm run build`
        *   Output Directory: `dist`
        *   Install Command: `npm ci`
        *   Framework: `vite`
    2.  **Environment Configuration**: Configure environments as outlined above.
    3.  **File Modifications**:
        *   Add `vercel.json` for Vercel configuration with the following structure:
            ```json
            {
              "$schema": "https://openapi.vercel.sh/vercel.json",
              "buildCommand": "npm run build",
              "outputDirectory": "dist",
              "installCommand": "npm ci",
              "framework": "vite",
              "rewrites": [
                {
                  "source": "/((?!assets/).*)",
                  "destination": "/index.html"
                }
              ]
            }
            ```
        *   Update `vite.config.ts` to remove GitHub Pages base path logic.
        *   Delete GitHub Pages workflows (`deploy-qa.yml`, `deploy-prod.yml`).
        *   Update `BRANCH_PROTECTION.md` to remove `gh-pages` references.
        *   Update `package.json` to simplify build scripts.
    4.  **Rollback Plan**: Keep GitHub Pages workflows in a separate branch until Vercel is verified. Maintain the ability to redeploy to GitHub Pages if needed.
*   Branch Strategy with Vercel:
    *   `dev`: Active development -> Preview (unique URL per commit)
    *   `qa`: Pre-production testing -> Preview (unique URL per commit)
    *   `main`: Production -> **Production** (stable URL)
*   Vercel Deployment Details:
    *   Preview URLs are unique for every push to `dev` or `qa`.
    *   Every PR automatically gets a preview deployment for review.
    *   Optional: Assign a custom domain to the `qa` branch in Vercel Project Settings → Domains → add `qa.yalose-flashcards.vercel.app` or similar. Or use branch aliases: Vercel auto-creates `yalose-flashcards-git-qa-bthos.vercel.app` for the `qa` branch
*   Branch Strategy with Vercel (Simplified):
    *   `dev`: Active development -> Preview (unique URL per commit)
    *   `qa`: Pre-production testing -> Preview (unique URL per commit)
    *   `main`: Production -> **Production** (stable URL)
*   Vercel CI/CD Workflows:
    *   CI Workflow (`.github/workflows/ci.yml`):
        *   Triggers on: PRs and pushes to `dev`, `qa`, `main`
        *   Runs: Linting, build verification
    *   Vercel Deployments (automatic):
        *   `main` branch → **Production** (`yalose-flashcards.vercel.app`)
        *   `dev`, `qa` branches → **Preview** (auto-generated URLs)
        *   Pull Requests → **Preview** (auto-generated per PR)

## DEBUGGING

*   If Vercel builds a project and publishes a blank page (whereas GitHub Pages worked correctly), troubleshoot configuration and potential issues.
    *   **Check Vercel Build Logs**: Go to your Vercel Dashboard → Project → Deployments → Click on the deployment. Look at the "Build Logs" tab for any errors.
    *   **Check Browser Console**: Open the Vercel URL. Press F12 → Console tab. Look for JavaScript errors (e.g., 404s for assets, CORS errors).
    *   **Check Network Tab**: F12 → Network tab. Reload the page. Are the JS/CSS files loading? (Look for red 404 errors).
    *   **Verify Vercel detected it as Vite**: In Vercel Dashboard → Project → Settings → General. Framework Preset should show "Vite".

## CODING STANDARDS

## STYLE GUIDES