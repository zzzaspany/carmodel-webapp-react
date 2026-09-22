# carmodel-webapp-react

A private collection catalogue for scale car models, backed by
[PocketBase](https://pocketbase.io/). Browse the collection as cards or as a table, search and
filter it, and add records from the browser.

Built with React 19, Vite, TypeScript and Tailwind. It ships as a static bundle served by nginx,
which also proxies `/pb` through to PocketBase so the browser talks to one origin.

## Running it locally

```bash
npm install
```

```bash
npm run dev
```

The dev server expects a PocketBase instance. The URL is read from `localStorage` under
`pb_server_url` and can be changed from the UI, so there is nothing to configure before the first
run — point it at your own instance once and it remembers.

PocketBase needs a collection named `carmodel`. The app's built-in schema guide shows the fields
it expects, and appears automatically when the collection is missing.

## Building

```bash
npm run build
```

Output lands in `dist/`.

## Container

The `Dockerfile` builds the bundle and serves it from nginx. Two placeholders are substituted at
container start, so one image works across environments:

| Placeholder | Environment variable | Default |
| --- | --- | --- |
| `__POCKETBASE_URL__` | `POCKETBASE_URL` | `http://localhost:8090` |
| `__CONTACT_EMAIL__` | `CONTACT_EMAIL` | empty |

`carmodel-webapp.container` is the Quadlet unit used to run it under rootless Podman. Images are
published to `ghcr.io/zzzaspany/carmodel-webapp-react` by the build workflow on every push to
`main` and on version tags.

## Licence

MIT — see [LICENSE](LICENSE).
