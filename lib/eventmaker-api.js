(function () {
  async function fetchJson(path, options) {
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options && options.csrfToken ? { "X-CSRF-Token": options.csrfToken } : {})
    };

    const response = await fetch(path, {
      method: "GET",
      credentials: "include",
      headers
    });

    const payload = await response.json();

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}`);
      error.response = response;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function tryFetchJson(path, options) {
    try {
      return await fetchJson(path, options);
    } catch (_) {
      return null;
    }
  }

  async function fetchEventEnabledFeatures(eventId, csrfToken) {
    return fetchJson(`/api/v1/events/${eventId}/feature_set.json`, { csrfToken });
  }

  async function fetchEventSnapshot(eventId, csrfToken) {
    const base = `/api/v1/events/${eventId}`;
    const [event, guestFields, guestCategories, website, websitePages, websiteSectionTypes, segments, workflowList, emailTemplates] = await Promise.all([
      fetchJson(`/fr/events/${eventId}.json`, { csrfToken }),
      fetchJson(`${base}/guest_fields.json`, { csrfToken }),
      fetchJson(`${base}/guest_categories.json`, { csrfToken }),
      fetchJson(`${base}/website.json?locale=fr`, { csrfToken }),
      fetchJson(`${base}/website/pages.json?locale=fr`, { csrfToken }),
      fetchJson(`${base}/website/section_types.json?locale=fr`, { csrfToken }),
      fetchJson(`/events/${eventId}/saved_searches.json`, { csrfToken }),
      fetchJson(`${base}/automation/workflows.json`, { csrfToken }),
      fetchJson(`${base}/email_templates.json`, { csrfToken })
    ]);
    const emailTemplateList = Array.isArray(emailTemplates) ? emailTemplates : [];
    const emailTemplateDetails = await Promise.all(
      emailTemplateList.map(async function(template) {
        if (!template?._id) return template;
        const detail = await tryFetchJson(`${base}/email_templates/${template._id}.json`, { csrfToken });
        return detail ? { ...template, ...detail } : template;
      })
    );
    const registrationFormIds = [...new Set(
      (Array.isArray(guestCategories) ? guestCategories : [])
        .map((category) => category?.registration_form_id)
        .filter(Boolean)
    )];
    const forms = await Promise.all(
      registrationFormIds.map((formId) => fetchJson(`/api/v1/registration_forms/${formId}.json`, { csrfToken }))
    );
    const workflowIds = (Array.isArray(workflowList) ? workflowList : []).map(function(workflow) {
      return workflow?._id;
    }).filter(Boolean);
    const workflowDetails = await Promise.all(
      workflowIds.map(function(workflowId) {
        return tryFetchJson(`${base}/automation/workflows/${workflowId}.json?builder=true`, { csrfToken })
          .then(function(payload) {
            return payload || fetchJson(`${base}/automation/workflows/${workflowId}.json`, { csrfToken });
          });
      })
    );
    function unwrapWorkflowDetail(entry) {
      if (!entry || typeof entry !== "object") return {};
      return entry.workflow || entry.data || entry.payload || entry;
    }
    const workflowDetailsById = Object.fromEntries(
      workflowDetails.map(function(entry) {
        const resolved = unwrapWorkflowDetail(entry);
        const resolvedId = resolved?._id || entry?._id || null;
        return [resolvedId, entry];
      }).filter(function(entry) { return Boolean(entry[0]); })
    );
    const workflows = await Promise.all((Array.isArray(workflowList) ? workflowList : []).map(async function(listEntry) {
      const detailEntry = workflowDetailsById[listEntry?._id] || null;
      const resolvedDetail = unwrapWorkflowDetail(detailEntry);
      const onlineVersionId =
        resolvedDetail.online_version_id
        || resolvedDetail.onlineVersionId
        || listEntry?.online_version_id
        || listEntry?.onlineVersionId
        || null;
      let resolvedVersion =
        resolvedDetail.current_workflow_version
        || resolvedDetail.currentWorkflowVersion
        || resolvedDetail.online_version
        || resolvedDetail.onlineVersion
        || resolvedDetail.draft_version
        || resolvedDetail.draftVersion
        || detailEntry?.current_workflow_version
        || detailEntry?.currentWorkflowVersion
        || detailEntry?.online_version
        || detailEntry?.onlineVersion
        || listEntry?.current_workflow_version
        || listEntry?.currentWorkflowVersion
        || null;

      if (!resolvedVersion && onlineVersionId && listEntry?._id) {
        const versionCandidates = await Promise.all([
          tryFetchJson(`${base}/automation/workflows/${listEntry._id}/versions/${onlineVersionId}.json`, { csrfToken }),
          tryFetchJson(`${base}/automation/workflow_versions/${onlineVersionId}.json`, { csrfToken }),
          tryFetchJson(`${base}/automation/workflows/${listEntry._id}/current_workflow_version.json`, { csrfToken })
        ]);
        const versionPayload = versionCandidates.find(Boolean);
        if (versionPayload) {
          const resolvedVersionPayload = unwrapWorkflowDetail(versionPayload);
          resolvedVersion =
            resolvedVersionPayload?.current_workflow_version
            || resolvedVersionPayload?.currentWorkflowVersion
            || resolvedVersionPayload?.workflow_version
            || resolvedVersionPayload?.workflowVersion
            || resolvedVersionPayload;
        }
      }

      return {
        ...listEntry,
        ...resolvedDetail,
        current_workflow_version: resolvedVersion
      };
    }));

    return {
      fetchedAt: new Date().toISOString(),
      event,
      guestFields,
      guestCategories,
      website,
      websitePages,
      websiteSectionTypes,
      emailTemplates: emailTemplateDetails,
      segments,
      forms,
      workflows,
      summary: {
        guestFields: countItems(guestFields, ["guest_fields"]),
        guestCategories: countItems(guestCategories, ["guest_categories"]),
        segments: countItems(segments, ["saved_searches"]),
        networkingRules: Object.keys(event?.networking_rules || {}).length,
        workflows: workflows.length,
        forms: forms.length,
        websitePages: countItems(websitePages, ["pages"]),
        emailTemplates: countItems(emailTemplateDetails, ["email_templates"])
      }
    };
  }

  function countItems(payload, nestedPaths) {
    if (Array.isArray(payload)) {
      return payload.length;
    }

    if (!payload || typeof payload !== "object") {
      return 0;
    }

    for (const key of nestedPaths) {
      if (Array.isArray(payload[key])) {
        return payload[key].length;
      }
    }

    return 0;
  }

  window.AtlasEventmakerApi = {
    fetchJson,
    tryFetchJson,
    fetchEventSnapshot,
    fetchEventEnabledFeatures
  };
})();
