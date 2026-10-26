# ✦ VELORA

## Record Management Studio

A refined, responsive CRUD workspace built with **HTML, CSS, and Vanilla
JavaScript**.

Create, organize, find, update, and manage records in a clean
interface---with browser-based persistence and no application backend.

## ✨ Overview

**VELORA --- Record Management Studio** is a frontend-only CRUD
application for managing everyday records from a responsive workspace.
It demonstrates core browser development concepts, including DOM
manipulation, form validation, client-side state, IndexedDB persistence,
and LocalStorage preferences.

-   **IndexedDB** stores the main record collection.
-   **LocalStorage** remembers supported interface preferences.
-   **HTML, CSS, and Vanilla JavaScript** power the application.
-   No backend, REST API, framework, or remote database is required for
    the app's record-management flow.

> **Storage note:** Records are stored in the current browser profile.
> Clearing that browser's site data can remove them, so use JSON export
> when you need a backup.

## 🚀 Features

### 🗂️ Record management

-   Create records with a title, description, category, status, and
    date.
-   View records in the workspace.
-   Edit existing records using their saved values.
-   Delete records after a confirmation step.
-   Validate required form fields before saving.
-   Generate an ID for each newly created record.
-   Display loading feedback, empty states, and success/error
    notifications.

### 🔎 Search, filter, and sort

-   Search records by title.
-   Filter records by category.
-   Filter records by status.
-   Sort by date or title in ascending or descending order.
-   Reset search and filters.
-   Navigate the collection with pagination.

### 📊 Workspace overview

-   Summary cards for record statistics.
-   Status-based organization.
-   Responsive navigation for different screen sizes.
-   Record count indicators and clear collection views.

### 🎨 Interface and accessibility

-   Light and dark themes.
-   Responsive layouts for desktop, tablet, and mobile.
-   Workspace sidebar, header, and branded footer.
-   Clear hover and keyboard-focus states.
-   Form labels and validation feedback.
-   Confirmation dialogs for destructive actions.
-   Reduced-motion styling support.
-   User-provided record content is escaped before being rendered as
    HTML.

### 💾 Persistence and data portability

-   Versioned IndexedDB database for primary records.
-   IndexedDB object store and indexes for record fields.
-   LocalStorage preferences for theme, category/status filters, and
    sorting.
-   JSON export of the record collection.
-   JSON import with record normalization and invalid-entry handling.
-   Clear-all action with confirmation.

### ⌨️ Keyboard shortcuts

  Shortcut   Action
  ---------- -------------------------------------------
  `/`        Focus the title search
  `N`        Open the new-record form
  `Esc`      Dismiss supported dialogs or transient UI

Shortcuts are intended for use outside editable form fields.

## 🧰 Technology

  -----------------------------------------------------------------------
  Technology                          Purpose
  ----------------------------------- -----------------------------------
  HTML5                               Application structure, forms,
                                      dialogs, and semantic content

  CSS3                                Layout, responsive styling, themes,
                                      and interaction states

  Vanilla JavaScript (ES6+)           DOM updates, validation,
                                      application state, and event
                                      handling

  IndexedDB                           Persistent storage for the main
                                      record collection

  LocalStorage                        Persistent UI preferences

  Browser File API                    JSON import and export
  -----------------------------------------------------------------------

## 📁 Project structure

``` text
VELORA-Record-Management-Studio/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── db.js
│   └── storage.js
└── README.md
```

### Source file guide

-   `index.html` --- application shell, navigation, record form, and
    dialogs.
-   `css/style.css` --- visual styling, responsive layouts, light/dark
    themes, and focus states.
-   `js/app.js` --- application state, rendering, form validation, CRUD
    flows, search, filtering, sorting, pagination, notifications, and
    JSON import/export.
-   `js/db.js` --- IndexedDB setup, versioning, object store, indexes,
    and record transactions.
-   `js/storage.js` --- LocalStorage-backed preference management.

## ▶️ Run locally

1.  Download and extract the project ZIP.
2.  Open the extracted project folder in VS Code.
3.  Launch `index.html` using the **Live Server** extension.
4.  Open the local address provided by Live Server in a modern browser.

No package installation or build step is required. Using a local static
server is recommended for consistent browser storage behavior.

## 🧭 Storage details

  Item               Implementation
  ------------------ ----------------------------------------------------
  Database           `VeloraRecordsDB`
  Database version   `1`
  Object store       `records`
  Indexed fields     `title`, `category`, `status`, `date`, `updatedAt`
  LocalStorage key   `velora.preferences.v1`

Application records and preferences remain in the current browser
profile; they are not uploaded to an application server.

## 📦 JSON import and export

The export action downloads a JSON file containing application metadata
and a `records` array. The importer supports the app's exported format
and raw JSON arrays, normalizes incoming record fields, and skips
entries that do not pass its checks. If an imported record uses an ID
that already exists, that record is updated.

Review the collection after importing data, particularly when combining
files from different backups.

## 🌐 Browser support

Use a current version of Chrome, Edge, Firefox, or Safari with support
for IndexedDB, LocalStorage, the File API, and the HTML dialog element.

If browser storage is unavailable, the application can report storage
errors instead of treating an unsuccessful save as successful. External
font styling may fall back to system fonts when the font provider is
unavailable.

## 🎯 Project scope

VELORA is a **client-side CRUD application**. It does not include a
backend service, authentication system, cloud synchronization, or
server-side database.

The project focuses on record CRUD, browser persistence, search and
organization, responsive UI, preferences, and JSON portability.

------------------------------------------------------------------------

## Author

**Shruti Goswami**