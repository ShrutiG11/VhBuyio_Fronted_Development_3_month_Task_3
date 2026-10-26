(() => {
  "use strict";

  const $ = (selector, rootElement = document) => rootElement.querySelector(selector);
  const $$ = (selector, rootElement = document) => [...rootElement.querySelectorAll(selector)];
  const PAGE_SIZE = 9;
  const STATUS_LABELS = { TODO: "To do", IN_PROGRESS: "In progress", COMPLETED: "Completed" };
  const state = { records: [], filtered: [], page: 1, view: "dashboard", deletingId: null, busy: false };

  const el = {
    pageTitle: $("#page-title"), welcomeCopy: $("#welcome-copy"), today: $("#today-date"),
    total: $("#stat-total"), progress: $("#stat-progress"), completed: $("#stat-completed"), overdue: $("#stat-overdue"),
    navCount: $("#nav-record-count"), mobileCount: $("#mobile-nav-count"), heading: $("#records-heading"),
    subtitle: $("#section-subtitle"), summary: $("#results-summary"), viewLabel: $("#view-label"),
    search: $("#search-input"), category: $("#category-filter"), status: $("#status-filter"), sort: $("#sort-select"),
    reset: $("#reset-filters"), grid: $("#records-grid"), loading: $("#loading-state"), empty: $("#empty-state"),
    emptyTitle: $("#empty-title"), emptyCopy: $("#empty-copy"), pagination: $("#pagination-row"),
    paginationInfo: $("#pagination-info"), pageNumber: $("#page-number"), previous: $("#previous-page"), next: $("#next-page"),
    dialog: $("#record-dialog"), form: $("#record-form"), dialogTitle: $("#dialog-title"), dialogEyebrow: $("#dialog-eyebrow"),
    id: $("#record-id"), title: $("#record-title"), description: $("#record-description"), formCategory: $("#record-category"),
    formStatus: $("#record-status"), date: $("#record-date"), save: $("#save-record-button"), saveLabel: $("#save-button-label"),
    spinner: $("#save-spinner"), confirmDialog: $("#confirm-dialog"), confirmCopy: $("#confirm-copy"),
    confirmDelete: $("#confirm-delete"), clearDialog: $("#clear-dialog"), confirmClear: $("#confirm-clear"),
    importFile: $("#import-file"), toastRegion: $("#toast-region"), mobileMenu: $("#mobile-menu"),
    mobileToggle: $("#mobile-menu-toggle"), settings: $("#settings-popover"), utility: $("#utility-button")
  };

  function makeId() {
    return window.crypto?.randomUUID?.() || `vlr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function todayISO() {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!value) return "No date";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function applyTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selected;
    ["#theme-toggle", "#theme-toggle-desktop"].forEach((selector) => {
      const button = $(selector);
      if (!button) return;
      button.setAttribute("aria-label", selected === "dark" ? "Switch to light theme" : "Switch to dark theme");
      button.title = selected === "dark" ? "Switch to light theme" : "Switch to dark theme";
    });
    $('meta[name="theme-color"]')?.setAttribute("content", selected === "dark" ? "#202431" : "#f5f7fb");
  }

  function toast(title, message, type = "success") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.innerHTML = `<span class="toast-icon" aria-hidden="true">${type === "error" ? "!" : type === "info" ? "i" : "✓"}</span><span class="toast-message"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></span><button class="toast-close" type="button" aria-label="Dismiss notification">×</button>`;
    const dismiss = () => {
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
      window.setTimeout(() => node.remove(), 180);
    };
    $(".toast-close", node).addEventListener("click", dismiss);
    el.toastRegion.append(node);
    window.setTimeout(dismiss, 4200);
  }

  function reportError(message, error) {
    console.error(`[VELORA] ${message}`, error);
    toast("Something went wrong", `${message} ${error?.message || "Please try again."}`, "error");
  }

  function setLoading(loading) {
    el.loading.hidden = !loading;
    if (loading) {
      el.grid.hidden = true;
      el.empty.hidden = true;
      el.pagination.hidden = true;
    }
  }

  function getFormValues() {
    return {
      title: el.title.value.trim(),
      description: el.description.value.trim(),
      category: el.formCategory.value,
      status: el.formStatus.value,
      date: el.date.value
    };
  }

  function validate(values) {
    const errors = {};
    if (!values.title) errors.title = "Please enter a title.";
    else if (values.title.length > 100) errors.title = "Title must be 100 characters or fewer.";
    if (values.description.length > 1000) errors.description = "Description must be 1,000 characters or fewer.";
    if (!values.category) errors.category = "Please choose a category.";
    if (!Object.hasOwn(STATUS_LABELS, values.status)) errors.status = "Please choose a valid status.";
    if (!values.date) errors.date = "Please choose a date.";
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(new Date(`${values.date}T00:00:00`).getTime())) {
      errors.date = "Please enter a valid date.";
    }
    return errors;
  }

  function clearValidation() {
    $$(".field-error").forEach((field) => { field.textContent = ""; });
    $$(".has-error").forEach((field) => field.classList.remove("has-error"));
  }

  function showValidation(errors) {
    clearValidation();
    Object.entries(errors).forEach(([key, message]) => {
      $(`#record-${key}`)?.classList.add("has-error");
      const errorElement = $(`#${key}-error`);
      if (errorElement) errorElement.textContent = message;
    });
    const firstKey = Object.keys(errors)[0];
    if (firstKey) $(`#record-${firstKey}`)?.focus();
  }

  function openCreateDialog() {
    clearValidation();
    el.form.reset();
    el.id.value = "";
    el.formStatus.value = "TODO";
    el.date.value = todayISO();
    el.dialogTitle.textContent = "Create a record";
    el.dialogEyebrow.textContent = "ADD TO YOUR COLLECTION";
    el.saveLabel.textContent = "Save record";
    el.dialog.showModal();
    window.setTimeout(() => el.title.focus(), 40);
  }

  async function openEditDialog(id) {
    try {
      const record = await window.VeloraDB.get(id);
      if (!record) {
        toast("Record not found", "It may have already been removed.", "error");
        await loadRecords();
        return;
      }
      clearValidation();
      el.id.value = record.id;
      el.title.value = record.title;
      el.description.value = record.description || "";
      el.formCategory.value = record.category;
      el.formStatus.value = record.status;
      el.date.value = record.date;
      el.dialogTitle.textContent = "Edit record";
      el.dialogEyebrow.textContent = "REFINE YOUR COLLECTION";
      el.saveLabel.textContent = "Save changes";
      el.dialog.showModal();
      window.setTimeout(() => el.title.focus(), 40);
    } catch (error) {
      reportError("Could not open this record for editing.", error);
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    if (state.busy) return;

    const values = getFormValues();
    const errors = validate(values);
    if (Object.keys(errors).length) {
      showValidation(errors);
      toast("Check the form", "Please correct the highlighted fields.", "error");
      return;
    }

    state.busy = true;
    el.save.disabled = true;
    el.spinner.hidden = false;
    const editingId = el.id.value;
    const existing = state.records.find((record) => record.id === editingId);
    const now = new Date().toISOString();
    const record = {
      id: editingId || makeId(),
      ...values,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    try {
      if (editingId) await window.VeloraDB.update(record);
      else await window.VeloraDB.add(record);
      el.dialog.close();
      state.page = 1;
      await loadRecords();
      toast(editingId ? "Record updated" : "Record created", editingId ? "Your changes have been saved." : "Your new record is safely stored on this device.");
    } catch (error) {
      reportError(editingId ? "Your changes could not be saved." : "This record could not be created.", error);
    } finally {
      state.busy = false;
      el.save.disabled = false;
      el.spinner.hidden = true;
    }
  }

  function openDeleteDialog(id) {
    const record = state.records.find((item) => item.id === id);
    if (!record) return;
    state.deletingId = id;
    el.confirmCopy.textContent = `“${record.title}” will be permanently removed from this device. This action cannot be undone.`;
    el.confirmDialog.showModal();
  }

  async function deleteRecord() {
    if (!state.deletingId) return;
    el.confirmDelete.disabled = true;
    try {
      await window.VeloraDB.remove(state.deletingId);
      el.confirmDialog.close();
      state.deletingId = null;
      await loadRecords();
      toast("Record deleted", "The record has been removed from your collection.");
    } catch (error) {
      reportError("Could not delete this record.", error);
    } finally {
      el.confirmDelete.disabled = false;
    }
  }

  async function clearAllRecords() {
    el.confirmClear.disabled = true;
    try {
      await window.VeloraDB.clear();
      el.clearDialog.close();
      await loadRecords();
      toast("Collection cleared", "All records have been removed from this browser.");
    } catch (error) {
      reportError("Could not clear your collection.", error);
    } finally {
      el.confirmClear.disabled = false;
    }
  }

  function visibleRecords() {
    const query = el.search.value.trim().toLocaleLowerCase();
    const category = el.category.value;
    const status = el.status.value;
    const records = state.records.filter((record) =>
      (!query || record.title.toLocaleLowerCase().includes(query)) &&
      (category === "all" || record.category === category) &&
      (status === "all" || record.status === status)
    );

    records.sort((a, b) => {
      switch (el.sort.value) {
        case "date-asc": return a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
        case "title-asc": return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        case "title-desc": return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
        default: return b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt);
      }
    });
    return records;
  }

  function updateCategoryOptions() {
    const selected = el.category.value || window.VeloraStorage.get("category") || "all";
    const categories = [...new Set(state.records.map((record) => record.category).filter(Boolean))].sort();
    el.category.innerHTML = '<option value="all">All categories</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      el.category.append(option);
    });
    el.category.value = categories.includes(selected) ? selected : "all";
  }

  function updateStats() {
    const records = state.records;
    el.total.textContent = records.length.toLocaleString();
    el.progress.textContent = records.filter((record) => record.status === "IN_PROGRESS").length.toLocaleString();
    el.completed.textContent = records.filter((record) => record.status === "COMPLETED").length.toLocaleString();
    el.overdue.textContent = records.filter((record) => record.status !== "COMPLETED" && record.date < todayISO()).length.toLocaleString();
    el.navCount.textContent = records.length;
    el.mobileCount.textContent = records.length;
  }

  function createCard(record, index) {
    const card = document.createElement("article");
    card.className = "record-card";
    card.style.animationDelay = `${Math.min(index * 35, 175)}ms`;
    card.innerHTML = `
      <div class="record-card-top">
        <span class="record-category"><span class="category-dot" data-category="${escapeHTML(record.category)}"></span>${escapeHTML(record.category)}</span>
        <button class="card-menu-button" type="button" data-action="edit" data-id="${escapeHTML(record.id)}" aria-label="Edit ${escapeHTML(record.title)}" title="Edit record">···</button>
      </div>
      <h3>${escapeHTML(record.title)}</h3>
      <p class="record-description ${record.description ? "" : "is-empty"}">${record.description ? escapeHTML(record.description) : "No description added yet."}</p>
      <div class="record-card-bottom">
        <span class="record-date"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>${escapeHTML(formatDate(record.date))}</span>
        <span class="status-badge status-${escapeHTML(record.status)}">${escapeHTML(STATUS_LABELS[record.status] || "Unknown")}</span>
      </div>
      <div class="record-card-actions" aria-label="Record actions">
        <button class="card-action edit" type="button" data-action="edit" data-id="${escapeHTML(record.id)}" aria-label="Edit ${escapeHTML(record.title)}" title="Edit record"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/></svg></button>
        <button class="card-action delete" type="button" data-action="delete" data-id="${escapeHTML(record.id)}" aria-label="Delete ${escapeHTML(record.title)}" title="Delete record"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg></button>
      </div>`;
    return card;
  }

  function render() {
    state.filtered = visibleRecords();
    const total = state.filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRecords = state.filtered.slice(start, start + PAGE_SIZE);

    el.grid.replaceChildren(...pageRecords.map(createCard));
    el.loading.hidden = true;
    const noResults = total === 0;
    el.grid.hidden = noResults;
    el.empty.hidden = !noResults;
    el.pagination.hidden = noResults || total <= PAGE_SIZE;

    const hasFilters = Boolean(el.search.value.trim()) || el.category.value !== "all" || el.status.value !== "all";
    el.reset.hidden = !hasFilters && el.sort.value === "date-desc";
    if (noResults) {
      const hasRecords = state.records.length > 0;
      el.emptyTitle.textContent = hasRecords ? "Nothing matches just yet." : "A fresh page.";
      el.emptyCopy.textContent = hasRecords
        ? "Try another search or clear your filters to see your records."
        : "Your collection is waiting. Add your first record and make this space yours.";
      $("#empty-create-button").hidden = hasRecords;
    } else {
      $("#empty-create-button").hidden = false;
    }

    $("#heading-count").textContent = total;
    el.summary.textContent = total
      ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} record${total === 1 ? "" : "s"}`
      : "No records to show";
    el.paginationInfo.textContent = `Showing ${total ? start + 1 : 0}–${Math.min(start + PAGE_SIZE, total)} of ${total}`;
    el.pageNumber.textContent = `${state.page} / ${pages}`;
    el.previous.disabled = state.page <= 1;
    el.next.disabled = state.page >= pages;
    el.viewLabel.textContent = state.view === "dashboard" ? "Overview" : "All records";
    el.heading.innerHTML = `${state.view === "dashboard" ? "Recent records" : "All records"} <span id="heading-count" class="heading-count">${total}</span>`;
    el.subtitle.textContent = state.view === "dashboard"
      ? "A clear view of what matters right now."
      : "Every record in your collection, ready to organize.";
  }

  async function loadRecords() {
    setLoading(true);
    try {
      const records = await window.VeloraDB.getAll();
      state.records = records
        .filter((record) => record && typeof record.id === "string" && typeof record.title === "string")
        .map((record) => ({
          description: "", category: "Other", status: "TODO", date: todayISO(),
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...record
        }));
      updateCategoryOptions();
      updateStats();
      render();
    } catch (error) {
      el.loading.hidden = true;
      el.grid.hidden = true;
      el.empty.hidden = false;
      el.emptyTitle.textContent = "We couldn't open your collection.";
      el.emptyCopy.textContent = "Your browser may have blocked local storage. Check browser settings and reload the page.";
      $("#empty-create-button").hidden = true;
      reportError("Storage is unavailable.", error);
    }
  }

  function setView(view) {
    state.view = view === "records" ? "records" : "dashboard";
    $$("[data-view]").forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle("is-active", active);
      if (button.classList.contains("nav-link") && active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    el.pageTitle.innerHTML = state.view === "dashboard" ? "A little more <em>organized.</em>" : "Everything in <em>one place.</em>";
    el.welcomeCopy.textContent = state.view === "dashboard"
      ? "Your ideas, projects, and plans — all in one thoughtful place."
      : "Browse, refine, and manage every record in your collection.";
    el.mobileMenu.hidden = true;
    el.mobileToggle.setAttribute("aria-expanded", "false");
    render();
  }

  function resetFilters() {
    el.search.value = "";
    el.category.value = "all";
    el.status.value = "all";
    el.sort.value = "date-desc";
    window.VeloraStorage.resetFilters();
    state.page = 1;
    render();
  }

  function exportRecords() {
    try {
      const data = { app: "VELORA Record Management Studio", schemaVersion: 1, exportedAt: new Date().toISOString(), records: state.records };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `velora-records-${todayISO()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast("Export ready", `${state.records.length} record${state.records.length === 1 ? "" : "s"} exported as JSON.`);
    } catch (error) {
      reportError("Your records could not be exported.", error);
    }
  }

  function normalizeImportedRecord(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const category = typeof item.category === "string" ? item.category.trim() : "";
    const status = Object.hasOwn(STATUS_LABELS, item.status) ? item.status : "TODO";
    const date = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "";
    if (!title || title.length > 100 || description.length > 1000 || !category || category.length > 60 || !date) return null;
    const now = new Date().toISOString();
    return {
      id: typeof item.id === "string" && item.id.length <= 100 ? item.id : makeId(),
      title, description, category, status, date,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now
    };
  }

  async function importFromFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("File too large", "Choose a JSON file smaller than 5 MB.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const source = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(source)) throw new Error("This file does not contain a records array.");
      const valid = source.map(normalizeImportedRecord).filter(Boolean);
      if (source.length && !valid.length) throw new Error("No valid records were found. Check the JSON structure.");
      await window.VeloraDB.importRecords(valid);
      state.page = 1;
      await loadRecords();
      toast("Import complete", `${valid.length} valid record${valid.length === 1 ? "" : "s"} imported or updated.`);
    } catch (error) {
      reportError("Could not import this JSON file.", error);
    } finally {
      el.importFile.value = "";
    }
  }

  function keyboardShortcuts(event) {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (event.key === "Escape") {
      el.settings.hidden = true;
      return;
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "/" && !el.dialog.open && !el.confirmDialog.open) {
      event.preventDefault();
      el.search.focus();
    } else if (event.key.toLowerCase() === "n" && !el.dialog.open && !el.confirmDialog.open && !el.clearDialog.open) {
      event.preventDefault();
      openCreateDialog();
    }
  }

  function bindEvents() {
    ["#theme-toggle", "#theme-toggle-desktop"].forEach((selector) => {
      const themeButton = $(selector);
      if (!themeButton) return;
      themeButton.addEventListener("click", () => {
        const next = window.VeloraStorage.get("theme") === "dark" ? "light" : "dark";
        window.VeloraStorage.set("theme", next);
        applyTheme(next);
      });
    });
    ["#top-create", "#new-record-button", "#empty-create-button"].forEach((selector) => $(selector).addEventListener("click", openCreateDialog));
    $("#dialog-close").addEventListener("click", () => el.dialog.close());
    $("#cancel-record").addEventListener("click", () => el.dialog.close());
    el.dialog.addEventListener("click", (event) => { if (event.target === el.dialog) el.dialog.close(); });
    el.form.addEventListener("submit", submitForm);
    el.form.addEventListener("input", (event) => {
      const key = event.target.id.replace("record-", "");
      const errorElement = $(`#${key}-error`);
      if (errorElement) {
        errorElement.textContent = "";
        event.target.classList.remove("has-error");
      }
    });

    el.grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      if (button.dataset.action === "edit") openEditDialog(button.dataset.id);
      if (button.dataset.action === "delete") openDeleteDialog(button.dataset.id);
    });
    $("#cancel-delete").addEventListener("click", () => {
      el.confirmDialog.close();
      state.deletingId = null;
    });
    el.confirmDelete.addEventListener("click", deleteRecord);
    el.confirmDialog.addEventListener("click", (event) => {
      if (event.target === el.confirmDialog) {
        el.confirmDialog.close();
        state.deletingId = null;
      }
    });
    $("#cancel-clear").addEventListener("click", () => el.clearDialog.close());
    el.confirmClear.addEventListener("click", clearAllRecords);

    el.search.addEventListener("input", () => { state.page = 1; render(); });
    el.category.addEventListener("change", () => { state.page = 1; window.VeloraStorage.set("category", el.category.value); render(); });
    el.status.addEventListener("change", () => { state.page = 1; window.VeloraStorage.set("status", el.status.value); render(); });
    el.sort.addEventListener("change", () => { state.page = 1; window.VeloraStorage.set("sort", el.sort.value); render(); });
    el.reset.addEventListener("click", resetFilters);
    el.previous.addEventListener("click", () => { if (state.page > 1) { state.page--; render(); } });
    el.next.addEventListener("click", () => {
      if (state.page < Math.ceil(state.filtered.length / PAGE_SIZE)) { state.page++; render(); }
    });

    $("#export-button").addEventListener("click", exportRecords);
    $("#import-button").addEventListener("click", () => { el.settings.hidden = true; el.importFile.click(); });
    el.importFile.addEventListener("change", (event) => importFromFile(event.target.files[0]));
    $("#clear-all-button").addEventListener("click", () => { el.settings.hidden = true; el.clearDialog.showModal(); });
    el.utility.addEventListener("click", (event) => {
      event.stopPropagation();
      el.settings.hidden = !el.settings.hidden;
    });
    document.addEventListener("click", (event) => {
      if (!el.settings.contains(event.target) && event.target !== el.utility) el.settings.hidden = true;
      if (!el.mobileMenu.hidden && !el.mobileMenu.contains(event.target) && !el.mobileToggle.contains(event.target) && !event.target.closest(".topbar")) {
        el.mobileMenu.hidden = true;
        el.mobileToggle.setAttribute("aria-expanded", "false");
      }
    });
    el.mobileToggle.addEventListener("click", () => {
      const opening = el.mobileMenu.hidden;
      el.mobileMenu.hidden = !opening;
      el.mobileToggle.setAttribute("aria-expanded", String(opening));
    });
    $$("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
    document.addEventListener("keydown", keyboardShortcuts);
  }

  async function init() {
    const preferences = window.VeloraStorage.getAll();
    applyTheme(preferences.theme);
    el.status.value = preferences.status;
    el.sort.value = preferences.sort;
    if (el.today) {
      el.today.textContent = formatDate(todayISO(), {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    bindEvents();
    setLoading(true);
    await loadRecords();
    if ([...el.category.options].some((option) => option.value === preferences.category)) {
      el.category.value = preferences.category;
    } else {
      el.category.value = "all";
    }
    render();
  }

  init().catch((error) => reportError("VELORA could not start correctly.", error));
})();
