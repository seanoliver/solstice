# Website deploy

**Status:** Current
**Last verified:** first production deploy on 2026-09-28 from the Vercel CLI
**Owner:** Sean Oliver
**Related:** [#10](https://github.com/seanoliver/solstice/issues/10), `docs/adr/0001-astro-for-the-website.md`

## Purpose

Deploy the Astro website in `web/` to https://solstice.seanoliver.dev, and
recover the setup if the Vercel project or DNS is lost.

## Setup

| Piece | Value |
| --- | --- |
| Vercel account | Personal account `seanoliver`, team **Cabin 9** (`cabin-9`). Never the Supabase work account. |
| Vercel project | `solstice` |
| Root directory | `web` |
| Framework preset | Astro (pnpm is detected from `web/pnpm-lock.yaml`) |
| Node version | 24.x |
| Custom domain | `solstice.seanoliver.dev` |
| DNS | Porkbun (`seanoliver.dev` nameservers are `*.ns.porkbun.com`) |
| DNS record | `CNAME solstice → 89be18e7ea266c56.vercel-dns-017.com` |
| Files outside the root directory | Must stay included (the Vercel default). The home page imports `newtab.js` and `newtab.css` from the repository root. No Ignored Build Step may skip builds when only root files change. |
| Deployment protection | Vercel default: `*.vercel.app` URLs require a Vercel login. The custom domain is public. |

## Prerequisites

- The personal Vercel login kept apart from the work login, in its own config
  directory:

  ```bash
  vercel login -Q ~/.vercel-personal
  vercel -Q ~/.vercel-personal whoami   # expect: seanoliver
  ```

  Pass `-Q ~/.vercel-personal` on every command below. Without it the CLI
  uses the default login, which may be the Supabase account.

## Procedure

### Normal deploys

Once the GitHub repository is connected to the Vercel project, pushes to
`main` deploy to production and PRs get preview deployments. Nothing to run.

To deploy by hand from the repository root (not from `web/`, because the
project's root directory setting already points at `web`):

```bash
vercel -Q ~/.vercel-personal deploy --prod --yes
```

### Rebuilding the setup from scratch

1. `vercel -Q ~/.vercel-personal project add solstice --scope cabin-9`
2. Set the root directory, framework, and Node version. The CLI has no
   command for this, so use the dashboard (Project → Settings → Build and
   Deployment) or the REST API:

   ```bash
   TOK=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.vercel-personal/auth.json')))['token'])")
   curl -X PATCH "https://api.vercel.com/v9/projects/solstice?slug=cabin-9" \
     -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
     -d '{"rootDirectory":"web","framework":"astro","nodeVersion":"24.x"}'
   ```

3. From the repository root: `vercel -Q ~/.vercel-personal link --yes --project solstice --scope cabin-9`.
   This writes `.vercel/` (gitignored) and an `.env.local` holding a
   short-lived OIDC token. The static site does not use it; delete it.
4. `vercel -Q ~/.vercel-personal git connect --yes`. This fails with
   "You need to add a Login Connection to your GitHub account first" until
   GitHub is added under Vercel Account Settings → Authentication.
5. `vercel -Q ~/.vercel-personal domains add solstice.seanoliver.dev`. The
   CLI then prints a 403 while fetching the domain. The domain is still
   attached; the 403 comes from the domain's DNS being outside Vercel.
6. Read the CNAME target Vercel wants (it can change if the project is
   recreated):

   ```bash
   curl -s "https://api.vercel.com/v6/domains/solstice.seanoliver.dev/config?slug=cabin-9" \
     -H "Authorization: Bearer $TOK" | python3 -m json.tool
   ```

   Use the rank 1 entry under `recommendedCNAME`.
7. In Porkbun → `seanoliver.dev` → DNS, add a `CNAME` with host `solstice`
   and that target.

## Verification

```bash
dig +short solstice.seanoliver.dev            # the vercel-dns CNAME, then IPs
curl -sI https://solstice.seanoliver.dev | head -1          # HTTP/2 200
curl -sI https://solstice.seanoliver.dev/privacy | head -1  # 200 or a redirect to /privacy/
```

The domain config call in step 6 returns `"misconfigured": false` once DNS
is correct. Vercel issues the TLS certificate automatically after that.

## Failure recovery

- A bad deploy: in the Vercel dashboard, promote the previous production
  deployment, or run `vercel -Q ~/.vercel-personal rollback`.
- `302` from a `*.vercel.app` URL is deployment protection, not an outage.
  Test the custom domain.
- `403` with `x-vercel-mitigated: challenge` from the custom domain is
  Vercel's bot protection reacting to repeated scripted requests (about 100
  `curl` calls in 10 minutes triggered it on 2026-09-28). Browsers pass the
  challenge. Verify in a browser and stop polling.

## References

- Astro `site` setting: `web/astro.config.mjs` (drives canonical and Open
  Graph URLs in `web/src/layouts/BaseLayout.astro`).
- Store listing links: `docs/chrome-web-store-listing.md`.
