(function () {
  'use strict';

  const PALETTE_ID = 'atlas-palette';
  const BACKDROP_ID = 'atlas-palette-backdrop';
  const STYLE_ID = 'atlas-palette-style';
  const LS_RECENT = 'em_recent_events';
  const LS_VISITS = 'em_feature_visits';
  const FEATURES = [
    {
      group: null,
      items: [
        { id: 'guests',           label: 'Liste des participants',  path: '/r/events/{id}/guests',                   icon: 'fa-users' },
        { id: 'website',          label: 'Site web',                path: '/events/{id}/website',                    icon: 'fa-laptop-mobile' },
        { id: 'guest_categories', label: 'Inscription',             path: '/events/{id}/guest_categories',           icon: 'fa-bookmark' },
        { id: 'emails',           label: 'Emails',                  path: '/r/events/{id}/emails',                   icon: 'fa-envelope' },
        { id: 'programme',        label: 'Programme',               path: '/events/{id}/accesspoints/sessions',      icon: 'fa-calendar' },
      ]
    },
    {
      group: 'Gérer',
      items: [
        { id: 'leads',     label: 'Leads',      path: '/events/{id}/exhibitors',      icon: 'fa-handshake' },
        { id: 'campaigns', label: 'Campagnes',   path: '/r/events/{id}/campaigns',     icon: 'fa-paper-plane' },
        { id: 'checkins',  label: 'Check-ins',   path: '/events/{id}/access_controls', icon: 'fa-scanner-gun' },
      ]
    },
    {
      group: 'Suivre',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', path: '/r/events/{id}/dashboard/registered', icon: 'fa-chart-column' },
        { id: 'reports',   label: 'Rapports',         path: '/r/events/{id}/reports',              icon: 'fa-file-chart-pie' },
      ]
    },
    {
      group: 'Configurer',
      items: [
        { id: 'edit',           label: 'Événement',              path: '/events/{id}/edit',                       icon: 'fa-gear' },
        { id: 'guest_fields',   label: 'Champs des participants', path: '/events/{id}/guest_fields',               icon: 'fa-database' },
        { id: 'ticketing',      label: 'Billetteries',            path: '/r/events/{id}/ticketing',                icon: 'fa-ticket' },
        { id: 'promo_codes',    label: 'Codes promo',             path: '/events/{id}/promo_codes',                icon: 'fa-badge-percent' },
        { id: 'thematics',      label: 'Thématiques',             path: '/events/{id}/thematics',                  icon: 'fa-bullseye-arrow' },
        { id: 'packages',       label: 'Packages',                path: '/events/{id}/accesspoints/bundles',       icon: 'fa-cubes' },
        { id: 'checkin_points', label: 'Points de check-in',      path: '/events/{id}/accesspoints',              icon: 'fa-check-square' },
        { id: 'products',       label: 'Produits',                path: '/events/{id}/accesspoints/products',      icon: 'fa-cart-plus' },
        { id: 'accommodations', label: 'Hébergement',             path: '/events/{id}/accesspoints/accommodations',icon: 'fa-bed-front' },
        { id: 'networking',     label: 'Engagement',              path: '/events/{id}/networking',                 icon: 'fa-users-viewfinder' },
        { id: 'meetings',       label: 'Rendez-vous',             path: '/r/events/{id}/meetings',                 icon: 'fa-clock' },
        { id: 'tasks',          label: 'Tâches',                  path: '/r/events/{id}/tasks',                    icon: 'fa-clipboard-list-check' },
        { id: 'app',            label: 'App mobile',              path: '/events/{id}/app_configuration/new',      icon: 'fa-mobile' },
        { id: 'translations',   label: 'Traductions',             path: '/r/events/{id}/translations',             icon: 'fa-language' },
      ]
    },
    {
      group: 'Intégrer',
      items: [
        { id: 'webhooks',     label: 'Webhooks',     path: '/events/{id}/webhooks',          icon: 'fa-webhook' },
        { id: 'integrations', label: 'Intégrations', path: '/r/events/{id}/integrations',    icon: 'fa-link' },
      ]
    }
  ];

  var ICONS = {
    'fa-users':               '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'fa-laptop-mobile':       '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    'fa-bookmark':            '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    'fa-envelope':            '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    'fa-calendar':            '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'fa-handshake':           '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    'fa-paper-plane':         '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    'fa-scanner-gun':         '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'fa-chart-column':        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'fa-file-chart-pie':      '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    'fa-gear':                '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    'fa-database':            '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    'fa-ticket':              '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    'fa-badge-percent':       '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    'fa-bullseye-arrow':      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'fa-cubes':               '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    'fa-check-square':        '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    'fa-cart-plus':           '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    'fa-bed-front':           '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'fa-users-viewfinder':    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'fa-clock':               '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'fa-clipboard-list-check':'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
    'fa-mobile':              '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    'fa-language':            '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'fa-webhook':             '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
    'fa-link':                '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    'fa-calendar-days':       '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'fa-compass':             '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  };

  function detectFa6() {
    try {
      var el = document.createElement('span');
      el.className = 'fa-solid';
      el.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden';
      document.body.appendChild(el);
      var ff = getComputedStyle(el).fontFamily;
      document.body.removeChild(el);
      return ff.indexOf('Font Awesome 6') !== -1;
    } catch (_) {
      return false;
    }
  }

  function iconSvg(name) {
    if (state.useFaIcons) {
      return '<i class="atlas-pi-icon fa-solid ' + name + '" aria-hidden="true"></i>';
    }
    var inner = ICONS[name] || ICONS['fa-link'];
    return '<svg class="atlas-pi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  const state = {
    isOpen: false,
    query: '',
    highlighted: 0,
    context: null,
    lang: 'fr',
    searchTimer: null,
    apiResults: [],
    closeTimer: null,
    useFaIcons: null,
    availableFeatureIds: null,
    lastTrackedVisitKey: null,
  };

  if (window.AtlasEventmakerUrls) {
    window.AtlasEventmakerUrls.getLang().then(function (lang) { state.lang = lang; });
  }

  // ---- localStorage ----

  function getRecentEvents() {
    try { return JSON.parse(localStorage.getItem(LS_RECENT) || '[]'); } catch (_) { return []; }
  }

  function upsertRecentEvent(event) {
    var list = getRecentEvents().filter(function (e) { return e.id !== event.id; });
    list.unshift({ id: event.id, title: event.title, organizer: event.organizer, lastVisited: Date.now() });
    if (list.length > 8) list = list.slice(0, 8);
    try { localStorage.setItem(LS_RECENT, JSON.stringify(list)); } catch (_) {}
  }

  function getFeatureVisits() {
    try { return JSON.parse(localStorage.getItem(LS_VISITS) || '{}'); } catch (_) { return {}; }
  }

  function incrementFeatureVisit(id) {
    var visits = getFeatureVisits();
    visits[id] = (visits[id] || 0) + 1;
    try { localStorage.setItem(LS_VISITS, JSON.stringify(visits)); } catch (_) {}
  }

  function getFeatureVisitScore(id) {
    var visits = getFeatureVisits();
    return visits[id] || 0;
  }

  // ---- Contexte et locale ----

  function detectLocale() {
    var match = window.location.pathname.match(/^\/([a-z]{2})\//);
    return match ? match[1] : state.lang;
  }

  function featurePathToRegex(path, eventId) {
    var resolved = path.replace('{id}', eventId);
    var escaped = resolved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped + '($|[/?#])');
  }

  function getCurrentFeatureId(eventId) {
    if (!eventId) return null;
    var pathname = window.location.pathname;
    var allItems = [];
    FEATURES.forEach(function (g) { allItems = allItems.concat(g.items); });
    allItems.sort(function (a, b) { return b.path.length - a.path.length; });
    for (var i = 0; i < allItems.length; i++) {
      if (featurePathToRegex(allItems[i].path, eventId).test(pathname)) {
        return allItems[i].id;
      }
    }
    return null;
  }

  // ---- Tracking de visites ----

  function trackPageVisit() {
    var ctx = window.AtlasEventmakerContext && window.AtlasEventmakerContext.detectContext();
    if (!ctx || !ctx.hasEventContext) return;
    var featureId = getCurrentFeatureId(ctx.eventId);
    if (!featureId) return;
    var visitKey = [ctx.eventId, featureId, window.location.pathname].join('::');
    if (state.lastTrackedVisitKey === visitKey) return;
    state.lastTrackedVisitKey = visitKey;
    incrementFeatureVisit(featureId);
  }

  function initVisitTracking() {
    trackPageVisit();
    window.addEventListener('popstate', trackPageVisit);
    document.addEventListener('turbo:load', trackPageVisit);
    document.addEventListener('turbolinks:load', trackPageVisit);
  }

  try { initVisitTracking(); } catch (_) {}

  // ---- URL builders ----

  function normalize(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function buildFeatureUrl(feature, eventId, locale) {
    var path = feature.path.replace('{id}', eventId);
    return '/' + locale + path;
  }

  function buildEventUrl(eventId, locale) {
    return '/' + locale + '/r/events/' + eventId + '/guests';
  }

  // ---- Styles ----

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + BACKDROP_ID + ' {',
      '  position: fixed; inset: 0; z-index: 2147483646;',
      '  background: rgba(23, 49, 47, 0.35);',
      '  opacity: 0; transition: opacity 150ms ease;',
      '}',
      '#' + BACKDROP_ID + '.is-visible { opacity: 1; }',
      '#' + PALETTE_ID + ' {',
      '  position: fixed; top: 50%; left: 50%;',
      '  transform: translate(-50%, calc(-50% - 40px)) translateY(8px);',
      '  width: 600px; max-width: calc(100vw - 32px);',
      '  background: var(--atlas-panel, #fff);',
      '  border: 1px solid var(--atlas-border, #d8e4e1);',
      '  border-radius: 12px;',
      '  box-shadow: 0 24px 48px rgba(20, 52, 49, 0.18);',
      '  z-index: 2147483647;',
      '  overflow: hidden;',
      '  opacity: 0;',
      '  transition: opacity 150ms ease-out, transform 150ms ease-out;',
      '}',
      '#' + PALETTE_ID + '.is-visible {',
      '  opacity: 1;',
      '  transform: translate(-50%, calc(-50% - 40px)) translateY(0);',
      '}',
      '.atlas-palette-input-wrap {',
      '  padding: 12px 16px;',
      '  border-bottom: 1px solid var(--atlas-border, #d8e4e1);',
      '}',
      '.atlas-palette-input {',
      '  width: 100%; box-sizing: border-box;',
      '  padding: 8px 12px;',
      '  font: 14px/1.5 Arial, sans-serif;',
      '  color: var(--atlas-text, #17312f);',
      '  background: var(--atlas-bg-soft, #f8fbfa);',
      '  border: 1px solid var(--atlas-border, #d8e4e1);',
      '  border-radius: 6px;',
      '  outline: none;',
      '}',
      '.atlas-palette-input:focus { border-color: var(--atlas-accent, #209991); }',
      '.atlas-palette-list {',
      '  max-height: 400px; overflow-y: auto;',
      '  padding: 6px 0;',
      '}',
      '.atlas-palette-group-label {',
      '  padding: 8px 16px 4px;',
      '  font-size: 10px; font-weight: 700;',
      '  letter-spacing: 0.08em; text-transform: uppercase;',
      '  color: var(--atlas-text-soft, #647a78);',
      '}',
      '.atlas-palette-item {',
      '  display: flex; align-items: center; gap: 10px;',
      '  padding: 8px 16px;',
      '  cursor: pointer;',
      '  font: 13px/1.4 Arial, sans-serif;',
      '  color: var(--atlas-text, #17312f);',
      '  transition: background 80ms;',
      '}',
      '.atlas-palette-item:hover,',
      '.atlas-palette-item.is-highlighted {',
      '  background: var(--atlas-accent-soft, rgba(32, 153, 145, 0.12));',
      '}',
      '.atlas-palette-item.is-current {',
      '  background: var(--atlas-accent-soft, rgba(32, 153, 145, 0.12));',
      '  border-left: 2px solid var(--atlas-accent, #209991);',
      '  padding-left: 14px;',
      '}',
      '.atlas-palette-item .atlas-pi-icon {',
      '  width: 20px; flex-shrink: 0; text-align: center;',
      '  color: var(--atlas-text-soft, #647a78); font-size: 13px;',
      '}',
      '.atlas-palette-item .atlas-pi-icon svg {',
      '  width: 16px; height: 16px; display: block; margin: 0 auto;',
      '}',
      '.atlas-palette-item .atlas-pi-label { flex: 1; }',
      '.atlas-palette-item .atlas-pi-sub {',
      '  font-size: 11px; color: var(--atlas-text-soft, #647a78);',
      '}',
      '.atlas-palette-empty {',
      '  padding: 24px 16px; text-align: center;',
      '  font-size: 13px; color: var(--atlas-text-soft, #647a78);',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ---- DOM ----

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function createDOM() {
    var backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });

    var palette = document.createElement('div');
    palette.id = PALETTE_ID;
    palette.innerHTML = [
      '<div class="atlas-palette-input-wrap">',
      '  <input class="atlas-palette-input" type="text" autocomplete="off" spellcheck="false"',
      '    placeholder="Rechercher une feature ou un événement..." />',
      '</div>',
      '<div class="atlas-palette-list"></div>',
    ].join('');

    backdrop.appendChild(palette);
    document.body.appendChild(backdrop);

    var input = palette.querySelector('.atlas-palette-input');
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeydown);
  }

  function removeDOM() {
    var el = document.getElementById(BACKDROP_ID);
    if (el) el.remove();
  }

  // ---- Rendu ----

  function filterFeatures(query) {
    var q = normalize(query).trim();
    if (!q) return getAvailableFeatureGroups(FEATURES);
    return FEATURES.map(function (group) {
      return {
        group: group.group,
        items: group.items.filter(function (item) {
          return isFeatureVisible(item) && normalize(item.label).indexOf(q) !== -1;
        })
      };
    }).filter(function (group) { return group.items.length > 0; });
  }

  function sortedItems(items) {
    return items.slice().sort(function (a, b) {
      var scoreDelta = getFeatureVisitScore(b.id) - getFeatureVisitScore(a.id);
      if (scoreDelta !== 0) return scoreDelta;
      return a.label.localeCompare(b.label, 'fr');
    });
  }

  function isFeatureVisible(item) {
    if (!item) return false;
    if (!(state.availableFeatureIds instanceof Set)) return true;
    return state.availableFeatureIds.has(item.id);
  }

  function getAvailableFeatureGroups(groups) {
    return groups.map(function (group) {
      return {
        group: group.group,
        items: group.items.filter(isFeatureVisible)
      };
    }).filter(function (group) { return group.items.length > 0; });
  }

  function getAvailableFlatFeatures() {
    var flat = [];
    getAvailableFeatureGroups(FEATURES).forEach(function (group) {
      flat = flat.concat(group.items);
    });
    return flat;
  }

  function buildTopFeatures(currentFeatureId) {
    return sortedItems(getAvailableFlatFeatures())
      .filter(function (item) { return item.id !== currentFeatureId; })
      .slice(0, 6);
  }

  function loadAvailableFeatures(eventId) {
    state.availableFeatureIds = null;
    if (!eventId || !window.AtlasEventmakerApi || typeof window.AtlasEventmakerApi.fetchEventEnabledFeatures !== 'function') {
      return;
    }

    var csrf = document.querySelector('meta[name="csrf-token"]');
    var csrfToken = csrf ? csrf.getAttribute('content') : '';

    window.AtlasEventmakerApi.fetchEventEnabledFeatures(eventId, csrfToken)
      .then(function (payload) {
        if (!state.isOpen || !state.context || state.context.eventId !== eventId) return;
        var featureIds = extractEnabledFeatureIds(payload);
        state.availableFeatureIds = featureIds.length > 0 ? new Set(featureIds) : null;
        renderList();
      })
      .catch(function () {});
  }

  function extractEnabledFeatureIds(payload) {
    var featureKeys = [];

    if (Array.isArray(payload)) {
      featureKeys = payload;
    } else if (payload && Array.isArray(payload.features)) {
      featureKeys = payload.features;
    } else {
      return [];
    }

    var explicitMap = {
      'website.website.website': ['website'],
      'website.schedule.schedule': ['programme'],
      'website.blog.blog': ['website'],

      'registration.advanced_registration.registration_quotas': ['guest_categories'],
      'registration.advanced_registration.accreditations': ['guest_categories'],
      'registration.advanced_registration.category_metadata': ['guest_categories'],
      'registration.advanced_registration.notifications': ['guest_categories'],
      'registration.advanced_registration.documents': ['guest_categories'],
      'registration.advanced_registration.rooming': ['guest_categories', 'accommodations'],
      'registration.advanced_registration.advanced_guest_fields': ['guest_fields'],

      'registration.payment.promo_codes': ['promo_codes'],
      'registration.payment.products': ['products'],
      'registration.payment.ticketing': ['ticketing'],
      'registration.payment.payment': ['ticketing'],
      'registration.payment.invoicing': ['ticketing'],

      'sponsors_and_exhibitors.exhibitor_leads.exhibitor_leads': ['leads'],
      'sponsors_and_exhibitors.visit_route.visit_route': ['leads'],
      'sponsors_and_exhibitors.exhibitor_invitations.exhibitor_invitations': ['guest_categories'],
      'sponsors_and_exhibitors.exhibitor_invitations.exhibitor_notification_when_invitee_shows_up': ['guest_categories'],
      'sponsors_and_exhibitors.tasks.tasks': ['tasks'],

      'networking.scheduled_1to1_meeting.scheduled_1to1_meeting': ['meetings', 'networking'],
      'networking.matchmaking.matchmaking': ['networking'],
      'networking.one_to_one_chat_and_connections.one_to_one_chat_and_connections': ['networking'],
      'networking.video_chat.video_chat': ['networking'],

      'marketing.thematic_scoring.thematic_scoring': ['thematics'],
      'marketing.engagement_scoring.engagement_scoring': ['networking'],
      'marketing.campaigns_and_tracking.campaigns_and_tracking': ['campaigns', 'emails'],

      'onsite.basic_checkin.checkin': ['checkins'],
      'onsite.advanced_checkin.checkin_rules': ['checkins'],
      'onsite.advanced_checkin.preprinted_badge_pairing': ['checkins'],
      'onsite.advanced_checkin.messages_on_checkin': ['checkins'],
      'onsite.advanced_checkin.accompanying_persons': ['checkins'],
      'onsite.badges.badges': ['checkins'],
      'onsite.badges.badges_printing_kiosk': ['checkins'],
      'onsite.onsite_payment_app': ['checkins'],
      'onsite.wallet_pass.wallet_pass': ['checkins'],

      'event.multilingual.multilingual': ['translations'],
      'event.mobile_app.mobile_app': ['app'],
      'event.data_integrations.custom_integrations': ['integrations'],
      'event.data_integrations.webhooks': ['webhooks']
    };

    var allowed = new Set(FEATURES.flatMap(function(group) { return group.items.map(function(item) { return item.id; }); }));
    var resolved = [];

    featureKeys.forEach(function(key) {
      if (typeof key !== 'string') return;
      var mapped = explicitMap[key] || [];
      if (mapped.length === 0) {
        var normalized = normalize(key).replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
        if (normalized.indexOf('website') !== -1) mapped = ['website'];
        else if (normalized.indexOf('schedule') !== -1 || normalized.indexOf('session') !== -1) mapped = ['programme'];
        else if (normalized.indexOf('guest_field') !== -1) mapped = ['guest_fields'];
        else if (normalized.indexOf('promo_code') !== -1) mapped = ['promo_codes'];
        else if (normalized.indexOf('ticketing') !== -1) mapped = ['ticketing'];
        else if (normalized.indexOf('product') !== -1) mapped = ['products'];
        else if (normalized.indexOf('multilingual') !== -1 || normalized.indexOf('translation') !== -1) mapped = ['translations'];
        else if (normalized.indexOf('mobile_app') !== -1) mapped = ['app'];
        else if (normalized.indexOf('webhook') !== -1) mapped = ['webhooks'];
        else if (normalized.indexOf('integration') !== -1) mapped = ['integrations'];
        else if (normalized.indexOf('task') !== -1) mapped = ['tasks'];
        else if (normalized.indexOf('meeting') !== -1) mapped = ['meetings'];
        else if (normalized.indexOf('matchmaking') !== -1 || normalized.indexOf('networking') !== -1 || normalized.indexOf('chat') !== -1) mapped = ['networking'];
        else if (normalized.indexOf('thematic') !== -1) mapped = ['thematics'];
        else if (normalized.indexOf('campaign') !== -1) mapped = ['campaigns', 'emails'];
        else if (normalized.indexOf('lead') !== -1 || normalized.indexOf('exhibitor') !== -1) mapped = ['leads'];
        else if (normalized.indexOf('checkin') !== -1 || normalized.indexOf('badge') !== -1 || normalized.indexOf('onsite') !== -1) mapped = ['checkins'];
        else if (normalized.indexOf('registration') !== -1 || normalized.indexOf('accreditation') !== -1 || normalized.indexOf('category_metadata') !== -1 || normalized.indexOf('rooming') !== -1) mapped = ['guest_categories'];
      }

      mapped.forEach(function(featureId) {
        if (allowed.has(featureId)) resolved.push(featureId);
      });
    });

    return Array.from(new Set(resolved));
  }

  var ACTIONS = [
    { id: 'open-atlas', label: 'Ouvrir Atlas', icon: 'fa-compass' },
  ];

  function getVisibleItems() {
    var flat = [];
    var ctx = state.context;
    var locale = detectLocale();
    var currentFeatureId = ctx && ctx.hasEventContext ? getCurrentFeatureId(ctx.eventId) : null;

    var matchingActions = state.query
      ? ACTIONS.filter(function (a) { return normalize(a.label).indexOf(normalize(state.query)) !== -1; })
      : ACTIONS;
    matchingActions.forEach(function (action) {
      flat.push({ type: 'action', data: action, groupLabel: null, url: null });
    });

    if (ctx && ctx.hasEventContext) {
      var filtered = filterFeatures(state.query);
      var topFeatureIds = new Set();

      if (!state.query) {
        buildTopFeatures(currentFeatureId).forEach(function (item, index) {
          topFeatureIds.add(item.id);
          flat.push({
            type: 'feature',
            data: item,
            groupLabel: index === 0 ? 'Accès fréquents' : null,
            isCurrent: item.id === currentFeatureId,
            url: buildFeatureUrl(item, ctx.eventId, locale),
            subLabel: getFeatureVisitScore(item.id) > 0 ? getFeatureVisitScore(item.id) + ' visites' : 'Pas encore utilisé'
          });
        });
      }

      filtered.forEach(function (group) {
        var sorted = sortedItems(group.items).filter(function (item) {
          return state.query || !topFeatureIds.has(item.id);
        });
        sorted.forEach(function (item, i) {
          flat.push({
            type: 'feature',
            data: item,
            groupLabel: i === 0 ? (group.group || 'Toutes les features') : null,
            isCurrent: item.id === currentFeatureId,
            url: buildFeatureUrl(item, ctx.eventId, locale),
            subLabel: getFeatureVisitScore(item.id) > 0 ? getFeatureVisitScore(item.id) + ' visites' : null
          });
        });
      });
    }

    var recents = getRecentEvents().sort(function (a, b) {
      return (b.lastVisited || 0) - (a.lastVisited || 0);
    });
    if (state.query) {
      var q = normalize(state.query);
      recents = recents.filter(function (e) {
        return normalize(e.title).indexOf(q) !== -1
          || normalize(e.organizer).indexOf(q) !== -1;
      });
    }
    recents.forEach(function (event, i) {
      flat.push({
        type: 'event',
        data: event,
        groupLabel: i === 0 ? 'Événements récents' : null,
        url: buildEventUrl(event.id, locale),
      });
    });

    state.apiResults.forEach(function (event, i) {
      flat.push({
        type: 'api-event',
        data: event,
        groupLabel: i === 0 ? 'Résultats' : null,
        url: buildEventUrl(event._id, locale),
      });
    });

    return flat;
  }

  function renderList() {
    var backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) return;
    var list = backdrop.querySelector('.atlas-palette-list');
    var items = getVisibleItems();

    if (items.length === 0) {
      list.innerHTML = '<div class="atlas-palette-empty">Aucun résultat</div>';
      return;
    }

    var html = items.map(function (item, idx) {
      var cls = 'atlas-palette-item'
        + (idx === state.highlighted ? ' is-highlighted' : '')
        + (item.isCurrent ? ' is-current' : '');

      var groupHtml = item.groupLabel
        ? '<div class="atlas-palette-group-label">' + escapeHtml(item.groupLabel) + '</div>'
        : '';

      var iconName = item.type === 'feature' || item.type === 'action' ? item.data.icon : 'fa-calendar-days';
      var iconHtml = iconSvg(iconName);
      var label = item.type === 'feature' || item.type === 'action' ? item.data.label : (item.data.title || '');
      var labelHtml = '<span class="atlas-pi-label">' + escapeHtml(label) + '</span>';
      var subText = item.subLabel || ((item.type !== 'feature' && item.data.organizer) ? item.data.organizer : '');
      var subHtml = subText
        ? '<span class="atlas-pi-sub">' + escapeHtml(subText) + '</span>'
        : '';

      return groupHtml
        + '<div class="' + cls + '" data-palette-idx="' + idx + '">'
        + iconHtml + labelHtml + subHtml
        + '</div>';
    }).join('');

    list.innerHTML = html;

    list.querySelectorAll('.atlas-palette-item').forEach(function (el) {
      el.addEventListener('click', function () {
        handleSelect(items[parseInt(el.getAttribute('data-palette-idx'), 10)]);
      });
      el.addEventListener('mouseenter', function () {
        state.highlighted = parseInt(el.getAttribute('data-palette-idx'), 10);
        updateHighlight();
      });
    });
  }

  function updateHighlight() {
    var backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) return;
    backdrop.querySelectorAll('.atlas-palette-item').forEach(function (el) {
      el.classList.toggle('is-highlighted', parseInt(el.getAttribute('data-palette-idx'), 10) === state.highlighted);
    });
    var active = backdrop.querySelector('.atlas-palette-item.is-highlighted');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  // ---- Clavier ----

  function handleKeydown(e) {
    var items = getVisibleItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.highlighted = Math.min(state.highlighted + 1, items.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.highlighted = Math.max(state.highlighted - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var item = items[state.highlighted] || items[0];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  // ---- Recherche ----

  function handleInput(e) {
    state.query = e.target.value;
    state.highlighted = 0;
    state.apiResults = [];
    clearTimeout(state.searchTimer);
    renderList();

    if (!state.query) return;

    var ctx = state.context;
    var hasFeatureMatch = ctx && ctx.hasEventContext
      ? FEATURES.some(function (group) {
          return group.items.some(function (item) {
            return normalize(item.label).indexOf(normalize(state.query)) !== -1;
          });
        })
      : false;

    if (!hasFeatureMatch) {
      var queryAtDispatch = state.query;
      state.searchTimer = setTimeout(function () {
        fetchEventsSearch(queryAtDispatch);
      }, 150);
    }
  }

  function fetchEventsSearch(query) {
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var csrfToken = csrf ? csrf.getAttribute('content') : '';
    var headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    fetch('/api/v1/events.json?page=1&per_page=10&search=' + encodeURIComponent(query), {
      credentials: 'include',
      headers: headers,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!state.isOpen || state.query !== query) return;
        state.apiResults = Array.isArray(data) ? data : [];
        renderList();
      })
      .catch(function () {});
  }

  // ---- Navigation ----

  function handleSelect(item) {
    if (item.type === 'action') {
      close();
      if (item.data.id === 'open-atlas') {
        var btn = document.getElementById('atlas-extension-toggle');
        if (btn) btn.click();
      }
      return;
    }
    if (item.type === 'event') {
      upsertRecentEvent(item.data);
    } else if (item.type === 'api-event') {
      upsertRecentEvent({
        id: item.data._id,
        title: item.data.title,
        organizer: item.data.organizer,
      });
    } else if (item.type === 'feature') {
      incrementFeatureVisit(item.data.id);
    }
    close();
    window.location.href = item.url;
  }

  // ---- Open / Close / Toggle ----

  function open() {
    if (state.isOpen) return;
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
    state.isOpen = true;
    state.query = '';
    state.highlighted = 0;
    state.apiResults = [];
    state.context = window.AtlasEventmakerContext
      ? window.AtlasEventmakerContext.detectContext()
      : null;
    if (state.context && state.context.hasEventContext) {
      loadAvailableFeatures(state.context.eventId);
    } else {
      state.availableFeatureIds = null;
    }
    if (state.useFaIcons === null) state.useFaIcons = detectFa6();

    injectStyles();
    createDOM();
    renderList();

    var atlasPanel = document.getElementById('atlas-extension-panel');
    var panelWidth = (atlasPanel && atlasPanel.classList.contains('is-open')) ? atlasPanel.offsetWidth : 0;
    if (panelWidth > 0) {
      var paletteEl = document.getElementById(PALETTE_ID);
      if (paletteEl) paletteEl.style.left = 'calc((100vw - ' + panelWidth + 'px) / 2)';
    }

    requestAnimationFrame(function () {
      var backdrop = document.getElementById(BACKDROP_ID);
      var palette = document.getElementById(PALETTE_ID);
      if (backdrop) backdrop.classList.add('is-visible');
      if (palette) palette.classList.add('is-visible');
      var input = palette && palette.querySelector('.atlas-palette-input');
      if (input) input.focus();
    });
  }

  function close() {
    if (!state.isOpen) return;
    state.isOpen = false;
    clearTimeout(state.searchTimer);

    var backdrop = document.getElementById(BACKDROP_ID);
    var palette = document.getElementById(PALETTE_ID);
    if (backdrop) backdrop.classList.remove('is-visible');
    if (palette) palette.classList.remove('is-visible');

    state.closeTimer = setTimeout(removeDOM, 160);
  }

  function toggle() {
    state.isOpen ? close() : open();
  }

  window.AtlasPalette = {
    open: function () { return open(); },
    close: function () { return close(); },
    toggle: function () { return toggle(); },
  };
})();
