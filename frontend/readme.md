# EcoSphere — ESG & Impact Suite

A React + Vite front-end for an ESG (Environmental, Social, Governance) management platform, built from the provided Excalidraw wireframes and the Odoo-aligned brand palette.

## Stack

- **React 19 + Vite** — app shell and build tooling
- **React Router** — module routing (Dashboard / Environmental / Social / Governance / Gamification / Reports / Settings)
- **GSAP** — subtle entrance/stagger animations on page and tab changes
- **Lenis** — smooth scrolling, synced to GSAP's ticker
- **Axios** — typed API client + endpoint templates, ready to point at a real backend
- **Recharts** — dashboard charts
- **lucide-react** — icon set

## Getting started

```bash
npm install
npm run dev       # start local dev server
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

## Environment variables

All configurable values live in `.env` (see `.env.example` for the template — copy it to `.env` and fill in real values):

```
VITE_API_BASE_URL=https://api.ecosphere.example.com/v1
VITE_API_KEY=
VITE_APP_NAME=EcoSphere
VITE_APP_ENV=development
```

Vite only exposes variables prefixed with `VITE_` to the client, and `.env` is git-ignored so real keys never get committed.

## Connecting the real API

Every network call goes through two files:

- `src/api/client.js` — the shared Axios instance. Base URL and API key come from the env vars above; it also attaches an auth token from `localStorage` if present, and normalizes error messages.
- `src/api/endpoints.js` — one function per REST resource (goals, CSR activities, audits, challenges, reports, departments, etc.), grouped by module. These already match the shape of the mock data in `src/data/mockData.js`.

To wire up a real backend:

1. Set `VITE_API_BASE_URL` (and `VITE_API_KEY` if needed) in `.env`.
2. In each page component, replace the `import { ... } from '../data/mockData'` calls with the matching function from `src/api/endpoints.js`, typically inside a `useEffect` + `useState`.
3. No other files need to change — the UI already expects the same field names the mock data uses.

## Project structure

```
src/
  api/            axios client + endpoint templates
  components/
    common/       shared UI: KpiCard, StatusPill, ProgressBar, Toggle, SubTabs
    layout/       Sidebar, Topbar, Layout shell
  data/           mock data + nav config (swap for live API responses)
  hooks/          useLenis (smooth scroll), useFadeInUp (GSAP entrance)
  pages/          one file per top-level module
  styles/         tokens.css (color palette) + global.css (base styles)
```

## Color palette (Odoo-aligned)

| Token | Hex | Usage |
|---|---|---|
| `--plum` | `#714B67` | Odoo primary — governance pillar |
| `--plum-light` | `#8E6482` | hover states, secondary CTAs |
| `--teal` | `#017E84` | Odoo secondary — social pillar, links/active states |
| `--plum-tint` | `#F3EEF1` | light backgrounds (light-theme reference) |
| `--env-green` | `#3F9142` | environmental pillar |
| `--gamify-gold` | `#E4A900` | gamification pillar |
| `--success` | `#2FA84F` | targets met |
| `--warning` | `#E5A422` | at risk |
| `--critical` | `#D9534F` | non-compliant |
| `--xp-highlight` | `#F4D35E` | XP / badge highlight |
| `--gray-secondary` | `#8F8F8F` | Odoo gray — secondary text |

All tokens are defined once in `src/styles/tokens.css` as CSS custom properties.

## Notes

- All data currently rendered comes from `src/data/mockData.js` so the UI is fully explorable without a backend.
- The sidebar (full nav tree) and the top tab bar are both implemented, matching the wireframes' two navigation surfaces.
- Sub-tab state (e.g. Environmental → Emission Factors / Goals / …) is local per page; deep-linking can be added later by lifting it into the URL if needed.
