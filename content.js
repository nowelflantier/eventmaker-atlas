(function () {
  if (window.__atlasOverlayInjected) return;
  window.__atlasOverlayInjected = true;

  const PANEL_ID = "atlas-extension-panel";
  const TOGGLE_ID = "atlas-extension-toggle";
  const TOGGLE_SLOT_ID = "atlas-extension-toggle-slot";
  const STYLE_ID = "atlas-extension-style";
  const TAB_ORDER = ["overview", "fields", "segments", "forms", "categories", "emails", "pages", "networking", "automations", "processes"];
  const MERMAID_BRIDGE_ID = "atlas-extension-mermaid-bridge";
  const MERMAID_BRIDGE_ATTR = "data-atlas-mermaid-bridge";
  let toggleMountObserver = null;
  let toggleMountRaf = null;
  const state = {
    isOpen: false,
    isLoading: false,
    lastMessage: null,
    context: window.AtlasEventmakerContext.detectContext(),
    cache: null,
    atlas: null,
    activeTab: "overview",
    selected: null,
    panelWidth: 760,
    isResizing: false,
    search: "",
    searchCaret: null,
    restoreSearchFocus: false,
    suggestion: null,   // NEW
    lang: "fr",        // NEW
    filters: {
      fieldOrigin: null,
      fieldWarnings: false,
      fieldFocus: null,
      segmentStatus: null,
      segmentWarnings: false,
      formWarnings: false,
      pageComplexity: null,
      networkingWarnings: false,
      networkingScope: null,
      automationWarnings: false,
      automationEnabledOnly: false
    }
  };

  if (window.AtlasEventmakerUrls) {
    window.AtlasEventmakerUrls.getLang().then(function(lang) { state.lang = lang; });
  }
  injectStyles();
  createUi();
  restoreUiState().then(function() {
    render();
    syncCacheFromContext();
    watchLocationChanges();
    startToggleMountObserver();
  });

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --atlas-bg: #eef4f3;
        --atlas-bg-soft: #f8fbfa;
        --atlas-panel: #ffffff;
        --atlas-border: #d8e4e1;
        --atlas-text: #17312f;
        --atlas-text-soft: #647a78;
        --atlas-accent: #209991;
        --atlas-accent-soft: rgba(32, 153, 145, 0.12);
        --atlas-danger: #c95a5a;
        --atlas-warning: #b8892f;
        --atlas-field: #005fb8;
        --atlas-segment: #6f3fd1;
        --atlas-form: #006fcf;
        --atlas-category: #d2477b;
        --atlas-page: #0d7a3a;
        --atlas-networking: #b8892f;
        --atlas-automation: #c65d0e;
      }

      #${TOGGLE_ID} {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border: 1px solid rgba(23, 49, 47, .10);
        border-radius: 10px;
        background: rgba(255, 255, 255, .92);
        color: #495b59;
        font: 600 12px/1.2 Arial, sans-serif;
        cursor: pointer;
        white-space: nowrap;
      }

      #${TOGGLE_ID}:hover {
        color: var(--atlas-text);
        border-color: rgba(32, 153, 145, .28);
        background: rgba(255, 255, 255, .98);
      }

      #${TOGGLE_ID}.is-active {
        color: var(--atlas-accent);
        border-color: rgba(32, 153, 145, .35);
        background: rgba(32, 153, 145, .08);
      }

      #${TOGGLE_ID} .atlas-toggle-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: currentColor;
        opacity: .85;
      }

      .atlas-toggle-slot {
        display: inline-flex;
        align-items: center;
        margin-left: 10px;
      }

      .atlas-toggle-slot.is-builder {
        margin-right: 8px;
      }

      .atlas-toggle-slot.is-form {
        margin-left: 12px;
        margin-right: 0;
      }

      .atlas-toggle-slot.is-bo {
        margin-right: 10px;
      }

      .atlas-builder-actions {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
      }

      body {
        transition: padding-right 160ms ease !important;
      }

      #${PANEL_ID} {
        position: fixed;
        top: 0;
        right: 0;
        width: 760px;
        min-width: 460px;
        max-width: 92vw;
        height: 100vh;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        background: linear-gradient(180deg, #ffffff 0%, #f4f8f7 100%);
        color: var(--atlas-text);
        border-left: 1px solid var(--atlas-border);
        box-shadow: -24px 0 48px rgba(20, 52, 49, .14);
        transform: translateX(100%);
        transition: transform 160ms ease;
        font: 14px/1.5 Arial, sans-serif;
      }

      #${PANEL_ID}.is-open { transform: translateX(0); }
      #${PANEL_ID} button { font: inherit; }

      .atlas-resize-handle {
        position: absolute;
        top: 0;
        left: 0;
        width: 10px;
        height: 100%;
        cursor: ew-resize;
        background: linear-gradient(90deg, rgba(32,153,145,.18), rgba(32,153,145,0));
      }

      .atlas-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--atlas-border);
        background: rgba(255, 255, 255, 0.92);
      }

      .atlas-panel-title { display: flex; flex-direction: column; gap: 4px; }
      .atlas-panel-title strong { font-size: 16px; letter-spacing: .02em; }
      .atlas-panel-title span { color: var(--atlas-text-soft); font-size: 12px; }

      .atlas-close, .atlas-button {
        border: 1px solid var(--atlas-border);
        border-radius: 10px;
        background: #ffffff;
        color: var(--atlas-text);
        padding: 8px 12px;
        cursor: pointer;
        font-weight: 600;
      }

      .atlas-button.is-primary {
        background: var(--atlas-accent);
        color: #ffffff;
        border-color: transparent;
        font-weight: 700;
      }

      .atlas-button[disabled] { opacity: .6; cursor: wait; }

      .atlas-tabs {
        display: flex;
        gap: 8px;
        padding: 14px 20px 12px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--atlas-border);
        background: rgba(248, 251, 250, 0.96);
      }

      .atlas-searchbar {
        padding: 12px 20px;
        border-bottom: 1px solid var(--atlas-border);
        background: rgba(248, 251, 250, 0.96);
      }

      .atlas-searchbar:empty {
        display: none;
      }

      .atlas-searchbar input {
        width: 100%;
        padding: 7px 12px;
        background: #ffffff;
        border: 1px solid var(--atlas-border);
        border-radius: 6px;
        color: var(--atlas-text);
        font-size: 13px;
        outline: none;
        font-family: inherit;
      }

      .atlas-searchbar input:focus {
        border-color: var(--atlas-accent);
      }

      .atlas-filters {
        padding: 10px 20px;
        border-bottom: 1px solid var(--atlas-border);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        background: #ffffff;
      }

      .atlas-filters:empty {
        display: none;
      }

      .atlas-chip {
        padding: 4px 9px;
        background: var(--atlas-bg-soft);
        border: 1px solid var(--atlas-border);
        border-radius: 999px;
        font-size: 11px;
        color: var(--atlas-text-soft);
        cursor: pointer;
        user-select: none;
      }

      .atlas-chip:hover {
        color: var(--atlas-text);
      }

      .atlas-chip.is-active {
        color: var(--atlas-text);
        background: #dff0ed;
        border-color: var(--atlas-accent);
      }

      .atlas-tab {
        border: 1px solid var(--atlas-border);
        background: #ffffff;
        color: var(--atlas-text-soft);
        border-radius: 999px;
        padding: 8px 13px;
        cursor: pointer;
        font-weight: 600;
      }

      .atlas-tab.is-active {
        background: var(--atlas-accent-soft);
        color: var(--atlas-text);
        border-color: rgba(32,153,145,.5);
      }

      .atlas-panel-body {
        padding: 16px 20px 20px;
        overflow: auto;
        display: grid;
        gap: 16px;
      }

      .atlas-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 20px;
        border-bottom: 1px solid var(--atlas-border);
        background: rgba(255, 255, 255, 0.9);
      }

      .atlas-toolbar:empty {
        display: none;
      }

      .atlas-card {
        border: 1px solid var(--atlas-border);
        border-radius: 16px;
        padding: 17px 18px;
        background: #ffffff;
      }

      .atlas-card h3 {
        margin: 0 0 10px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: var(--atlas-text-soft);
      }

      .atlas-detail-title {
        margin: 0 0 4px 0;
        font-size: 22px;
        font-weight: 600;
        color: var(--atlas-text);
      }

      .atlas-detail-subtitle {
        font-family: ui-monospace, "SF Mono", Consolas, monospace;
        color: var(--atlas-text-soft);
        font-size: 13px;
        margin-bottom: 12px;
      }

      .atlas-detail-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .atlas-open-in-em {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 7px 12px;
        border: 1px solid rgba(32, 153, 145, .24);
        border-radius: 10px;
        background: rgba(32, 153, 145, .06);
        color: var(--atlas-accent);
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        transition: border-color 80ms, background 80ms;
      }

      .atlas-open-in-em:hover {
        border-color: var(--atlas-accent);
        background: var(--atlas-accent-soft);
      }

      .atlas-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px 12px;
      }

      .atlas-grid dt { color: var(--atlas-text-soft); }
      .atlas-grid dd { margin: 0; word-break: break-word; }

      .atlas-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .atlas-note { margin: 0; color: var(--atlas-text-soft); }

      .atlas-status {
        margin-top: 12px;
        padding: 12px;
        border-radius: 12px;
        white-space: pre-wrap;
        background: #fffaf0;
        border: 1px solid rgba(216,166,79,.35);
      }

      .atlas-status.is-success { border-color: rgba(32,153,145,.45); }
      .atlas-status.is-error { border-color: rgba(220,111,111,.45); }

      .atlas-summary-list {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .atlas-summary-item {
        padding: 12px;
        border-radius: 12px;
        border: 1px solid var(--atlas-border);
        background: #ffffff;
        cursor: pointer;
      }

      .atlas-summary-item:not([data-tab-jump]):not([type="button"]) {
        cursor: default;
      }

      .atlas-summary-item strong { display: block; font-size: 22px; }
      .atlas-summary-item span { color: var(--atlas-text-soft); font-size: 12px; }

      .atlas-split {
        display: grid;
        grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
        gap: 16px;
      }

      .atlas-list {
        display: block;
        max-height: 58vh;
        overflow: auto;
        min-width: 0;
        border: 1px solid var(--atlas-border);
        border-radius: 8px;
        background: #ffffff;
      }

      .atlas-list-item {
        border: 0;
        border-bottom: 1px solid var(--atlas-border);
        background: #ffffff;
        padding: 10px 14px;
        cursor: pointer;
        width: 100%;
        text-align: left;
        min-width: 0;
        overflow: hidden;
        display: flex;
        gap: 11px;
        align-items: flex-start;
        border-radius: 0;
      }

      .atlas-list-item.is-active {
        background: #e5f3f1;
        box-shadow: inset 2px 0 0 var(--atlas-accent);
        padding-left: 12px;
      }

      .atlas-list-item:hover {
        background: #f2f8f7;
      }

      .atlas-type-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
      }

      .atlas-list-body {
        flex: 1;
        min-width: 0;
      }

      .atlas-list-label {
        display: block;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .atlas-list-key {
        display: block;
        font-family: ui-monospace, "SF Mono", Consolas, monospace;
        font-size: 11px;
        color: var(--atlas-text-soft);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .atlas-list-meta {
        display: flex;
        gap: 6px;
        margin-top: 3px;
        align-items: center;
        flex-wrap: wrap;
      }

      .atlas-list-coverage {
        display: block;
        margin-top: 4px;
        color: var(--atlas-text-soft);
        font-size: 11px;
        line-height: 1.35;
      }

      .atlas-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 10px;
        margin-bottom: 20px;
      }

      .atlas-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 7px;
        border-radius: 999px;
        border: 1px solid var(--atlas-border);
        color: var(--atlas-text-soft);
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .2px;
      }

      .atlas-badge.is-warning {
        background: #f8d7d4;
        color: #9f1f16;
        border-color: #efb8b2;
      }

      .atlas-badge.is-api {
        background: #f4efe2;
        color: #8a6a2f;
        border-color: #e6d7b0;
      }

      .atlas-badge.is-info {
        background: #d6f0ec;
        color: #0f5f59;
        border-color: #b7e3dc;
      }

      .atlas-badge.is-neutral {
        background: #eef3f6;
        color: #42586b;
        border-color: #d7e1e8;
      }

      .atlas-code {
        margin: 0;
        padding: 12px;
        border-radius: 12px;
        background: #f6fbfa;
        border: 1px solid var(--atlas-border);
        font: 12px/1.5 Consolas, monospace;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .atlas-kv-list {
        display: grid;
        gap: 8px;
      }

      .atlas-kv-row {
        padding: 10px 12px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid var(--atlas-border);
      }

      .atlas-kv-row strong { display: block; }
      .atlas-kv-row span { color: var(--atlas-text-soft); font-size: 12px; }

      .atlas-kv-row.is-clickable {
        width: 100%;
        text-align: left;
        cursor: pointer;
      }

      .atlas-kv-row.is-clickable:hover {
        border-color: rgba(32,153,145,.45);
        background: rgba(32,153,145,.08);
      }

      .atlas-detail-stack {
        display: grid;
        gap: 16px;
      }

      .atlas-inline-muted {
        color: var(--atlas-text-soft);
        font-size: 12px;
      }

      .atlas-detail-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px;
        margin: 0 0 22px 0;
      }

      .atlas-detail-summary-card {
        background: linear-gradient(180deg, #ffffff 0%, #f8fbfa 100%);
        border: 1px solid var(--atlas-border);
        border-radius: 12px;
        padding: 11px 12px;
      }

      .atlas-detail-summary-card .k {
        color: var(--atlas-text-soft);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 5px;
      }

      .atlas-detail-summary-card .v {
        color: var(--atlas-text);
        font-size: 20px;
        font-weight: 700;
        line-height: 1.1;
      }

      .atlas-detail-summary-card .s {
        color: var(--atlas-text-soft);
        font-size: 11px;
        margin-top: 4px;
        line-height: 1.35;
      }

      .atlas-section {
        margin-bottom: 24px;
      }

      .atlas-section-head {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--atlas-border);
      }

      .atlas-section-title {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.2px;
        color: var(--atlas-text);
      }

      .atlas-section-hint {
        color: var(--atlas-text-soft);
        font-size: 12px;
        line-height: 1.45;
        margin: 0 0 12px;
      }

      .atlas-ref-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .atlas-ref-list-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: start;
        gap: 3px 8px;
        padding: 8px 10px;
        background: #ffffff;
        border: 1px solid var(--atlas-border);
        border-radius: 10px;
      }

      .atlas-ref-list-item.is-clickable {
        cursor: pointer;
      }

      .atlas-ref-list-item.is-clickable:hover {
        border-color: var(--atlas-accent);
      }

      .atlas-ref-main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .atlas-ref-label {
        min-width: 0;
        font-weight: 600;
      }

      .atlas-ref-key {
        font-family: ui-monospace, "SF Mono", Consolas, monospace;
        font-size: 11px;
        color: var(--atlas-text-soft);
        word-break: break-word;
      }

      .atlas-ref-subtitle {
        color: var(--atlas-text-soft);
        font-size: 11px;
        line-height: 1.35;
      }

      .atlas-mini-graph {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 160px minmax(0, 1fr);
        gap: 12px;
        align-items: start;
      }

      .atlas-mini-graph-col {
        display: grid;
        gap: 8px;
      }

      .atlas-mini-graph-center {
        border: 1px solid var(--atlas-accent);
        background: #e5f3f1;
        border-radius: 10px;
        padding: 12px;
        text-align: center;
      }

      .atlas-mini-graph-node {
        border: 1px solid var(--atlas-border);
        background: #ffffff;
        border-radius: 8px;
        padding: 10px;
      }

      .atlas-mini-graph-node.is-clickable {
        cursor: pointer;
      }

      .atlas-mini-graph-node.is-clickable:hover {
        border-color: var(--atlas-accent);
      }

      .atlas-mini-graph-node strong {
        display: block;
      }

      .atlas-mini-graph-node span {
        color: var(--atlas-text-soft);
        font-size: 11px;
      }

      .atlas-graph-shell {
        display: grid;
        gap: 10px;
      }

      .atlas-graph-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .atlas-graph-hint {
        color: var(--atlas-text-soft);
        font-size: 12px;
      }

      .atlas-graph-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
      }

      .atlas-graph-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--atlas-text-soft);
        font-size: 11px;
      }

      .atlas-graph-legend-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        flex-shrink: 0;
      }

      .atlas-mermaid-shell {
        border: 1px solid var(--atlas-border);
        border-radius: 12px;
        background: linear-gradient(180deg, #ffffff, #f7fbfa);
        overflow: auto;
      }

      .atlas-mermaid-stage {
        min-height: 280px;
        min-width: 720px;
        padding: 16px;
      }

      .atlas-mermaid-stage[data-mermaid-status="loading"] {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .atlas-mermaid-stage svg {
        display: block;
      }

      @media (max-width: 980px) {
        .atlas-split {
          grid-template-columns: 1fr;
        }
      }

      .atlas-banner {
        margin: 0 20px 12px;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid var(--atlas-border);
        background: #f0f8f7;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
      }
      .atlas-banner.is-warning {
        background: #fff8ed;
        border-color: rgba(184,137,47,.4);
      }
      .atlas-banner span { flex: 1; }
      .atlas-banner-nav {
        border: 1px solid var(--atlas-accent);
        border-radius: 6px;
        background: #fff;
        color: var(--atlas-accent);
        padding: 4px 10px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        white-space: nowrap;
      }
      .atlas-banner-dismiss {
        border: none;
        background: none;
        color: var(--atlas-text-soft);
        cursor: pointer;
        font: inherit;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .atlas-banner-dismiss:hover { background: var(--atlas-bg); }
      .atlas-ext-link {
        display: inline-flex;
        align-items: center;
        margin-left: 6px;
        padding: 2px 5px;
        color: var(--atlas-text-soft);
        font-size: 13px;
        text-decoration: none;
        opacity: 0.35;
        transition: opacity 100ms, color 100ms;
        flex-shrink: 0;
        border-radius: 4px;
      }
      .atlas-ext-link:hover {
        opacity: 1;
        color: var(--atlas-accent);
        background: rgba(32,153,145,.08);
      }
      .atlas-overview-counter {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .atlas-overview-blocking {
        border-color: rgba(201, 90, 90, .35);
        background: #fff8f8;
      }
      .atlas-anomaly-list {
        display: grid;
        gap: 8px;
      }
      .atlas-anomaly-item {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto;
        gap: 2px 10px;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--atlas-border);
        background: #fff;
        text-align: left;
        width: 100%;
        font: inherit;
        cursor: default;
      }
      .atlas-anomaly-item.is-clickable { cursor: pointer; }
      .atlas-anomaly-item.is-clickable:hover { background: #f2f8f7; border-color: var(--atlas-accent); }
      .atlas-anomaly-item .atlas-badge { grid-row: 1 / 3; align-self: center; }
      .atlas-anomaly-label { font-weight: 500; font-size: 13px; }
      .atlas-anomaly-hint { color: var(--atlas-text-soft); font-size: 12px; }
      .atlas-badge.is-danger { background: #fce8e8; color: var(--atlas-danger); border: 1px solid rgba(201,90,90,.3); }
      .atlas-badge.is-ok { background: #e8f5f3; color: #1a7a6e; border: 1px solid rgba(32,153,145,.3); }

      /* Split button */
      .atlas-split-btn {
        display: inline-flex;
        align-items: stretch;
        border-radius: 10px;
        overflow: visible;
        position: relative;
      }

      .atlas-split-main {
        border: none;
        border-radius: 10px 0 0 10px;
        background: var(--atlas-accent);
        color: #ffffff;
        font: 700 13px/1.2 Arial, sans-serif;
        padding: 8px 12px;
        cursor: pointer;
        white-space: nowrap;
      }

      .atlas-split-arrow {
        border: none;
        border-left: 1px solid rgba(255,255,255,0.25);
        border-radius: 0 10px 10px 0;
        background: var(--atlas-accent);
        color: #ffffff;
        padding: 8px 8px;
        cursor: pointer;
        font-size: 10px;
        line-height: 1;
      }

      .atlas-split-main:hover,
      .atlas-split-arrow:hover {
        filter: brightness(1.08);
      }

      .atlas-split-main:disabled,
      .atlas-split-arrow:disabled {
        opacity: .6;
        cursor: wait;
      }

      .atlas-dropdown-menu {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        background: #ffffff;
        border: 1px solid var(--atlas-border);
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(20,52,49,.14);
        z-index: 2147483647;
        min-width: 190px;
        overflow: hidden;
      }

      .atlas-dropdown-item {
        display: block;
        width: 100%;
        padding: 9px 14px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        font: 13px/1.5 Arial, sans-serif;
        color: var(--atlas-text);
      }

      .atlas-dropdown-item:hover { background: var(--atlas-bg-soft); }
      .atlas-dropdown-item.is-danger { color: var(--atlas-danger); }
      .atlas-dropdown-item.is-danger:hover { background: #fce8e8; }

    `;
    document.documentElement.appendChild(style);
  }

  function createUi() {
    const toggle = document.createElement("button");
    toggle.id = TOGGLE_ID;
    toggle.type = "button";
    toggle.innerHTML = '<span class="atlas-toggle-dot" aria-hidden="true"></span><span>Atlas</span>';
    toggle.addEventListener("click", togglePanel);

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="atlas-resize-handle" title="Redimensionner"></div>
      <div class="atlas-panel-header">
        <div class="atlas-panel-title">
          <strong>Eventmaker Atlas</strong>
          <span>Overlay Atlas dans Eventmaker</span>
        </div>
        <div class="atlas-actions">
          <div class="atlas-split-btn" id="atlas-split-refresh">
            <button class="atlas-split-main" type="button" data-action="refresh">Charger les données</button>
            <button class="atlas-split-arrow" type="button" data-action="refresh-menu" title="Plus d'options">▾</button>
          </div>
          <button class="atlas-close" type="button">Fermer</button>
        </div>
      </div>
      <div class="atlas-tabs"></div>
      <div class="atlas-searchbar"></div>
      <div class="atlas-filters"></div>
      <div class="atlas-toolbar"></div>
      <div class="atlas-panel-body"></div>
    `;

    panel.querySelector(".atlas-close").addEventListener("click", closePanel);
    panel.querySelector(".atlas-resize-handle").addEventListener("mousedown", startResize);
    document.body.appendChild(toggle);
    document.body.appendChild(panel);
  }

  function ensureBuilderActionsWrapper() {
    const builderSwitch = document.querySelector("nav.navbar.navbar-expand.navbar-light.bg-light.navbar-static-top .btn-group-switch");
    if (!builderSwitch || !builderSwitch.parentNode) return;
    if (builderSwitch.parentNode.classList && builderSwitch.parentNode.classList.contains("atlas-builder-actions")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "atlas-builder-actions";
    builderSwitch.parentNode.insertBefore(wrapper, builderSwitch);
    wrapper.appendChild(builderSwitch);
  }

  function findToggleMountTarget() {
    const workflowBuilderClose = document.querySelector("nav.navbar .close-builder[href*='/workflows']");
    if (workflowBuilderClose) {
      const workflowNavbar = workflowBuilderClose.closest("nav.navbar");
      const workflowBuilderActions = workflowNavbar
        ? [...workflowNavbar.querySelectorAll(".navbar-text")]
            .find(function(node) {
              return node.querySelector("#switch")
                || node.textContent.includes("Voir les versions")
                || node.textContent.includes("Historique");
            })
        : null;
      if (workflowBuilderActions) {
        return { node: workflowBuilderActions, method: "prepend", variant: "is-builder" };
      }
    }

    const builderSwitch = document.querySelector("nav.navbar.navbar-expand.navbar-light.bg-light.navbar-static-top .btn-group-switch");
    if (builderSwitch && builderSwitch.parentNode) {
      return { node: builderSwitch, method: "before", variant: "is-builder" };
    }

    const emailBuilderSwitch = document.querySelector("nav.navbar.navbar-expand.navbar-light.bg-light.navbar-static-top .btn-group-switch");
    if (emailBuilderSwitch && emailBuilderSwitch.parentNode) {
      return { node: emailBuilderSwitch, method: "before", variant: "is-builder" };
    }

    const formPreview = document.querySelector("nav.navbar.navbar-expand.navbar-light.bg-light.navbar-static-top .navbar-end .nav .dropdown");
    if (formPreview && formPreview.parentNode) {
      return { node: formPreview, method: "before", variant: "is-form" };
    }

    const featuresButton = document.querySelector("ul.nav.d-flex.align-items-center.flex-nowrap > li > a[href*='/features']");
    if (featuresButton && featuresButton.parentNode) {
      return { node: featuresButton.parentNode, method: "before", variant: "is-bo" };
    }

    const accountNav = document.querySelector(".container-fluid > ul.nav.d-flex.align-items-center.flex-nowrap");
    if (accountNav) {
      return { node: accountNav, method: "prepend", variant: "is-bo" };
    }

    return null;
  }

  function ensureToggleMounted() {
    const toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) return;

    ensureBuilderActionsWrapper();

    const target = findToggleMountTarget();
    let slot = document.getElementById(TOGGLE_SLOT_ID);

    if (!target) {
      toggle.style.display = "none";
      return;
    }

    if (!slot) {
      slot = document.createElement("div");
      slot.id = TOGGLE_SLOT_ID;
      slot.className = "atlas-toggle-slot";
    }

    const expectedClass = "atlas-toggle-slot " + target.variant;
    if (slot.className !== expectedClass) {
      slot.className = expectedClass;
    }

    let alreadyMounted = false;
    if (target.method === "prepend") {
      alreadyMounted = target.node.firstChild === slot;
    } else if (target.method === "before") {
      alreadyMounted = slot.parentNode === target.node.parentNode && slot.nextSibling === target.node;
    } else {
      alreadyMounted = slot.parentNode === target.node && target.node.lastChild === slot;
    }

    if (!alreadyMounted) {
      if (target.method === "prepend") {
        target.node.prepend(slot);
      } else if (target.method === "before") {
        target.node.parentNode.insertBefore(slot, target.node);
      } else {
        target.node.appendChild(slot);
      }
    }

    if (toggle.parentNode !== slot) {
      slot.appendChild(toggle);
    }
    toggle.style.display = state.context.hasEventContext ? "inline-flex" : "none";
  }

  function startToggleMountObserver() {
    if (toggleMountObserver) return;
    const root = document.body || document.documentElement;
    if (!root) return;

    toggleMountObserver = new MutationObserver(function() {
      if (toggleMountRaf != null) return;
      toggleMountRaf = window.requestAnimationFrame(function() {
        toggleMountRaf = null;
        ensureToggleMounted();
      });
    });

    toggleMountObserver.observe(root, {
      childList: true,
      subtree: true
    });
  }

  function updateToggleVisibility(toggle, actualWidth) {
    if (!toggle) return;
    toggle.style.display = state.context.hasEventContext ? "inline-flex" : "none";
  }

  function togglePanel() {
    state.isOpen = !state.isOpen;
    saveUiState();
    render();
    if (state.isOpen && state.context.hasEventContext && !state.cache && !state.atlas && !state.isLoading) {
      refreshSnapshot();
    }
  }

  function closePanel() {
    state.isOpen = false;
    saveUiState();
    render();
  }

  function applyPagePush() {
    var actualWidth = state.isOpen ? Math.max(460, Math.min(state.panelWidth, Math.floor(window.innerWidth * 0.92))) : 0;
    var pushValue = actualWidth > 0 ? actualWidth + "px" : "";

    document.body.style.paddingRight = pushValue;
    document.body.style.boxSizing = "border-box";
  }

  function saveNavState() {
    if (!state.context.eventId) return;
    try {
      chrome.storage.local.set({ atlasNavState: {
        eventId: state.context.eventId,
        activeTab: state.activeTab,
        selected: state.selected
      }});
    } catch (_) {}
  }

  function saveUiState() {
    try {
      chrome.storage.local.set({ atlasUiState: {
        panelWidth: state.panelWidth,
        isOpen: state.isOpen
      }});
    } catch (_) {}
  }

  function restoreUiState() {
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get(["atlasUiState"], function(result) {
          var saved = result && result.atlasUiState;
          if (saved) {
            if (typeof saved.panelWidth === "number" && saved.panelWidth >= 460) {
              state.panelWidth = saved.panelWidth;
            }
            if (typeof saved.isOpen === "boolean") {
              state.isOpen = saved.isOpen;
            }
          }
          resolve();
        });
      } catch (_) { resolve(); }
    });
  }

  async function restoreNavState() {
    if (!state.atlas || !state.context.eventId) return;
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get(["atlasNavState"], function(result) {
          var saved = result && result.atlasNavState;
          if (!saved || saved.eventId !== state.context.eventId) { resolve(); return; }
          if (saved.activeTab) state.activeTab = saved.activeTab;
          if (saved.selected) {
            // Validate the saved item still exists in the current atlas
            var exists = false;
            var s = saved.selected;
            if (s.type === "fields") exists = Boolean(state.atlas.fieldsByKey[s.id]);
            else if (s.type === "segments") exists = state.atlas.segments.some(function(x) { return x.id === s.id; });
            else if (s.type === "forms") exists = Boolean(state.atlas.formsById[s.id]);
            else if (s.type === "pages") exists = Boolean(state.atlas.pagesById[s.id]);
            else if (s.type === "networking") exists = state.atlas.networking.some(function(x) { return x.id === s.id; });
            else if (s.type === "automations") exists = state.atlas.automations.some(function(x) { return x.id === s.id; });
            if (exists) state.selected = s;
          }
          resolve();
        });
      } catch (_) { resolve(); }
    });
  }

  function render() {
    const panel = document.getElementById(PANEL_ID);
    const toggle = document.getElementById(TOGGLE_ID);
    if (!panel || !toggle) return;
    ensureToggleMounted();
    var staleDropdown = document.getElementById("atlas-refresh-dropdown");
    if (staleDropdown) {
      if (staleDropdown._closeListener) {
        document.removeEventListener("click", staleDropdown._closeListener, true);
      }
      staleDropdown.remove();
    }

    const actualWidth = Math.max(460, Math.min(state.panelWidth, Math.floor(window.innerWidth * 0.92)));
    panel.classList.toggle("is-open", state.isOpen);

    // Update split button label and disabled state
    var splitMain = panel.querySelector(".atlas-split-main");
    var splitArrow = panel.querySelector(".atlas-split-arrow");
    if (splitMain) {
      splitMain.textContent = state.isLoading ? "Chargement\u2026" : (state.atlas ? "Rafra\u00EEchir" : "Charger les donn\u00E9es");
      splitMain.disabled = state.isLoading;
    }
    if (splitArrow) splitArrow.disabled = state.isLoading;

    panel.style.width = `${actualWidth}px`;
    toggle.classList.toggle("is-active", state.isOpen);
    updateToggleVisibility(toggle, actualWidth);
    applyPagePush();
    saveNavState();

    renderTabs(panel.querySelector(".atlas-tabs"));
    renderSearchbar(panel.querySelector(".atlas-searchbar"));
    renderFilters(panel.querySelector(".atlas-filters"));
    renderToolbar(panel.querySelector(".atlas-toolbar"));
    panel.querySelector(".atlas-panel-body").innerHTML = buildMarkup();
    bindPanelEvents(panel);
    restoreSearchFocusIfNeeded(panel);
    hydrateMermaidGraphs(panel);
  }

  function renderTabs(container) {
    if (!container) return;
    if (!state.atlas) {
      container.innerHTML = "";
      return;
    }
    const counts = {
      overview: "",
      fields: `${state.atlas.fields.length}`,
      segments: `${state.atlas.segments.length}`,
      forms: `${state.atlas.forms.length}`,
      categories: `${state.atlas.guestCategories.length}`,
      emails: `${(state.atlas.emailTemplates || []).length}`,
      pages: `${state.atlas.pages.length}`,
      networking: `${state.atlas.networking.length}`,
      automations: `${state.atlas.automations.length}`,
      processes: `${buildProcessItems().length}`
    };
    container.innerHTML = TAB_ORDER.map((tab) => `
      <button class="atlas-tab ${state.activeTab === tab ? "is-active" : ""}" type="button" data-tab="${tab}">
        ${escapeHtml(tabLabel(tab))}${counts[tab] ? ` · ${escapeHtml(counts[tab])}` : ""}
      </button>
    `).join("");
  }

  function renderToolbar(container) {
    if (!container) return;
    if (!state.context.hasEventContext) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = "";
  }

  function renderSearchbar(container) {
    if (!container) return;
    if (!state.atlas || state.activeTab === "overview") {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `<input type="text" value="${escapeHtml(state.search)}" placeholder="Rechercher…">`;
  }

  function renderFilters(container) {
    if (!container) return;
    if (!state.atlas || state.activeTab === "overview") {
      container.innerHTML = "";
      return;
    }

    const chip = (label, active, action, value, tooltip) =>
      `<button class="atlas-chip ${active ? "is-active" : ""}" type="button" data-filter-action="${action}" data-filter-value="${escapeHtml(value || "")}"${tooltip ? ` title="${escapeHtml(tooltip)}"` : ""}>${escapeHtml(label)}</button>`;

    if (state.activeTab === "fields") {
      const nativeCount = state.atlas.fields.filter((field) => field.fieldKind === "native").length;
      const apiCount = state.atlas.fields.filter((field) => field.fieldKind === "api_property").length;
      const customCount = state.atlas.fields.filter((field) => field.fieldKind === "custom").length;
      const warningCount = state.atlas.fields.filter((field) => window.AtlasCore.hasFieldAnomaly(state.atlas, field)).length;
      const hotCount = state.atlas.fields.filter((field) => window.AtlasCore.getFieldCoverage(field).total >= 5).length;
      const sensitiveCount = state.atlas.fields.filter((field) => window.AtlasCore.getFieldSensitivityScore(state.atlas, field) >= 10).length;
      const unusedCount = state.atlas.fields.filter((field) => field.fieldKind === "custom" && window.AtlasCore.getFieldCoverage(field).total === 0).length;
      container.innerHTML = [
        chip(`Natifs · ${nativeCount}`, state.filters.fieldOrigin === "native", "field-origin", "native"),
        apiCount > 0 ? chip(`API / Liquid · ${apiCount}`, state.filters.fieldOrigin === "api", "field-origin", "api", "Propriétés accessibles via API ou Liquid, mais pas champs natifs métier") : "",
        chip(`Custom · ${customCount}`, state.filters.fieldOrigin === "custom", "field-origin", "custom"),
        unusedCount > 0 ? chip(`Non utilisés · ${unusedCount}`, state.filters.fieldFocus === "unused", "field-focus-unused", "unused", "Champs custom sans usage détecté dans formulaires, segments, pages ou calculs") : "",
        hotCount > 0 ? chip(
  `Très utilisés · ${hotCount}`,
  state.filters.fieldFocus === "hot",
  "field-focus", "hot",
  "5 références directes ou plus (formulaires, segments, pages, champs calculés combinés)"
) : "",
        sensitiveCount > 0 ? chip(
  `Sensibles · ${sensitiveCount}`,
  state.filters.fieldFocus === "sensitive",
  "field-focus", "sensitive",
  "Score Atlas ≥ 10 : pondère les références par type (pages ×2, segments ×2) et ajoute 8 si anomalie détectée"
) : "",
        warningCount > 0 ? chip(`⚠ Anomalies · ${warningCount}`, state.filters.fieldWarnings, "field-warnings", "toggle") : "",
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    if (state.activeTab === "segments") {
      const activeCount = state.atlas.segments.filter((segment) => !segment.isDeleted).length;
      const deletedCount = state.atlas.segments.filter((segment) => segment.isDeleted).length;
      const warningCount = state.atlas.segments.filter((segment) => !segment.isDeleted && window.AtlasCore.hasSegmentAnomaly(state.atlas, segment)).length;
      container.innerHTML = [
        chip(`Actifs · ${activeCount}`, state.filters.segmentStatus === "active", "segment-status", "active"),
        chip(`Supprimés · ${deletedCount}`, state.filters.segmentStatus === "deleted", "segment-status", "deleted"),
        warningCount > 0 ? chip(`⚠ Champs inconnus · ${warningCount}`, state.filters.segmentWarnings, "segment-warnings", "toggle") : "",
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    if (state.activeTab === "forms") {
      const warningCount = state.atlas.forms.filter((form) => window.AtlasCore.hasFormAnomaly(state.atlas, form)).length;
      const totalFields = new Set(state.atlas.forms.flatMap((form) => [...form.fieldWrites])).size;
      container.innerHTML = [
        chip(`${state.atlas.forms.length} formulaires`, false, "noop", ""),
        chip(`${totalFields} champs distincts`, false, "noop", ""),
        warningCount > 0 ? chip(`⚠ Anomalies · ${warningCount}`, state.filters.formWarnings, "form-warnings", "toggle") : "",
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    if (state.activeTab === "categories") {
      const withFormCount = state.atlas.guestCategories.filter((category) => Boolean(category.registrationFormId)).length;
      const warningCount = state.atlas.guestCategories.filter((category) => window.AtlasCore.hasGuestCategoryAnomaly(state.atlas, category)).length;
      const withWebsiteCount = state.atlas.guestCategories.filter((category) =>
        window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "page" }).length > 0
      ).length;
      const withAutomationCount = state.atlas.guestCategories.filter((category) =>
        window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "automation_step" }).length > 0
      ).length;
      container.innerHTML = [
        withFormCount > 0 ? chip(`Avec formulaire · ${withFormCount}`, false, "noop", "") : "",
        withWebsiteCount > 0 ? chip(`Website · ${withWebsiteCount}`, false, "noop", "") : "",
        withAutomationCount > 0 ? chip(`Automations · ${withAutomationCount}`, false, "noop", "") : "",
        warningCount > 0 ? chip(`⚠ À vérifier · ${warningCount}`, false, "noop", "", "Catégories sans formulaire et sans usage détecté, ou avec formulaire introuvable") : "",
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    if (state.activeTab === "networking") {
      const withSegmentCount = state.atlas.networking.filter((entry) => entry.usedSegmentIds.length > 0).length;
      const warningCount = state.atlas.networking.filter((entry) => window.AtlasCore.hasNetworkingAnomaly(state.atlas, entry)).length;
      const nobodyCount = state.atlas.networking.filter((entry) =>
        entry.rules.global.scope === "nobody" && entry.rules.meetings.scope === "nobody"
      ).length;
      container.innerHTML = [
        withSegmentCount > 0 ? chip(`Avec segment · ${withSegmentCount}`, state.filters.networkingScope === "segment", "networking-scope", "segment", "Règle globale ou meetings pointant vers un segment Atlas") : "",
        nobodyCount > 0 ? chip(`Nobody · ${nobodyCount}`, state.filters.networkingScope === "nobody", "networking-scope", "nobody", "Population sans accès networking ni meetings") : "",
        warningCount > 0 ? chip(`⚠ Segments manquants · ${warningCount}`, state.filters.networkingWarnings, "networking-warnings", "toggle", "Référence à un segment absent du snapshot chargé") : "",
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    if (state.activeTab === "automations") {
      const enabledCount = state.atlas.automations.filter((entry) => entry.enabled).length;
      const warningCount = state.atlas.automations.filter((entry) => window.AtlasCore.hasAutomationAnomaly(state.atlas, entry)).length;
      container.innerHTML = [
        enabledCount > 0 ? chip(`Actives · ${enabledCount}`, state.filters.automationEnabledOnly, "automation-enabled", "toggle", "Workflows activés côté Eventmaker") : "",
        warningCount > 0 ? chip(`⚠ Références manquantes · ${warningCount}`, state.filters.automationWarnings, "automation-warnings", "toggle", "Champs, catégories ou segments référencés mais introuvables dans le snapshot chargé") : "",
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    if (state.activeTab === "processes") {
      const items = buildProcessItems();
      container.innerHTML = [
        chip(`${items.length} process`, false, "noop", ""),
        hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
      ].filter(Boolean).join("");
      return;
    }

    const simpleCount = state.atlas.pages.filter((page) => window.AtlasCore.getPageComplexityMetrics(state.atlas, page).level === "simple").length;
    const midCount = state.atlas.pages.filter((page) => window.AtlasCore.getPageComplexityMetrics(state.atlas, page).level === "intermédiaire").length;
    const complexCount = state.atlas.pages.filter((page) => window.AtlasCore.getPageComplexityMetrics(state.atlas, page).level === "complexe").length;
    container.innerHTML = [
      simpleCount > 0 ? chip(`Simples · ${simpleCount}`, state.filters.pageComplexity === "simple", "page-complexity", "simple") : "",
      midCount > 0 ? chip(`Intermédiaires · ${midCount}`, state.filters.pageComplexity === "intermédiaire", "page-complexity", "intermédiaire") : "",
      complexCount > 0 ? chip(`Complexes · ${complexCount}`, state.filters.pageComplexity === "complexe", "page-complexity", "complexe") : "",
      hasActiveFilters() ? chip("Réinitialiser", false, "reset-filters", "all", "Supprimer tous les filtres actifs") : ""
    ].filter(Boolean).join("");
  }

  function renderSuggestionBanner() {
    var s = state.suggestion;
    if (!s) return "";

    if (s.type === "navigation") {
      return '<div class="atlas-banner"><span>Tu es sur ' + escapeHtml(s.label) + '</span><button class="atlas-banner-nav" data-nav-type="' + escapeHtml(s.nav.type) + '" data-nav-id="' + escapeHtml(s.nav.id) + '">Ouvrir la fiche</button><button class="atlas-banner-dismiss" data-action="dismiss-suggestion">✕</button></div>';
    }

    if (s.type === "segment-candidates") {
      var links = s.candidates.map(function(c) {
        return '<button class="atlas-banner-nav" data-nav-type="segments" data-nav-id="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + ' (' + c.score + '%)</button>';
      }).join(" ");
      return '<div class="atlas-banner"><span>Filtre approchant :</span>' + links + '<button class="atlas-banner-dismiss" data-action="dismiss-suggestion">✕</button></div>';
    }

    if (s.type === "segment-unknown") {
      return '<div class="atlas-banner is-warning"><span>Filtre actif non reconnu dans Atlas.</span><button class="atlas-banner-dismiss" data-action="dismiss-suggestion">✕</button></div>';
    }

    return "";
  }

  function renderEmptyState() {
    var eventId = state.context.eventId || "";
    if (state.isLoading) {
      return '<section class="atlas-card" style="text-align:center;padding:32px 24px;">'
        + '<div style="font-size:36px;margin-bottom:12px;opacity:0.4;">&#8635;</div>'
        + '<h3 style="font-size:15px;font-weight:600;color:var(--atlas-text);text-transform:none;letter-spacing:0;margin-bottom:8px;">Premier chargement en cours</h3>'
        + '<p class="atlas-note" style="margin-bottom:20px;font-size:13px;">Atlas récupère les champs, segments, formulaires et pages de cet événement.<br><span style="font-size:11px;opacity:0.7;">Événement&nbsp;: ' + escapeHtml(eventId) + '</span></p>'
        + '</section>';
    }
    return '<section class="atlas-card" style="text-align:center;padding:32px 24px;">'
      + '<div style="font-size:36px;margin-bottom:12px;opacity:0.4;">&#128194;</div>'
      + '<h3 style="font-size:15px;font-weight:600;color:var(--atlas-text);text-transform:none;letter-spacing:0;margin-bottom:8px;">Aucune donn\u00E9e charg\u00E9e</h3>'
      + '<p class="atlas-note" style="margin-bottom:20px;font-size:13px;">Clique sur <strong>Charger les donn\u00E9es</strong> pour analyser les champs, segments, formulaires et pages de cet \u00E9v\u00E9nement.<br><span style="font-size:11px;opacity:0.7;">\u00C9v\u00E9nement\u00A0: ' + escapeHtml(eventId) + '</span></p>'
      + '</section>';
  }

  function buildMarkup() {
    var banner = renderSuggestionBanner();

    if (!state.context.hasEventContext) {
      return banner + '<section class="atlas-card"><h3>Hors contexte</h3><p class="atlas-note">L\'overlay Atlas ne s\'active que sur une URL contenant <code>/events/:eventId</code>.</p></section>';
    }

    if (!state.atlas) return banner + renderEmptyState();
    if (state.activeTab === "overview") return banner + renderOverview();
    return banner + renderEntityTab();
  }

  function renderOverview() {
    var stats = state.atlas.overview.stats;
    var anomalies = state.atlas.overview.anomalies;

    var blockingCount = (anomalies.fields || 0) + (anomalies.forms || 0);
    var firstBlockingTab = anomalies.fields > 0 ? "fields" : anomalies.forms > 0 ? "forms" : null;
    var firstBlockingFilter = anomalies.fields > 0 ? "field-warnings" : anomalies.forms > 0 ? "form-warnings" : null;

    return (
      '<section class="atlas-card">'
      + '<h3>Périmètre chargé</h3>'
      + '<div class="atlas-summary-list">'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="fields"><strong>' + stats.fields + '</strong><span>Fields</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="segments"><strong>' + stats.segments + '</strong><span>Segments</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="forms"><strong>' + stats.forms + '</strong><span>Formulaires</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="categories"><strong>' + (stats.guestCategories || 0) + '</strong><span>Catégories</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="emails"><strong>' + (stats.emailTemplates || 0) + '</strong><span>Emails</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="pages"><strong>' + stats.pages + '</strong><span>Pages</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="networking"><strong>' + (stats.networking || 0) + '</strong><span>Networking</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="automations"><strong>' + (stats.automations || 0) + '</strong><span>Automations</span></button>'
      + '<button class="atlas-summary-item" type="button" data-tab-jump="processes"><strong>' + buildProcessItems().length + '</strong><span>Processes</span></button>'
      + '</div>'
      + '</section>'

      + (blockingCount > 0
        ? '<section class="atlas-card atlas-overview-blocking">'
          + '<div class="atlas-overview-counter">'
          + '<span class="atlas-badge is-danger">' + blockingCount + ' anomalie' + (blockingCount > 1 ? 's' : '') + ' bloquante' + (blockingCount > 1 ? 's' : '') + '</span>'
          + (firstBlockingTab ? '<button class="atlas-button" type="button" data-tab-jump="' + firstBlockingTab + '" data-filter-action-init="' + firstBlockingFilter + '">Voir la première</button>' : '')
          + '</div>'
          + '</section>'
        : '')

      + '<section class="atlas-card">'
      + '<h3>Anomalies bloquantes</h3>'
      + '<p class="atlas-section-hint">Ces anomalies produisent un comportement incorrect dans Eventmaker aujourd\'hui.</p>'
      + '<div class="atlas-anomaly-list">'
      + renderAnomalyItem(
          anomalies.fields,
          'Champs calculés suspects',
          'Référence Liquid vers un champ inexistant, ou syntaxe invalide (ex. double point)',
          'fields', 'field-warnings',
          'is-danger'
        )
      + renderAnomalyItem(
          anomalies.forms,
          'Formulaires avec clés inconnues',
          'Condition d\'affichage ou champ écrit référençant une clé absente des données chargées',
          'forms', 'form-warnings',
          'is-danger'
        )
      + '</div>'
      + '</section>'

      + '<section class="atlas-card">'
      + '<h3>Signaux de nettoyage</h3>'
      + '<p class="atlas-section-hint">Ces points ne causent pas de bug actif, mais méritent attention.</p>'
      + '<div class="atlas-anomaly-list">'
      + renderAnomalyItem(
          anomalies.segments,
          'Segments avec champs inconnus',
          'Filtre sur un champ absent des données chargées — peut retourner zéro résultat sans erreur visible',
          'segments', 'segment-warnings',
          'is-warning'
        )
      + renderAnomalyItem(
          anomalies.unusedCustomFields || 0,
          'Champs custom jamais référencés',
          'Champ custom présent dans les données mais non utilisé dans formulaires, segments, pages ni champs calculés',
          'fields', 'field-focus-unused',
          'is-warning'
        )
      + renderAnomalyItem(
          anomalies.emailTemplates || 0,
          'Emails avec références manquantes',
          'Template email pointant vers un champ ou une catégorie absente du snapshot chargé',
          'emails', 'none',
          'is-warning'
        )
      + renderAnomalyItem(
          anomalies.deletedSegments || 0,
          'Segments supprimés encore listés',
          'Segments marqués deleted_at dans le snapshot — présents dans les données mais inactifs',
          'segments', 'segment-status-deleted',
          'is-warning'
        )
      + renderAnomalyItem(
          anomalies.networking || 0,
          'Règles networking avec segments manquants',
          'Une règle networking pointe vers un segment absent du snapshot chargé',
          'networking', 'networking-warnings',
          'is-warning'
        )
      + renderAnomalyItem(
          anomalies.automations || 0,
          'Automations avec références manquantes',
          'Workflow pointant vers un champ, une catégorie ou un segment absent du snapshot chargé',
          'automations', 'automation-warnings',
          'is-warning'
        )
      + '</div>'
      + '</section>'
    );
  }

  function renderAnomalyItem(count, label, hint, tab, filterAction, badgeClass) {
    if (count === 0) {
      return '<div class="atlas-anomaly-item is-ok">'
        + '<span class="atlas-badge is-ok">✓</span>'
        + '<span class="atlas-anomaly-label">' + escapeHtml(label) + '</span>'
        + '<span class="atlas-anomaly-hint">' + escapeHtml(hint) + '</span>'
        + '</div>';
    }
    return '<button class="atlas-anomaly-item is-clickable" type="button" data-tab-jump="' + escapeHtml(tab) + '" data-filter-action-init="' + escapeHtml(filterAction) + '">'
      + '<span class="atlas-badge ' + badgeClass + '">' + count + '</span>'
      + '<span class="atlas-anomaly-label">' + escapeHtml(label) + '</span>'
      + '<span class="atlas-anomaly-hint">' + escapeHtml(hint) + '</span>'
      + '</button>';
  }

  function renderEntityTab() {
    const items = getCurrentItems();
    const selected = getSelectedEntity(items);
    return `
      <section class="atlas-card">
        <h3>${escapeHtml(tabLabel(state.activeTab))} <span class="atlas-inline-muted">· ${items.length} éléments</span></h3>
        <div class="atlas-split">
          <div class="atlas-list">
            ${items.map((item) => renderListItem(item, selected)).join("")}
          </div>
          <div>
            ${selected ? renderDetail(selected) : '<div class="atlas-card"><p class="atlas-note">Sélectionne un élément dans la liste pour afficher les détails.</p></div>'}
          </div>
        </div>
      </section>
    `;
  }

  function renderListItem(item, selected) {
    const badges = renderListBadges(item);
    return `
      <button class="atlas-list-item ${selected && selected.id === item.id ? "is-active" : ""}" type="button" data-entity-type="${state.activeTab}" data-entity-id="${escapeHtml(item.id)}">
        <span class="atlas-type-dot" style="background:${escapeHtml(item.dotColor || "#209991")}"></span>
        <span class="atlas-list-body">
          <span class="atlas-list-label">${escapeHtml(item.title)}</span>
          <span class="atlas-list-key">${escapeHtml(item.subtitle)}</span>
          <span class="atlas-list-meta">${badges}</span>
          ${item.coverage ? `<span class="atlas-list-coverage">${escapeHtml(item.coverage)}</span>` : ""}
        </span>
      </button>
    `;
  }

  function renderDetail(selected) {
    if (state.activeTab === "fields") return renderFieldDetail(selected.raw);
    if (state.activeTab === "segments") return renderSegmentDetail(selected.raw);
    if (state.activeTab === "forms") return renderFormDetail(selected.raw);
    if (state.activeTab === "categories") return renderCategoryDetail(selected.raw);
    if (state.activeTab === "emails") return renderEmailDetail(selected.raw);
    if (state.activeTab === "networking") return renderNetworkingDetail(selected.raw);
    if (state.activeTab === "automations") return renderAutomationDetail(selected.raw);
    if (state.activeTab === "processes") return renderProcessDetail(selected.raw);
    return renderPageDetail(selected.raw);
  }

  function renderAutomationDetail(automation) {
    const triggerStep = (automation.steps || []).find((step) => step.type === "trigger") || null;
    const stepRows = (automation.steps || []).map((step, index) => ({
      title: step.label || `${index + 1}. ${step.type} · ${step.strategy}`,
      key: [
        step.fieldKeys.length > 0 ? `${step.fieldKeys.length} champs` : null,
        step.categoryIds.length > 0 ? `${step.categoryIds.length} catégories` : null,
        step.segmentIds.length > 0 ? `${step.segmentIds.length} segments` : null,
        step.externalEndpoints.length > 0 ? `${step.externalEndpoints.length} endpoint${step.externalEndpoints.length > 1 ? "s" : ""}` : null
      ].filter(Boolean).join(" · ") || "aucune dépendance détectée"
    }));
    const fieldRows = (automation.fieldKeys || []).map((key) => ({
      title: state.atlas.fieldsByKey[key]?.label || key,
      key: `guest.${key}`,
      navType: state.atlas.fieldsByKey[key] ? "fields" : null,
      navId: state.atlas.fieldsByKey[key]?.key || null
    }));
    const categoryRows = (automation.categories || []).map((category) => ({
      title: category.name,
      key: category.populationType || "population non renseignée",
      navType: category.registrationFormId ? "forms" : null,
      navId: category.registrationFormId || null
    }));
    const segmentRows = (automation.segmentIds || []).map((segmentId) => {
      const segment = state.atlas.segments.find((entry) => entry.id === segmentId);
      return {
        title: segment ? segment.label : "Segment introuvable",
        key: segmentId,
        navType: segment ? "segments" : null,
        navId: segment ? segment.id : null
      };
    });
    const emailRows = (automation.emailTemplateIds || []).map((emailTemplateId) => {
      const emailTemplate = state.atlas.emailTemplatesById ? state.atlas.emailTemplatesById[emailTemplateId] : null;
      return {
        title: emailTemplate ? emailTemplate.label : "Email introuvable",
        key: emailTemplateId,
        navType: emailTemplate ? "emails" : null,
        navId: emailTemplate ? emailTemplate.id : null
      };
    });
    const missingRows = [
      ...(automation.fieldKeys || []).filter((key) => !state.atlas.fieldsByKey[key]).map((key) => ({ title: "Champ introuvable", key: `guest.${key}` })),
      ...(automation.emailTemplateIds || []).filter((id) => !state.atlas.emailTemplatesById?.[id]).map((id) => ({ title: "Email introuvable", key: id })),
      ...(automation.missingCategoryIds || []).map((id) => ({ title: "Catégorie introuvable", key: id })),
      ...(automation.missingSegmentIds || []).map((id) => ({ title: "Segment introuvable", key: id }))
    ];
    const badges = [];
    badges.push(renderBadge(automation.enabled ? "active" : "inactive", automation.enabled ? "is-info" : "is-neutral"));
    badges.push(renderBadge(automation.triggerEvent || "trigger", "is-neutral"));
    if (window.AtlasCore.hasAutomationAnomaly(state.atlas, automation)) badges.push(renderBadge("anomalie", "is-warning"));
    const automationExtLink = renderOpenInEM("automations", automation.id);

    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(automation.label)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(automation.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          ${automationExtLink ? `<div class="atlas-detail-actions">${automationExtLink}</div>` : ''}
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Déclencheur</div>
              <div class="v">${escapeHtml(automation.triggerEvent || "inconnu")}</div>
              <div class="s">${triggerStep ? `${triggerStep.categoryIds.length} catégories ciblées` : "aucun trigger analysé"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Étapes</div>
              <div class="v">${automation.steps.length}</div>
              <div class="s">${automation.steps.filter((step) => step.type === "action").length} actions · ${automation.steps.filter((step) => step.type === "filter").length} filtres</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Champs lus</div>
              <div class="v">${automation.fieldKeys.length + automation.nativeFieldKeys.length}</div>
              <div class="s">${automation.fieldKeys.length} custom/api · ${automation.nativeFieldKeys.length} natifs</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Runs</div>
              <div class="v">${automation.runsCount}</div>
              <div class="s">Version ${automation.versionNumber || "?"}</div>
            </div>
          </div>
        </div>
        ${renderSection("Étapes du workflow", "Lecture séquentielle des steps de l’automation.", renderSimpleRows(stepRows, "Aucune étape."))}
        ${automation.steps.length === 0 ? renderSection("Diagnostic", "Aucune étape exploitable n’a été extraite de ce workflow dans le snapshot courant.", renderRefList([
          { title: "Version courante détectée", key: automation.hasCurrentVersion ? (automation.currentVersionId || "sans id") : "non" },
          { title: "Clés workflow détectées", key: (automation.rawWorkflowKeys || []).join(", ") || "aucune" },
          { title: "Clés version détectées", key: (automation.rawVersionKeys || []).join(", ") || "aucune" }
        ], "Aucun diagnostic.")) : ""}
        ${automation.steps.length > 0 ? renderSection("Étapes détaillées", "Dépendances détectées step par step dans les triggers, filtres et actions.", automation.steps.map(function(step, index) {
          const rows = [
            ...step.fieldRefs.map(function(ref) {
              const field = state.atlas.fieldsByKey[ref.key];
              return {
                title: field ? field.label : ref.key,
                key: `guest.${ref.key} · ${ref.context}`,
                navType: field ? "fields" : null,
                navId: field ? field.key : null
              };
            }),
            ...step.nativeFieldRefs.map(function(ref) {
              const field = state.atlas.fieldsByKey[ref.key];
              return {
                title: field ? field.label : ref.key,
                key: `guest.${ref.key} · ${ref.context}`,
                navType: field ? "fields" : null,
                navId: field ? field.key : null
              };
            }),
            ...step.categoryRefs.filter(function(ref) { return Boolean(ref.id); }).map(function(ref) {
              const category = state.atlas.guestCategoriesById ? state.atlas.guestCategoriesById[ref.id] : null;
              return {
                title: category ? (category.name || ref.id) : "Catégorie introuvable",
                key: `${ref.id} · ${ref.context}`,
                navType: category ? "categories" : null,
                navId: category ? category.id : null
              };
            }),
            ...step.segmentRefs.map(function(ref) {
              const segment = state.atlas.segments.find(function(entry) { return entry.id === ref.id; });
              return {
                title: segment ? segment.label : "Segment introuvable",
                key: `${ref.id} · ${ref.context}`,
                navType: segment ? "segments" : null,
                navId: segment ? segment.id : null
              };
            }),
            ...step.externalEndpoints.map(function(ref) {
              return {
                title: "Endpoint externe",
                key: `${ref.url} · ${ref.context}`
              };
            }),
            ...step.stepOutputRefs.map(function(ref) {
              return {
                title: "Output d’étape",
                key: ref.context
              };
            })
          ];

          return renderSection(
            step.label || `${index + 1}. ${step.type} · ${step.strategy}`,
            step.type === "trigger"
              ? "Déclencheur et contraintes d’entrée du workflow."
              : step.type === "filter"
                ? "Condition intermédiaire qui lit des données avant de continuer."
                : "Action exécutée par le workflow.",
            renderRefList(rows, "Aucune dépendance métier détectée sur cette étape.")
            + (step.sourcePath ? `<div class="atlas-note" style="margin-top:8px;">Source Atlas: ${escapeHtml(step.sourcePath)}</div>` : "")
          );
        }).join("")) : ""}
        ${fieldRows.length > 0 ? renderSection("Champs référencés", "Champs lus dans les conditions ou templates de l’automation.", renderRefList(fieldRows, "Aucun champ détecté.")) : ""}
        ${categoryRows.length > 0 ? renderSection("Catégories ciblées", "Catégories de trigger ou de workflow détectées dans les settings.", renderRefList(categoryRows, "Aucune catégorie détectée.")) : ""}
        ${segmentRows.length > 0 ? renderSection("Segments liés", "Segments référencés directement dans les settings des steps.", renderRefList(segmentRows, "Aucun segment détecté.")) : ""}
        ${emailRows.length > 0 ? renderSection("Emails liés", "Templates email explicitement référencés dans les settings des steps.", renderRefList(emailRows, "Aucun email détecté.")) : ""}
        ${renderSection("Graphe de dépendances", "Vue synthétique du workflow : trigger, steps clés, champs lus, catégories, segments et endpoints externes.", renderMermaidGraph(buildAutomationGraphSpec(automation)))}
        ${missingRows.length > 0 ? renderSection("Alertes", "Références présentes dans le workflow mais introuvables dans le snapshot chargé.", renderRefList(missingRows, "Aucune anomalie.")) : ""}
      </div>
    `;
  }

  function renderCategoryDetail(category) {
    const formRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "out", targetType: "form" });
    const pageRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "page" });
    const networkingRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "networking" });
    const emailRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "email_template" });
    const automationRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "automation_step" });
    const formRows = formRelations.map((relation) => {
      const form = state.atlas.formsById[relation.targetId];
      return {
        title: form ? form.title : "Formulaire introuvable",
        key: relation.context || relation.targetId,
        subtitle: "Formulaire principal relié à la catégorie",
        navType: form ? "forms" : null,
        navId: form ? form.id : null
      };
    });
    const pageRows = pageRelations.map((relation) => {
      const page = state.atlas.pagesById[relation.targetId];
      return {
        title: page ? page.label : "Page introuvable",
        key: relation.context || relation.targetId,
        subtitle: "Usage website détecté depuis la configuration du site",
        navType: page ? "pages" : null,
        navId: page ? page.id : null
      };
    });
    const networkingRows = networkingRelations.map((relation) => {
      const networking = state.atlas.networking.find((entry) => entry.id === relation.targetId);
      return {
        title: networking ? networking.label : "Règle networking introuvable",
        key: relation.context || relation.targetId,
        subtitle: "Population networking liée via population_type",
        navType: networking ? "networking" : null,
        navId: networking ? networking.id : null
      };
    });
    const emailRows = emailRelations.map((relation) => {
      const emailTemplate = state.atlas.emailTemplatesById ? state.atlas.emailTemplatesById[relation.targetId] : null;
      return {
        title: emailTemplate ? emailTemplate.label : "Email introuvable",
        key: relation.context || relation.targetId,
        subtitle: "Template email qui cible explicitement cette catégorie",
        navType: emailTemplate ? "emails" : null,
        navId: emailTemplate ? emailTemplate.id : null
      };
    });
    const automationRows = automationRelations.map((relation) => {
      const automation = state.atlas.automations.find((entry) => entry.id === relation.sourceObjectId);
      return {
        title: automation ? automation.label : "Automation introuvable",
        key: relation.context || relation.targetId,
        subtitle: "Étape workflow qui cible cette catégorie",
        navType: automation ? "automations" : null,
        navId: automation ? automation.id : null
      };
    });
    const badges = [];
    if (category.populationType) badges.push(renderBadge(category.populationType, "is-info"));
    if (category.defaultForPopulation) badges.push(renderBadge("défaut", "is-neutral"));
    if (window.AtlasCore.hasGuestCategoryAnomaly(state.atlas, category)) badges.push(renderBadge("anomalie", "is-warning"));
    const categoryExtLink = renderOpenInEM("categories", category.id);

    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(category.label)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(category.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          ${categoryExtLink ? `<div class="atlas-detail-actions">${categoryExtLink}</div>` : ""}
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Population</div>
              <div class="v">${escapeHtml(category.populationType || "non renseignée")}</div>
              <div class="s">${category.defaultForPopulation ? "Catégorie par défaut pour cette population" : "Catégorie additionnelle ou spécialisée"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Formulaire</div>
              <div class="v">${formRelations.length}</div>
              <div class="s">${category.registrationFormId ? "Formulaire principal relié" : "Aucun formulaire direct déclaré"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Website</div>
              <div class="v">${pageRelations.length}</div>
              <div class="s">Pages website qui exposent cette catégorie</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Emails / Automations</div>
              <div class="v">${emailRelations.length + automationRelations.length}</div>
              <div class="s">${emailRelations.length} emails · ${automationRelations.length} automations · ${networkingRelations.length} usages networking</div>
            </div>
          </div>
        </div>
        ${formRows.length > 0 ? renderSection("Formulaire lié", "Formulaire principal déclaré sur la catégorie Eventmaker.", renderRefList(formRows, "Aucun formulaire lié.")) : ""}
        ${pageRows.length > 0 ? renderSection("Pages website liées", "Pages website qui exposent cette catégorie via la configuration du site.", renderRefList(pageRows, "Aucune page liée.")) : ""}
        ${networkingRows.length > 0 ? renderSection("Networking lié", "Règles networking qui incluent cette catégorie via sa population type.", renderRefList(networkingRows, "Aucune règle networking liée.")) : ""}
        ${emailRows.length > 0 ? renderSection("Emails liés", "Templates email qui ciblent explicitement cette catégorie.", renderRefList(emailRows, "Aucun email lié.")) : ""}
        ${automationRows.length > 0 ? renderSection("Automations liées", "Étapes d’automations qui ciblent explicitement cette catégorie.", renderRefList(automationRows, "Aucune automation liée.")) : ""}
        ${renderSection("Graphe de dépendances", "Vue synthétique de la catégorie comme pivot métier entre formulaire, website, networking et automations.", renderMermaidGraph(buildCategoryGraphSpec(category, formRows, pageRows, networkingRows, automationRows)))}
        ${renderSection("Diagnostic", "Vue pivot de la catégorie dans Atlas.", renderRefList([
          { title: "Formulaire configuré", key: category.registrationFormId || "aucun" },
          { title: "Population type", key: category.populationType || "non renseignée" },
          { title: "Alerte", key: window.AtlasCore.hasGuestCategoryAnomaly(state.atlas, category) ? "à vérifier" : "RAS" }
        ], "Aucun diagnostic."))}
      </div>
    `;
  }

  function renderEmailDetail(emailTemplate) {
    const fieldRelations = window.AtlasCore.getEntityRelations(state.atlas, "email_template", emailTemplate.id, { direction: "out", targetType: "field" });
    const categoryRelations = window.AtlasCore.getEntityRelations(state.atlas, "email_template", emailTemplate.id, { direction: "out", targetType: "guest_category" });
    const segmentRelations = window.AtlasCore.getEntityRelations(state.atlas, "email_template", emailTemplate.id, { direction: "out", targetType: "segment" });
    const automationRelations = window.AtlasCore.getEntityRelations(state.atlas, "email_template", emailTemplate.id, { direction: "in", targetType: "automation_step" });
    const emailExtLink = renderOpenInEM("emails", emailTemplate.id);
    const fieldRows = fieldRelations.map((relation) => {
      const field = state.atlas.fieldsByKey[relation.targetId];
      return {
        title: field ? field.label : relation.targetId,
        key: field ? `guest.${field.key}` : relation.targetId,
        subtitle: "Référence détectée dans les contenus ou settings de l’email",
        navType: field ? "fields" : null,
        navId: field ? field.key : null
      };
    });
    const categoryRows = categoryRelations.map((relation) => {
      const category = state.atlas.guestCategoriesById[relation.targetId];
      return {
        title: category ? category.label : relation.targetId,
        key: category?.populationType || relation.targetId,
        subtitle: "Catégorie explicitement ciblée par ce template email",
        navType: category ? "categories" : null,
        navId: category ? category.id : null
      };
    });
    const segmentRows = segmentRelations.map((relation) => {
      const segment = state.atlas.segmentsById[relation.targetId];
      return {
        title: segment ? segment.label : relation.targetId,
        key: segment?.id || relation.targetId,
        subtitle: "Segment détecté dans les settings ou conditions de l’email",
        navType: segment ? "segments" : null,
        navId: segment ? segment.id : null
      };
    });
    const automationRows = automationRelations.map((relation) => {
      const automation = state.atlas.automationsById[relation.sourceObjectId];
      return {
        title: automation ? automation.label : "Automation introuvable",
        key: relation.context || relation.targetId,
        subtitle: "Étape workflow qui envoie ou utilise ce template email",
        navType: automation ? "automations" : null,
        navId: automation ? automation.id : null
      };
    });
    const sectionRows = (emailTemplate.sections || []).map((section) => ({
      title: section.title,
      key: `${section.type}${section.summary ? ` · ${section.summary}` : ""}`,
      subtitle: [
        section.fieldKeys.length > 0 ? `${section.fieldKeys.length} champ${section.fieldKeys.length > 1 ? "s" : ""}` : null,
        section.categoryIds.length > 0 ? `${section.categoryIds.length} catégorie${section.categoryIds.length > 1 ? "s" : ""}` : null,
        (section.segmentIds || []).length > 0 ? `${section.segmentIds.length} segment${section.segmentIds.length > 1 ? "s" : ""}` : null
      ].filter(Boolean).join(" · ") || "Aucune dépendance détectée"
    }));
    const campaignRows = (emailTemplate.guestCampaignsUses || []).map((entry) => ({
      title: entry?.name || entry?._id || "Campagne",
      key: entry?._id || "sans id"
    }));
    const documentRows = (emailTemplate.documentTemplateNames || []).map((entry) => ({
      title: "Document template",
      key: entry
    }));
    const accesspointRows = (emailTemplate.accesspointTraits || []).map((entry) => ({
      title: "Trait accesspoint",
      key: entry
    }));
    const anomalies = [];
    if (window.AtlasCore.hasEmailTemplateAnomaly(state.atlas, emailTemplate)) {
      (emailTemplate.missingCategoryIds || []).forEach((id) => {
        anomalies.push({ title: "Catégorie introuvable", key: id });
      });
      (emailTemplate.missingSegmentIds || []).forEach((id) => {
        anomalies.push({ title: "Segment introuvable", key: id });
      });
      (emailTemplate.fieldKeys || []).forEach((key) => {
        if (!state.atlas.fieldsByKey[key]) {
          anomalies.push({ title: "Champ introuvable", key: `guest.${key}` });
        }
      });
    }
    const badges = [
      renderBadge(emailTemplate.presetName || "preset", "is-neutral"),
      renderBadge(emailTemplate.layoutName || "layout", "is-info")
    ];
    if (window.AtlasCore.hasEmailTemplateAnomaly(state.atlas, emailTemplate)) {
      badges.push(renderBadge("anomalie", "is-warning"));
    }
    const settingsSections = emailTemplate?.raw?.settings_data?.sections || {};
    const orderedSections = (emailTemplate.sectionOrder || []).map((sectionId) => {
      const normalized = (emailTemplate.sections || []).find((entry) => entry.id === sectionId);
      return {
        id: sectionId,
        normalized: normalized || null,
        raw: settingsSections[sectionId] || null
      };
    });
    const sectionCards = orderedSections.map(function(sectionEntry, index) {
      const normalized = sectionEntry.normalized || {};
      const rawSection = sectionEntry.raw || {};
      const rawSettings = rawSection.settings || {};
      const localFieldRows = (normalized.fieldKeys || []).map(function(key) {
        const field = state.atlas.fieldsByKey[key];
        return {
          title: field ? field.label : key,
          key: `guest.${key}`,
          navType: field ? "fields" : null,
          navId: field ? field.key : null
        };
      });
      const localCategoryRows = (normalized.categoryIds || []).map(function(id) {
        const category = state.atlas.guestCategoriesById[id];
        return {
          title: category ? category.label : id,
          key: category?.populationType || id,
          navType: category ? "categories" : null,
          navId: category ? category.id : null
        };
      });
      const localSegmentRows = (normalized.segmentIds || []).map(function(id) {
        const segment = state.atlas.segmentsById[id];
        return {
          title: segment ? segment.label : id,
          key: segment?.id || id,
          navType: segment ? "segments" : null,
          navId: segment ? segment.id : null
        };
      });
      const settingRows = Object.entries(rawSettings).slice(0, 6).map(function(entry) {
        const value = entry[1];
        let label = "";
        if (typeof value === "string") label = value.replace(/\s+/g, " ").trim();
        else if (typeof value === "number" || typeof value === "boolean") label = String(value);
        else if (Array.isArray(value)) label = `${value.length} valeur${value.length > 1 ? "s" : ""}`;
        else if (value && typeof value === "object") label = Object.keys(value).length > 0 ? Object.keys(value).slice(0, 3).join(", ") : "objet vide";
        else label = "vide";
        return {
          title: entry[0],
          key: label.length > 90 ? `${label.slice(0, 89)}…` : label
        };
      });

      return `
        <div class="atlas-section">
          <div class="atlas-section-head">
            <div class="atlas-section-title">${escapeHtml(`${index + 1}. ${sectionEntry.id}`)}</div>
            <div class="atlas-inline-muted">${escapeHtml((normalized.type || rawSection.type || sectionEntry.id) + (normalized.summary ? ` · ${normalized.summary}` : ""))}</div>
          </div>
          <div class="atlas-detail-summary" style="margin-bottom:12px;">
            <div class="atlas-detail-summary-card">
              <div class="k">Type</div>
              <div class="v">${escapeHtml(normalized.type || rawSection.type || sectionEntry.id)}</div>
              <div class="s">Section email active dans ce template</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Champs</div>
              <div class="v">${(normalized.fieldKeys || []).length}</div>
              <div class="s">${(normalized.nativeFieldKeys || []).length || 0} natifs visibles si présents</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Catégories</div>
              <div class="v">${(normalized.categoryIds || []).length}</div>
              <div class="s">Ciblage explicite de section</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Segments</div>
              <div class="v">${(normalized.segmentIds || []).length}</div>
              <div class="s">Conditions ou ciblages de section</div>
            </div>
          </div>
          ${normalized.summary ? `<p class="atlas-section-hint">${escapeHtml(normalized.summary)}</p>` : ""}
          ${localFieldRows.length > 0 ? renderRefList(localFieldRows, "Aucune référence champ.") : '<div class="atlas-note">Aucune référence champ.</div>'}
          ${localCategoryRows.length > 0 ? `<div style="margin-top:10px;">${renderRefList(localCategoryRows, "Aucune catégorie.")}</div>` : ""}
          ${localSegmentRows.length > 0 ? `<div style="margin-top:10px;">${renderRefList(localSegmentRows, "Aucun segment.")}</div>` : ""}
          ${settingRows.length > 0 ? `<div style="margin-top:10px;">${renderSimpleRows(settingRows, "Aucun setting.")}</div>` : ""}
        </div>
      `;
    });

    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(emailTemplate.label)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(emailTemplate.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          ${emailExtLink ? `<div class="atlas-detail-actions">${emailExtLink}</div>` : ""}
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Sections</div>
              <div class="v">${emailTemplate.sections.length}</div>
              <div class="s">${emailTemplate.sectionOrder.length > 0 ? escapeHtml(emailTemplate.sectionOrder.join(" → ")) : "Aucun ordre de section détecté"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Champs lus</div>
              <div class="v">${emailTemplate.fieldKeys.length + emailTemplate.nativeFieldKeys.length}</div>
              <div class="s">${emailTemplate.fieldKeys.length} custom/api · ${emailTemplate.nativeFieldKeys.length} natifs</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Catégories</div>
              <div class="v">${emailTemplate.categoryIds.length}</div>
              <div class="s">${emailTemplate.guestCategoriesUses.length} usages explicites côté Eventmaker</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Segments</div>
              <div class="v">${emailTemplate.segmentIds.length}</div>
              <div class="s">${segmentRelations.length} segments résolus dans Atlas</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Usages</div>
              <div class="v">${emailTemplate.usesCount}</div>
              <div class="s">${automationRelations.length} automations liées détectées</div>
            </div>
          </div>
        </div>
        ${renderSection("Structure", "Sections actives, plus proche d’une lecture website: ordre, type, contenu utile, dépendances et settings principaux.", sectionCards.join("") || '<div class="atlas-note">Aucune section détectée.</div>')}
        ${renderSection("Vue compacte", "Liste courte pour scanner rapidement l’ordre et les dépendances de haut niveau.", renderSimpleRows(sectionRows, "Aucune section détectée."))}
        ${fieldRows.length > 0 ? renderSection("Champs référencés", "Références `guest.*` détectées dans les contenus et settings du template.", renderRefList(fieldRows, "Aucun champ détecté.")) : ""}
        ${categoryRows.length > 0 ? renderSection("Catégories ciblées", "Catégories explicitement utilisées par ce template email.", renderRefList(categoryRows, "Aucune catégorie détectée.")) : ""}
        ${segmentRows.length > 0 ? renderSection("Segments liés", "Segments détectés dans les conditions ou settings du template email.", renderRefList(segmentRows, "Aucun segment détecté.")) : ""}
        ${automationRows.length > 0 ? renderSection("Automations liées", "Steps d’automation qui pointent vers ce template email.", renderRefList(automationRows, "Aucune automation liée.")) : ""}
        ${renderSection("Graphe de dépendances", "Vue synthétique de l’email : champs lus, catégories/segments ciblés et automations entrantes.", renderMermaidGraph(buildEmailGraphSpec(emailTemplate, fieldRows, categoryRows, segmentRows, automationRows)))}
        ${campaignRows.length > 0 ? renderSection("Campagnes liées", "Usages marketing explicites remontés par l’API email template.", renderRefList(campaignRows, "Aucune campagne liée.")) : ""}
        ${documentRows.length > 0 ? renderSection("Documents liés", "Templates document visibles dans le détail email.", renderRefList(documentRows, "Aucun document lié.")) : ""}
        ${accesspointRows.length > 0 ? renderSection("Traits accesspoint", "Traits techniques exposés dans le détail email.", renderRefList(accesspointRows, "Aucun trait accesspoint.")) : ""}
        ${anomalies.length > 0 ? renderSection("Alertes", "Références présentes dans l’email mais introuvables dans le snapshot Atlas.", renderRefList(anomalies, "Aucune anomalie.")) : ""}
      </div>
    `;
  }

  function renderProcessDetail(process) {
    const categoryRows = (process.categories || []).slice(0, 8).map((category) => ({
      title: category.label || category.name || category.id,
      key: category.populationType || category.id,
      subtitle: category.registrationFormId ? "Catégorie avec formulaire" : "Catégorie sans formulaire direct",
      navType: "categories",
      navId: category.id
    }));
    const formRows = (process.forms || []).slice(0, 8).map((form) => ({
      title: form.title,
      key: `${form.steps.length} étapes`,
      subtitle: "Formulaire impliqué dans ce process",
      navType: "forms",
      navId: form.id
    }));
    const pageRows = (process.pages || []).slice(0, 8).map((page) => ({
      title: page.label,
      key: page.pathName || page.id,
      subtitle: "Page website liée au process",
      navType: "pages",
      navId: page.id
    }));
    const automationRows = (process.automations || []).slice(0, 8).map((automation) => ({
      title: automation.label,
      key: automation.triggerEvent || automation.id,
      subtitle: automation.enabled ? "Automation active" : "Automation inactive",
      navType: "automations",
      navId: automation.id
    }));
    const networkingRows = (process.networking || []).slice(0, 8).map((entry) => ({
      title: entry.label,
      key: `${entry.usedSegmentIds.length} segments`,
      subtitle: "Population networking impliquée",
      navType: "networking",
      navId: entry.id
    }));
    const segmentRows = (process.segments || []).slice(0, 8).filter(Boolean).map((segment) => ({
      title: segment.label,
      key: segment.id,
      subtitle: "Segment critique du process",
      navType: "segments",
      navId: segment.id
    }));
    const fieldRows = (process.fields || []).slice(0, 8).filter(Boolean).map((field) => ({
      title: field.label,
      key: `guest.${field.key}`,
      subtitle: "Champ critique du process",
      navType: "fields",
      navId: field.key
    }));
    const endpointRows = (process.endpoints || []).slice(0, 8).map((endpoint) => ({
      title: "Endpoint externe",
      key: endpoint.url,
      subtitle: endpoint.context || "Appel HTTP détecté"
    }));
    const riskRows = process.risks || [];

    const badges = [renderBadge("process", "is-info")];
    if (riskRows.some((risk) => risk.key !== "faible")) {
      badges.push(renderBadge("risque", "is-warning"));
    }

    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(process.title)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(process.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          <p class="atlas-note" style="margin-bottom:16px;">${escapeHtml(process.subtitle)}</p>
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Périmètre</div>
              <div class="v">${escapeHtml(process.coverage || "—")}</div>
              <div class="s">Regroupement heuristique à partir des catégories, formulaires, pages, networking et automations liées.</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Catégories</div>
              <div class="v">${(process.categories || []).length}</div>
              <div class="s">Point d’entrée métier du process</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Automations</div>
              <div class="v">${(process.automations || []).length}</div>
              <div class="s">Workflows qui portent la logique dynamique</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Website / Networking</div>
              <div class="v">${(process.pages || []).length + (process.networking || []).length}</div>
              <div class="s">Surfaces visibles ou règles d’accès liées</div>
            </div>
          </div>
        </div>
        ${riskRows.length > 0 ? renderSection("Risques et signaux", "Ce qui mérite une attention rapide avant de modifier ce process.", renderRefList(riskRows, "Aucun risque détecté.")) : ""}
        ${categoryRows.length > 0 ? renderSection("Catégories centrales", "Catégories qui structurent ce process.", renderRefList(categoryRows, "Aucune catégorie.")) : ""}
        ${formRows.length > 0 ? renderSection("Formulaires impliqués", "Formulaires d’entrée ou d’édition liés au process.", renderRefList(formRows, "Aucun formulaire.")) : ""}
        ${pageRows.length > 0 ? renderSection("Pages concernées", "Pages website utilisées par ce process.", renderRefList(pageRows, "Aucune page.")) : ""}
        ${networkingRows.length > 0 ? renderSection("Networking", "Populations networking impliquées dans ce process.", renderRefList(networkingRows, "Aucun networking.")) : ""}
        ${segmentRows.length > 0 ? renderSection("Segments clés", "Segments qui pilotent ou filtrent ce process.", renderRefList(segmentRows, "Aucun segment.")) : ""}
        ${automationRows.length > 0 ? renderSection("Automations clés", "Workflows qui exécutent la logique du process.", renderRefList(automationRows, "Aucune automation.")) : ""}
        ${fieldRows.length > 0 ? renderSection("Champs critiques", "Champs particulièrement centraux pour ce process.", renderRefList(fieldRows, "Aucun champ critique.")) : ""}
        ${endpointRows.length > 0 ? renderSection("Endpoints externes", "Intégrations externes directement visibles dans ce process.", renderRefList(endpointRows, "Aucun endpoint externe.")) : ""}
        ${renderSection("Graphe de dépendances", "Vue transverse compacte du process pour une reprise de projet.", renderMermaidGraph(buildProcessGraphSpec(process)))}
      </div>
    `;
  }

  function renderNetworkingDetail(ruleSet) {
    const globalSegment = ruleSet.rules.global.segmentId ? state.atlas.segments.find((segment) => segment.id === ruleSet.rules.global.segmentId) : null;
    const meetingsSegment = ruleSet.rules.meetings.segmentId ? state.atlas.segments.find((segment) => segment.id === ruleSet.rules.meetings.segmentId) : null;
    const missingSegments = (ruleSet.missingSegmentIds || []).map((segmentId) => ({
      title: "Segment introuvable",
      key: segmentId
    }));
    const categoryRows = (ruleSet.categories || []).map((category) => ({
      title: category.name,
      key: category.defaultForPopulation ? "catégorie par défaut" : "catégorie liée",
      navType: category.formId ? "forms" : null,
      navId: category.formId || null
    }));
    const viewRows = (ruleSet.views || []).map((view) => ({
      title: view.target,
      key: view.scope + (view.columnsSetId ? ` · ${view.columnsSetId}` : "")
    }));
    const segmentRows = [
      {
        title: "Règle globale",
        subtitle: ruleSet.rules.global.scope + (globalSegment ? ` · ${globalSegment.label}` : ruleSet.rules.global.segmentId ? ` · ${ruleSet.rules.global.segmentId}` : ""),
        navType: globalSegment ? "segments" : null,
        navId: globalSegment ? globalSegment.id : null
      },
      {
        title: "Règle meetings",
        subtitle: ruleSet.rules.meetings.scope + (meetingsSegment ? ` · ${meetingsSegment.label}` : ruleSet.rules.meetings.segmentId ? ` · ${ruleSet.rules.meetings.segmentId}` : ""),
        navType: meetingsSegment ? "segments" : null,
        navId: meetingsSegment ? meetingsSegment.id : null
      }
    ];
    const badges = [];
    if (ruleSet.inMatchmakingPopulationTypes) badges.push(renderBadge("matchmaking", "is-info"));
    if (ruleSet.categories.length > 0) badges.push(renderBadge(`${ruleSet.categories.length} catégories`, "is-neutral"));
    if (window.AtlasCore.hasNetworkingAnomaly(state.atlas, ruleSet)) badges.push(renderBadge("anomalie", "is-warning"));

    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(ruleSet.label)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(ruleSet.populationType)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Global</div>
              <div class="v">${escapeHtml(ruleSet.rules.global.scope)}</div>
              <div class="s">${globalSegment ? `segment ${escapeHtml(globalSegment.label)}` : "pas de segment résolu"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Meetings</div>
              <div class="v">${escapeHtml(ruleSet.rules.meetings.scope)}</div>
              <div class="s">${meetingsSegment ? `segment ${escapeHtml(meetingsSegment.label)}` : "pas de segment résolu"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Catégories</div>
              <div class="v">${ruleSet.categories.length}</div>
              <div class="s">${ruleSet.inPopulationTypes ? "population déclarée dans l’événement" : "population vue via règles seulement"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Statut</div>
              <div class="v">${window.AtlasCore.hasNetworkingAnomaly(state.atlas, ruleSet) ? "à vérifier" : "ok"}</div>
              <div class="s">${ruleSet.missingSegmentIds.length > 0 ? `${ruleSet.missingSegmentIds.length} segment(s) manquant(s)` : "aucune référence cassée"}</div>
            </div>
          </div>
        </div>
        ${renderSection("Règles networking", "Lecture directe du payload event-level pour cette population.", renderSimpleRows(segmentRows, "Aucune règle networking."))}
        ${ruleSet.categories.length > 0 ? renderSection("Catégories associées", "Catégories guest rattachées à cette population_type. Le clic ouvre le formulaire s’il est connu.", renderRefList(
          categoryRows.map((row) => ({
            title: row.title,
            key: row.key,
            navType: row.navType,
            navId: row.navId
          })),
          "Aucune catégorie liée."
        )) : ""}
        ${(ruleSet.views || []).length > 0 ? renderSection("Guest view rules", "Règles de visibilité mobile/profile présentes dans le payload event.", renderRefList(
          viewRows,
          "Aucune règle de vue."
        )) : ""}
        ${renderSection("Graphe de dépendances", "Vue synthétique des segments et catégories qui pilotent cette population networking.", renderMermaidGraph(buildNetworkingGraphSpec(ruleSet, segmentRows, categoryRows, viewRows)))}
        ${missingSegments.length > 0 ? renderSection("Alertes", "Segments référencés par les règles networking mais absents du snapshot Atlas.", renderRefList(
          missingSegments,
          "Aucune anomalie."
        )) : ""}
      </div>
    `;
  }

  function renderFieldDetail(field) {
    const coverage = window.AtlasCore.getFieldCoverage(field);
    const derivedLevels = window.AtlasCore.getDerivedHierarchyLevels(state.atlas, field);
    const impactAnalysis = window.AtlasCore.getFieldImpactAnalysis(state.atlas, field);
    const usageDetails = window.AtlasCore.getFieldUsageDetails(state.atlas, field);
    const impactTotal = impactAnalysis.fields.length + impactAnalysis.segments.length + impactAnalysis.forms.length + impactAnalysis.emails.length + impactAnalysis.automations.length;
    const hasCascadeImpact = impactAnalysis.levels.some(([depth]) => depth > 1);
    const anomalies = [];
    const dependencyRows = usageDetails.dependencies;
    const directReaderRows = usageDetails.usages
      .filter((ref) => ref.from !== "field" && ref.from !== "field_child")
      .map((ref) => ({
      title: ref.label || ref.key,
      subtitle: ref.from === "automation"
        ? ref.context ? `automation · ${ref.context}` : "automation"
        : ref.from === "form_condition"
          ? "condition formulaire"
          : ref.from === "field_child"
            ? "niveau hiérarchique"
            : ref.from,
      navType: ref.navType || (ref.from === "segment" ? "segments" : ref.from === "form" || ref.from === "form_condition" ? "forms" : ref.from === "page" ? "pages" : ref.from === "automation" ? "automations" : ref.from === "field" || ref.from === "field_child" ? "fields" : null),
      navId: ref.navId || ref.key
    }));
    const automationUsageRows = usageDetails.automations.map((ref) => ({
        title: ref.title || ref.key,
        key: [ref.stepLabel || ref.key, ref.stepPath || null].filter(Boolean).join(" · "),
        subtitle: "Lecture détectée dans une étape d’automation",
        navType: "automations",
        navId: ref.key
      }));
    const calculatedUsageRows = field.referencedBy
      .filter((ref) => ref.from === "field" || ref.from === "field_child")
      .map((ref) => ({
        title: ref.label || ref.key,
        key: ref.from === "field_child" ? `guest.${ref.key} (enfant hiérarchique)` : `guest.${ref.key}`,
        navType: "fields",
        navId: ref.key
      }));
    const liquidSymbolRows = (field.extracted ? [...field.extracted.liquidRefs] : []).map((key) => {
      const meta = window.AtlasCore.getLiquidSymbolMeta(key) || {};
      return {
        title: `guest.${key}`,
        key: meta.kind === "field_alias" && meta.target
          ? `alias de guest.${meta.target}`
          : "symbole Liquid non éditable",
        subtitle: meta.label || "symbole Liquid connu"
      };
    });
    if (field.extracted?.warnings?.length) anomalies.push(...field.extracted.warnings.map((warning) => `Liquid suspect: ${warning.match}`));
    (field.extracted ? [...field.extracted.fields] : []).forEach((key) => {
      const resolved = state.atlas.fieldsByKey[key] || state.atlas.fieldsByKey[key.replace(/_level_\d+$/, "")];
      if (!resolved) anomalies.push(`Référence inconnue: guest.${key}`);
    });

    const fieldKindLabel = field.fieldKind === "native" ? "natif" : field.fieldKind === "api_property" ? "api/liquid" : "custom";
    const fieldKindBadge = field.fieldKind === "native" ? "is-neutral" : field.fieldKind === "api_property" ? "is-api" : "is-info";
    const badges = [
      renderBadge(field.type, "is-info"),
      renderBadge(fieldKindLabel, fieldKindBadge)
    ];
    if (coverage.total > 0) badges.push(renderBadge(`${coverage.total} réf`, coverage.total >= 5 ? "is-warning" : "is-neutral"));
    if (window.AtlasCore.hasFieldAnomaly(state.atlas, field)) badges.push(renderBadge("anomalie", "is-warning"));

    const fieldExtLink = field._id ? renderOpenInEM("fields", field.key) : '';
    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(field.label)}</h2>
          <div class="atlas-detail-subtitle">guest.${escapeHtml(field.key)}</div>
          <div class="atlas-badges">
            ${badges.join("")}
          </div>
          ${fieldExtLink ? `<div class="atlas-detail-actions">${fieldExtLink}</div>` : ''}
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Usages directs</div>
              <div class="v">${coverage.total}</div>
              <div class="s">${escapeHtml(`${coverage.forms} formulaires · ${coverage.segments} segments · ${coverage.pages} pages · ${coverage.emails} emails · ${coverage.automations} automations · ${coverage.calculated} calculs`)}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Anomalies</div>
              <div class="v">${window.AtlasCore.hasFieldAnomaly(state.atlas, field) ? "Oui" : "Non"}</div>
              <div class="s">${window.AtlasCore.hasFieldAnomaly(state.atlas, field) ? "Références cassées ou Liquid suspect" : "Aucune anomalie détectée"}</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Propagation</div>
              <div class="v">${impactTotal}</div>
              <div class="s">Objets potentiellement impactés si ce champ change</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Nature</div>
              <div class="v">${escapeHtml(field.type)}</div>
              <div class="s">${field.fieldKind === "native" ? "Champ natif confirmé" : field.fieldKind === "api_property" ? "Propriété API / Liquid accessible, mais pas champ natif métier" : "Champ custom projet"}</div>
            </div>
          </div>
        </div>
        ${anomalies.length > 0 ? renderSection("Alertes", "Anomalies détectées dans la formule Liquid ou références impossibles à résoudre.", renderRefList(
          anomalies.map((entry) => ({ title: entry, key: "à vérifier" })),
          "Aucune anomalie détectée."
        )) : ""}
        ${renderSection("Usages directs", "Où ce champ est utilisé directement aujourd’hui: collecte, segments, pages website, autres calculs et conditions.", renderRefList([
          coverage.forms > 0 ? { title: "Collecté dans les formulaires", key: `${coverage.forms}` } : null,
          coverage.segments > 0 ? { title: "Utilisé dans les segments", key: `${coverage.segments}` } : null,
          coverage.pages > 0 ? { title: "Utilisé dans les pages website", key: `${coverage.pages}` } : null,
          coverage.emails > 0 ? { title: "Utilisé dans les emails", key: `${coverage.emails}` } : null,
          coverage.automations > 0 ? { title: "Utilisé dans les automations", key: `${coverage.automations}` } : null,
          coverage.calculated > 0 ? { title: "Référencé par des champs calculés", key: `${coverage.calculated}` } : null,
          coverage.formConditions > 0 ? { title: "Utilisé dans des conditions de formulaire", key: `${coverage.formConditions}` } : null
        ].filter(Boolean), "Aucun usage détecté."))}
        ${automationUsageRows.length > 0 ? renderSection("Automations liées", "Workflows qui lisent ce champ dans un trigger, une condition ou une action.", renderRefList(
          automationUsageRows,
          "Aucune automation liée."
        )) : ""}
        ${renderSection("Ce que la formule lit", "Champs ou objets lus par la formule pour calculer la valeur.", renderRefList(
          dependencyRows.map((row) => ({ title: row.subtitle || row.title, key: `guest.${row.title}`, navType: row.navType, navId: row.navId })),
          "Aucune dépendance extraite."
        ))}
        ${liquidSymbolRows.length > 0 ? renderSection("Symboles Liquid reconnus", "Références accessibles en Liquid mais distinctes des champs configurables classiques.", renderRefList(
          liquidSymbolRows.map((row) => ({ title: row.title, key: row.key })),
          "Aucun symbole Liquid spécifique."
        )) : ""}
        ${calculatedUsageRows.length > 0 ? renderSection("Champs calculés qui le lisent", "Champs calculés ou dérivés qui dépendent directement de ce champ.", renderRefList(
          calculatedUsageRows,
          "Aucun champ calculé lié."
        )) : ""}
        ${directReaderRows.length > 0 ? renderSection("Qui lit ce champ directement", "Objets non calculés qui consomment directement ce champ.", renderRefList(
          directReaderRows.map((row) => ({ title: row.title, key: row.subtitle, navType: row.navType, navId: row.navId })),
          "Aucun lecteur direct supplémentaire."
        )) : ""}
        ${derivedLevels.length > 0 ? renderSection("Niveaux hiérarchiques dérivés", "Déclinaisons techniques du champ racine pour représenter les niveaux d’un champ hiérarchique.", renderRefList(
          derivedLevels.map((item) => ({
            title: `${field.label} · niveau ${item.level}`,
            key: `guest.${item.key}`,
            navType: "fields",
            navId: item.key
          })),
          "Aucun niveau dérivé."
        )) : ""}
        ${impactTotal > 0 && hasCascadeImpact ? renderSection("Propagation possible", "Ce qui risque de bouger si ce champ change au-delà des lecteurs directs. Niveau 2+ = effet en chaîne.", impactAnalysis.levels.filter(([depth]) => depth > 1).map(([depth, nodes]) => renderSection(
          `Niveau ${depth}`,
          `Propagation indirecte via le niveau ${depth - 1}.`,
          renderRefList(nodes.map((node) => ({
            title: node.kind === "field"
              ? (state.atlas.fieldsByKey[node.id]?.label || node.id)
              : node.kind === "segment"
                ? (state.atlas.segments.find((segment) => segment.id === node.id)?.label || node.id)
                : node.kind === "automation"
                ? (state.atlas.automations.find((automation) => automation.id === node.id)?.label || node.id)
                  : node.kind === "email"
                    ? (state.atlas.emailTemplatesById[node.id]?.label || node.id)
                    : (state.atlas.formsById[node.id]?.title || node.id),
            key: node.kind === "field" ? `guest.${node.id}` : node.id,
            navType: node.kind === "field" ? "fields" : node.kind === "segment" ? "segments" : node.kind === "automation" ? "automations" : node.kind === "email" ? "emails" : "forms",
            navId: node.id
          })), "Aucun impact.")
        )).join("")) : ""}
        ${field.type === "value_list" && field.availableValues.length > 0 ? renderSection("Valeurs possibles", "Valeurs déclarées sur le champ, avec mise en évidence de celles déjà utilisées dans des segments.", `
          <div class="atlas-kv-list">
            ${field.availableValues.slice(0, 80).map((valueEntry) => {
              const rawValue = valueEntry.value || valueEntry.label || "";
              const label = valueEntry.label || rawValue;
              const usages = window.AtlasCore.getValueUsageForField(state.atlas, field, rawValue);
              return `
                <button class="atlas-kv-row ${usages.length > 0 ? "is-clickable" : ""}" ${usages.length > 0 ? `type="button" data-focus-value-field="${escapeHtml(field.key)}" data-focus-value="${escapeHtml(rawValue)}"` : ""}>
                  <strong>${escapeHtml(label)}</strong>
                  <span>${usages.length > 0 ? `${usages.length} segment${usages.length > 1 ? "s" : ""}` : "non détecté dans les segments"}</span>
                </button>
              `;
            }).join("")}
          </div>
        `) : ""}
        ${renderSection("Graphe de dépendances", "Lecture visuelle proche du local : dépendances lues, champ analysé, objets impactés.", renderMermaidGraph(buildFieldGraphSpec(field, dependencyRows, usageDetails.graphImpact)))}
        ${field.code ? renderSection("Formule Liquid", "Code source du champ calculé, tel qu’il est configuré côté Eventmaker.", `
          <pre class="atlas-code">${escapeHtml(field.code)}</pre>
        `) : ""}
      </div>
    `;
  }

  function renderSegmentDetail(segment) {
    const linkedPages = window.AtlasCore.getPagesForSegment(state.atlas, segment.id);
    const emailRelations = window.AtlasCore.getEntityRelations(state.atlas, "segment", segment.id, { direction: "in", targetType: "email_template" });
    const known = [];
    const unknown = [];
    const seen = new Set();
    segment.parsedRefs.forEach((ref) => {
      if (seen.has(ref.key)) return;
      seen.add(ref.key);
      const resolvedKey = state.atlas.fieldsByKey[ref.key]?.key || state.atlas.fieldsByKey[ref.key.replace(/_level_\d+$/, "")]?.key || null;
      const row = {
        title: ref.key,
        key: ref.values?.length ? ref.values.join(", ") : (ref.empty ? "champ vide" : "valeur libre"),
        navType: resolvedKey ? "fields" : null,
        navId: resolvedKey
      };
      if (resolvedKey) known.push(row);
      else unknown.push(row);
    });
    const websiteUsageRelations = window.AtlasCore.getEntityRelations(state.atlas, "segment", segment.id, { direction: "in", targetType: "page", type: "website_segment" });
    const emailRows = emailRelations.map((relation) => {
      const emailTemplate = state.atlas.emailTemplatesById[relation.sourceObjectId];
      return {
        title: emailTemplate ? emailTemplate.label : relation.sourceObjectId,
        key: relation.context || relation.sourceObjectId,
        subtitle: "Template email qui utilise ce segment",
        navType: emailTemplate ? "emails" : null,
        navId: emailTemplate ? emailTemplate.id : null
      };
    });
    const badges = [];
    if (segment.isDeleted) badges.push(renderBadge("supprimé", "is-neutral"));
    if (window.AtlasCore.hasSegmentAnomaly(state.atlas, segment)) badges.push(renderBadge("anomalie", "is-warning"));
    if (linkedPages.length > 0) badges.push(renderBadge(`${linkedPages.length} pages`, "is-info"));
    if (emailRelations.length > 0) badges.push(renderBadge(`${emailRelations.length} emails`, "is-info"));
    const segmentExtLink = renderOpenInEM("segments", segment.id);
    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(segment.label)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(segment.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          ${segmentExtLink ? `<div class="atlas-detail-actions">${segmentExtLink}</div>` : ''}
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Champs référencés</div>
              <div class="v">${segment.parsedRefs.length}</div>
              <div class="s">${known.length} connus · ${unknown.length} inconnus</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Pages website liées</div>
              <div class="v">${linkedPages.length}</div>
              <div class="s">Pages, sections ou blocs où ce segment pilote la visibilité</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Emails liés</div>
              <div class="v">${emailRelations.length}</div>
              <div class="s">Templates email qui utilisent ce segment dans leurs settings</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Statut</div>
              <div class="v">${segment.isDeleted ? "supprimé" : "actif"}</div>
              <div class="s">${segment.createdBy ? `créé par ${segment.createdBy}` : "snapshot courant"}</div>
            </div>
          </div>
        </div>
        ${renderSection("Requête Eventmaker", "", `<pre class="atlas-code">${escapeHtml(segment.query || "(vide)")}</pre>`)}
        ${unknown.length > 0 ? renderSection("Alertes", "Champs non reconnus dans la search_query.", renderRefList(
          unknown.map((row) => ({ title: "Champ inconnu", key: row.title })),
          "Aucune alerte."
        )) : ""}
        ${renderSection(`Champs référencés (${known.length + unknown.length})`, "", renderRefList(
          [...known, ...unknown.map((row) => ({ title: row.title, key: row.key }))],
          "Aucun champ détecté."
        ))}
        ${emailRows.length > 0 ? renderSection("Emails liés", "Templates email qui ciblent ou conditionnent leur rendu avec ce segment.", renderRefList(
          emailRows,
          "Aucun email lié."
        )) : ""}
        ${websiteUsageRelations.length > 0 ? renderSection("Usages website détaillés", "Pages, sections et blocs où ce segment pilote la visibilité ou le ciblage.", renderRefList(
          websiteUsageRelations.map((rel) => ({
            title: state.atlas.pagesById[rel.targetId]?.label || rel.targetId,
            key: `${state.atlas.pagesById[rel.targetId]?.pathName || rel.targetId}${rel.context ? ` · ${rel.context}` : ""}`,
            navType: "pages",
            navId: rel.targetId
          })),
          "Aucun usage website détaillé."
        )) : ""}
        ${renderSection("Pages website liées", "Pages, sections ou blocs où ce segment est utilisé pour piloter la visibilité ou le ciblage.", renderRefList(
          linkedPages.map((page) => ({ title: page.label, key: page.pathName, navType: "pages", navId: page.id })),
          "Aucune page liée."
        ))}
        ${renderSection("Graphe de dépendances", "Champs lus par le segment, puis usages website et email détectés.", renderMermaidGraph(buildSegmentGraphSpec(segment, known, linkedPages, emailRows)))}
      </div>
    `;
  }

  function renderFormDetail(form) {
    const linkedPages = window.AtlasCore.getPagesForForm(state.atlas, form.id);
    const fieldWriteRows = [...form.fieldWrites].map((key) => ({
      title: key,
      subtitle: state.atlas.fieldsByKey[key]?.label || "champ cible",
      navType: state.atlas.fieldsByKey[key] ? "fields" : null,
      navId: state.atlas.fieldsByKey[key]?.key || null
    }));
    const conditionRows = [...form.fieldConditions].map((key) => ({
      title: key,
      subtitle: state.atlas.fieldsByKey[key]?.label || "champ conditionnel",
      navType: state.atlas.fieldsByKey[key] ? "fields" : null,
      navId: state.atlas.fieldsByKey[key]?.key || null
    }));
    const unknownWrites = [...form.fieldWrites].filter((key) => key && !state.atlas.fieldsByKey[key]);
    const unknownConds = [...form.fieldConditions].filter((key) => !state.atlas.fieldsByKey[key]);
    const totalAnomalies = unknownWrites.length + unknownConds.length;
    const websiteFormRelations = window.AtlasCore.getEntityRelations(state.atlas, "form", form.id, { direction: "in", targetType: "page", type: "website_form" });
    const badges = [
      renderBadge(`${form.steps.length} étapes`, "is-neutral"),
      renderBadge(`${form.fieldWrites.size} champs`, "is-info")
    ];
    if (linkedPages.length > 0) badges.push(renderBadge(`${linkedPages.length} pages`, "is-info"));
    if (totalAnomalies > 0) badges.push(renderBadge(`⚠ ${totalAnomalies}`, "is-warning"));
    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(form.title)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(form.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Étapes</div>
              <div class="v">${form.steps.length}</div>
              <div class="s">Structure du formulaire</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Champs collectés</div>
              <div class="v">${form.fieldWrites.size}</div>
              <div class="s">${form.fieldConditions.size} conditions d’affichage</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Pages website</div>
              <div class="v">${linkedPages.length}</div>
              <div class="s">Pages qui exposent ce formulaire</div>
            </div>
          </div>
        </div>
        ${totalAnomalies > 0 ? renderSection("Alertes", "", renderRefList(
          [
            ...unknownWrites.map((key) => ({ title: "Clé inconnue dans le formulaire", key })),
            ...unknownConds.map((key) => ({ title: "Champ inconnu dans les conditions", key }))
          ],
          "Aucune anomalie."
        )) : ""}
        ${renderSection("Étapes du formulaire", "", renderFormSteps(form))}
        ${renderSection("Champs collectés", "", renderRefList(fieldWriteRows.map((row) => ({ title: row.subtitle || row.title, key: row.title, navType: row.navType, navId: row.navId })), "Aucun champ guest détecté."))}
        ${renderSection("Conditions d’affichage", "", renderRefList(conditionRows.map((row) => ({ title: row.subtitle || row.title, key: row.title, navType: row.navType, navId: row.navId })), "Aucune condition détectée."))}
        ${linkedPages.length > 0 ? renderSection("Pages website qui exposent ce formulaire", "Lien déduit via les guest categories website qui pointent vers ce registration form.", renderRefList(
          linkedPages.map((page) => ({ title: page.label, key: page.pathName, navType: "pages", navId: page.id })),
          "Aucune page liée."
        )) : ""}
        ${websiteFormRelations.length > 0 ? renderSection("Rattachements website détaillés", "Pages website qui exposent ce formulaire, avec provenance par guest category.", renderRefList(
          websiteFormRelations.map((rel) => ({
            title: state.atlas.pagesById[rel.targetId]?.label || rel.targetId,
            key: `${state.atlas.pagesById[rel.targetId]?.pathName || rel.targetId}${rel.context ? ` · ${rel.context}` : ""}`,
            navType: "pages",
            navId: rel.targetId
          })),
          "Aucun rattachement détaillé."
        )) : ""}
        ${renderSection("Graphe de dépendances", "Champs collectés ou lus en condition, puis pages qui exposent le formulaire.", renderMermaidGraph(buildFormGraphSpec(form, fieldWriteRows, conditionRows, linkedPages)))}
      </div>
    `;
  }

  function renderPageDetail(page) {
    const fieldRelations = window.AtlasCore.getEntityRelations(state.atlas, "page", page.id, { direction: "out", targetType: "field", type: "website_field" });
    const segmentRelations = window.AtlasCore.getEntityRelations(state.atlas, "page", page.id, { direction: "out", targetType: "segment", type: "website_segment" });
    const formRelations = window.AtlasCore.getEntityRelations(state.atlas, "page", page.id, { direction: "out", targetType: "form", type: "website_form" });
    const pageLinkRelations = window.AtlasCore.getEntityRelations(state.atlas, "page", page.id, { direction: "out", targetType: "page", type: "website_page_link" });
    const complexity = window.AtlasCore.getPageComplexityMetrics(state.atlas, page);
    const conditionRows = renderPageConditionRows(page, complexity);
    const badges = [];
    if (page.isHomepage) badges.push(renderBadge("homepage", "is-neutral"));
    if (page.online) badges.push(renderBadge("online", "is-info"));
    if (page.isPrivate) badges.push(renderBadge("privée", "is-warning"));
    badges.push(renderBadge(complexity.level, complexity.level === "complexe" ? "is-warning" : "is-neutral"));
    return `
      <div class="atlas-detail-stack">
        <div class="atlas-card">
          <h2 class="atlas-detail-title">${escapeHtml(page.label)}</h2>
          <div class="atlas-detail-subtitle">${escapeHtml(page.pathName || page.id)}</div>
          <div class="atlas-badges">${badges.join("")}</div>
          <div class="atlas-detail-summary">
            <div class="atlas-detail-summary-card">
              <div class="k">Complexité</div>
              <div class="v">${complexity.score}</div>
              <div class="s">${complexity.level} · ${complexity.conditionCount} conditions</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Structure</div>
              <div class="v">${page.sectionCount} sections · ${page.blockCount} blocs</div>
              <div class="s">Lecture structurelle rapide</div>
            </div>
            <div class="atlas-detail-summary-card">
              <div class="k">Dépendances</div>
              <div class="v">${segmentRelations.length + fieldRelations.length + formRelations.length}</div>
              <div class="s">${segmentRelations.length} segments · ${fieldRelations.length} champs · ${formRelations.length} formulaires</div>
            </div>
          </div>
        </div>
        ${renderSection("Ce que fait la page", "Ce que la page expose ou déclenche côté website.", renderRefList(
          [
            ...formRelations.map((rel) => ({
              title: state.atlas.formsById[rel.targetId]?.title || rel.targetId,
              key: rel.context || "form",
              navType: "forms",
              navId: rel.targetId
            })),
            ...pageLinkRelations.map((rel) => ({
              title: state.atlas.pagesById[rel.targetId]?.label || rel.targetId,
              key: rel.context || "page link",
              navType: "pages",
              navId: rel.targetId
            }))
          ],
          "Aucune exposition détectée."
        ))}
        ${conditionRows.length > 0 ? renderSection("Ce qui conditionne l’affichage", "Segments, conditions et règles de visibilité qui modifient le comportement de la page.", renderRefList(conditionRows, "Aucune condition détectée.")) : ""}
        ${renderSection("De quoi elle dépend", "Les segments et champs dont dépend réellement cette page.", renderRefList(
          [
            ...segmentRelations.map((rel) => ({
              title: state.atlas.segments.find((segment) => segment.id === rel.targetId)?.label || rel.targetId,
              key: rel.context || "segment",
              navType: "segments",
              navId: rel.targetId
            })),
            ...fieldRelations.map((rel) => ({
              title: state.atlas.fieldsByKey[rel.targetId]?.label || rel.targetId,
              key: rel.context || "field",
              navType: "fields",
              navId: rel.targetId
            }))
          ],
          "Aucune dépendance détectée."
        ))}
        ${renderSection("Sections et blocs", "Répartition visuelle de la page.", renderRefList(
          page.sections.map((section) => ({
            title: `${section.title} (${section.type})`,
            key: `${section.blockCount} bloc${section.blockCount > 1 ? "s" : ""}`
          })),
          "Aucune section détectée."
        ))}
        ${page.sections.map((section) => renderSection(
          `Section · ${section.title}`,
          section.schemaName || section.type || "",
          renderRefList(
            section.blocks.map((block) => {
              const blockFields = getBlockFieldRefs(block);
              const blockSegments = block.segmentIds.map((id) => state.atlas.segments.find((segment) => segment.id === id)?.label || id);
              return {
                title: `${block.title} (${block.type})${blockFields.length ? ` · ${blockFields.map((field) => field.label).join(", ")}` : ""}`,
                key: `${blockSegments.length ? blockSegments.join(", ") : "sans segment"}${block.conditionalDisplay ? " · conditionnel" : ""}`
              };
            }),
            "Aucun bloc enfant."
          )
        )).join("")}
      </div>
    `;
  }

  function renderSection(title, hint, content) {
    return `
      <div class="atlas-card atlas-section">
        <div class="atlas-section-head">
          <div class="atlas-section-title">${escapeHtml(title)}</div>
          ${hint ? `<div class="atlas-section-hint">${escapeHtml(hint)}</div>` : ""}
        </div>
        ${content}
      </div>
    `;
  }

  function renderOpenInEM(navType, navId) {
    var url = getExtUrl(navType, navId);
    if (!url) return '';
    return '<a class="atlas-open-in-em" href="' + escapeHtml(url) + '" data-ext-link>↗ Ouvrir dans Eventmaker</a>';
  }

  function getExtUrl(navType, navId) {
    if (!state.atlas || !state.context.eventId || !window.AtlasEventmakerUrls) return null;
    var eventId = state.context.eventId;
    var lang = state.lang;

    if (navType === "fields") {
      var field = state.atlas.fieldsByKey[navId];
      if (!field || !field._id) return null;
      return window.AtlasEventmakerUrls.buildEventmakerUrl("field", field._id, { eventId: eventId, lang: lang });
    }
    if (navType === "segments") {
      var segment = state.atlas.segments.find(function(s) { return s.id === navId; });
      if (!segment) return null;
      return window.AtlasEventmakerUrls.buildEventmakerUrl("segment", null, { eventId: eventId, lang: lang, query: segment.query });
    }
    if (navType === "forms") {
      return window.AtlasEventmakerUrls.buildEventmakerUrl("form", navId, { eventId: eventId, lang: lang });
    }
    if (navType === "categories") {
      return window.AtlasEventmakerUrls.buildEventmakerUrl("category", navId, { eventId: eventId, lang: lang });
    }
    if (navType === "automations") {
      return window.AtlasEventmakerUrls.buildEventmakerUrl("automation", navId, { eventId: eventId, lang: lang });
    }
    if (navType === "emails") {
      return window.AtlasEventmakerUrls.buildEventmakerUrl("email", navId, { eventId: eventId, lang: lang });
    }
    if (navType === "pages") {
      return window.AtlasEventmakerUrls.buildEventmakerUrl("page", navId, { eventId: eventId, lang: lang });
    }
    return null;
  }

  function renderRefList(rows, emptyMessage) {
    if (!rows || rows.length === 0) return '<div class="atlas-note">' + escapeHtml(emptyMessage) + '</div>';
    return '<ul class="atlas-ref-list">' + rows.map(function(row) {
      var hasNav = !!(row.navType && row.navId);
      var extUrl = hasNav ? getExtUrl(row.navType, row.navId) : null;
      var extLink = extUrl
        ? '<a class="atlas-ext-link" href="' + escapeHtml(extUrl) + '" title="Ouvrir dans Eventmaker" data-ext-link>↗</a>'
        : '';
      return '<li class="atlas-ref-list-item ' + (hasNav ? 'is-clickable' : '') + '"'
        + (hasNav ? ' data-nav-type="' + escapeHtml(row.navType) + '" data-nav-id="' + escapeHtml(row.navId) + '"' : '')
        + '>'
        + '<span class="atlas-type-dot" style="background:' + escapeHtml(typeColorForNav(row.navType)) + '"></span>'
        + '<span class="atlas-ref-main">'
        + '<span class="atlas-ref-label">' + escapeHtml(row.title) + '</span>'
        + (row.subtitle ? '<span class="atlas-ref-subtitle">' + escapeHtml(row.subtitle) + '</span>' : '')
        + '<span class="atlas-ref-key">' + escapeHtml(row.key || '') + '</span>'
        + '</span>'
        + extLink
        + '</li>';
    }).join('') + '</ul>';
  }

  function renderFormSteps(form) {
    const parts = [];
    form.steps.forEach((step, index) => {
      const displayItems = step.sections.flatMap((section) => section.items).filter((item) => item.type !== "paragraph");
      parts.push(`
        <div class="atlas-section">
          <div class="atlas-section-title">${escapeHtml(`${index + 1}. ${step.title || "Étape"}`)}</div>
          ${
            displayItems.length === 0
              ? '<div class="atlas-note">Étape de confirmation / contenu uniquement.</div>'
              : renderRefList(displayItems.map((item) => ({
                  title: item.label || "(sans label)",
                  key: item.key || item.type,
                  navType: item.key && state.atlas.fieldsByKey[item.key] ? "fields" : null,
                  navId: item.key && state.atlas.fieldsByKey[item.key] ? item.key : null
                })), "Aucun item.")
          }
        </div>
      `);
    });
    return parts.join("");
  }

  function renderMiniGraph(graph) {
    return `
      <div class="atlas-mini-graph">
        <div class="atlas-mini-graph-col">
          ${graph.incoming?.length ? graph.incoming.map((node) => `
            <div class="atlas-mini-graph-node ${node.navType && node.navId ? "is-clickable" : ""}" ${node.navType && node.navId ? `data-nav-type="${escapeHtml(node.navType)}" data-nav-id="${escapeHtml(node.navId)}"` : ""}>
              <strong>${escapeHtml(node.title)}</strong>
              <span>${escapeHtml(node.key || "")}</span>
            </div>
          `).join("") : '<div class="atlas-note">Aucune entrée</div>'}
        </div>
        <div class="atlas-mini-graph-center">
          <strong>${escapeHtml(graph.center.title)}</strong>
          <div class="atlas-inline-muted">${escapeHtml(graph.center.key || "")}</div>
        </div>
        <div class="atlas-mini-graph-col">
          ${graph.outgoing?.length ? graph.outgoing.map((node) => `
            <div class="atlas-mini-graph-node ${node.navType && node.navId ? "is-clickable" : ""}" ${node.navType && node.navId ? `data-nav-type="${escapeHtml(node.navType)}" data-nav-id="${escapeHtml(node.navId)}"` : ""}>
              <strong>${escapeHtml(node.title)}</strong>
              <span>${escapeHtml(node.key || "")}</span>
            </div>
          `).join("") : '<div class="atlas-note">Aucune sortie</div>'}
        </div>
      </div>
    `;
  }

  function renderMermaidGraph(spec) {
    if (!spec || !spec.graph) {
      return `<div class="atlas-note">Pas assez de relations pour afficher un graphe utile.</div>`;
    }
    const id = `atlas-mermaid-${Math.random().toString(36).slice(2)}`;
    return `
      <div class="atlas-graph-shell">
        <div class="atlas-graph-meta">
          <div class="atlas-graph-legend">
            ${spec.legend.map((item) => `
              <span class="atlas-graph-legend-item">
                <span class="atlas-graph-legend-dot" style="background:${escapeHtml(item.color)}"></span>
                <span>${escapeHtml(item.label)}</span>
              </span>
            `).join("")}
          </div>
          <div class="atlas-graph-hint">Scroll horizontal si besoin</div>
        </div>
        <div class="atlas-mermaid-shell">
          <div
            class="atlas-mermaid-stage"
            id="${id}"
            data-mermaid-graph="${escapeHtml(encodeURIComponent(spec.graph))}"
            data-mermaid-status="loading"
          >
            <div class="atlas-note">Chargement du graphe…</div>
          </div>
        </div>
      </div>
    `;
  }

  function buildFieldGraphSpec(field, dependencyRows, graphImpact) {
    const dependencyKeys = field.extracted ? [...field.extracted.fields] : [];
    const impactedFields = (graphImpact?.fields || []).filter(Boolean);
    const impactedSegments = (graphImpact?.segments || []).filter(Boolean);
    const impactedForms = (graphImpact?.forms || []).filter(Boolean);
    const impactedEmails = (graphImpact?.emails || []).filter(Boolean);
    const impactedPages = (graphImpact?.pages || []).filter(Boolean);
    const impactedAutomations = (graphImpact?.automations || []).filter(Boolean);
    const total = dependencyKeys.length + impactedFields.length + impactedSegments.length + impactedForms.length + impactedEmails.length + impactedPages.length + impactedAutomations.length;
    if (total < 1) return null;

    const lines = [
      "graph LR",
      '  subgraph IN["Dépendances lues"]',
      "    direction TB"
    ];
    const added = new Set();
    const addNode = (id, label, pill, style) => {
      if (added.has(id)) return;
      added.add(id);
      lines.push(pill ? `  ${id}(["${safeGraphLabel(label)}"])` : `  ${id}["${safeGraphLabel(label)}"]`);
      if (style) lines.push(`  style ${id} ${style}`);
    };

    dependencyRows.slice(0, 8).forEach((row) => {
      const key = row.navId || row.title;
      const nodeId = safeGraphId(`dep_${key}`);
      addNode(nodeId, row.subtitle || row.title, false, row.navId ? graphNodeStyle("dependency") : graphNodeStyle("anomaly"));
    });
    lines.push("  end");
    lines.push('  subgraph CORE["Champ analysé"]');
    lines.push("    direction TB");
    const centerId = safeGraphId(`field_${field.key}`);
    addNode(centerId, field.label, false, graphNodeStyle("center"));
    lines.push("  end");
    lines.push('  subgraph OUT["Objets impactés"]');
    lines.push("    direction TB");

    impactedFields.slice(0, 6).forEach((ref) => addNode(safeGraphId(`f_${ref.key}`), ref.label || ref.key, false, graphNodeStyle("impacted")));
    if (impactedFields.length > 6) addNode("FIELD_MORE", `+${impactedFields.length - 6} champs`, true, graphNodeStyle("summary"));

    impactedSegments.slice(0, 4).forEach((ref) => addNode(safeGraphId(`s_${ref.key}`), ref.label || ref.key, true, graphNodeStyle("segment")));
    if (impactedSegments.length > 4) addNode("SEG_MORE", `+${impactedSegments.length - 4} segments`, true, graphNodeStyle("summary"));

    impactedForms.slice(0, 4).forEach((ref) => addNode(safeGraphId(`frm_${ref.key}`), ref.label || ref.key, false, graphNodeStyle("form")));
    if (impactedForms.length > 4) addNode("FORM_MORE", `+${impactedForms.length - 4} formulaires`, true, graphNodeStyle("summary"));

    impactedEmails.slice(0, 4).forEach((ref) => addNode(safeGraphId(`mail_${ref.key}`), ref.label || ref.key, false, graphNodeStyle("email")));
    if (impactedEmails.length > 4) addNode("EMAIL_MORE", `+${impactedEmails.length - 4} emails`, true, graphNodeStyle("summary"));

    impactedPages.slice(0, 4).forEach((ref) => addNode(safeGraphId(`p_${ref.key}`), ref.label || ref.key, false, graphNodeStyle("page")));
    if (impactedPages.length > 4) addNode("PAGE_MORE", `+${impactedPages.length - 4} pages`, true, graphNodeStyle("summary"));

    impactedAutomations.slice(0, 4).forEach((ref) => addNode(safeGraphId(`auto_${ref.key}_${ref.context || ""}`), ref.context ? `${ref.label} · ${ref.context}` : (ref.label || ref.key), false, graphNodeStyle("automation")));
    if (impactedAutomations.length > 4) addNode("AUTO_MORE", `+${impactedAutomations.length - 4} automations`, true, graphNodeStyle("summary"));
    lines.push("  end");

    dependencyRows.slice(0, 8).forEach((row) => {
      const key = row.navId || row.title;
      lines.push(`  ${safeGraphId(`dep_${key}`)} --> ${centerId}`);
    });
    impactedFields.slice(0, 6).forEach((ref) => lines.push(`  ${centerId} --> ${safeGraphId(`f_${ref.key}`)}`));
    if (impactedFields.length > 6) lines.push(`  ${centerId} --> FIELD_MORE`);
    impactedSegments.slice(0, 4).forEach((ref) => lines.push(`  ${centerId} -.-> ${safeGraphId(`s_${ref.key}`)}`));
    if (impactedSegments.length > 4) lines.push(`  ${centerId} -.-> SEG_MORE`);
    impactedForms.slice(0, 4).forEach((ref) => lines.push(`  ${centerId} ==> ${safeGraphId(`frm_${ref.key}`)}`));
    if (impactedForms.length > 4) lines.push(`  ${centerId} ==> FORM_MORE`);
    impactedEmails.slice(0, 4).forEach((ref) => lines.push(`  ${centerId} --> ${safeGraphId(`mail_${ref.key}`)}`));
    if (impactedEmails.length > 4) lines.push(`  ${centerId} --> EMAIL_MORE`);
    impactedPages.slice(0, 4).forEach((ref) => lines.push(`  ${centerId} --> ${safeGraphId(`p_${ref.key}`)}`));
    if (impactedPages.length > 4) lines.push(`  ${centerId} --> PAGE_MORE`);
    impactedAutomations.slice(0, 4).forEach((ref) => lines.push(`  ${centerId} ==> ${safeGraphId(`auto_${ref.key}_${ref.context || ""}`)}`));
    if (impactedAutomations.length > 4) lines.push(`  ${centerId} ==> AUTO_MORE`);

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "champ analysé", color: graphColor("center") },
        { label: "dépendances", color: graphColor("dependency") },
        { label: "champs impactés", color: graphColor("impacted") },
        impactedSegments.length > 0 ? { label: "segments", color: graphColor("segment") } : null,
        impactedForms.length > 0 ? { label: "formulaires", color: graphColor("form") } : null,
        impactedEmails.length > 0 ? { label: "emails", color: graphColor("email") } : null,
        impactedPages.length > 0 ? { label: "pages website", color: graphColor("page") } : null,
        impactedAutomations.length > 0 ? { label: "automations", color: graphColor("automation") } : null
      ].filter(Boolean)
    };
  }

  function buildSegmentGraphSpec(segment, knownRows, linkedPages, emailRows) {
    const fields = knownRows.slice(0, 8);
    const pages = linkedPages.slice(0, 6);
    const emails = (emailRows || []).slice(0, 5);
    if (fields.length + pages.length + emails.length < 2) return null;
    const centerId = safeGraphId(`segment_${segment.id}`);
    const lines = [
      "graph LR",
      '  subgraph IN["Champs lus"]',
      "    direction TB"
    ];
    fields.forEach((row) => {
      lines.push(`  ${safeGraphId(`field_${row.navId || row.title}`)}["${safeGraphLabel(row.title)}"]`);
      lines.push(`  style ${safeGraphId(`field_${row.navId || row.title}`)} ${graphNodeStyle("dependency")}`);
    });
    lines.push("  end");
    lines.push('  subgraph CORE["Segment"]');
    lines.push("    direction TB");
    lines.push(`  ${centerId}(["${safeGraphLabel(segment.label)}"])`);
    lines.push(`  style ${centerId} ${graphNodeStyle("segment")}`);
    lines.push("  end");
    lines.push('  subgraph OUT["Pages impactées"]');
    lines.push("    direction TB");
    pages.forEach((page) => {
      lines.push(`  ${safeGraphId(`page_${page.id}`)}["${safeGraphLabel(page.label)}"]`);
      lines.push(`  style ${safeGraphId(`page_${page.id}`)} ${graphNodeStyle("page")}`);
    });
    if (linkedPages.length > 6) {
      lines.push('  PAGE_MORE["+' + (linkedPages.length - 6) + ' pages"]');
      lines.push(`  style PAGE_MORE ${graphNodeStyle("summary")}`);
    }
    lines.push("  end");
    if (emails.length > 0) {
      lines.push('  subgraph EMAIL["Emails impactés"]');
      lines.push("    direction TB");
      emails.forEach((row) => {
        const nodeId = safeGraphId(`segment_email_${row.navId || row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("email")}`);
      });
      if ((emailRows || []).length > 5) {
        lines.push(`  SEG_EMAIL_MORE["${safeGraphLabel(`+${emailRows.length - 5} emails`)}"]`);
        lines.push(`  style SEG_EMAIL_MORE ${graphNodeStyle("summary")}`);
      }
      lines.push("  end");
    }
    fields.forEach((row) => lines.push(`  ${safeGraphId(`field_${row.navId || row.title}`)} --> ${centerId}`));
    pages.forEach((page) => lines.push(`  ${centerId} -.-> ${safeGraphId(`page_${page.id}`)}`));
    if (linkedPages.length > 6) lines.push(`  ${centerId} -.-> PAGE_MORE`);
    emails.forEach((row) => lines.push(`  ${centerId} ==> ${safeGraphId(`segment_email_${row.navId || row.title}`)}`));
    if ((emailRows || []).length > 5) lines.push(`  ${centerId} ==> SEG_EMAIL_MORE`);

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "champs lus", color: graphColor("dependency") },
        { label: "segment", color: graphColor("segment") },
        pages.length > 0 ? { label: "pages website", color: graphColor("page") } : null,
        emails.length > 0 ? { label: "emails", color: graphColor("email") } : null
      ].filter(Boolean)
    };
  }

  function buildEmailGraphSpec(emailTemplate, fieldRows, categoryRows, segmentRows, automationRows) {
    const fields = (fieldRows || []).slice(0, 8);
    const categories = (categoryRows || []).slice(0, 5);
    const segments = (segmentRows || []).slice(0, 5);
    const automations = (automationRows || []).slice(0, 4);
    const total = fields.length + categories.length + segments.length + automations.length;
    if (total < 2) return null;

    const centerId = safeGraphId(`email_${emailTemplate.id}`);
    const lines = [
      "graph LR",
      '  subgraph IN["Champs lus"]',
      "    direction TB"
    ];

    fields.forEach((row) => {
      const nodeId = safeGraphId(`email_field_${row.navId || row.title}`);
      lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
      lines.push(`  style ${nodeId} ${graphNodeStyle("dependency")}`);
    });
    if ((fieldRows || []).length > 8) {
      lines.push(`  EMAIL_FIELD_MORE["${safeGraphLabel(`+${fieldRows.length - 8} champs`)}"]`);
      lines.push(`  style EMAIL_FIELD_MORE ${graphNodeStyle("summary")}`);
    }
    lines.push("  end");
    lines.push('  subgraph CORE["Email"]');
    lines.push("    direction TB");
    lines.push(`  ${centerId}(["${safeGraphLabel(emailTemplate.label)}"])`);
    lines.push(`  style ${centerId} ${graphNodeStyle("email")}`);
    lines.push("  end");

    if (categories.length > 0) {
      lines.push('  subgraph CAT["Catégories ciblées"]');
      lines.push("    direction TB");
      categories.forEach((row) => {
        const nodeId = safeGraphId(`email_cat_${row.navId || row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("category")}`);
      });
      if ((categoryRows || []).length > 5) {
        lines.push(`  EMAIL_CAT_MORE["${safeGraphLabel(`+${categoryRows.length - 5} catégories`)}"]`);
        lines.push(`  style EMAIL_CAT_MORE ${graphNodeStyle("summary")}`);
      }
      lines.push("  end");
    }

    if (segments.length > 0) {
      lines.push('  subgraph SEG["Segments liés"]');
      lines.push("    direction TB");
      segments.forEach((row) => {
        const nodeId = safeGraphId(`email_seg_${row.navId || row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("segment")}`);
      });
      if ((segmentRows || []).length > 5) {
        lines.push(`  EMAIL_SEG_MORE["${safeGraphLabel(`+${segmentRows.length - 5} segments`)}"]`);
        lines.push(`  style EMAIL_SEG_MORE ${graphNodeStyle("summary")}`);
      }
      lines.push("  end");
    }

    if (automations.length > 0) {
      lines.push('  subgraph AUTO["Automations entrantes"]');
      lines.push("    direction TB");
      automations.forEach((row) => {
        const nodeId = safeGraphId(`email_auto_${row.navId || row.title}_${row.key || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("automation")}`);
      });
      if ((automationRows || []).length > 4) {
        lines.push(`  EMAIL_AUTO_MORE["${safeGraphLabel(`+${automationRows.length - 4} automations`)}"]`);
        lines.push(`  style EMAIL_AUTO_MORE ${graphNodeStyle("summary")}`);
      }
      lines.push("  end");
    }

    fields.forEach((row) => lines.push(`  ${safeGraphId(`email_field_${row.navId || row.title}`)} --> ${centerId}`));
    if ((fieldRows || []).length > 8) lines.push(`  EMAIL_FIELD_MORE --> ${centerId}`);
    categories.forEach((row) => lines.push(`  ${centerId} -.-> ${safeGraphId(`email_cat_${row.navId || row.title}`)}`));
    if ((categoryRows || []).length > 5) lines.push(`  ${centerId} -.-> EMAIL_CAT_MORE`);
    segments.forEach((row) => lines.push(`  ${centerId} -.-> ${safeGraphId(`email_seg_${row.navId || row.title}`)}`));
    if ((segmentRows || []).length > 5) lines.push(`  ${centerId} -.-> EMAIL_SEG_MORE`);
    automations.forEach((row) => lines.push(`  ${safeGraphId(`email_auto_${row.navId || row.title}_${row.key || ""}`)} ==> ${centerId}`));
    if ((automationRows || []).length > 4) lines.push(`  EMAIL_AUTO_MORE ==> ${centerId}`);

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "email", color: graphColor("email") },
        fields.length > 0 ? { label: "champs lus", color: graphColor("dependency") } : null,
        categories.length > 0 ? { label: "catégories", color: graphColor("category") } : null,
        segments.length > 0 ? { label: "segments", color: graphColor("segment") } : null,
        automations.length > 0 ? { label: "automations", color: graphColor("automation") } : null
      ].filter(Boolean)
    };
  }

  function buildCategoryGraphSpec(category, formRows, pageRows, networkingRows, automationRows) {
    const forms = (formRows || []).slice(0, 3);
    const pages = (pageRows || []).slice(0, 4);
    const networking = (networkingRows || []).slice(0, 3);
    const automations = (automationRows || []).slice(0, 4);
    const total = forms.length + pages.length + networking.length + automations.length;
    if (total < 1) return null;
    const centerId = safeGraphId(`cat_${category.id}`);
    const lines = [
      "graph LR",
      '  subgraph CORE["Catégorie"]',
      "    direction TB",
      `  ${centerId}(["${safeGraphLabel(category.label)}"])`,
      `  style ${centerId} ${graphNodeStyle("category")}`,
      "  end"
    ];

    if (forms.length > 0) {
      lines.push('  subgraph FORM["Formulaire"]');
      lines.push("    direction TB");
      forms.forEach((row) => {
        const nodeId = safeGraphId(`cat_form_${row.navId || row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("form")}`);
        lines.push(`  ${centerId} --> ${nodeId}`);
      });
      lines.push("  end");
    }

    if (pages.length > 0) {
      lines.push('  subgraph PAGE["Website"]');
      lines.push("    direction TB");
      pages.forEach((row) => {
        const nodeId = safeGraphId(`cat_page_${row.navId || row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("page")}`);
        lines.push(`  ${nodeId} --> ${centerId}`);
      });
      lines.push("  end");
    }

    if (networking.length > 0) {
      lines.push('  subgraph NET["Networking"]');
      lines.push("    direction TB");
      networking.forEach((row) => {
        const nodeId = safeGraphId(`cat_net_${row.navId || row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("networking")}`);
        lines.push(`  ${nodeId} -.-> ${centerId}`);
      });
      lines.push("  end");
    }

    if (automations.length > 0) {
      lines.push('  subgraph AUTO["Automations"]');
      lines.push("    direction TB");
      automations.forEach((row) => {
        const nodeId = safeGraphId(`cat_auto_${row.navId || row.title}_${row.key || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("automation")}`);
        lines.push(`  ${nodeId} ==> ${centerId}`);
      });
      lines.push("  end");
    }

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "catégorie", color: graphColor("category") },
        forms.length > 0 ? { label: "formulaire", color: graphColor("form") } : null,
        pages.length > 0 ? { label: "pages website", color: graphColor("page") } : null,
        networking.length > 0 ? { label: "networking", color: graphColor("networking") } : null,
        automations.length > 0 ? { label: "automations", color: graphColor("automation") } : null
      ].filter(Boolean)
    };
  }

  function buildAutomationGraphSpec(automation) {
    const steps = (automation.steps || []).slice(0, 5);
    const fieldRefs = [];
    const categoryRefs = [];
    const segmentRefs = [];
    const endpointRefs = [];

    steps.forEach((step) => {
      (step.fieldRefs || []).slice(0, 3).forEach((ref) => {
        fieldRefs.push({
          key: ref.key,
          label: state.atlas.fieldsByKey[ref.key]?.label || ref.key,
          context: ref.context || null
        });
      });
      (step.categoryRefs || []).filter((ref) => Boolean(ref.id)).slice(0, 2).forEach((ref) => {
        const category = state.atlas.guestCategoriesById[ref.id];
        categoryRefs.push({
          id: ref.id,
          label: category?.label || ref.id,
          context: ref.context || null
        });
      });
      (step.segmentRefs || []).slice(0, 2).forEach((ref) => {
        const segment = state.atlas.segmentsById[ref.id];
        segmentRefs.push({
          id: ref.id,
          label: segment?.label || ref.id,
          context: ref.context || null
        });
      });
      (step.externalEndpoints || []).slice(0, 2).forEach((ref) => {
        endpointRefs.push({
          url: ref.url,
          label: ref.url.replace(/^https?:\/\//, ""),
          context: ref.context || null
        });
      });
    });

    const total = steps.length + fieldRefs.length + categoryRefs.length + segmentRefs.length + endpointRefs.length;
    if (total < 2) return null;

    const centerId = safeGraphId(`automation_${automation.id}`);
    const lines = [
      "graph LR",
      '  subgraph CORE["Automation"]',
      "    direction TB",
      `  ${centerId}(["${safeGraphLabel(automation.label)}"])`,
      `  style ${centerId} ${graphNodeStyle("automation")}`,
      "  end"
    ];

    if (steps.length > 0) {
      lines.push('  subgraph STEP["Étapes"]');
      lines.push("    direction TB");
      steps.forEach((step) => {
        const stepId = safeGraphId(`auto_step_${step.id || step.label}`);
        lines.push(`  ${stepId}["${safeGraphLabel(step.label || step.strategy)}"]`);
        lines.push(`  style ${stepId} ${graphNodeStyle(step.type === "trigger" ? "segment" : step.type === "filter" ? "dependency" : "automation")}`);
        lines.push(`  ${stepId} --> ${centerId}`);
      });
      lines.push("  end");
    }

    if (fieldRefs.length > 0) {
      lines.push('  subgraph FIELD["Champs lus"]');
      lines.push("    direction TB");
      fieldRefs.slice(0, 6).forEach((ref) => {
        const nodeId = safeGraphId(`auto_field_${ref.key}_${ref.context || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(ref.context ? `${ref.label} · ${ref.context}` : ref.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("dependency")}`);
        lines.push(`  ${centerId} --> ${nodeId}`);
      });
      if (fieldRefs.length > 6) {
        lines.push(`  AUTO_FIELD_MORE["${safeGraphLabel(`+${fieldRefs.length - 6} champs`)}"]`);
        lines.push(`  style AUTO_FIELD_MORE ${graphNodeStyle("summary")}`);
        lines.push(`  ${centerId} --> AUTO_FIELD_MORE`);
      }
      lines.push("  end");
    }

    if (categoryRefs.length > 0) {
      lines.push('  subgraph CAT["Catégories"]');
      lines.push("    direction TB");
      categoryRefs.slice(0, 4).forEach((ref) => {
        const nodeId = safeGraphId(`auto_cat_${ref.id}_${ref.context || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(ref.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("category")}`);
        lines.push(`  ${nodeId} -.-> ${centerId}`);
      });
      if (categoryRefs.length > 4) {
        lines.push(`  AUTO_CAT_MORE["${safeGraphLabel(`+${categoryRefs.length - 4} catégories`)}"]`);
        lines.push(`  style AUTO_CAT_MORE ${graphNodeStyle("summary")}`);
        lines.push(`  AUTO_CAT_MORE -.-> ${centerId}`);
      }
      lines.push("  end");
    }

    if (segmentRefs.length > 0) {
      lines.push('  subgraph SEG["Segments"]');
      lines.push("    direction TB");
      segmentRefs.slice(0, 4).forEach((ref) => {
        const nodeId = safeGraphId(`auto_seg_${ref.id}_${ref.context || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(ref.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("segment")}`);
        lines.push(`  ${nodeId} -.-> ${centerId}`);
      });
      if (segmentRefs.length > 4) {
        lines.push(`  AUTO_SEG_MORE["${safeGraphLabel(`+${segmentRefs.length - 4} segments`)}"]`);
        lines.push(`  style AUTO_SEG_MORE ${graphNodeStyle("summary")}`);
        lines.push(`  AUTO_SEG_MORE -.-> ${centerId}`);
      }
      lines.push("  end");
    }

    if (endpointRefs.length > 0) {
      lines.push('  subgraph EXT["Endpoints externes"]');
      lines.push("    direction TB");
      endpointRefs.slice(0, 3).forEach((ref) => {
        const nodeId = safeGraphId(`auto_ext_${ref.url}_${ref.context || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(ref.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("page")}`);
        lines.push(`  ${centerId} ==> ${nodeId}`);
      });
      if (endpointRefs.length > 3) {
        lines.push(`  AUTO_EXT_MORE["${safeGraphLabel(`+${endpointRefs.length - 3} endpoints`)}"]`);
        lines.push(`  style AUTO_EXT_MORE ${graphNodeStyle("summary")}`);
        lines.push(`  ${centerId} ==> AUTO_EXT_MORE`);
      }
      lines.push("  end");
    }

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "automation", color: graphColor("automation") },
        steps.length > 0 ? { label: "étapes", color: graphColor("dependency") } : null,
        fieldRefs.length > 0 ? { label: "champs lus", color: graphColor("dependency") } : null,
        categoryRefs.length > 0 ? { label: "catégories", color: graphColor("category") } : null,
        segmentRefs.length > 0 ? { label: "segments", color: graphColor("segment") } : null,
        endpointRefs.length > 0 ? { label: "endpoints", color: graphColor("page") } : null
      ].filter(Boolean)
    };
  }

  function buildNetworkingGraphSpec(ruleSet, segmentRows, categoryRows, viewRows) {
    const segments = (segmentRows || []).filter((row) => row.navId).slice(0, 2);
    const categories = (categoryRows || []).slice(0, 5);
    const views = (viewRows || []).slice(0, 4);
    const total = segments.length + categories.length + views.length;
    if (total < 1) return null;

    const centerId = safeGraphId(`networking_${ruleSet.id}`);
    const lines = [
      "graph LR",
      '  subgraph CORE["Networking"]',
      "    direction TB",
      `  ${centerId}(["${safeGraphLabel(ruleSet.label)}"])`,
      `  style ${centerId} ${graphNodeStyle("networking")}`,
      "  end"
    ];

    if (segments.length > 0) {
      lines.push('  subgraph SEG["Segments"]');
      lines.push("    direction TB");
      segments.forEach((row) => {
        const nodeId = safeGraphId(`net_seg_${row.navId}_${row.title}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("segment")}`);
        lines.push(`  ${nodeId} -.-> ${centerId}`);
      });
      lines.push("  end");
    }

    if (categories.length > 0) {
      lines.push('  subgraph CAT["Catégories"]');
      lines.push("    direction TB");
      categories.forEach((row) => {
        const nodeId = safeGraphId(`net_cat_${row.title}_${row.key || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(row.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("category")}`);
        lines.push(`  ${centerId} --> ${nodeId}`);
      });
      if ((categoryRows || []).length > 5) {
        lines.push(`  NET_CAT_MORE["${safeGraphLabel(`+${categoryRows.length - 5} catégories`)}"]`);
        lines.push(`  style NET_CAT_MORE ${graphNodeStyle("summary")}`);
        lines.push(`  ${centerId} --> NET_CAT_MORE`);
      }
      lines.push("  end");
    }

    if (views.length > 0) {
      lines.push('  subgraph VIEW["Guest View"]');
      lines.push("    direction TB");
      views.forEach((row) => {
        const nodeId = safeGraphId(`net_view_${row.title}_${row.key || ""}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(`${row.title} · ${row.key}`)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("form")}`);
        lines.push(`  ${centerId} ==> ${nodeId}`);
      });
      if ((viewRows || []).length > 4) {
        lines.push(`  NET_VIEW_MORE["${safeGraphLabel(`+${viewRows.length - 4} vues`)}"]`);
        lines.push(`  style NET_VIEW_MORE ${graphNodeStyle("summary")}`);
        lines.push(`  ${centerId} ==> NET_VIEW_MORE`);
      }
      lines.push("  end");
    }

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "networking", color: graphColor("networking") },
        segments.length > 0 ? { label: "segments", color: graphColor("segment") } : null,
        categories.length > 0 ? { label: "catégories", color: graphColor("category") } : null,
        views.length > 0 ? { label: "guest view rules", color: graphColor("form") } : null
      ].filter(Boolean)
    };
  }

  function buildProcessGraphSpec(process) {
    const categories = (process.categories || []).slice(0, 3);
    const forms = (process.forms || []).slice(0, 3);
    const automations = (process.automations || []).slice(0, 4);
    const pages = (process.pages || []).slice(0, 3);
    const networking = (process.networking || []).slice(0, 2);
    const total = categories.length + forms.length + automations.length + pages.length + networking.length;
    if (total < 2) return null;

    const centerId = safeGraphId(`process_${process.id}`);
    const lines = [
      "graph LR",
      '  subgraph CORE["Process"]',
      "    direction TB",
      `  ${centerId}(["${safeGraphLabel(process.title)}"])`,
      `  style ${centerId} ${graphNodeStyle("center")}`,
      "  end"
    ];

    if (categories.length > 0) {
      lines.push('  subgraph CAT["Catégories"]');
      lines.push("    direction TB");
      categories.forEach((category) => {
        const nodeId = safeGraphId(`process_cat_${category.id}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(category.label || category.name)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("category")}`);
        lines.push(`  ${nodeId} --> ${centerId}`);
      });
      lines.push("  end");
    }

    if (forms.length > 0) {
      lines.push('  subgraph FORM["Formulaires"]');
      lines.push("    direction TB");
      forms.forEach((form) => {
        const nodeId = safeGraphId(`process_form_${form.id}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(form.title)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("form")}`);
        lines.push(`  ${centerId} --> ${nodeId}`);
      });
      lines.push("  end");
    }

    if (automations.length > 0) {
      lines.push('  subgraph AUTO["Automations"]');
      lines.push("    direction TB");
      automations.forEach((automation) => {
        const nodeId = safeGraphId(`process_auto_${automation.id}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(automation.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("automation")}`);
        lines.push(`  ${centerId} ==> ${nodeId}`);
      });
      lines.push("  end");
    }

    if (pages.length > 0) {
      lines.push('  subgraph PAGE["Website"]');
      lines.push("    direction TB");
      pages.forEach((page) => {
        const nodeId = safeGraphId(`process_page_${page.id}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(page.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("page")}`);
        lines.push(`  ${centerId} --> ${nodeId}`);
      });
      lines.push("  end");
    }

    if (networking.length > 0) {
      lines.push('  subgraph NET["Networking"]');
      lines.push("    direction TB");
      networking.forEach((entry) => {
        const nodeId = safeGraphId(`process_net_${entry.id}`);
        lines.push(`  ${nodeId}["${safeGraphLabel(entry.label)}"]`);
        lines.push(`  style ${nodeId} ${graphNodeStyle("networking")}`);
        lines.push(`  ${centerId} -.-> ${nodeId}`);
      });
      lines.push("  end");
    }

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "process", color: graphColor("center") },
        categories.length > 0 ? { label: "catégories", color: graphColor("category") } : null,
        forms.length > 0 ? { label: "formulaires", color: graphColor("form") } : null,
        automations.length > 0 ? { label: "automations", color: graphColor("automation") } : null,
        pages.length > 0 ? { label: "website", color: graphColor("page") } : null,
        networking.length > 0 ? { label: "networking", color: graphColor("networking") } : null
      ].filter(Boolean)
    };
  }

  function buildFormGraphSpec(form, fieldWriteRows, conditionRows, linkedPages) {
    const incoming = [...fieldWriteRows, ...conditionRows].slice(0, 10);
    const pages = linkedPages.slice(0, 6);
    if (incoming.length + pages.length < 2) return null;
    const centerId = safeGraphId(`form_${form.id}`);
    const lines = [
      "graph LR",
      '  subgraph IN["Champs collectés / conditions"]',
      "    direction TB"
    ];
    incoming.forEach((row, index) => {
      const nodeId = safeGraphId(`form_field_${row.navId || row.title}_${index}`);
      lines.push(`  ${nodeId}["${safeGraphLabel(row.subtitle || row.title)}"]`);
      lines.push(`  style ${nodeId} ${graphNodeStyle("dependency")}`);
    });
    lines.push("  end");
    lines.push('  subgraph CORE["Formulaire"]');
    lines.push("    direction TB");
    lines.push(`  ${centerId}["${safeGraphLabel(form.title)}"]`);
    lines.push(`  style ${centerId} ${graphNodeStyle("form")}`);
    lines.push("  end");
    lines.push('  subgraph OUT["Pages website"]');
    lines.push("    direction TB");
    pages.forEach((page) => {
      lines.push(`  ${safeGraphId(`page_${page.id}`)}["${safeGraphLabel(page.label)}"]`);
      lines.push(`  style ${safeGraphId(`page_${page.id}`)} ${graphNodeStyle("page")}`);
    });
    if (linkedPages.length > 6) {
      lines.push('  FORM_PAGE_MORE["+' + (linkedPages.length - 6) + ' pages"]');
      lines.push(`  style FORM_PAGE_MORE ${graphNodeStyle("summary")}`);
    }
    lines.push("  end");
    incoming.forEach((row, index) => lines.push(`  ${safeGraphId(`form_field_${row.navId || row.title}_${index}`)} --> ${centerId}`));
    pages.forEach((page) => lines.push(`  ${centerId} ==> ${safeGraphId(`page_${page.id}`)}`));
    if (linkedPages.length > 6) lines.push(`  ${centerId} ==> FORM_PAGE_MORE`);

    return {
      graph: lines.join("\n"),
      legend: [
        { label: "champs / conditions", color: graphColor("dependency") },
        { label: "formulaire", color: graphColor("form") },
        pages.length > 0 ? { label: "pages website", color: graphColor("page") } : null
      ].filter(Boolean)
    };
  }

  function renderPageConditionRows(page, complexity) {
    const rows = [];
    if (complexity.conditionCount > 0) {
      rows.push({
        title: "Affichages conditionnels détectés",
        key: `${complexity.conditionCount}`
      });
    }
    if (page.isPrivate) {
      rows.push({
        title: "Visibilité",
        key: "privée"
      });
    }
    if (page.publicOnly) {
      rows.push({
        title: "Visibilité",
        key: "public only"
      });
    }

    page.sections.forEach((section) => {
      const sectionFlags = [];
      if (section.conditionalDisplay) sectionFlags.push("affichage conditionnel");
      if (section.isPrivate) sectionFlags.push("privé");
      if (section.publicOnly) sectionFlags.push("public only");
      if (sectionFlags.length > 0 || section.segmentIds.length > 0) {
        const segmentLabels = section.segmentIds.map((id) => state.atlas.segments.find((segment) => segment.id === id)?.label || `segment:${id}`);
        rows.push({
          title: `Section · ${section.title}`,
          key: [...sectionFlags, ...segmentLabels].join(" · ")
        });
      }

      section.blocks.forEach((block) => {
        const blockFlags = [];
        if (block.conditionalDisplay) blockFlags.push("affichage conditionnel");
        if (block.isPrivate) blockFlags.push("privé");
        if (block.publicOnly) blockFlags.push("public only");
        if (blockFlags.length > 0 || block.segmentIds.length > 0) {
          const segmentLabels = block.segmentIds.map((id) => state.atlas.segments.find((segment) => segment.id === id)?.label || `segment:${id}`);
          rows.push({
            title: `Bloc · ${section.title} / ${block.title}`,
            key: [...blockFlags, ...segmentLabels].join(" · ")
          });
        }
      });
    });

    return rows;
  }

  function getBlockFieldRefs(block) {
    const refs = [];
    (block.fieldKeys || []).forEach((key) => {
      const resolved = state.atlas.fieldsByKey[key] ? key : key.replace(/_level_\d+$/, "");
      const field = state.atlas.fieldsByKey[resolved];
      if (!field) return;
      refs.push({
        key: field.key,
        label: field.label || field.key,
        type: field.type || "text"
      });
    });
    (block.fieldIds || []).forEach((id) => {
      const field = state.atlas.fieldsById[id];
      if (!field) return;
      refs.push({
        key: field.key,
        label: field.label || field.key,
        type: field.type || "text"
      });
    });
    return [...new Map(refs.map((ref) => [ref.key, ref])).values()];
  }

  function renderSimpleRows(rows, emptyMessage) {
    if (!rows || rows.length === 0) return `<div class="atlas-kv-row"><span>${escapeHtml(emptyMessage)}</span></div>`;
    return rows.map((row) => `
      <${row.navType && row.navId ? "button" : "div"} class="atlas-kv-row ${row.navType && row.navId ? "is-clickable" : ""}" ${row.navType && row.navId ? `type="button" data-nav-type="${escapeHtml(row.navType)}" data-nav-id="${escapeHtml(row.navId)}"` : ""}>
        <strong>${escapeHtml(row.title)}</strong>
        <span>${escapeHtml(row.subtitle || "")}</span>
      </${row.navType && row.navId ? "button" : "div"}>
    `).join("");
  }

  async function syncCacheFromContext() {
    if (!state.context.hasEventContext) {
      state.cache = null;
      state.atlas = null;
      state.selected = null;
      state.lastMessage = null;
      render();
      return;
    }
    state.cache = await window.AtlasStorage.readEventCache(state.context.eventId);
    state.atlas = state.cache?.snapshot ? window.AtlasCore.buildAtlas(state.cache.snapshot) : null;
    syncSelectionWithContext();
    // Segment matching on initial load (guests page with ?q= — not handled by matchContextToEntity)
    if (state.atlas && state.context.pageType === "guests" && state.context.guestQuery && state.selected === null) {
      const segmentMatch = matchSegmentFromQuery(state.context.guestQuery);
      if (segmentMatch) navigateToEntity("segments", segmentMatch.id);
    }
    // Restore saved navigation state if no URL-based match was found
    if (state.selected === null && state.activeTab === "overview") {
      await restoreNavState();
    }
    render();
  }

  async function refreshSnapshot() {
    if (!state.context.hasEventContext || state.isLoading) return;
    state.isLoading = true;
    state.lastMessage = null;
    render();
    try {
      const snapshot = await window.AtlasEventmakerApi.fetchEventSnapshot(state.context.eventId, state.context.csrfToken);
      await window.AtlasStorage.writeEventCache(state.context.eventId, snapshot);
      state.cache = await window.AtlasStorage.readEventCache(state.context.eventId);
      state.atlas = window.AtlasCore.buildAtlas(state.cache.snapshot);
      syncSelectionWithContext();
      if (state.context.pageType === "guests" && state.context.guestQuery && state.selected === null) {
        const segmentMatch = matchSegmentFromQuery(state.context.guestQuery);
        if (segmentMatch) navigateToEntity("segments", segmentMatch.id);
      }
      state.lastMessage = {
        ok: true,
        message: [
          `Snapshot mis à jour pour ${state.context.eventId}.`,
          `Fields ${snapshot.summary.guestFields} · Segments ${snapshot.summary.segments} · Forms ${snapshot.summary.forms} · Pages ${snapshot.summary.websitePages} · Networking ${snapshot.summary.networkingRules || 0}`
        ].join("\n")
      };
    } catch (error) {
      state.lastMessage = {
        ok: false,
        message: ["Échec du rafraîchissement.", error instanceof Error ? error.message : String(error)].join("\n")
      };
    } finally {
      state.isLoading = false;
      render();
    }
  }

  async function clearSnapshot() {
    if (!state.context.hasEventContext || state.isLoading) return;
    await window.AtlasStorage.clearEventCache(state.context.eventId);
    state.cache = null;
    state.atlas = null;
    state.selected = null;
    state.lastMessage = { ok: true, message: `Cache supprimé pour l'événement ${state.context.eventId}.` };
    render();
  }

  function getCurrentItems() {
    if (!state.atlas) return [];
    const q = state.search.trim().toLowerCase();
    if (state.activeTab === "processes") {
      return buildProcessItems().filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        return true;
      });
    }
    if (state.activeTab === "fields") {
      return state.atlas.fields.map((field) => ({
        id: field.key,
        title: field.label,
        subtitle: `${field.type} · ${field.key}`,
        searchable: [field.label, field.key, field.type, field.code || ""].join(" ").toLowerCase(),
        dotColor: typeColor(field.type),
        coverage: formatFieldCoverage(window.AtlasCore.getFieldCoverage(field)),
        raw: field
      })).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        if (state.filters.fieldOrigin === "native" && item.raw.fieldKind !== "native") return false;
        if (state.filters.fieldOrigin === "api" && item.raw.fieldKind !== "api_property") return false;
        if (state.filters.fieldOrigin === "custom" && item.raw.fieldKind !== "custom") return false;
        if (state.filters.fieldWarnings && !window.AtlasCore.hasFieldAnomaly(state.atlas, item.raw)) return false;
        if (state.filters.fieldFocus === "hot" && window.AtlasCore.getFieldCoverage(item.raw).total < 5) return false;
        if (state.filters.fieldFocus === "sensitive" && window.AtlasCore.getFieldSensitivityScore(state.atlas, item.raw) < 10) return false;
        if (state.filters.fieldFocus === "unused" && (item.raw.fieldKind !== "custom" || window.AtlasCore.getFieldCoverage(item.raw).total > 0)) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    if (state.activeTab === "segments") {
      return state.atlas.segments.map((segment) => ({
        id: segment.id,
        title: segment.label,
        subtitle: `${segment.parsedRefs.length} champs · ${window.AtlasCore.getEntityRelations(state.atlas, "segment", segment.id, { direction: "in", targetType: "email_template" }).length} emails · ${segment.isDeleted ? "supprimé" : "actif"}`,
        searchable: [segment.label, segment.id, segment.query || ""].join(" ").toLowerCase(),
        dotColor: "#6f3fd1",
        coverage: segment.query || "",
        raw: segment
      })).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        if (state.filters.segmentStatus === "active" && item.raw.isDeleted) return false;
        if (state.filters.segmentStatus === "deleted" && !item.raw.isDeleted) return false;
        if (state.filters.segmentWarnings && !window.AtlasCore.hasSegmentAnomaly(state.atlas, item.raw)) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    if (state.activeTab === "forms") {
      return state.atlas.forms.map((form) => ({
        id: form.id,
        title: form.title,
        subtitle: `${form.fieldWrites.size} champs · ${form.steps.length} étapes`,
        searchable: [form.title, form.id, ...form.fieldWrites, ...form.fieldConditions].join(" ").toLowerCase(),
        dotColor: "#006fcf",
        coverage: `${form.fieldConditions.size} conditions`,
        raw: form
      })).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        if (state.filters.formWarnings && !window.AtlasCore.hasFormAnomaly(state.atlas, item.raw)) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    if (state.activeTab === "categories") {
      return state.atlas.guestCategories.map((category) => {
        const pageRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "page" });
        const networkingRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "networking" });
        const automationRelations = window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "automation_step" });
        return {
          id: category.id,
          title: category.label,
          subtitle: `${category.populationType || "population non renseignée"} · ${category.registrationFormId ? "avec formulaire" : "sans formulaire"}`,
          searchable: [category.label, category.id, category.populationType || "", category.registrationFormId || ""].join(" ").toLowerCase(),
          dotColor: "#d2477b",
          coverage: `${pageRelations.length} pages · ${networkingRelations.length} networking · ${automationRelations.length} automations`,
          raw: category
        };
      }).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    if (state.activeTab === "emails") {
      return (state.atlas.emailTemplates || []).map((emailTemplate) => {
        const automationRelations = window.AtlasCore.getEntityRelations(state.atlas, "email_template", emailTemplate.id, { direction: "in", targetType: "automation_step" });
        return {
          id: emailTemplate.id,
          title: emailTemplate.label,
          subtitle: `${emailTemplate.sections.length} sections · ${emailTemplate.usesCount} usage${emailTemplate.usesCount > 1 ? "s" : ""}`,
          searchable: [
            emailTemplate.label,
            emailTemplate.id,
            emailTemplate.presetName || "",
            emailTemplate.layoutName || "",
            ...(emailTemplate.fieldKeys || []),
            ...(emailTemplate.categoryIds || [])
          ].join(" ").toLowerCase(),
          dotColor: "#a13fb8",
          coverage: `${emailTemplate.fieldKeys.length + emailTemplate.nativeFieldKeys.length} champs · ${emailTemplate.categoryIds.length} catégories · ${automationRelations.length} automations`,
          raw: emailTemplate
        };
      }).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    if (state.activeTab === "networking") {
      return state.atlas.networking.map((entry) => ({
        id: entry.id,
        title: entry.label,
        subtitle: `${entry.rules.global.scope} / ${entry.rules.meetings.scope}`,
        searchable: [
          entry.label,
          entry.populationType,
          entry.rules.global.scope,
          entry.rules.meetings.scope,
          ...(entry.usedSegmentIds || []),
          ...(entry.categories || []).map((category) => category.name)
        ].join(" ").toLowerCase(),
        dotColor: "#b8892f",
        coverage: `${entry.usedSegmentIds.length} segments · ${entry.categories.length} catégories`,
        raw: entry
      })).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        if (state.filters.networkingWarnings && !window.AtlasCore.hasNetworkingAnomaly(state.atlas, item.raw)) return false;
        if (state.filters.networkingScope === "segment" && item.raw.usedSegmentIds.length === 0) return false;
        if (state.filters.networkingScope === "nobody" && !(item.raw.rules.global.scope === "nobody" && item.raw.rules.meetings.scope === "nobody")) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    if (state.activeTab === "automations") {
      return state.atlas.automations.map((entry) => ({
        id: entry.id,
        title: entry.label,
        subtitle: `${entry.triggerEvent || "trigger inconnu"} · ${entry.enabled ? "active" : "inactive"}`,
        searchable: [
          entry.label,
          entry.id,
          entry.triggerEvent || "",
          ...(entry.fieldKeys || []),
          ...(entry.categoryIds || []),
          ...(entry.segmentIds || [])
        ].join(" ").toLowerCase(),
        dotColor: "#c65d0e",
        coverage: `${entry.steps.length} étapes · ${entry.runsCount} runs`,
        raw: entry
      })).filter((item) => {
        if (q && !item.searchable.includes(q)) return false;
        if (state.filters.automationWarnings && !window.AtlasCore.hasAutomationAnomaly(state.atlas, item.raw)) return false;
        if (state.filters.automationEnabledOnly && !item.raw.enabled) return false;
        return true;
      }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
    return state.atlas.pages.map((page) => ({
      id: page.id,
      title: page.label,
      subtitle: `${page.pathName} · ${page.sectionCount} sections`,
      searchable: [page.label, page.pathName, page.fileName || "", ...(page.linkedPagePaths || [])].join(" ").toLowerCase(),
      dotColor: "#0d7a3a",
      coverage: `${page.segmentIds.length} segments · ${page.blockCount} blocs`,
      raw: page
    })).filter((item) => {
      if (q && !item.searchable.includes(q)) return false;
      if (state.filters.pageComplexity) {
        const metrics = window.AtlasCore.getPageComplexityMetrics(state.atlas, item.raw);
        if (metrics.level !== state.filters.pageComplexity) return false;
      }
      return true;
    }).sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }

  function getSelectedEntity(items) {
    if (!items.length) return null;
    if (!state.selected || state.selected.type !== state.activeTab) return items[0];
    return items.find((item) => item.id === state.selected.id) || items[0];
  }

  function buildProcessItems() {
    if (!state.atlas) return [];
    const items = [];
    const visitorCategories = sortCategoriesForProcess(state.atlas.guestCategories.filter((category) => category.populationType === "visitor"));
    const exhibitorCategories = sortCategoriesForProcess(state.atlas.guestCategories.filter((category) => /exhibitor/i.test(category.populationType || "") || /partner|partenaire/i.test(category.label || "")));
    const visitorCategoryIds = processCategoryIds(visitorCategories);
    const exhibitorCategoryIds = processCategoryIds(exhibitorCategories);
    const registerAutomations = state.atlas.automations.filter((automation) => ["guest_did_register", "guest_did_create"].includes(automation.triggerEvent));
    const updateAutomations = state.atlas.automations.filter((automation) => automation.triggerEvent === "guest_did_update");
    const externalAutomations = state.atlas.automations.filter((automation) =>
      (automation.steps || []).some((step) => (step.externalEndpoints || []).length > 0)
    );
    const networkingEntries = state.atlas.networking.filter((entry) =>
      entry.usedSegmentIds.length > 0 || entry.categories.length > 0
    );
    const websitePages = state.atlas.pages.filter((page) => page.guestCategories.length > 0 || page.segmentIds.length > 0);

    const pushProcess = (id, title, subtitle, payload) => {
      const riskRows = buildProcessRiskRows(payload);
      items.push({
        id,
        title,
        subtitle,
        searchable: [title, subtitle, ...(payload.keywords || [])].join(" ").toLowerCase(),
        dotColor: "#209991",
        coverage: payload.coverage,
        raw: {
          id,
          title,
          subtitle,
          risks: riskRows,
          ...payload
        }
      });
    };

    if (visitorCategories.length > 0 || registerAutomations.length > 0) {
      pushProcess(
        "visitor-registration",
        "Inscription visiteur",
        "Catégories visiteur, formulaires d’entrée et automations de création / inscription.",
        {
          coverage: `${visitorCategories.length} catégories · ${sortAutomationsForProcess(registerAutomations.filter((automation) => automationTouchesCategorySet(automation, visitorCategoryIds) || (automation.categoryIds || []).length === 0)).length} automations`,
          categories: visitorCategories,
          automations: sortAutomationsForProcess(registerAutomations.filter((automation) => automationTouchesCategorySet(automation, visitorCategoryIds) || (automation.categoryIds || []).length === 0)),
          forms: formsForCategories(visitorCategories),
          pages: pagesForCategories(visitorCategories),
          keywords: ["inscription", "visiteur", "register", "guest_did_register", "guest_did_create"]
        }
      );
    }

    if (exhibitorCategories.length > 0 || updateAutomations.length > 0) {
      pushProcess(
        "exhibitor-journey",
        "Parcours exposant",
        "Catégories exposant, formulaires, pages et automations de mise à jour.",
        {
          coverage: `${exhibitorCategories.length} catégories · ${sortAutomationsForProcess(updateAutomations.filter((automation) => automationTouchesCategorySet(automation, exhibitorCategoryIds) || (automation.categoryIds || []).length === 0)).length} automations`,
          categories: exhibitorCategories,
          automations: sortAutomationsForProcess(updateAutomations.filter((automation) => automationTouchesCategorySet(automation, exhibitorCategoryIds) || (automation.categoryIds || []).length === 0)),
          forms: formsForCategories(exhibitorCategories),
          pages: pagesForCategories(exhibitorCategories),
          keywords: ["exposant", "partenaire", "update", "guest_did_update"]
        }
      );
    }

    if (networkingEntries.length > 0) {
      pushProcess(
        "networking-access",
        "Accès networking",
        "Population types, segments d’accès et catégories visibles dans le networking.",
        {
          coverage: `${networkingEntries.length} populations · ${networkingEntries.reduce((sum, entry) => sum + entry.usedSegmentIds.length, 0)} segments`,
          networking: uniqueById(networkingEntries, (entry) => entry.id),
          categories: sortCategoriesForProcess(networkingEntries.flatMap((entry) => entry.categories || []).map((category) => state.atlas.guestCategoriesById[category.id]).filter(Boolean)),
          segments: uniqueById(networkingEntries.flatMap((entry) => entry.usedSegmentIds || []).map((id) => state.atlas.segmentsById[id]).filter(Boolean), (segment) => segment.id),
          automations: sortAutomationsForProcess(state.atlas.automations.filter((automation) =>
            networkingEntries.some((entry) => (entry.categories || []).some((category) => (automation.categoryIds || []).includes(category.id)))
          )),
          keywords: ["networking", "matchmaking", "meeting"]
        }
      );
    }

    if (externalAutomations.length > 0) {
      pushProcess(
        "external-sync",
        "Synchronisation externe",
        "Automations avec appels HTTP, endpoints externes et écritures de retour dans Eventmaker.",
        {
          coverage: `${externalAutomations.length} automations externes`,
          automations: uniqueById(externalAutomations, (automation) => automation.id),
          endpoints: externalAutomations.flatMap((automation) => automation.steps || []).flatMap((step) => step.externalEndpoints || []),
          fields: uniqueById(externalAutomations.flatMap((automation) => automation.fieldKeys || []).map((key) => state.atlas.fieldsByKey[key]).filter(Boolean), (field) => field.key),
          keywords: ["http", "api", "sync", "climeet", "endpoint"]
        }
      );
    }

    if (websitePages.length > 0) {
      pushProcess(
        "website-experience",
        "Expérience website",
        "Pages, catégories et formulaires visibles côté site web Eventmaker.",
        {
          coverage: `${websitePages.length} pages · ${state.atlas.forms.length} formulaires`,
          pages: uniqueById(websitePages, (page) => page.id),
          forms: uniqueById(state.atlas.forms.filter((form) => window.AtlasCore.getPagesForForm(state.atlas, form.id).length > 0), (form) => form.id),
          categories: sortCategoriesForProcess(state.atlas.guestCategories.filter((category) =>
            window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "page" }).length > 0
          )),
          automations: sortAutomationsForProcess(state.atlas.automations.filter((automation) =>
            (automation.categories || []).some((category) =>
              window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "page" }).length > 0
            )
          )),
          keywords: ["website", "pages", "site web", "formulaire"]
        }
      );
    }

    return items;
  }

  function uniqueById(items, getId) {
    const seen = new Set();
    return (items || []).filter((item) => {
      if (!item) return false;
      const id = getId(item);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function processCategoryIds(categories) {
    return new Set((categories || []).map((category) => category?.id).filter(Boolean));
  }

  function automationTouchesCategorySet(automation, categoryIds) {
    if (!automation || !categoryIds || categoryIds.size === 0) return false;
    return (automation.categoryIds || []).some((id) => categoryIds.has(id));
  }

  function sortCategoriesForProcess(categories) {
    return uniqueById(categories, (category) => category.id).sort((a, b) => {
      const formScoreA = a.registrationFormId ? 1 : 0;
      const formScoreB = b.registrationFormId ? 1 : 0;
      if (formScoreA !== formScoreB) return formScoreB - formScoreA;
      const defaultScoreA = a.defaultForPopulation ? 1 : 0;
      const defaultScoreB = b.defaultForPopulation ? 1 : 0;
      if (defaultScoreA !== defaultScoreB) return defaultScoreB - defaultScoreA;
      return (a.label || "").localeCompare(b.label || "", "fr");
    });
  }

  function sortAutomationsForProcess(automations) {
    return uniqueById(automations, (automation) => automation.id).sort((a, b) => {
      const enabledDelta = Number(Boolean(b.enabled)) - Number(Boolean(a.enabled));
      if (enabledDelta !== 0) return enabledDelta;
      const runsDelta = (b.runsCount || 0) - (a.runsCount || 0);
      if (runsDelta !== 0) return runsDelta;
      return (a.label || "").localeCompare(b.label || "", "fr");
    });
  }

  function pagesForCategories(categories) {
    return uniqueById(
      (categories || []).flatMap((category) =>
        window.AtlasCore.getEntityRelations(state.atlas, "guest_category", category.id, { direction: "in", targetType: "page" })
      ).map((relation) => state.atlas.pagesById[relation.targetId]).filter(Boolean),
      (page) => page.id
    );
  }

  function formsForCategories(categories) {
    return uniqueById(
      (categories || []).map((category) => state.atlas.formsById[category.registrationFormId]).filter(Boolean),
      (form) => form.id
    );
  }

  function buildProcessRiskRows(process) {
    const rows = [];
    const categories = process.categories || [];
    const automations = process.automations || [];
    const networking = process.networking || [];
    const endpoints = process.endpoints || [];

    const orphanCategories = categories.filter((category) => window.AtlasCore.hasGuestCategoryAnomaly(state.atlas, category));
    if (orphanCategories.length > 0) {
      rows.push({
        title: "Catégories à vérifier",
        key: `${orphanCategories.length}`,
        subtitle: "Catégories sans formulaire ou sans usage détecté cohérent"
      });
    }

    const riskyAutomations = automations.filter((automation) => window.AtlasCore.hasAutomationAnomaly(state.atlas, automation));
    if (riskyAutomations.length > 0) {
      rows.push({
        title: "Automations en anomalie",
        key: `${riskyAutomations.length}`,
        subtitle: "Workflows avec références cassées ou incomplètes"
      });
    }

    const riskyNetworking = networking.filter((entry) => window.AtlasCore.hasNetworkingAnomaly(state.atlas, entry));
    if (riskyNetworking.length > 0) {
      rows.push({
        title: "Networking incomplet",
        key: `${riskyNetworking.length}`,
        subtitle: "Population(s) avec segments manquants dans le snapshot"
      });
    }

    if (endpoints.length > 0) {
      rows.push({
        title: "Dépendance externe",
        key: `${endpoints.length}`,
        subtitle: "Appels HTTP ou synchronisations externes présents"
      });
    }

    if (rows.length === 0) {
      rows.push({
        title: "Risque principal",
        key: "faible",
        subtitle: "Aucune anomalie majeure détectée sur ce process dans le snapshot courant"
      });
    }

    return rows;
  }

  function syncSelectionWithContext() {
    if (!state.atlas) return;

    const matched = matchContextToEntity();
    if (matched) {
      state.activeTab = matched.type;
      state.selected = { type: matched.type, id: matched.id };
      return;
    }

    if (!TAB_ORDER.includes(state.activeTab)) state.activeTab = "overview";
    if (state.activeTab !== "overview") {
      const items = getCurrentItems();
      if (items.length > 0) state.selected = { type: state.activeTab, id: items[0].id };
    }
  }

  function matchContextToEntity() {
    const { pageType, objectId } = state.context;
    if (!objectId || !state.atlas) return null;
    if (pageType === "guest_fields") {
      const field = state.atlas.fields.find((entry) => entry._id === objectId);
      return field ? { type: "fields", id: field.key } : null;
    }
    if (pageType === "segments") {
      const segment = state.atlas.segments.find((entry) => entry.id === objectId);
      return segment ? { type: "segments", id: segment.id } : null;
    }
    if (pageType === "registration_forms") {
      const form = state.atlas.forms.find((entry) => entry.id === objectId);
      return form ? { type: "forms", id: form.id } : null;
    }
    if (pageType === "guest_categories") {
      const category = state.atlas.guestCategories.find((entry) => entry.id === objectId);
      return category ? { type: "categories", id: category.id } : null;
    }
    if (pageType === "emails") {
      const emailTemplate = (state.atlas.emailTemplates || []).find((entry) => entry.id === objectId);
      return emailTemplate ? { type: "emails", id: emailTemplate.id } : null;
    }
    if (pageType === "automations") {
      const automation = state.atlas.automations.find((entry) => entry.id === objectId);
      return automation ? { type: "automations", id: automation.id } : null;
    }
    if (pageType === "website") {
      const page = state.atlas.pages.find((entry) => entry.runtimeId === objectId || entry.id === objectId);
      return page ? { type: "pages", id: page.id } : null;
    }
    return null;
  }

  function bindPanelEvents(panel) {
    const searchInput = panel.querySelector(".atlas-searchbar input");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        state.searchCaret = event.target.selectionStart;
        state.restoreSearchFocus = true;
        if (state.activeTab !== "overview") {
          const items = getCurrentItems();
          state.selected = items.length > 0 ? { type: state.activeTab, id: items[0].id } : null;
        }
        render();
      });
    }
    panel.querySelectorAll("[data-action='refresh']").forEach((button) => button.addEventListener("click", refreshSnapshot));
    panel.querySelectorAll("[data-action='clear']").forEach((button) => button.addEventListener("click", clearSnapshot));
    panel.querySelectorAll("[data-action='refresh-menu']").forEach(function(btn) {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        var existing = document.getElementById("atlas-refresh-dropdown");
        if (existing) { existing.remove(); return; }

        var menu = document.createElement("div");
        menu.id = "atlas-refresh-dropdown";
        menu.className = "atlas-dropdown-menu";
        menu.innerHTML = (state.atlas
          ? '<button class="atlas-dropdown-item" data-dropdown-action="refresh">\u21BA Rafra\u00EEchir les donn\u00E9es</button>'
          : '')
          + '<button class="atlas-dropdown-item is-danger" data-dropdown-action="clear">\u2715 Vider le cache local</button>';

        var splitBtn = document.getElementById("atlas-split-refresh");
        if (splitBtn) splitBtn.appendChild(menu);

        function closeMenu(ev) {
          if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener("click", closeMenu, true);
          }
        }
        document.addEventListener("click", closeMenu, true);
        menu._closeListener = closeMenu;

        menu.querySelectorAll("[data-dropdown-action='refresh']").forEach(function(item) {
          item.addEventListener("click", function() { menu.remove(); refreshSnapshot(); });
        });
        menu.querySelectorAll("[data-dropdown-action='clear']").forEach(function(item) {
          item.addEventListener("click", function() { menu.remove(); clearSnapshot(); });
        });
      });
    });
    panel.querySelectorAll("[data-filter-action]").forEach((button) => button.addEventListener("click", () => {
      handleFilterAction(button.getAttribute("data-filter-action"), button.getAttribute("data-filter-value"));
    }));
    panel.querySelectorAll("[data-tab-jump]").forEach(function(button) {
      button.addEventListener("click", function() {
        var tab = button.getAttribute("data-tab-jump");
        var filterInit = button.getAttribute("data-filter-action-init");
        state.activeTab = tab;
        state.search = "";
        resetFilters();
        if (filterInit === "field-warnings") state.filters.fieldWarnings = true;
        else if (filterInit === "form-warnings") state.filters.formWarnings = true;
        else if (filterInit === "segment-warnings") state.filters.segmentWarnings = true;
        else if (filterInit === "segment-status-deleted") state.filters.segmentStatus = "deleted";
        else if (filterInit === "field-focus-unused") state.filters.fieldFocus = "unused";
        else if (filterInit === "networking-warnings") state.filters.networkingWarnings = true;
        else if (filterInit === "automation-warnings") state.filters.automationWarnings = true;
        if (tab !== "overview") {
          var items = getCurrentItems();
          if (items.length > 0) state.selected = { type: tab, id: items[0].id };
        }
        render();
      });
    });
    panel.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
      state.activeTab = button.getAttribute("data-tab");
      state.search = "";
      resetFilters();
      if (state.activeTab !== "overview") {
        const items = getCurrentItems();
        if (items.length > 0) state.selected = { type: state.activeTab, id: items[0].id };
      }
      render();
    }));
    panel.querySelectorAll("[data-entity-id]").forEach((button) => button.addEventListener("click", () => {
      state.selected = {
        type: button.getAttribute("data-entity-type"),
        id: button.getAttribute("data-entity-id")
      };
      render();
    }));
    panel.querySelectorAll("[data-action='dismiss-suggestion']").forEach(function(button) {
      button.addEventListener("click", function() {
        state.suggestion = null;
        render();
      });
    });
    panel.querySelectorAll("[data-nav-type][data-nav-id]").forEach(function(el) {
      el.addEventListener("click", function(e) {
        if (e.target.closest("[data-ext-link]")) return;
        navigateToEntity(el.getAttribute("data-nav-type"), el.getAttribute("data-nav-id"));
      });
    });
    panel.querySelectorAll("[data-focus-value-field][data-focus-value]").forEach((button) => button.addEventListener("click", () => {
      focusSegmentsForFieldValue(button.getAttribute("data-focus-value-field"), button.getAttribute("data-focus-value"));
    }));
    panel.querySelectorAll("[data-ext-link]").forEach(function(link) {
      link.addEventListener("click", function(e) {
        if (e.ctrlKey || e.metaKey || e.button === 1) {
          e.preventDefault();
          window.open(link.href, "_blank", "noopener,noreferrer");
        }
        // Normal click: let browser follow the href in the current tab (default <a> behavior)
      });
      link.addEventListener("auxclick", function(e) {
        if (e.button === 1) {
          e.preventDefault();
          window.open(link.href, "_blank", "noopener,noreferrer");
        }
      });
    });
  }

  function navigateToEntity(type, id) {
    state.activeTab = type;
    state.search = "";
    state.selected = { type, id };
    render();
  }

  function ensurePanelOpen() {
    if (!state.isOpen) togglePanel();
  }

  function handleFilterAction(action, value) {
    if (action === "noop") return;
    if (action === "reset-filters") {
      resetFilters();
    } else if (action === "field-origin") {
      state.filters.fieldOrigin = state.filters.fieldOrigin === value ? null : value;
    } else if (action === "field-focus") {
      state.filters.fieldFocus = state.filters.fieldFocus === value ? null : value;
    } else if (action === "field-warnings") {
      state.filters.fieldWarnings = !state.filters.fieldWarnings;
    } else if (action === "segment-status") {
      state.filters.segmentStatus = state.filters.segmentStatus === value ? null : value;
    } else if (action === "segment-warnings") {
      state.filters.segmentWarnings = !state.filters.segmentWarnings;
    } else if (action === "form-warnings") {
      state.filters.formWarnings = !state.filters.formWarnings;
    } else if (action === "page-complexity") {
      state.filters.pageComplexity = state.filters.pageComplexity === value ? null : value;
    } else if (action === "field-focus-unused") {
      state.filters.fieldFocus = state.filters.fieldFocus === "unused" ? null : "unused";
    } else if (action === "networking-warnings") {
      state.filters.networkingWarnings = !state.filters.networkingWarnings;
    } else if (action === "networking-scope") {
      state.filters.networkingScope = state.filters.networkingScope === value ? null : value;
    } else if (action === "automation-warnings") {
      state.filters.automationWarnings = !state.filters.automationWarnings;
    } else if (action === "automation-enabled") {
      state.filters.automationEnabledOnly = !state.filters.automationEnabledOnly;
    }

    const items = getCurrentItems();
    state.selected = items.length > 0 ? { type: state.activeTab, id: items[0].id } : null;
    render();
  }

  function restoreSearchFocusIfNeeded(panel) {
    if (!state.restoreSearchFocus) return;
    const input = panel.querySelector(".atlas-searchbar input");
    if (!input) {
      state.restoreSearchFocus = false;
      state.searchCaret = null;
      return;
    }
    input.focus();
    const caret = typeof state.searchCaret === "number" ? state.searchCaret : input.value.length;
    try {
      input.setSelectionRange(caret, caret);
    } catch (_) {
      // noop
    }
    state.restoreSearchFocus = false;
  }

  async function hydrateMermaidGraphs(panel) {
    const stages = [...panel.querySelectorAll(".atlas-mermaid-stage[data-mermaid-graph]")];
    if (stages.length === 0) return;
    const ready = await ensureMermaidBridge();
    if (!ready) {
      stages.forEach((stage) => {
        stage.setAttribute("data-mermaid-status", "error");
        stage.innerHTML = `<div class="atlas-note">Bridge Mermaid indisponible. Recharge l'extension puis réessaie.</div>`;
      });
      return;
    }
    stages.forEach((stage) => {
      if (stage.getAttribute("data-mermaid-hydrated") === "true") return;
      stage.setAttribute("data-mermaid-hydrated", "true");
      const encoded = stage.getAttribute("data-mermaid-graph");
      if (!encoded) return;
      document.dispatchEvent(new CustomEvent("atlas:mermaid-render", {
        detail: {
          targetId: stage.id,
          graph: decodeURIComponent(encoded),
          svgCss: getGraphSvgCss()
        }
      }));
    });
  }

  async function ensureMermaidBridge() {
    if (document.documentElement.getAttribute(MERMAID_BRIDGE_ATTR)) return true;
    if (!document.getElementById(MERMAID_BRIDGE_ID)) {
      const script = document.createElement("script");
      script.id = MERMAID_BRIDGE_ID;
      script.src = chrome.runtime.getURL("mermaid-bridge.js");
      script.async = false;
      (document.head || document.documentElement).appendChild(script);
    }
    for (let index = 0; index < 30; index += 1) {
      if (document.documentElement.getAttribute(MERMAID_BRIDGE_ATTR)) return true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  }

  function focusSegmentsForFieldValue(fieldKey, rawValue) {
    const field = state.atlas?.fieldsByKey[fieldKey];
    if (!field) return;
    const segments = window.AtlasCore.getValueUsageForField(state.atlas, field, rawValue);
    state.activeTab = "segments";
    state.search = "";
    resetFilters();
    if (segments.length > 0) {
      state.selected = { type: "segments", id: segments[0].id };
    }
    render();
  }

  function watchLocationChanges() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function () {
      originalPushState.apply(this, arguments);
      scheduleContextRefresh();
    };
    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      scheduleContextRefresh();
    };
    window.addEventListener("popstate", scheduleContextRefresh);
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (window.AtlasPalette) window.AtlasPalette.toggle();
      } else if (e.key === 'Escape' && state.isOpen) {
        closePanel();
      }
    });
  }

  function startResize(event) {
    event.preventDefault();
    state.isResizing = true;
    document.body.style.userSelect = "none";
  }

  function handleResize(event) {
    if (!state.isResizing) return;
    const nextWidth = window.innerWidth - event.clientX;
    state.panelWidth = Math.max(460, Math.min(nextWidth, Math.floor(window.innerWidth * 0.92)));
    render();
  }

  function stopResize() {
    if (!state.isResizing) return;
    state.isResizing = false;
    saveUiState();
    document.body.style.userSelect = "";
  }

  function scheduleContextRefresh() {
    var nextContext = window.AtlasEventmakerContext.detectContext();
    var urlChanged = nextContext.url !== state.context.url;
    if (!urlChanged) return;

    var changedEvent = nextContext.eventId !== state.context.eventId;
    state.context = nextContext;
    state.suggestion = null;

    if (changedEvent) {
      state.lastMessage = null;
      state.search = "";
      resetFilters();
      syncCacheFromContext();
    } else {
      handleContextNavigation();
      render();
    }
  }

  function handleContextNavigation() {
    if (!state.atlas) return;

    if (state.context.pageType === "guests" && state.context.guestQuery) {
      var segmentMatch = matchSegmentFromQuery(state.context.guestQuery);
      if (segmentMatch) {
        if (state.activeTab === "overview" || state.selected === null) {
          navigateToEntity("segments", segmentMatch.id);
        } else {
          state.suggestion = {
            type: "navigation",
            nav: { type: "segments", id: segmentMatch.id },
            label: getEntityLabelForContext("segments", segmentMatch.id),
            objectType: "segment"
          };
        }
      } else {
        var candidates = matchSegmentFuzzy(state.context.guestQuery);
        state.suggestion = candidates.length > 0
          ? { type: "segment-candidates", candidates: candidates, query: state.context.guestQuery }
          : { type: "segment-unknown", query: state.context.guestQuery };
      }
      return;
    }

    var matched = matchContextToEntity();
    if (!matched) {
      state.suggestion = null;
      return;
    }

    if (state.activeTab === "overview" || state.selected === null) {
      navigateToEntity(matched.type, matched.id);
      state.suggestion = null;
    } else {
      state.suggestion = {
        type: "navigation",
        nav: matched,
        label: getEntityLabelForContext(matched.type, matched.id),
        objectType: matched.type
      };
    }
  }

  function matchSegmentFromQuery(query) {
    if (!state.atlas || !query) return null;
    var decoded = query;
    try { decoded = decodeURIComponent(query); } catch (_) {}
    return state.atlas.segments.find(function(s) {
      return !s.isDeleted && s.query === decoded;
    }) || null;
  }

  function matchSegmentFuzzy(query) {
    if (!state.atlas || !query) return [];
    var decoded = query;
    try { decoded = decodeURIComponent(query); } catch (_) {}
    var urlTokens = parseSegmentTokens(decoded);
    var urlTokenSet = new Set(urlTokens);
    if (urlTokenSet.size === 0) return [];

    var THRESHOLD = 80;
    var results = [];

    state.atlas.segments.forEach(function(segment) {
      if (segment.isDeleted) return;
      var segTokens = parseSegmentTokens(segment.query);
      var segTokenSet = new Set(segTokens);
      if (segTokenSet.size === 0) return;

      var common = 0;
      urlTokenSet.forEach(function(t) { if (segTokenSet.has(t)) common++; });
      var score = Math.round((common / Math.max(urlTokenSet.size, segTokenSet.size)) * 100);

      if (score >= THRESHOLD) {
        results.push({ id: segment.id, label: segment.label, score: score });
      }
    });

    return results.sort(function(a, b) { return b.score - a.score; }).slice(0, 5);
  }

  function parseSegmentTokens(query) {
    if (!query) return [];
    var tokens = [];
    var parts = String(query).split(/\s+/);
    parts.forEach(function(part) {
      var clean = part.replace(/^[()]+|[()]+$/g, "").trim();
      if (clean) tokens.push(clean.toLowerCase());
    });
    return tokens;
  }

  function getEntityLabelForContext(type, id) {
    if (!state.atlas) return id;
    if (type === "fields") {
      var field = state.atlas.fieldsByKey[id];
      return field ? "le champ \"" + field.label + "\"" : "un champ";
    }
    if (type === "segments") {
      var segment = state.atlas.segments.find(function(s) { return s.id === id; });
      return segment ? "le segment \"" + segment.label + "\"" : "un segment";
    }
    if (type === "forms") {
      var form = state.atlas.formsById[id];
      return form ? "le formulaire \"" + form.title + "\"" : "un formulaire";
    }
    if (type === "processes") {
      var process = buildProcessItems().find(function(entry) { return entry.id === id; });
      return process ? "le process \"" + process.title + "\"" : "un process";
    }
    if (type === "categories") {
      var category = state.atlas.guestCategoriesById[id];
      return category ? "la catégorie \"" + category.label + "\"" : "une catégorie";
    }
    if (type === "emails") {
      var emailTemplate = state.atlas.emailTemplatesById ? state.atlas.emailTemplatesById[id] : null;
      return emailTemplate ? "l’email \"" + emailTemplate.label + "\"" : "un email";
    }
    if (type === "pages") {
      var page = state.atlas.pagesById[id];
      return page ? "la page \"" + page.label + "\"" : "une page";
    }
    if (type === "networking") {
      var entry = state.atlas.networking.find(function(ruleSet) { return ruleSet.id === id; });
      return entry ? "la population networking \"" + entry.label + "\"" : "une règle networking";
    }
    if (type === "automations") {
      var automation = state.atlas.automations.find(function(entry) { return entry.id === id; });
      return automation ? "l’automation \"" + automation.label + "\"" : "une automation";
    }
    return id;
  }

  function tabLabel(tab) {
    return {
      overview: "Vue d’ensemble",
      fields: "Fields",
      segments: "Segments",
      forms: "Formulaires",
      categories: "Catégories",
      emails: "Emails",
      pages: "Pages",
      networking: "Networking",
      automations: "Automations",
      processes: "Processes"
    }[tab] || tab;
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleString("fr-FR");
    } catch (_) {
      return value;
    }
  }

  function renderListBadges(item) {
    if (state.activeTab === "fields") {
      const field = item.raw;
      const badges = [];
      badges.push(renderBadge(field.fieldKind === "native" ? "natif" : field.fieldKind === "api_property" ? "api" : "custom", field.fieldKind === "native" ? "is-neutral" : field.fieldKind === "api_property" ? "is-api" : "is-info"));
      if (window.AtlasCore.hasFieldAnomaly(state.atlas, field)) badges.push(renderBadge("⚠", "is-warning"));
      if (field.code) badges.push(renderBadge("calc", "is-info"));
      return badges.join("");
    }
    if (state.activeTab === "segments") {
      const segment = item.raw;
      const badges = [];
      const emailUsageCount = window.AtlasCore.getEntityRelations(state.atlas, "segment", segment.id, { direction: "in", targetType: "email_template" }).length;
      if (segment.isDeleted) badges.push(renderBadge("supprimé", "is-neutral"));
      if (window.AtlasCore.hasSegmentAnomaly(state.atlas, segment)) badges.push(renderBadge("⚠", "is-warning"));
      badges.push(renderBadge(`${segment.parsedRefs.length} champs`, "is-info"));
      if (emailUsageCount > 0) badges.push(renderBadge(`${emailUsageCount} emails`, "is-neutral"));
      return badges.join("");
    }
    if (state.activeTab === "forms") {
      const form = item.raw;
      const badges = [];
      badges.push(renderBadge(`${form.steps.length} étapes`, "is-neutral"));
      badges.push(renderBadge(`${form.fieldWrites.size} champs`, "is-info"));
      if (window.AtlasCore.hasFormAnomaly(state.atlas, form)) badges.push(renderBadge("⚠", "is-warning"));
      return badges.join("");
    }
    if (state.activeTab === "categories") {
      const category = item.raw;
      const badges = [];
      if (category.populationType) badges.push(renderBadge(category.populationType, "is-info"));
      if (category.registrationFormId) badges.push(renderBadge("form", "is-neutral"));
      if (window.AtlasCore.hasGuestCategoryAnomaly(state.atlas, category)) badges.push(renderBadge("⚠", "is-warning"));
      return badges.join("");
    }
    if (state.activeTab === "emails") {
      const emailTemplate = item.raw;
      const badges = [];
      if (emailTemplate.presetName) badges.push(renderBadge(emailTemplate.presetName, "is-neutral"));
      if (emailTemplate.layoutName) badges.push(renderBadge(emailTemplate.layoutName, "is-info"));
      if (window.AtlasCore.hasEmailTemplateAnomaly(state.atlas, emailTemplate)) badges.push(renderBadge("⚠", "is-warning"));
      return badges.join("");
    }
    if (state.activeTab === "networking") {
      const networking = item.raw;
      const badges = [];
      const networkingSegments = Array.isArray(networking?.usedSegmentIds) ? networking.usedSegmentIds : [];
      if (networking?.inMatchmakingPopulationTypes) badges.push(renderBadge("match", "is-info"));
      if (networkingSegments.length > 0) badges.push(renderBadge(`${networkingSegments.length} seg`, "is-neutral"));
      if (window.AtlasCore.hasNetworkingAnomaly(state.atlas, networking)) badges.push(renderBadge("⚠", "is-warning"));
      return badges.join("");
    }
    if (state.activeTab === "automations") {
      const automation = item.raw;
      const badges = [];
      const automationSteps = Array.isArray(automation?.steps) ? automation.steps : [];
      badges.push(renderBadge(automation?.enabled ? "on" : "off", automation?.enabled ? "is-info" : "is-neutral"));
      if (automationSteps.length > 0) badges.push(renderBadge(`${automationSteps.length} étapes`, "is-neutral"));
      if (window.AtlasCore.hasAutomationAnomaly(state.atlas, automation)) badges.push(renderBadge("⚠", "is-warning"));
      return badges.join("");
    }
    if (state.activeTab === "processes") {
      const process = item.raw;
      const badges = [];
      badges.push(renderBadge("process", "is-info"));
      if ((process.automations || []).length > 0) badges.push(renderBadge(`${process.automations.length} auto`, "is-neutral"));
      if ((process.categories || []).length > 0) badges.push(renderBadge(`${process.categories.length} cat`, "is-neutral"));
      return badges.join("");
    }
    const page = item.raw;
    const badges = [];
    if (page.online) badges.push(renderBadge("online", "is-info"));
    if (page.isHomepage) badges.push(renderBadge("home", "is-neutral"));
    if (page.segmentIds.length) badges.push(renderBadge(`${page.segmentIds.length} seg`, "is-neutral"));
    return badges.join("");
  }

  function renderBadge(label, className) {
    return `<span class="atlas-badge ${className || ""}">${escapeHtml(label)}</span>`;
  }

  function formatFieldCoverage(coverage) {
    const parts = [];
    if (coverage.forms > 0) parts.push(`${coverage.forms} formulaires`);
    if (coverage.segments > 0) parts.push(`${coverage.segments} segments`);
    if (coverage.pages > 0) parts.push(`${coverage.pages} pages`);
    if (coverage.emails > 0) parts.push(`${coverage.emails} emails`);
    if (coverage.automations > 0) parts.push(`${coverage.automations} automations`);
    if (coverage.calculated > 0) parts.push(`${coverage.calculated} calculs`);
    return parts.join(" · ");
  }

  function typeColor(type) {
    if (type === "value_list") return "#6f3fd1";
    if (type === "calculated") return "#c65d0e";
    if (type === "file") return "#0d7a3a";
    if (type === "event_meta") return "#006fcf";
    return "#005fb8";
  }

  function typeColorForNav(type) {
    if (type === "segments") return "#6f3fd1";
    if (type === "forms") return "#006fcf";
    if (type === "categories") return "#d2477b";
    if (type === "emails") return "#a13fb8";
    if (type === "networking") return "#b8892f";
    if (type === "pages") return "#0d7a3a";
    if (type === "automations") return "#c65d0e";
    if (type === "processes") return "#209991";
    return "#005fb8";
  }

  function resetFilters() {
    state.filters = {
      fieldOrigin: null,
      fieldWarnings: false,
      fieldFocus: null,
      segmentStatus: null,
      segmentWarnings: false,
      formWarnings: false,
      pageComplexity: null,
      networkingWarnings: false,
      networkingScope: null,
      automationWarnings: false,
      automationEnabledOnly: false
    };
  }

  function hasActiveFilters() {
    return Boolean(
      state.filters.fieldOrigin
      || state.filters.fieldWarnings
      || state.filters.fieldFocus
      || state.filters.segmentStatus
      || state.filters.segmentWarnings
      || state.filters.formWarnings
      || state.filters.pageComplexity
      || state.filters.networkingWarnings
      || state.filters.networkingScope
      || state.filters.automationWarnings
      || state.filters.automationEnabledOnly
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeGraphId(value) {
    return `N_${String(value || "node").replace(/[^a-zA-Z0-9]/g, "_")}`;
  }

  function safeGraphLabel(value) {
    return String(value || "?").replace(/"/g, "'").replace(/[[\]<>]/g, "").slice(0, 28);
  }

  function graphColor(role) {
    return {
      center: "#b85a12",
      dependency: "#005fb8",
      impacted: "#0d7a3a",
      segment: "#6f3fd1",
      form: "#006fcf",
      category: "#d2477b",
      email: "#a13fb8",
      page: "#1f7a4c",
      networking: "#b8892f",
      automation: "#c65d0e",
      anomaly: "#b42318",
      summary: "#566377",
      summaryFill: "#d5deea",
      text: "#0f1b2d"
    }[role] || "#566377";
  }

  function graphNodeStyle(role) {
    const stroke = graphColor(role);
    const fill = role === "summary" ? graphColor("summaryFill") : `${stroke}${role === "center" ? "70" : "2a"}`;
    const extra = role === "center" ? ",font-weight:bold" : "";
    return `fill:${fill},stroke:${stroke},stroke-width:2.4px,color:${graphColor("text")}${extra}`;
  }

  function getGraphSvgCss() {
    return `
      .label, .nodeLabel, .edgeLabel, .cluster-label, .cluster span, .label text, .cluster-label text, .edgeLabel text {
        color: #0f1b2d !important;
        fill: #0f1b2d !important;
        font-weight: 700 !important;
      }
      .cluster rect {
        fill: #f3f6fb !important;
        stroke: #8fa0b5 !important;
        stroke-width: 2px !important;
      }
      .edgeLabel rect {
        fill: #ffffff !important;
        opacity: 0.96 !important;
        stroke: #aab7c8 !important;
      }
      .flowchart-link, .edge-thickness-normal, .edge-thickness-thick, .arrowheadPath {
        opacity: 1 !important;
      }
      .marker path {
        fill: #445267 !important;
        stroke: #445267 !important;
      }
      .node rect, .node polygon, .node circle, .node ellipse, .node path {
        filter: none !important;
      }
    `;
  }

  window.AtlasExtension = {
    open: function() {
      ensurePanelOpen();
      return true;
    },
    navigateTo: function(type, id) {
      if (!type || !id) return false;
      ensurePanelOpen();
      navigateToEntity(type, id);
      return true;
    }
  };
})();
