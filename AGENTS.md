# AGENTS

## Repo shape

- `web/`: React + TypeScript + Vite frontend.
- `api/`: API area. Only a minimal README exists today.
- `README.md`: top-level monorepo entry point.

## Working assumptions

- Treat this as a frontend-first repo unless the task clearly targets `api/`.
- Prefer edits that match the existing React, Chakra UI, Redux, and Vite patterns already in `web/src/`.
- Keep changes scoped. There is a mix of `.tsx`, `.ts`, `.jsx`, and `.js` in the frontend, so follow the local file style instead of normalizing unrelated code.

## Common commands

Run these from `web/` unless noted otherwise:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

Notes:

- `npm run build-ts` deploys to `/usr/share/nginx/html` with `sudo`. Do not run it unless the user explicitly asks for deployment behavior.
- The repo includes `package-lock.json`, so prefer `npm` over other package managers.

## Frontend guidance

- Main app entry points are under `web/src/`, with routing and feature pages co-located there.
- Shared UI helpers live in `web/src/components/`, including Chakra UI wrappers.
- Redux state is in `web/src/redux/`.
- Lumatone-related code is concentrated in `web/src/lumatone/`; keep those changes localized when possible.

## Editing guidance

- Update README files when behavior or developer workflow changes materially.
- For new UI work, reuse existing Chakra components and local wrappers before adding a new abstraction.
- Avoid broad formatting churn. This repo appears to have accumulated code over time, and narrow diffs will be easier to review.

## Validation

- For frontend code changes, at minimum run the most relevant targeted check from `web/`:
  - `npm run lint`
  - `npm run build`
- If a task touches only documentation, no build is required.
