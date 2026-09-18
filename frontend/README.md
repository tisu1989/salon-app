# Salon App — Frontend

React + Redux Toolkit (RTK Query) + TypeScript + React Router, built with Vite. See the
[repo root README](../README.md) for the full project status and stack.

## Structure
- `src/app/` — Redux store, RTK Query base API (with auto refresh-on-401), router, the
  responsive app shell (bottom tab bar under 1024px, sidebar above it)
- `src/features/<domain>/` — one folder per backend module (auth, appointments, staff, services,
  customers, notifications), each with its own API slice and screens
- `src/styles/tokens.css` — design tokens (color, type, breakpoints), carried over from the
  project's design blueprint

## Commands
```
npm run dev       # start the dev server (needs VITE_API_BASE_URL in .env - see .env.example)
npm run build     # typecheck + production build
npm run lint       # oxlint
```
