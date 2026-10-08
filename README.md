# Family Tree

A client-side family tree viewer and editor built with React and [Vite](https://vite.dev/).

- Select a person and use the `+` button (or the side panel) to add a parent, sibling, partner, ex-partner or child.
- The tree is drawn around a focus person: the view shows the descendants of their topmost ancestor. A `↑` button on a card means some of that person's relatives are outside the current view; click it to re-focus.
- Drag or scroll to pan, pinch or ⌘/Ctrl + scroll to zoom.
- Data is saved in `localStorage` (key `family-tree:tree`), and can be exported/imported as JSON.

## Data format

The tree is stored in the same shape as the API export (see `src/data/sampleTree.json`):

- `tree` – tree metadata (`name`, `show_known_as`, `reverse_names`, …)
- `individuals` – people
- `partner_relationships` – unions of people (`individual_ids` is a JSON-encoded string, `type` is `Current` or `Ex`). A single parent is a one-member union.
- `parent_relationships` – links a `child_id` to the `partner_relationship_id` of their parents

`src/utils/familyModel.js` builds a read-only index from this (people with resolved `parentIds`, two-person partnerships) for the layout and UI. All edits in `src/utils/relatives.js` write back to the raw format.

## Getting started

```bash
npm install
npm run dev      # Vite dev server with hot reload, local API included
npm run build    # production build into dist/ (local API, no sign-in)
npm start        # build, then run the Express server (API + app) on http://localhost:3001
npm run serve    # run the Express server without rebuilding
npm run lint     # lint with oxlint
```

## Configuration

Settings are read from Vite env files (`src/config.js`):

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id. When set, the app shows a Google sign-in screen and sends the ID token to the API as `Authorization: Bearer …`. When empty (plain `npm run dev`), sign-in is skipped |
| `VITE_API_BASE_URL` | Base URL of the backup API (defaults to `/api`, the local Express server) |
| `VITE_PHOTO_UPLOADS` | `true` to enable photo uploads (local Express server only); off by default |

`.env.prod` and `.env.dev` hold the deployed settings and are used by `vite build --mode prod|dev`; those builds fail if the client id or API URL is missing. Put local overrides in `.env.local` (git-ignored). The Google OAuth client needs each site's origin (e.g. `https://famtree.buzz`, `http://localhost:5173`) listed under *Authorised JavaScript origins*.

## Backups

The browser keeps localStorage as its primary store and backs up ~1.5s after each change. If localStorage is empty on load, the latest backup is restored before falling back to the sample tree.

Backups use a `/docs` document API (the deployed one is `trackmyholidays-api`): the tree is saved as the document `family-tree` with body `{ "tree": … }`. The client tries `PUT /docs/family-tree` and falls back to `POST /docs` the first time.

## Local server

`server/app.js` is a small Express app that stands in for the API locally. In development it is mounted inside the Vite dev server (see `vite.config.js`), so there is only one process to run. `npm start` builds the app and runs the server standalone, serving `dist/` alongside the API.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/docs/family-tree` | Latest backed-up tree as `{ id, tree, updatedAt }` (404 if none) |
| `PUT /api/docs/family-tree`, `POST /api/docs` | Save `{ tree }` to `data/tree.json` plus a timestamped snapshot in `data/backups/`. Saves within 10 minutes of the latest snapshot's creation overwrite it; the last 100 snapshots are kept |
| `POST /api/photos` | Upload an image (multipart field `photo`, max 10 MB), returns `{ url }` |
| `GET /photos/:file` | Serve uploaded photos from `data/photos/` |

Data lives in `data/` (git-ignored); override with `DATA_DIR`. Port defaults to 3001; override with `PORT`.

## Deployment

`.github/workflows/deploy.yml` publishes to GitHub Pages (repo *Settings → Pages → Source: GitHub Actions*):

- Pull requests to `main` lint and build with `.env.dev` as a check; nothing is deployed.
- Pushes to `main` build with `.env.prod` and deploy `dist/` to Pages.

The custom domain (`famtree.buzz`) is set in *Settings → Pages → Custom domain*. The build uses a relative base path, so it also works under `<user>.github.io/<repo>/`.

## Project structure

```
public/            Static files served as-is (favicon, etc.)
src/
  assets/          Images, fonts and other imported assets
  components/      Reusable UI components, one folder per component
  context/         Family tree state (provider + reducer)
  data/            Sample family
  hooks/           Custom React hooks (state access, pan/zoom)
  services/        Persistence (localStorage, JSON import/export)
  styles/          Global styles and CSS variables
  utils/           Pure logic: family model, relative operations, tree layout
  App.jsx          Root component
  main.jsx         Entry point that mounts the app
index.html         HTML shell
vite.config.js     Vite configuration
```
