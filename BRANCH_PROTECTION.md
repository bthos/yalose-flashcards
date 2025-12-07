# Branch Protection Rules

This document outlines the recommended branch protection rules for the YaLoSé Flashcards repository to ensure code quality and prevent accidental changes to critical branches.

## Branch Strategy

The repository follows a branched CI/CD approach:

- **`dev`** → Development branch (base for feature branches)
- **`qa`** → QA/Testing branch (PRs from dev are merged here after review)
- **`main`** → Production branch (PRs from qa are merged here after approval)
- **`gh-pages`** → Deployment branch for GitHub Pages (auto-deployed from main)

## Recommended Protection Rules

### `dev` Branch

**Purpose:** Base branch for active development and feature work

**Recommended Settings:**
- ✅ Require pull request reviews before merging
  - Required approving reviews: 1
- ✅ Require status checks to pass before merging
  - Required status checks:
    - `ci` (CI workflow)
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

**Rationale:** Ensures all code entering the development branch has been reviewed and passes basic quality checks (linting and builds).

### `qa` Branch

**Purpose:** QA/Testing environment branch for pre-production validation

**Recommended Settings:**
- ✅ Require pull request reviews before merging
  - Required approving reviews: 1
  - Require review from Code Owners (if configured)
- ✅ Require status checks to pass before merging
  - Required status checks:
    - `ci` (CI workflow)
- ✅ Require conversation resolution before merging
- ✅ Restrict who can push to matching branches
  - Recommended: Only allow maintainers and QA leads
- ✅ Do not allow bypassing the above settings

**Rationale:** QA branch should only receive well-tested code from dev. Additional restrictions ensure only authorized personnel can deploy to the QA environment.

### `main` Branch

**Purpose:** Production branch representing the live application

**Recommended Settings:**
- ✅ Require pull request reviews before merging
  - Required approving reviews: **2** (recommended for production)
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from Code Owners (if configured)
- ✅ Require status checks to pass before merging
  - Required status checks:
    - `ci` (CI workflow)
  - Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Restrict who can push to matching branches
  - Recommended: Only allow repository administrators
- ✅ Do not allow bypassing the above settings
- ✅ Include administrators (recommended for production)

**Rationale:** Production branch requires the highest level of protection. Multiple approvals, strict status checks, and limited access prevent accidental deployments of untested code.

### `gh-pages` Branch

**Purpose:** Auto-generated deployment branch for GitHub Pages

**Recommended Settings:**
- ✅ Restrict who can push to matching branches
  - Allow: GitHub Actions (automated deployments only)
- ⚠️ Do not require pull requests (this branch is auto-managed by workflows)

**Rationale:** This branch is automatically updated by the production deployment workflow and should not be manually modified.

## How to Apply These Rules

1. Navigate to repository **Settings** → **Branches**
2. Click **Add rule** or edit existing rules
3. Enter the branch name pattern (e.g., `main`, `qa`, `dev`)
4. Configure the protection settings as outlined above
5. Click **Create** or **Save changes**

## CI/CD Workflows

The following GitHub Actions workflows enforce the branch strategy:

- **CI Workflow** (`.github/workflows/ci.yml`)
  - Triggers on: PRs and pushes to `dev`, `qa`, `main`
  - Runs: Linting, build verification

- **QA Deployment** (`.github/workflows/deploy-qa.yml`)
  - Triggers on: Push to `qa` branch
  - Deploys: QA build to GitHub Pages at `/yalose-flashcards/qa/` (i.e., the `/qa` subdirectory relative to the repository's Pages root)

- **Production Deployment** (`.github/workflows/deploy-prod.yml`)
  - Triggers on: Push to `main` branch
  - Deploys: Production build to GitHub Pages root
  - Includes: QA build at `/qa` for continued access

## Notes

- These are **recommended** settings. Adjust based on team size and workflow needs.
- For smaller teams or solo projects, reducing required reviewers is acceptable.
- Always ensure at least basic status checks are enabled to prevent broken code from being merged.
- Consider setting up CODEOWNERS file to automatically request reviews from specific team members.
