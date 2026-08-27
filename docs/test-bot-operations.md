# Test Bot Operations

`SpokaneMyo Test Bot` is the automation identity for the `test` branch.

## Access boundary

- The GitHub App is owned by the `spokanemyo` organization.
- It is installed only on `spokanemyo/spokane-myo-website`.
- Its repository permissions are Contents: read/write and Metadata: read.
- It has no organization, administration, workflow, secret, DNS, or Cloudflare permissions.
- It is not on the `main` ruleset bypass list and cannot push to production.
- It cannot access or initiate the protected production promotion workflow.

## Test workflow

1. Check out `test` and make the requested change.
2. Run the build locally when the local environment supports it.
3. Commit with the bot identity.
4. Run `npm run push:test:bot`.
5. Confirm the GitHub Actions build succeeds.
6. Confirm Cloudflare Pages deploys the commit to `test.spokanemyo.com`.

The `test` ruleset permits direct pushes but continues to block force pushes and branch deletion. GitHub Actions and Cloudflare run after the push. If a build fails, investigate or revert the commit; do not promote it to production.

## Credential handling

- The private key is never stored in this repository.
- The local push helper reads it from the current Windows user's protected local secrets folder.
- The helper exchanges it for a short-lived GitHub installation token and does not print or persist that token.
- Store a backup copy of the private key in the shared 1Password vault.

## Disable or rotate

- To immediately stop automation, suspend or uninstall `SpokaneMyo Test Bot` in the organization GitHub App settings.
- To rotate credentials, generate a replacement private key, update the protected local copy and 1Password backup, verify a test push, and then delete the old key in GitHub.
- Never add this app to the `main` ruleset bypass list.

Production promotion uses a different, human-gated identity. See
`docs/production-promotion.md`.
