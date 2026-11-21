# Network and storage audit

## Snapshot build

The delivered console file has four request routes, all on `https://www.instagram.com`. These are the two list GETs, the optional home-page GET and the confirmed unfollow POST listed below. A verification search uses the same following-list GET. The request wrapper sets same-origin mode and credentials and rejects redirects. Clicking a valid profile link is a separate, user-initiated Instagram navigation. The overlay has no analytics, remote scripts, remote fonts or avatar requests. Initials are rendered in the page. Profile-picture URLs are retained as snapshot metadata. [HTTP wrapper and response handling](./src/utils/utils.ts) · [Result rendering](./src/components/Searching.tsx)

| Operation in this build | Data path |
| --- | --- |
| Scan | The existing paginated REST reader collects both lists for the signed-in numeric viewer ID. Only a completed walk of both lists can supply a live snapshot. |
| Save, compare and restore history | Records under `iu_snapshots_v1:<viewer_id>:…` live in Instagram-origin localStorage. Each account record contains its decimal ID, handle, full name, profile-picture URL and the verified/private flags. Each local import validates the entire batch before appending history. |
| Export snapshots | The browser creates a JSON Blob and downloads it. The backup includes account identity, capture labels/times and both lists. It contains no session credentials. |
| Import Meta files | The browser reads only the JSON files selected in the dialog. It makes no online identity lookup. Handle-only records can be reviewed locally. |
| Confirm a batch | Selection is drawn from the active view. The queue rechecks the viewer and durable whitelist before each write. A missing or ambiguous confirmation is recorded as a failure. |
| Block response | HTTP 429 or a recognised feedback block stops the operation. A persisted ten-minute cooldown prevents a new live operation after reloading. |

`dist/index.html` embeds the same console script, with the upstream Prism and font references removed at build time. `dist/preview.html` loads the script from the same directory. Package installation and the development server are separate from the console file. Instagram itself, other scripts already on its page, browser extensions and the browser's download settings are outside the overlay's network boundary. Backups are ordinary unencrypted files. Keep them somewhere private. [Snapshot engine](./src/utils/snapshots.ts) · [Build script](./scripts/update-index.js)

### Verification

The verified console build has SHA-256 `a6df344141294eca44db85f8cb280ac5a51d469008192a075dcfa1940d58ed9b`. The built script was loaded into a fresh headless Chrome context at a simulated Instagram origin. Every request was intercepted before navigation. Synthetic two-page follower and following lists were used at T0 and T1, including a renamed account and deliberately external avatar URLs. The tests exercised snapshot save/reload, diff, whitelist, search, JSON download and restore into fresh storage, Meta imports, and blocked scan and queue paths. No unexpected request was observed. The upstream bundle requested the external fixture avatar under the same conditions. This was an offline integration check. Live Instagram API behaviour was not exercised.

## Upstream findings

The source inspected was upstream commit `8dc78a6ad2b663eebad9dfc5bebb8f7d185da1f0`. The console overlay bundles Preact, its components and CSS. Its explicit fetch calls target Instagram, but the original overlay also makes image requests. Rendering a result could therefore contact another host. [Audited upstream revision](https://github.com/davidarroyo1234/InstagramUnfollowers/tree/8dc78a6ad2b663eebad9dfc5bebb8f7d185da1f0)

| Destination and method | Trigger and data |
| --- | --- |
| `GET https://www.instagram.com/api/v1/friendships/{viewer_id}/followers/` | The scanner pages through the signed-in account's followers. Requests carry the page size and, on later pages, a cursor. |
| `GET https://www.instagram.com/api/v1/friendships/{viewer_id}/following/` | The scanner pages through following. The existing queue can also search this endpoint with the selected handle to verify an ambiguous unfollow response. |
| `GET https://www.instagram.com/` | The existing queue can load the Instagram page as a fallback for session information. |
| `POST https://www.instagram.com/api/v1/friendships/destroy/{user_id}/` | Confirming the unfollow queue changes the signed-in account's relationship with the selected account. |
| `GET https://api.dicebear.com/9.x/initials/svg` | The preview and pasted whitelist construct avatar URLs with a username in the query. Rendering such a URL discloses the handle to DiceBear. |
| `GET {profile_pic_url}` | Each rendered result image loads its supplied URL. The destination depends on the API or stored record. The upstream renderer has no host restriction. |
| `GET /{username}` | Clicking a profile opens a new tab. The original link interpolates its value directly, so a malformed stored value beginning with a slash can change the destination. |

The active collection and unfollow functions use REST. Old GraphQL constants in the source do not make a request. The upstream scanner retries some HTTP 429 and feedback responses. The mutation queue stops when it recognises an action block. The page fallback and follow-up verification require separate checks when enforcing an immediate stop across the whole operation. [Request code](./src/utils/utils.ts) · [Scan and queue](./src/main.tsx) · [Result renderer](./src/components/Searching.tsx) · [Whitelist](./src/components/WhitelistManager.tsx)

## Distribution and development

The separate upstream copy page requests Prism JavaScript and CSS from `cdnjs.cloudflare.com/ajax/libs/prism/`, a font stylesheet from `fonts.googleapis.com/css2`, and fonts from `fonts.gstatic.com`. A third-party script on that page can affect the code it offers to copy. README badges request images from `img.shields.io`. Locked package tarballs use `https://registry.npmjs.org/`. The optional webpack development server also serves local assets and opens its live-reload WebSocket. Neither is used by the production console overlay. SVG namespace strings such as `http://www.w3.org/2000/svg` identify an XML namespace and cause no request. [Copy page](./public/index.html) · [Dependencies](./package.json)

## Local data boundary

Upstream stores the whitelist, timing preferences, language, recent non-follower results, scan time and cooldown in browser storage. The recent-results cache is only a subset of the relationship lists and cannot serve as a historical baseline. An import reads a user-selected file locally. Export uses a local Blob download. Copying a list writes to the system clipboard. Browser storage is readable by scripts running on the same origin, and downloaded JSON can contain private relationship data.
