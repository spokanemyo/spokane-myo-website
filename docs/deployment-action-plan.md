# SpokaneMyo Website Deployment Action Plan

Goal: host the website securely on Cloudflare Pages with separate test and production environments, then later allow approved website-change requests from Discord through Hermes/OpenClaw.

## Phase 1: Baseline The Website

- [x] Confirm the current local site is the production fallback version we want to publish first.
- [x] Run `npm run build` locally and confirm Astro outputs only the expected static files in `dist`.
- [x] Review public assets for private or unnecessary files before anything is pushed.
- [x] Add a short README with build instructions, ownership notes, and deployment branches.

Security gate:

- [x] No secrets, API keys, customer data, private notes, or local-only files are committed.
- [x] `.gitignore` excludes `node_modules`, local env files, logs, and generated caches.

## Phase 2: GitHub Repository

- [ ] Create a private GitHub repository for the site.
- [ ] Push the current website code to GitHub.
- [ ] Create two long-lived branches:
  - `main` for production.
  - `test` for the test site.
- [x] Add a pull request template requiring:
  - change summary
  - preview URL
  - screenshots if visual changes were made
  - approval checkbox
- [x] Add GitHub security settings checklist.

Security gate:

- [ ] Enable MFA on GitHub accounts with repo access.
- [ ] Protect `main`.
- [ ] Protect `test`.
- [ ] Require pull requests before merging into `main`.
- [ ] Require at least one approval before merging into `main`.
- [ ] Require status checks before merging into `main`.
- [ ] Disable force pushes and branch deletion on `main`.
- [ ] Restrict direct pushes to `main`.

## Phase 3: Cloudflare Pages

- [ ] Create one Cloudflare Pages project connected to the GitHub repo.
- [ ] Configure build settings:
  - Framework preset: Astro
  - Build command: `npm run build`
  - Output directory: `dist`
- [ ] Set production branch to `main`.
- [ ] Enable preview deployments for `test` and feature branches.
- [ ] Confirm Cloudflare deploys successfully from `main`.
- [ ] Confirm Cloudflare deploys successfully from `test`.

Security gate:

- [ ] Enable Cloudflare account MFA.
- [ ] Keep Cloudflare account membership minimal.
- [ ] Enable Cloudflare Access for preview deployments if test/preview content should not be public.
- [ ] Confirm preview deployments return `X-Robots-Tag: noindex`.
- [ ] Do not create broad Cloudflare API tokens yet.

## Phase 4: Domains

- [ ] Add production domains to the Cloudflare Pages project:
  - `spokanemyo.com`
  - `www.spokanemyo.com`
- [ ] Add a test domain:
  - Preferred: `test.spokanemyo.com`
  - Fallback: Cloudflare branch alias such as `test.<project>.pages.dev`
- [ ] Verify HTTPS certificates are active.
- [ ] Verify production and test domains show the expected branch.

Security gate:

- [ ] DNS changes are reviewed before cutover.
- [ ] Existing DNS records are exported or screenshotted before changes.
- [ ] Production domain is not pointed at Cloudflare until the test deployment is verified.

## Phase 5: CI Checks

- [x] Add a GitHub Actions workflow that runs on pull requests:
  - install dependencies with `npm ci`
  - run `npm run build`
- [ ] Make the build workflow a required status check for `main`.
- [ ] Optionally add link and accessibility checks after the first deployment.

Security gate:

- [ ] GitHub Actions permissions are read-only by default.
- [ ] Workflows do not receive Cloudflare tokens unless needed.
- [ ] Any future deploy token is stored as a GitHub secret, never in code.

## Phase 6: Safe Change Workflow

Test automation workflow:

- [ ] Change request is written as a GitHub issue or Discord request.
- [x] A repository-scoped GitHub App provides a separate automation identity.
- [ ] The automation commits approved test changes directly to `test`.
- [ ] GitHub Actions builds the pushed commit.
- [ ] Cloudflare deploys a successful build to `test.spokanemyo.com`.
- [ ] The test deployment is reviewed.

Production promotion workflow:

- [ ] Final approved changes merge from `test` into `main`.
- [ ] Cloudflare deploys production.

Security gate:

- [ ] No AI or bot can push directly to `main`.
- [ ] No AI or bot can deploy directly to production.
- [ ] Human approval is required before merging to `main`.
- [x] Test automation has no GitHub administration, DNS, or Cloudflare permissions.
- [x] Test automation cannot force-push or delete the `test` branch.

## Phase 7: Discord, Hermes, And OpenClaw

- [ ] Define allowed Discord commands:
  - request text change
  - request image change
  - request new section
  - request review status
- [ ] Define blocked Discord commands:
  - publish production immediately
  - change DNS
  - change Cloudflare account settings
  - reveal secrets
  - modify billing or account access
- [ ] Build Hermes/OpenClaw integration to create GitHub issues from Discord messages.
- [ ] Add a second step where Hermes/OpenClaw can propose a branch and pull request.
- [ ] Have the bot post preview URLs back to Discord.
- [ ] Require a human GitHub approval before merging.

Security gate:

- [ ] Discord bot token is stored only in the automation host secret store.
- [ ] GitHub token is least-privilege and cannot administer the repo.
- [ ] Cloudflare token is avoided at first; if later needed, scope it only to Pages for this project.
- [ ] Bot logs redact tokens, cookies, email addresses, and personal contact details.
- [ ] Bot cannot approve its own pull requests.

## Phase 8: Operational Runbook

- [ ] Document how to publish a normal change.
- [ ] Document how to roll back production.
- [ ] Document how to disable the Discord automation.
- [ ] Document who owns GitHub, Cloudflare, Discord, and domain registrar access.
- [ ] Schedule a quarterly access review.

Security gate:

- [ ] At least two trusted people can recover the GitHub and Cloudflare accounts.
- [ ] Backup recovery codes are stored somewhere secure.
- [ ] Old tokens and inactive users are removed during access review.

## Recommended Order

1. Finish Phase 1 locally.
2. Create and secure the GitHub repo.
3. Connect Cloudflare Pages.
4. Publish test first.
5. Publish production only after test is verified.
6. Add CI checks and branch protection.
7. Build the Discord/Hermes/OpenClaw workflow after the website deployment path is reliable.

## Reference Notes

- GitHub protected branches can require pull request reviews, status checks, signed commits, conversation resolution, and restrict direct pushes.
- Cloudflare Pages can deploy from GitHub branches, with `main` as production and other branches as previews.
- Cloudflare Pages preview deployments can be protected with Cloudflare Access.
- Cloudflare API tokens should use the smallest possible permissions, such as Pages-specific access only when deployment automation truly needs it.
