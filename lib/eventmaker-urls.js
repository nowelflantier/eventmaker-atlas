(function () {
  // Patterns entrants — testés dans l'ordre, premier match gagne.
  // Le segment de langue (/{lang}/) est variable et ignoré via [^/]+.
  const INCOMING_PATTERNS = [
    {
      type: "field",
      regex: /\/r\/events\/([^/?#]+)\/guest_fields\/([^/?#]+)/,
      eid: 1, oid: 2
    },
    {
      type: "category",
      regex: /\/r\/events\/([^/?#]+)\/guest_categories\/([^/?#]+)/,
      eid: 1, oid: 2
    },
    {
      type: "form",
      // Pas de /r/ sur les forms
      regex: /\/events\/([^/?#]+)\/registration_forms\/([^/?#]+)/,
      eid: 1, oid: 2
    },
    {
      type: "automation",
      regex: /\/events\/([^/?#]+)\/workflows\/([^/?#]+)(?:\/builder)?/,
      eid: 1, oid: 2
    },
    {
      type: "page",
      regex: /\/events\/([^/?#]+)\/website\/builder\/page\/([^/?#]+)/,
      eid: 1, oid: 2
    },
    {
      type: "email",
      regex: /\/events\/([^/?#]+)\/emails\/([^/?#]+)(?:\/builder)?(?:$|[/?#])/,
      eid: 1, oid: 2
    },
    {
      type: "guests",
      regex: /\/r\/events\/([^/?#]+)\/guests(?:$|[/?#])/,
      eid: 1, oid: null
    }
  ];

  /**
   * Parse une URL Eventmaker et retourne { type, eventId, objectId, query } ou null.
   */
  function parseEventmakerUrl(href) {
    try {
      const parsed = new URL(href, "https://app.eventmaker.io");
      const pathname = parsed.pathname;
      for (var i = 0; i < INCOMING_PATTERNS.length; i++) {
        var pattern = INCOMING_PATTERNS[i];
        var match = pathname.match(pattern.regex);
        if (!match) continue;
        return {
          type: pattern.type,
          eventId: match[pattern.eid],
          objectId: pattern.oid !== null ? match[pattern.oid] : null,
          query: pattern.type === "guests" ? (parsed.searchParams.get("q") || null) : null
        };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Construit une URL Eventmaker depuis un type et des options.
   * @param {string} type  "field" | "category" | "form" | "page" | "segment" | "automation" | "email"
   * @param {string|null} objectId  ID de l'objet (null pour segment)
   * @param {{ eventId: string, lang?: string, query?: string }} options
   * @returns {string|null}
   */
  function buildEventmakerUrl(type, objectId, options) {
    var lang = (options && options.lang) || "fr";
    var eventId = options && options.eventId;
    var query = options && options.query;
    if (!eventId) return null;
    var base = "https://app.eventmaker.io";
    switch (type) {
      case "field":    return base + "/" + lang + "/r/events/" + eventId + "/guest_fields/" + objectId;
      case "category": return base + "/" + lang + "/r/events/" + eventId + "/guest_categories/" + objectId;
      case "form":     return base + "/" + lang + "/events/" + eventId + "/registration_forms/" + objectId;
      case "automation": return base + "/" + lang + "/events/" + eventId + "/workflows/" + objectId + "/builder";
      case "email":    return base + "/" + lang + "/events/" + eventId + "/emails/" + objectId + "/builder";
      case "page":     return base + "/" + lang + "/events/" + eventId + "/website/builder/page/" + objectId;
      case "segment":  return base + "/" + lang + "/r/events/" + eventId + "/guests?q=" + encodeURIComponent(query || "");
      default:         return null;
    }
  }

  /**
   * Lit la langue configurée depuis chrome.storage.local (défaut: "fr").
   * @returns {Promise<string>}
   */
  function getLang() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(["atlasLang"], function (result) {
          resolve((result && result.atlasLang) || "fr");
        });
      } catch (_) {
        resolve("fr");
      }
    });
  }

  window.AtlasEventmakerUrls = {
    parseEventmakerUrl: parseEventmakerUrl,
    buildEventmakerUrl: buildEventmakerUrl,
    getLang: getLang
  };
})();
