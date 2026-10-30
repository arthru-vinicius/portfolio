# portfolio

**English** · [Português](README.pt-BR.md)

Arthur Vinicius's professional portfolio, live at **https://portfolio.arthru.com**: a site in
Portuguese and English, a panel to edit its content and a résumé generated from that same
content, as PDF and DOCX for people and as Markdown and JSON Resume for AI assistants.

> Pre-launch. The site, the panel, the résumé, search engine and AI assistant optimization and
> the security headers are live; search engines are kept out until launch.

## Architecture

- **Next.js 16** (App Router and Cache Components), **React 19**, strict **TypeScript** and
  **Tailwind CSS 4**.
- **One Docker container** on a self-hosted ARM64 server, behind a Cloudflare Tunnel: no port is
  open on the server.
- **SQLite** through Node's built-in `node:sqlite` module, with WAL and migrations applied at
  startup.
- **Publishing without a deploy:** pages read the latest published revision through a cached
  layer, and publishing invalidates that cache. The site changes within seconds.
- **Pull-based deploy:** the server follows `main` and, once a commit's `verify` check is green,
  builds the image, swaps the container and rolls back to the previous version on its own if the
  healthcheck fails. No server credential is stored on GitHub.

```
GitHub (main + green verify) ──▶ server: build, swap, rollback
                                          │
visitor ──▶ Cloudflare ──▶ tunnel ──▶ container (Next.js + SQLite in /data)
```

## Running locally

Requirements: Node 22 (see `.nvmrc`) and, for the image and the end-to-end tests, Docker.

```bash
npm ci
npm run dev   # http://localhost:3000, with the database at .data/portfolio.db
```

On the first run, `npm run dev` writes a fictitious document to the local database, as both the
draft and a published revision. The server variables are listed in `.env.example`; outside
production, the defaults are enough for the site. Open it through `localhost`, not `127.0.0.1`:
`next dev` refuses the hot reload connection from another origin.

## Site

- **URLs:** `/pt/` and `/en/`, the canonical URL of each language, with a trailing slash, so a
  section link reads `/pt/#experiencia`. The root `/` leads to the browser's language
  (`Accept-Language`) with a temporary redirect that varies on that header, and `/pt` leads to
  `/pt/` with a permanent one. The proxy adds the slash, and only on those pages: Next redirects
  nothing (`skipTrailingSlashRedirect`), so `/api/health` is never redirected. A URL that doesn't
  exist gets a 404 in both languages (`global-not-found`).
- **Content:** the latest published revision, with only the visible blocks and items, in the
  panel's order. The header menu leads to the main sections (about, experience, projects,
  education and awards); skills, languages and free-form blocks are only on the page, and contact
  has the "Get in touch" button, which becomes the last menu item on mobile. Long texts accept a
  subset of Markdown (paragraphs, lists, bold, italics, code and links), which becomes React
  elements, never raw HTML, and only accepts `https:`, `http:` and `mailto:` links.
- **Theme:** follows the system's, and a button switches between system, light and dark. The
  choice is kept in `localStorage`, with no cookie, and a short script in `<head>` applies it
  before the first paint.
- **Look:** near-black with green, large gradient headings, a particle network behind the hero,
  the skills strip and the reading progress bar. The effects pause off-screen and with "reduce
  motion". The fonts (Plus Jakarta Sans and JetBrains Mono, OFL license) come from the Fontsource
  packages and are served by the site itself: the build doesn't depend on Google Fonts. The mono
  font only comes in weight 400, the only one the labels use, at half the size of the variable
  one.
- **Preview:** `/admin/preview/pt` and `/admin/preview/en` show the draft with the same
  components as the site, before publishing.
- **Photo:** uploaded in the panel's profile screen (`POST /admin/photo`, with a session and an
  origin check). The server rotates the image according to the camera orientation, strips the
  metadata (EXIF, GPS), scales it down to 480 and 960 px and stores it as WebP in `/data/media`,
  named after the SHA-256 digest of its content. So a file never changes:
  `/media/<id>-<width>.webp` is served with a one-year cache, and changing the photo goes through
  the draft and publishing, like the rest of the content. The photo's `sizes` follows its width
  at each breakpoint, and a typical phone downloads the 480 px one.
- **Contact:** a form with name, email and message. The public Server Action checks the per-IP
  limit (5 per hour), the fields, a honeypot field and Turnstile, in that order, and hands the
  message as plain text to the email relay, which sends it to the site owner. Outside production,
  or with `MAIL_RELAY_DRY_RUN=true`, messages only go to the log; in production without the relay,
  the form is hidden and the email address remains. The form's Turnstile only loads when the
  form gets close to the screen: the widget downloads hundreds of KB, and visitors who never
  scroll to the contact section don't pay for them.
- **Icons:** `icon.svg`, `favicon.ico` and `apple-icon.png` in `src/app`, through Next's file
  conventions.

## Search engines and social networks

Everything comes from the published content and `PUBLIC_ORIGIN`; no domain is hard-coded.

- **Metadata per language:** title, description, canonical URL (`/pt/` and `/en/`) and
  `hreflang` for both languages, with the root as `x-default`. They always go in `<head>`
  (`htmlLimitedBots: /.*/`): by default, on a dynamic page, Next sends them at the end of
  `<body>`, except to a list of bots that leaves out the AI ones.
- **Share card:** `/pt/og.jpg` and `/en/og.jpg` (Open Graph and Twitter), in the site's look,
  with the name, the job title and the photo. It is drawn with `next/og`, cached until the next
  publish and served as JPEG to stay light. The metadata points to it with `?v=<revision>`, so
  social networks fetch the new image after a publish.
- **Structured data:** a JSON-LD `ProfilePage` with the person (`Person`): job title,
  description, photo, email, links (`sameAs`), employer, education, skills, languages and
  awards. It only uses what the page shows.
- **`sitemap.xml`:** both pages, each with the other's URL and the date of the last publish.
- **`robots.txt`:** the same rule as `X-Robots-Tag`. On the canonical host and with
  `ALLOW_INDEXING`, every bot is allowed (search and AI ones), except into the panel, and the
  sitemap is listed; before that, or on another host, none is.
- **For AI assistants:** `/llms.txt` (the `llmstxt.org` convention) has the name, the job title
  in one line, the professional summary and links to the résumé in Markdown and in JSON Resume in
  both languages, to the pages, to the profiles and to the contact section; the PDF and the DOCX
  go in the `Optional` section. The headings are in English, and each file is named in its own
  language. The page of each language also points to the résumé as text and as data with
  `<link rel="alternate">` (`text/markdown` and `application/json`).

## Security and analytics

The proxy sets the same headers on every response (`/api/health` is left out, as the server
contract requires):

- **Content Security Policy** without a nonce. The shell of each language is prerendered at build
  time, and Next doesn't combine a nonce with that partial prerendering; so the inline scripts it
  writes (React's data and the theme script) need `'unsafe-inline'`. The policy limits the rest:
  scripts only from the site itself, Turnstile and Web Analytics; connections only to the site
  itself and to the Web Analytics endpoint; the only iframe is Turnstile's; no site can put these
  pages in an iframe (`frame-ancestors 'none'`); no `<object>` and no `<base>` from elsewhere. On
  the panel, the CSP keeps Web Analytics out. Under `next dev`, it allows `eval` and WebSocket for
  hot reload.
- **`X-Content-Type-Options: nosniff`**, **`Referrer-Policy: strict-origin-when-cross-origin`**,
  **`X-Frame-Options: DENY`**, **`Cross-Origin-Opener-Policy: same-origin`** and a
  **`Permissions-Policy`** that turns off camera, microphone, geolocation, payment and the like.
- **zod without `eval`:** the panel validates in the browser with the same schemas, and zod runs
  in `jitless` mode, without trying to compile the validators with `Function`.
- **Static files:** the files in `/_next/static` are named after their content and already leave
  Next with `Cache-Control: public, max-age=31536000, immutable`.
- **Cloudflare Web Analytics** (no cookie and no banner): only on the public pages, with the
  token in `WEB_ANALYTICS_TOKEN`. Without the variable, the site doesn't load the script. The
  script loads after the page has finished loading, so it doesn't compete with the content for
  bandwidth.

## Résumé

The résumé comes from the same content as the site, in Portuguese and English: as PDF and DOCX,
in a format designed for recruiters and applicant tracking systems (ATS), and as Markdown and
JSON Resume, for AI assistants and tools that read text or data without guessing the layout.

- **What goes in:** whatever each item marks for the résumé (even when hidden on the site), the
  marked highlights and the professional summary from the résumé screen. The sections follow the
  job market's order, not the site's: summary, experience, skills, projects, education, awards
  and languages. Jobs, courses and awards go from newest to oldest, and months are written as
  `MM/YYYY`.
- **One model, four formats:** `buildResumeModel` builds the résumé of one language as plain text
  (the panel's Markdown becomes text, and links keep their address written out), and
  `layoutResume` lays it out in sections and lines. The PDF, the DOCX and the Markdown only draw
  that layout, so they have the same text in the same order; the JSON Resume comes from the same
  model.
- **PDF** (pdfkit): A4, one column, no tables, images, page headers or footers. Real text, with
  Inter embedded (OFL license, from Fontsource) and accents that copy correctly. It is tagged,
  with language, title, author, subject and keywords. A character the font doesn't have becomes
  an equivalent, such as `→` into `->`. At most two pages: if the content doesn't fit, the
  layout gets more compact (first the margins and spacing, then the text, down to 9.5 pt), and a
  section heading never sits alone at the bottom of a page.
- **DOCX** (docx): for anyone who needs an editable file or a format the job platform accepts.
  One column, no tables or text boxes, with Word's own styles (the name in Heading 1, the
  sections in Heading 2, real bulleted lists), Calibri, the language of the text and the
  document properties.
- **Markdown:** the text of the PDF without the layout: the name as `#`, the sections as `##`,
  each item as `###`, real lists and links, with the text escaped so nothing becomes markup by
  accident. It also has the portfolio link in its language, unless a profile link already points
  to the site.
- **JSON Resume** (`jsonresume.org`, v1.0.0): the same data in standard fields (`basics`,
  `work`, `education`, `skills`, `projects`, `awards`, `languages`), with dates as `YYYY-MM`, the
  technologies in `keywords` and the expected completion of an ongoing course as `endDate`. No
  empty fields, and with the URLs of the portfolio and of the file itself.
- **When it is generated:** on publish, before the revision is saved; if the generator fails,
  nothing is published. The eight files go to `/data/cv/<revision>-v<format>/`, and the files of
  the previous revision are deleted. If they are missing (a revision from before the résumé, a
  new format version), the route generates them on the first request.
- **Fixed URLs:** `/cv/curriculo.pdf`, `.docx`, `.md` and `.json`, and the same with `resume` in
  English. The DOCX downloads; the others open in the browser. The response has
  `Cache-Control: no-cache` and the revision's ETag, and Cloudflare checks with the server before
  using its copy. The links on the site carry `?v=<revision>`: the browser caches a file by URL,
  and the URL changes with every publish.
- **On the site:** the "Download résumé" button, at the top and in the footer, opens the list of
  the PDF and DOCX files in both languages, with the size of each. The Markdown and the JSON are
  left out of the button; `/llms.txt` and the page's `<link rel="alternate">` point to them.
- **Phone number:** never goes into the public files. The full version, with the phone number
  from the private field, is only available in the panel.

## Panel

The panel is at `/admin`, with a username and password login, and its interface is in
Portuguese. Without the complete configuration, it answers 503: no secret has a default value,
in any environment.

**To use it under `npm run dev`**, create a `.env.local` from `.env.example` and fill in:

- `ADMIN_USERNAME`: any name;
- `ADMIN_PASSWORD_HASH`: the hash of a local password, generated by
  `npm run --silent admin:hash-password` (the password is read without echo);
- `ADMIN_SESSION_SECRET`: a text with 32 characters or more.

The login's Turnstile uses Cloudflare's test keys, which always pass.

**On the server**, the values are secrets, set by the maintainer:

| Secret | Purpose | Format and how to generate it |
|---|---|---|
| `ADMIN_USERNAME` | login username | free text |
| `ADMIN_PASSWORD_HASH` | checks the password | `scrypt:N:r:p:<salt>:<hash>`, the output of `npm run --silent admin:hash-password` |
| `ADMIN_SESSION_SECRET` | signs the session cookie | 32 random characters or more (from a password manager). Changing it signs out every session |
| `TURNSTILE_SECRET_KEY` | checks the login's Turnstile | the widget's secret key, from the Cloudflare dashboard |

None of the values may contain single quotes or line breaks. Changing the username or the
password also signs out the open sessions.

**Editing content:**

- Each part has its own screen: the profile, the block list (order, visibility, new and removed
  blocks), each block with its items, and the résumé. Texts show both languages side by side,
  with a warning when a translation is missing.
- Saving writes the draft, which the site doesn't show: the pages only read the published
  revision.
- Each screen keeps the version of the part it opened. If the same part changed in another tab,
  saving is refused instead of overwriting the other change; changing another part doesn't get
  in the way.
- Leaving a screen with unsaved changes asks for confirmation. Items are reordered with buttons,
  which work from the keyboard.
- **Publishing**, from the overview, generates the résumé, saves a new revision and expires the
  pages' cache (`updateTag`): the site changes on the next visit, without a deploy. Publishing
  first checks the draft: every text that goes to the site or to the résumé needs both
  languages, the main fields of each item must be filled in and at least one block must be
  visible. What's missing shows up on the overview, with a link to the screen that fixes it. The
  page publishes exactly the version it was showing: if the draft changed in another tab,
  publishing is refused.
- **Résumé:** the professional summary and the draft's files, generated on the spot to be checked
  before publishing (`/admin/cv/<file>`). The full version, with the phone number, also comes
  from there; it is only delivered in that response and never stored. If not even the most
  compact PDF fits in two pages, the screen says so for that language.
- **History:** the published revisions, newest first, each with a YAML download and a restore as
  draft. Restoring doesn't publish, and revisions never change: the database refuses to update or
  delete them.
- **YAML export and import**, on the overview. The exported file, with the private fields, is the
  copy of the content outside the server, and it can be edited by hand: multi-line texts are
  literal blocks (`|`), and a new item can be left without an `id`, which it gets on import.
  Import accepts YAML or JSON, validates the file and replaces the draft, without publishing. The
  parser uses standard YAML 1.2 and refuses custom tags, aliases and more than one document per
  file.

**Protections:**

- The panel only answers on the hosts in `ADMIN_HOSTS`; on any other, it's a 404.
- The session is a signed `__Host-` cookie (HMAC-SHA256), `HttpOnly`, `Secure` and
  `SameSite=Strict`, valid for 8 hours.
- The login requires Turnstile and allows 5 attempts per IP every 15 minutes. The count is kept in
  the database and survives a deploy.
- The password is checked with `scrypt` (64 MiB per attempt), in constant time. A wrong username
  and a wrong password get the same answer.
- The proxy is the first barrier (host, configuration and session), and every page, Server Action
  and route handler checks the session again. The tests keep a list of every Server Action and
  route handler of the panel and call each one without a session.
- Requests that arrive over HTTP go to HTTPS, and HTTPS responses carry HSTS, without
  `includeSubDomains`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | development server, with the local database seeded |
| `npm run db:seed` | writes the fictitious document to the local database (`-- --force` overwrites it) |
| `npm run admin:hash-password` | generates the panel's password hash; with the real password, only the maintainer runs it |
| `npm run build` | production build |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript and unit tests (Vitest) |
| `npm run format` | formats the code with Prettier |
| `npm run docker:build` | builds the image the way the server does (Docker's classic builder) |
| `npm run test:e2e` | Playwright against the local container, with the production limits (Chromium comes from `npx playwright install chromium`) |

## Server contract

- The container listens on `0.0.0.0:3000`, runs as uid 1001 and only writes to `/data`: the
  database, the photos (`/data/media`) and the résumé files (`/data/cv`, which the app generates
  again if they go missing).
- `GET /api/health` answers 200 with the database open and the migrations applied, and 503
  otherwise. The body has the image version and the status of the last deploy.
- No domain is hard-coded: the absolute URLs and the indexing rule come from `PUBLIC_ORIGIN`.
  Only its host can be indexed, and only with `ALLOW_INDEXING=true`. Every other response carries
  `X-Robots-Tag: noindex`.
- `WEB_ANALYTICS_TOKEN`, optional, turns on Cloudflare Web Analytics on the public pages. The
  token shows up in the HTML, but it is account data: it stays on the server, never in the
  repository.
- The CI job is called `verify` and runs on ARM64, the same architecture as the server.

## Development with AI

This repository is built with an AI coding agent (Claude Code), working under the rules in
[`AGENTS.md`](AGENTS.md), and every change goes through human review:

- **Written rules.** `AGENTS.md` is the project's contract: the repository is public, so no
  secrets or personal data; agents neither generate nor ask for secrets; every panel action
  checks the session on its own; the docs to read are those of the installed Next.js version,
  not the model's memory; and before calling something done, the type check, lint, unit tests,
  build and Docker image run, and whatever wasn't tested is stated.
- **Review.** Every change arrives as a pull request, reviewed and merged by the maintainer; the
  agent never merges its own work. Commits made with the agent carry a `Co-Authored-By` trailer.
- **Safety net.** CI builds the image on ARM64 and runs the end-to-end tests against the
  container, with axe in both themes. Merging to `main` is publishing: the server deploys the
  green commit and rolls back to the previous version on its own if the healthcheck fails.
