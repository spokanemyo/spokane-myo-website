# GitHub Security Settings

Use this checklist after the private GitHub repository is created.

## Repository Access

- Keep the repository private.
- Require MFA for every GitHub account with access.
- Grant access only to people or automation that need it.
- Prefer GitHub teams or named collaborators over shared accounts.

## Branches

Create these long-lived branches:

- `main`: production branch connected to the production Cloudflare Pages deployment.
- `test`: test branch connected to the test Cloudflare Pages deployment or preview alias.

## Protect `main`

Enable a branch ruleset or branch protection rule for `main`:

- Require a pull request before merging.
- Require at least one approval.
- Require status checks to pass before merging.
- Require the `Build` workflow to pass.
- Require conversation resolution before merging.
- Block force pushes.
- Block branch deletion.
- Restrict who can push directly.
- Do not allow bypassing unless absolutely necessary.

## Protect `test`

Enable a branch ruleset or branch protection rule for `test`:

- Require a pull request before merging when practical.
- Require the `Build` workflow to pass.
- Block force pushes.
- Block branch deletion.
- Allow faster review than `main`, but keep direct pushes limited.

## Actions Permissions

Set default GitHub Actions permissions to read-only:

- Repository Settings -> Actions -> General -> Workflow permissions -> Read repository contents permission

Only add write permissions to a workflow when that workflow truly needs them.

## Secrets

- Do not add Cloudflare tokens until they are needed.
- If a token is needed later, store it as a GitHub Actions secret.
- Use least-privilege tokens.
- Rotate tokens after setup, team changes, or suspected exposure.

## Bot Rules

For future Discord, Hermes, or OpenClaw automation:

- The bot may create issues.
- The bot may create branches.
- The bot may open pull requests.
- The bot may comment with preview URLs.
- The bot must not push directly to `main`.
- The bot must not approve its own pull requests.
- The bot must not change branch protections, repo settings, Cloudflare settings, DNS, billing, or account access.
