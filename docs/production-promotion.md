# Production Promotion

Production promotion is a human-initiated GitHub Actions workflow. It is not
available to the test bot or to AI automation.

## Phone workflow

1. Verify the desired version at `https://test.spokanemyo.com`.
2. In GitHub Mobile, open the `spokane-myo-website` repository.
3. Open **Actions**, then **Promote test to production**.
4. Run the workflow from `main`.
5. Confirm that the validation and promotion jobs both succeed.
6. Confirm the production Cloudflare Pages deployment succeeds.

If validation or the build fails, `main` is not changed. If `test` changes
during a promotion, the workflow stops instead of deploying an unreviewed
revision.

## Security boundary

- The workflow can only be manually dispatched from the default `main` branch.
- The workflow permits only the `janderson133` GitHub actor.
- Validation runs without production credentials and builds the exact `test`
  commit selected for promotion.
- Promotion uses the separate `SpokaneMyo Production Promoter` GitHub App.
- The promoter private key is stored only as the
  `PRODUCTION_PROMOTER_PRIVATE_KEY` secret in the GitHub `production`
  environment.
- The `production` environment permits deployments only from `main`.
- The promoter app is installed only on this repository.
- The promoter app receives a pull-request-only bypass on the production
  rulesets. Its environment-protected workflow is the only sanctioned
  automated route into `main`.
- The human `production-approvers` team may update `main` through pull
  requests, but the separate no-bypass review and build requirements still
  apply to ordinary human merges.
- The existing test bot is never added to a `main` bypass list and has no
  production environment, Actions, secrets, administration, or Cloudflare
  access.
- No personal access token or Cloudflare token is used.

## Promotion behavior

The workflow:

1. Captures and builds the current `test` revision.
2. Rechecks that `test` did not change and is strictly ahead of `main`.
3. Requires a successful GitHub `build` check for that exact revision.
4. Creates an auditable `test`-to-`main` pull request.
5. Merges through the dedicated production promoter identity.
6. Fast-forwards `test` to the resulting merge commit so the branches remain
   synchronized.

The human workflow dispatch is the explicit production approval. Cloudflare
Pages deploys automatically after `main` changes.
