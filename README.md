# Spokane Myofunctional Therapy Website

Simple Astro website for `spokanemyo.com`, intended for secure hosting on Cloudflare Pages.

## Current Site

The current site is a simple one-page static website that mirrors the existing Spokane Myofunctional Therapy content:

- Logo and provider intro
- Spokane locations
- About Tamara
- Orofacial myofunctional therapy overview
- Littles, Kiddos, and Adults sections
- Nature imagery and footer contact links

## Stack

- Astro
- Static output
- Cloudflare Pages
- GitHub pull request workflow
- Minimal dependencies
- Plain CSS

## Local Development

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm`.

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 4321
```

Open:

```text
http://127.0.0.1:4321/
```

## Build

```powershell
npm.cmd run build
```

Astro writes the production site to:

```text
dist/
```

## Cloudflare Pages Settings

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Test branch: `test`
- Production domains: `spokanemyo.com` and `www.spokanemyo.com`
- Test domain: `test.spokanemyo.com` or the Cloudflare Pages branch preview URL

## Git Workflow

- `main` is production.
- `test` is the test site.
- Feature branches are used for proposed changes.
- Pull requests are required before merging to `main`.
- Cloudflare preview URLs should be reviewed before production changes are merged.

Recommended branch flow:

```text
feature branch -> test -> main
```

## Security Notes

- Do not commit secrets, API keys, tokens, customer data, or private notes.
- Keep `.env` files local only.
- Require MFA for GitHub and Cloudflare accounts.
- Protect `main` and `test`.
- Do not let Discord, Hermes, OpenClaw, or any bot push directly to `main`.
- Use least-privilege tokens for any future automation.

## Deployment Plan

The working deployment and automation checklist is in:

```text
docs/deployment-action-plan.md
```
