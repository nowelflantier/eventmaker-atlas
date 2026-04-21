(function () {
  const EVENT_PATH_PATTERN = /\/events\/([^/?#]+)/;

  function detectContext(url) {
    const targetUrl = url || window.location.href;
    const parsed = new URL(targetUrl, window.location.origin);
    const eventMatch = parsed.pathname.match(EVENT_PATH_PATTERN);
    const eventId = eventMatch ? eventMatch[1] : null;
    const pageType = inferPageType(parsed.pathname);
    const objectId = inferObjectId(parsed.pathname, pageType);
    const guestQuery = pageType === "guests" ? (parsed.searchParams.get("q") || null) : null;
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");

    return {
      url: parsed.href,
      pathname: parsed.pathname,
      eventId,
      hasEventContext: Boolean(eventId),
      pageType,
      objectId,
      guestQuery,
      csrfToken
    };
  }

  function inferPageType(pathname) {
    const rules = [
      { marker: "/guests", type: "guests" },
      { marker: "/guest_fields", type: "guest_fields" },
      { marker: "/guest_categories", type: "guest_categories" },
      { marker: "/emails", type: "emails" },
      { marker: "/saved_searches", type: "segments" },
      { marker: "/workflows", type: "automations" },
      { marker: "/registration_forms", type: "registration_forms" },
      { marker: "/website", type: "website" }
    ];

    const found = rules.find((rule) => pathname.includes(rule.marker));
    return found ? found.type : "event";
  }

  function inferObjectId(pathname, pageType) {
    const patterns = {
      guest_fields: /\/guest_fields\/([^/?#]+)/,
      guest_categories: /\/guest_categories\/([^/?#]+)/,
      emails: /\/emails\/([^/?#]+)/,
      segments: /\/saved_searches\/([^/?#]+)/,
      automations: /\/workflows\/([^/?#]+)/,
      registration_forms: /\/registration_forms\/([^/?#]+)/,
      website: /\/website\/builder\/page\/([^/?#]+)/
    };

    const pattern = patterns[pageType];
    const match = pattern ? pathname.match(pattern) : null;
    return match ? match[1] : null;
  }

  window.AtlasEventmakerContext = {
    detectContext
  };
})();
