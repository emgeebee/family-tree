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
npm run dev      # Vite dev server with hot reload, API included
npm run build    # production build into dist/
npm start        # build, then run the Express server (API + app) on http://localhost:3001
npm run serve    # run the Express server without rebuilding
npm run lint     # lint with oxlint
```

## Server

`server/app.js` is a small Express app. In development it is mounted inside the Vite dev server (see `vite.config.js`), so there is only one process to run. `npm start` builds the app and runs the server standalone, serving `dist/` alongside the API.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/tree` | Latest backed-up tree (404 if none) |
| `PUT /api/tree` | Save the tree to `data/tree.json` plus a timestamped snapshot in `data/backups/`. Saves within 10 minutes of the latest snapshot's creation overwrite it; the last 100 snapshots are kept |
| `POST /api/photos` | Upload an image (multipart field `photo`, max 10 MB), returns `{ url }` |
| `GET /photos/:file` | Serve uploaded photos from `data/photos/` |

Data lives in `data/` (git-ignored); override with `DATA_DIR`. Port defaults to 3001; override with `PORT`.

The browser keeps localStorage as its primary store and backs up to the server ~1.5s after each change. If localStorage is empty on load, the latest server backup is restored before falling back to the sample tree.

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
