c# CLAUDE.md — PSU Dormitory 10-11 Repair & Maintenance Management System

This file defines the working rules for Claude Code (and any AI assistant) contributing to this
repository. It is derived from the actual patterns already established across the three
sub-projects in this monorepo. Follow these rules by default; do not silently deviate from them.

> Project (TH): การปรับปรุงและพัฒนารับแจ้งซ่อมครุภัณฑ์และการบริหารจัดการงานซ่อมบำรุงภายในหอพักนักศึกษา
> Project (EN): PSU Dormitory 10-11 Management System — repair request & maintenance management
> for supervised student dormitories, Hat Yai Campus, Prince of Songkla University.

---

## 1. Tech Stack & Architecture

### 1.1 Monorepo layout

```
/backend/           Node.js + Express API, MySQL/MariaDB
/staff-portal/       (modeator_dorm) React (Vite) + Tailwind v4 — staff/admin web app
/student-app/       (student_dorm) Flutter — student-facing mobile app
```

Do not assume a different top-level layout. If a sub-project's actual folder name differs from
the above, treat these as logical names and ask before renaming directories.

### 1.2 Backend — Node.js / Express / MySQL

- Runtime: Node.js, framework: Express.
- Database: MySQL/MariaDB, accessed via model files that **only** perform database queries —
  no business logic in models.
- Auth: JWT-based. `checkAccessToken` middleware lives in `server.js` and protects routes.
  Auth flow uses **challenge-response with SHA-256 hashing** across two endpoints:
  `authen_request` and `access_request`.
- File uploads: multipart photo uploads; photos are stored in a one-to-many
  `repair_photos` table (one repair request → many photos).
- Data modeling conventions (must be preserved):
  - Normalized entities with explicit numeric IDs and foreign-key relationships.
  - Enumerated workflow/status values (e.g. `progress_status_id`, repair-type IDs 1–6).
  - Boolean-like fields expressed as explicit string enums, not raw booleans
    (e.g. `allow_entry`: `'yes'` / `'no'`).
- **Backend/SQL schema changes are off-limits unless explicitly requested.** Reference existing
  models (e.g. `RepairRequestModel`) as-is; do not add fields to satisfy the frontend without
  confirming with the user first, even if the frontend expects them (known gap:
  `studentName`, `roomNumber` are expected by the UI but absent from the current model).

### 1.3 Staff Portal — React (Vite) + Tailwind v4

- Build tool: Vite. Styling: Tailwind CSS v4 (`@import "tailwindcss"` syntax — **not** the v3
  `@tailwind base/components/utilities` directives).
- Desktop-first, desktop-only layout: permanent left sidebar, Topbar, Footer. No mobile nav for
  staff-side screens.
- Folder structure to follow:
  ```
  src/
    main.jsx
    pages/            One file per screen (LoginPage, HomePage, RepairManagementPage,
                       InventoryPage, ReportPage, PersonnelPage, ...)
    components/        Shared, reusable UI (StatusCard, RepairCard, BaseModal, StatusPill,
                       EquipmentPickerCard, ...)
    layouts/           AppLayout.jsx (with <Outlet />), BrandPanel.jsx, MainLayout.jsx
    services/          authService.js, api.js — API access layer
    config/            appConfig.js — e.g. AppConfig.apiBaseUri
    models/            Domain-split model files (repairRequest.js, inventory.js,
                       notifications.js, user.js) with mock data + commented-out real fetch()
  ```
- Routing: React Router, nested layouts via `AppLayout.jsx` + `<Outlet />`, `NavLink` for active
  route styling. Staff routes live under `/staff/...`.
- API service pattern (`services/api.js`): exported **plain const object** (not a class), using
  `fetch`, JWT stored in `localStorage` under key `access_token`, base URL from
  `AppConfig.apiBaseUri`. Returns the **raw response** — no automatic JSON parsing/unwrapping
  inside the service layer.
- Components only get promoted into the shared `components/` folder once they are actually
  reused across more than one page. Page-local, non-reused decorative elements (e.g. a live
  clock on the dashboard) stay inline in that page.

### 1.4 Student App — Flutter

- Design tokens centralized in `lib/constants/colors.dart`.
- Color/design system: navy/gold — `kNavy #1A3A6C`, `kNavyDark #0F2347`, `kGold #FFD700`,
  font **Sarabun** (Thai) alongside Inter / Be Vietnam Pro for buttons/headings.
- Assets: prefer inline SVG / Material Symbols over external image URLs where possible.
- API access via a shared `AppAPI` class (`AppAPI.get()`, etc.) using Bearer tokens.
- Status values from the backend are Thai-language strings — match them exactly:
  `'รอตรวจสอบ'`, `'กำลังซ่อม'`, `'เสร็จแล้ว'`.
- Some widgets are **locked / do-not-edit** by explicit prior agreement (e.g. `repair_info.dart`)
  — check before touching a widget that looks shared or foundational.
- **StatefulWidget vs StatelessWidget**: make a widget `StatefulWidget` only when it must track
  mutable interaction state that changes via the user's own actions *within that widget* (e.g.
  current swipe/page index, an upload-in-progress spinner, the currently-displayed image after a
  successful upload). A widget that only displays data already fetched/passed in by its parent
  (a photo grid, a read-only avatar, a single-photo viewer with no index to track) should stay
  `StatelessWidget` — the mutable state and business logic belong in the parent screen instead.
- **Where to put an extracted StatelessWidget**: once a section of a screen qualifies as
  `StatelessWidget` by the rule above *and* is an important/necessary section of that screen
  (e.g. its AppBar, a distinct content card, a bottom action bar) — extract it into its own file
  under `lib/widgets/<page_name>/` (drop the `_screen` suffix from the folder name, e.g.
  `repair_complaint_screen.dart` → `lib/widgets/repair_complaint/`). Trivial one-line style
  helpers (a card wrapper, an icon badge) are not "sections" — keep those duplicated inline in
  each file that needs them rather than extracting a file for them. Do not extract every
  Stateless-eligible fragment just because it qualifies; over-splitting trivial pieces makes the
  code harder to follow, not easier.
- When connecting to the backend from a physical device, use the LAN IP, not `localhost`; be
  aware university WiFi may apply AP isolation (ngrok is the known workaround).

### 1.5 Cross-cutting architecture rules

- Backend is the single source of truth for status labels, IDs, and enums — frontend and mobile
  must mirror backend values exactly, not invent their own.
- New shared components/widgets should exist in exactly one place per sub-project (React
  `components/`, Flutter shared widgets folder) — do not duplicate.
- Prefer pagination over infinite scroll for list views (established pattern on the equipment
  page).

---

## 2. Coding Standards & Readability

- **Naming must be descriptive of meaning, not type or position.** e.g. `progressStatusId`, not
  `status2`; `repairTypeChip`, not `chip1`.
- Match the **existing naming convention per language**: `camelCase` for JS/JSX and Dart
  variables/functions, `PascalCase` for React components and Dart classes/widgets,
  `snake_case` for SQL/database columns.
- Keep model files (backend) limited to query logic only — no request/response shaping, no
  validation logic inside models.
- Keep API layers (`services/api.js`, `AppAPI`) thin — transport only, no business logic.
- Mark integration points that are still using mock/hardcoded data with a clear, greppable
  marker, matching the existing convention: `// TODO: 🔌` (React) or an equivalent explicit
  `TODO:` comment (Flutter/backend). Do not silently leave mock data unmarked.
- **Comments must explain "why", not "what".** Do not write comments that restate the code line;
  write comments that explain the reasoning, trade-off, or constraint behind a decision
  (e.g. *why* pagination was chosen over scroll, *why* a field is hardcoded pending backend
  work).
- Default to **preserving existing code structure, pattern, and decoration**; change only what is
  necessary to fulfill the request. Do not refactor unrelated code, rename unrelated variables,
  or restyle unrelated components as a side effect of a task.
- Prefer extracting a component/widget into a shared folder only once genuine reuse appears —
  do not pre-emptively over-abstract single-use UI.

---

## 3. Security & Secrets Management

- **Never commit secrets** (DB credentials, JWT signing secrets, API keys, `.env` files) to the
  repository. All secrets load from environment variables / an untracked `.env` file.
- **All SQL queries must use prepared statements / parameterized queries.** No string
  concatenation or template-literal interpolation of user input into SQL, ever — this applies to
  every model file in `/backend`.
- **Validate all input at the API boundary**, not just in the frontend/mobile UI:
  - Type-check and range-check IDs (repair-type IDs 1–6, status IDs, etc.) server-side.
  - Reject unexpected/extra fields rather than silently accepting them.
  - Treat all file uploads (repair photos) as untrusted: validate MIME type, enforce a size
    limit, and never trust the client-provided filename directly for storage paths.
- **Auth tokens**: JWT access tokens are stored in `localStorage` on the web client per current
  convention — do not introduce a second, inconsistent storage mechanism without discussion.
  Never log tokens, password hashes, or challenge-response secrets.
- Route protection goes through the existing `checkAccessToken` middleware — do not bypass it or
  create parallel ad-hoc auth checks in individual routes.
- **PDPA (Thailand's Personal Data Protection Act) compliance:**
  - Collect and store only the personal data genuinely necessary for the repair-request
    workflow (student name, room number, contact info, repair details, photos, permission to
    enter room) — do not add new personal-data fields "for later" without justification.
  - Where personal data is displayed (student profile, room-entry permission, contact info),
    surface it only to roles that need it (student themself, assigned technician, admin/staff)
    — respect the existing role-based access model (student / staff / technician / admin).
  - When a feature touches personal data collection or display for the first time, flag to the
    user that a notice/consent point may be needed — do not assume it is already covered.
  - Avoid retaining personal data in logs, error messages, or debug output.

---

## 4. Agentic Behavior & Guardrails

- **Backend/SQL schema is off-limits by default.** Do not alter tables, columns, models, or
  business logic in `/backend` unless the user explicitly asks for a backend change in this
  turn. Frontend/mobile field mismatches (e.g. missing `studentName`/`roomNumber`) are known and
  should be worked around or flagged, not silently "fixed" by editing the backend.
- **Before proposing any new SQL table/column for a feature, check the current live schema
  first** (ask the user for a fresh dump if one isn't already available in the conversation) to
  confirm no existing column/table already serves that purpose — only propose adding or
  modifying schema once its absence is confirmed. (Precedent: almost proposed a new
  `repair_report` column duplicating the already-existing but unused `progress_detail_des`
  column, caught only after the user shared a real SQL dump.)
- **Do not edit files marked as locked/do-not-touch** (e.g. `repair_info.dart`) even if a change
  there would be the most direct fix — propose the change and ask instead.
- **Do not restyle, redecorate, or restructure existing UI** (e.g. `BrandPanel`) beyond genuine
  bug fixes. Bug-fix-only policy applies to visually "finished" components unless redesign is
  explicitly requested.
- When a request is ambiguous about which sub-project (backend / staff-portal / student-app) it
  targets, state the assumed scope before proceeding rather than editing all three.
- **When asked to help design a UI/screen, always present an HTML/static mockup for the user to
  choose from first — do not go straight to hand-coding the final React/Flutter implementation.**
  Get an explicit pick before implementing.
- Never introduce a new library, state-management approach, or architectural pattern (e.g.
  switching Tailwind versions, adding Redux, changing the API-layer pattern) without flagging it
  and getting confirmation — match what's already there.
- If a task would require inventing data that should come from the backend, use clearly marked
  mock data (see `TODO: 🔌` convention) rather than fabricating values silently.
- **After manually testing add/edit/delete against a live database (e.g. via curl or a script),
  delete any test records created and reset the affected table's `AUTO_INCREMENT` back to its
  prior value before finishing** — do not leave test data or advanced ID counters behind in a
  shared dev database.
- **After every code change, summarize what was changed** — see Section 7 below.

---

## 5. Error Handling & Validation

- Backend:
  - All prepared-statement queries wrapped with error handling that returns clear,
    non-leaky error responses (no raw SQL errors or stack traces sent to the client).
  - Validate request payloads before touching the database — required fields, correct types,
    valid enum/ID ranges (status IDs, repair-type IDs 1–6, `allow_entry` in `{'yes','no'}`).
  - Auth middleware failures (`checkAccessToken`) must return a consistent 401/403 shape the
    frontend/mobile can branch on reliably.
- Frontend (React) / Mobile (Flutter):
  - Handle and surface network/API failures gracefully in the UI — do not let a failed fetch
    leave a screen in a silent broken state.
  - Validate user-entered data client-side before submission (repair-report form: required
    fields, description length, valid repair-type selection, image attachment constraints) —
    but treat this as UX convenience only, never a substitute for server-side validation.
  - Where a value from the backend is parsed (e.g. repair-type as numeric ID vs string), guard
    against type mismatches explicitly — this project has previously hit a
    `FormatException` from an unguarded numeric parse of a repair-type value; do not
    reintroduce that class of bug.
- Status values are the Thai-language canonical strings from the backend
  (`'รอตรวจสอบ'`, `'กำลังซ่อม'`, `'เสร็จแล้ว'`, etc.) — validate/compare against these exact
  strings, don't invent English equivalents for internal logic.

---

## 6. UI/UX & Component Guidelines

- **Responsive support requirement:** student-facing surfaces (Flutter app, and any
  student-facing web views) must support phone and tablet form factors. Staff-facing surfaces
  are desktop-first/desktop-only by established convention (permanent sidebar, no mobile nav) —
  do not add mobile responsiveness to staff screens unless asked.
- Language: **Thai-language UI throughout**, both web and mobile.
- Design system (must be reused, not reinvented per screen):
  - Colors: navy/gold — `kNavy #1A3A6C`, `kNavyDark #0F2347`, `kGold #FFD700`.
  - Typography: Sarabun (Thai), Inter / Be Vietnam Pro (Latin/buttons/headings).
  - Visual tone: clean and restrained — pale status colors, light-gray dividers, muted secondary
    text, blue accents, centered support text, small footer.
- Reusable UI building blocks — use the existing ones instead of creating new one-off variants:
  - React: `StatusCard`, `RepairCard`, `BaseModal`, `StatusPill`, `EquipmentPickerCard`,
    `renderSidebar(activePage)`-style sidebar, split-screen login layout
    (`BrandPanel` + `LoginForm`).
  - Flutter: `status_card.dart`, `repair_info.dart` (locked), `work_type_chip.dart`,
    `problem_report_card.dart`.
- List views: paginated card grid pattern (established on the equipment page) is the default —
  don't switch to infinite scroll without discussion.
- Assets: prefer inline SVG / Material Symbols over external image URLs.
- **Mockup-first workflow:** for any new screen or significant UI change, produce an HTML mockup
  for the user to review and choose before implementing it in React or Flutter.

---

## 7. Change Summaries (required after every code edit)

After every code change, provide a concise summary covering:
1. **What changed** — files touched and the nature of the change.
2. **Why** — the reasoning, especially for anything non-obvious.
3. **Scope check** — confirm nothing outside the intended sub-project/backend boundary was
   touched (see Section 4 guardrails).
4. **Open items** — any `TODO: 🔌` / mock-data markers left behind, and any known gaps
   (e.g. missing backend fields) relevant to the change.

---

## Quick Reference

| Area | Backend | Staff Portal (React) | Student App (Flutter) |
|---|---|---|---|
| Language | JS (Node) | JS/JSX | Dart |
| Style | camelCase, snake_case (DB) | camelCase, PascalCase components | camelCase, PascalCase classes |
| Auth | JWT + challenge-response SHA-256 | `access_token` in localStorage | Bearer token via `AppAPI` |
| Layout | — | Desktop-only, permanent sidebar | Responsive: phone + tablet |
| Off-limits by default | Schema/model changes | `BrandPanel` decoration | `repair_info.dart` |
| Data source of truth | ✅ (canonical) | Mirrors backend | Mirrors backend |
