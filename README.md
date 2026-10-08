# Family Tree

A family tree viewer and editor built with React and [Vite](https://vite.dev/). Sign in with Google to keep several trees on the server and share them read-only.

- Select a person and use the `+` button (or the side panel) to add a parent, sibling, partner, ex-partner or child.
- The tree is drawn around a focus person: the view shows the descendants of their topmost ancestor. A `↑` button on a card means some of that person's relatives are outside the current view; click it to re-focus.
- Drag or scroll to pan, pinch or ⌘/Ctrl + scroll to zoom.
- **Trees** (header) lists your trees: open, rename, duplicate, share or delete them, or start a new one from scratch, from the sample family or from an exported JSON file.
- **Share** creates read-only links (`?share=<code>`). Whoever opens one signs in with Google and sees the tree with all editing turned off. Links can be revoked; deleting a tree revokes its links.
- **Export** downloads the open tree as JSON.

## Data format

Each tree is stored in the same shape as the API export (see `src/data/sampleTree.json`):

- `tree` – tree metadata (`name`, `show_known_as`, `reverse_names`, …)
- `individuals` – people
- `partner_relationships` – unions of people (`individual_ids` is a JSON-encoded string, `type` is `Current` or `Ex`). A single parent is a one-member union.
- `parent_relationships` – links a `child_id` to the `partner_relationship_id` of their parents

`src/utils/familyModel.js` builds a read-only index from this (people with resolved `parentIds`, two-person partnerships) for the layout and UI. All edits in `src/utils/relatives.js` write back to the raw format.

## Storage and sync

Trees live in the `/docs` document API of [`trackmyholidays-api`](https://github.com/emgeebee/trackmyholidays-api), authenticated with the Google ID token:

- Each tree is a document `tree-<uuid>` with body `{ "type": "family-tree", "name": …, "tree": … }`. The tree backed up before multiple trees existed keeps the id `family-tree`. Other documents belonging to the user are ignored.
- The server holds the master copy. The browser caches every tree in localStorage, namespaced by Google user id (`family-tree:user:<id>:…`), so trees open instantly and work offline.
- Edits are written to the cache immediately and saved to the server ~1.5s later (`PUT /docs/:id`, falling back to `POST /docs` for a new tree). Edits that haven't reached the server are marked pending and are uploaded on the next load; on load, other trees are refreshed from the server.
- Sharing uses `POST/GET /docs/:id/shares`, `DELETE /docs/:id/shares/:code` and `GET /shared/:code`.

`src/context/TreesProvider.jsx` owns the list of trees, syncing and sharing; `src/context/FamilyTreeProvider.jsx` holds the editing state for the open tree (read-only for shared trees).

## Getting started

```bash
npm install
npm run dev        # dev server on http://localhost:5173 using .env.dev (dev Google client + dev API)
npm run build:dev  # build with .env.dev into dist/
npm run build:prod # build with .env.prod into dist/
npm run lint       # lint with oxlint
```

Local development talks to the deployed dev API, so `http://localhost:5173` must be an authorised JavaScript origin on the dev Google OAuth client and in the API's `config/allowedOrigins.json`.

## Configuration

Settings come from Vite env files (`src/config.js`); the build fails if the first two are missing:

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id used for sign-in |
| `VITE_API_BASE_URL` | Base URL of the API, e.g. `https://xxxx.execute-api.us-west-2.amazonaws.com/dev` |
| `VITE_PHOTO_UPLOADS` | `true` to show photo uploads. Off: the API has no photo endpoint yet |

`.env.dev` and `.env.prod` are committed (OAuth client ids aren't secret). Put personal overrides in `.env.local` (git-ignored). Each site's origin (e.g. `https://famtree.buzz`) must be listed under *Authorised JavaScript origins* on its OAuth client.

## Deployment

`.github/workflows/deploy.yml` publishes to GitHub Pages (repo *Settings → Pages → Source: GitHub Actions*):

- Pull requests to `main` lint and build with `.env.dev` as a check; nothing is deployed.
- Pushes to `main` build with `.env.prod` and deploy `dist/` to Pages.

The custom domain (`famtree.buzz`) is set in *Settings → Pages → Custom domain*. The build uses a relative base path, so it also works under `<user>.github.io/<repo>/`.

## Project structure

```
public/            Static files served as-is (favicon, etc.)
src/
  components/      UI components, one folder per component
  context/         Auth, trees (list/sync/sharing) and family tree editing state
  data/            Sample family
  hooks/           Custom React hooks (context access, pan/zoom)
  services/        API client, localStorage cache, Google sign-in, JSON export/import
  styles/          Global styles and CSS variables
  utils/           Pure logic: family model, relative operations, tree layout, tree helpers
  App.jsx          Root component
  main.jsx         Entry point that mounts the app
index.html         HTML shell
vite.config.js     Vite configuration
```
