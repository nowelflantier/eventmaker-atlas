(function () {
  const EVENTMAKER_RELATIONAL_OPERATORS = ["person_parent", "main_exhibitor"];
  const EVENTMAKER_NATIVE_FIELDS = new Set([
    // Identité et références
    "_id", "uid", "alias_uids", "id", "secret",
    "contact_id", "person_parent_id", "person_parent_uid",
    "order_uid",

    // Informations personnelles
    "first_name", "last_name", "email", "email_cc",
    "phone_number", "phone_number_prefix",
    "company_name", "company_id_number", "position",
    "vat_number", "message",

    // Adresse et localisation
    "address", "postal_code", "city",
    "country", "country_name", "country_alpha2",
    "locale",

    // Catégorisation
    "guest_category",
    "label_ids",

    // Statuts et dates
    "status", "showed_up", "registered_at", "deleted_at",
    "created_at", "updated_at",
    "arrival_date", "attended_dates",
    "rsvp_status", "attendance_types",

    // Attribution des places et sièges
    "rank", "seat_number",
    "registration_step_id",

    // Affichage et navigation
    "avatar", "avatar_thumb", "avatar_medium",
    "badge_url", "badge_permalink",
    "qrcode_url",
    "website_page_id",

    // Campagnes et optins
    "event_campaign_optin", "gdpr_event_campaign_optin",
    "account_campaign_optin",
    "sent_campaign_ids",

    // Quotas
    "invitations_quota", "invitations_quota_mapping",
    "products_quota", "collections_quota",
    "meeting_requests_remaining_quota",

    // Paiement
    "payment_promo_code", "payment_promo_code_label",
    "payment_status", "payment_merchant_type",
    "payment_total_incl_taxes", "payment_total_excl_taxes",
    "payment_balance", "tax",

    // Exhibiteurs
    "exhibitor_id", "exhibitor_affiliation_code",
    "main_exhibitor_affiliation_code",

    // Email et notifications
    "confirmation_email_sent", "edition_link_email_sent",
    "moderation_email_sent",
    "nb_emails_sent", "nb_emails_opened", "nb_emails_clicked",
    "nb_emails_bounced", "nb_emails_blocked", "nb_emails_spammed",
    "nb_emails_enqueued", "nb_emails_unsubscribed",
    "unread_messages_email_last_notified_at",
    "unread_messages_email_scheduled_at",
    "notification_disabled_until",
    "subscribed_to_web_push",

    // Modération et accès
    "incoming_messages_moderation_type",
    "invitation_moderation_status",
    "is_imported_linked_guest",
    "contact_sso_status",

    // Accès et contrôle
    "in_access_control_ids", "green_access_control_ids",
    "red_access_control_ids",
    "vip_checkin_notification_sms_phone_numbers",
    "vip_notification_on_checkin",

    // Événement
    "event_id", "is_online",

    // Intégrations tierces
    "third_party_applications_refs",

    // Analytics et engagement
    "engagement_score", "engagement_quartile", "engagement_std_score",
    "thematics", "thematic_scorings", "thematics_quartile",

    // Panier et documents
    "cart", "carts", "wallet", "products", "meetings", "collections",
    "documents", "documents_hash", "documents_detail",
    "labels_detail", "checkins_stats",

    // Métadonnées
    "guest_metadata", "guest_metadata_hash",

    // Suivi technique
    "utm_source", "utm_medium", "utm_campaign",
    "user_agent", "browser_on_create",
    "takeout",

    // Liens et relations
    "linked_guests_size", "linked_guests",
    "labels",

    // Web
    "website_path_slug",

    // Autres champs utilitaires
    "send_email_on_guest_category_change",
    "have_or_should_have_badge"
  ]);
  const EVENTMAKER_PLATFORM_FIELDS = new Set([
    "access_privileges",
    "checkins",
    "guest_category_id",
    "number_of_other_guests_previous_checkin_at",
    "thematic_ids"
  ]);
  const CONFIRMED_NATIVE_GUEST_FIELDS = new Set([
    "uid", "alias_uids", "avatar", "created_at", "updated_at",
    "guest_category", "email", "first_name", "last_name",
    "company_name", "company_id_number", "position",
    "phone_number", "phone_number_prefix",
    "address", "postal_code", "city", "country_name", "country",
    "vat_number", "message", "person_parent_uid",
    "payment_promo_code", "payment_promo_code_label", "order_uid",
    "utm_source", "utm_medium", "utm_campaign",
    "badge_permalink", "browser_on_create",
    "status", "showed_up", "locale", "rank", "registered_at",
    "thematics", "event_campaign_optin", "account_campaign_optin",
    "invitations_quota", "products_quota", "collections_quota",
    "invitations_quota_mapping", "email_cc", "seat_number",
    "main_exhibitor_affiliation_code", "exhibitor_affiliation_code",
    "website_path_slug", "vip_notification_on_checkin",
    "invitation_moderation_status", "third_party_applications_refs",
    "meeting_requests_remaining_quota",
    "payment_total_incl_taxes", "payment_total_excl_taxes",
    "tax", "payment_status", "payment_balance", "payment_merchant_type"
  ]);
  const EVENTMAKER_LIQUID_SYMBOLS = Object.freeze({
    link_guest_size: {
      kind: "field_alias",
      target: "linked_guests_size",
      label: "Alias Liquid historique de linked_guests_size"
    },
    link_guests: {
      kind: "field_alias",
      target: "linked_guests",
      label: "Alias Liquid historique de linked_guests"
    },
    identity: {
      kind: "liquid_only",
      label: "Libellé d'identité calculé du guest (first_name + last_name, ou company_name, ou email selon disponibilité)"
    },
    localized_exposant_zone: {
      kind: "liquid_only",
      label: "Libellé localisé de zone exposant, calculé côté plateforme"
    },
    localized_exposant_zone_numero: {
      kind: "liquid_only",
      label: "Libellé localisé zone + numéro, calculé côté plateforme"
    },
    cart: {
      kind: "field_alias",
      target: "carts",
      label: "Alias Liquid singulier du panier guest"
    },
    guest_products_size: {
      kind: "liquid_only",
      label: "Nombre de produits liés au participant"
    },
    sessions_as_exhibitor: {
      kind: "liquid_only",
      label: "Collection des sessions où le guest est exposant"
    },
    sessions_as_speaker: {
      kind: "liquid_only",
      label: "Collection des sessions où le guest est speaker"
    }
  });
  const SEGMENT_NATIVE_OPERATORS = new Set([
    "status", "guest_category", "sort", "campaign_optin", "locale",
    "email", "country_name", "label", "meeting_status", "utm_medium",
    "utm_source", "registered_after", "checked_in_at", "expected_at",
    "include_takeout", "no", "last_name", "liste_officiels", "is_coexhibitor"
  ]);
  const FORM_STRUCTURAL_TYPES = new Set(["paragraph", "subform"]);
  function nativeKeyToLabel(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function inferFieldKind(key, hasCustomId) {
    if (hasCustomId) return "custom";
    if (CONFIRMED_NATIVE_GUEST_FIELDS.has(key)) return "native";
    if (EVENTMAKER_NATIVE_FIELDS.has(key) || EVENTMAKER_PLATFORM_FIELDS.has(key)) return "api_property";
    return "custom";
  }

  function camelToSnakeCase(value) {
    if (!value) return value;
    return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  }

  function canonicalLiquidKey(key) {
    if (!key) return key;

    const directAliases = {
      guestCategory: "guest_category",
      guestMetadata: "guest_metadata",
      personParent: "person_parent",
      mainExhibitor: "main_exhibitor"
    };

    if (directAliases[key]) return directAliases[key];

    const snakeKey = camelToSnakeCase(key);
    if (
      EVENTMAKER_NATIVE_FIELDS.has(snakeKey)
      || EVENTMAKER_PLATFORM_FIELDS.has(snakeKey)
      || EVENTMAKER_RELATIONAL_OPERATORS.includes(snakeKey)
      || snakeKey === "guest_category"
      || snakeKey === "guest_cateogry"
      || snakeKey === "guest_metadata"
      || snakeKey === "event"
    ) {
      return snakeKey;
    }

    return key;
  }

  function getLiquidSymbolMeta(key) {
    if (!key) return null;
    return EVENTMAKER_LIQUID_SYMBOLS[key] || null;
  }

  function buildAtlas(snapshot) {
    const customFields = normalizeFields(snapshot.guestFields || [], []);
    const existingKeys = new Set(customFields.map(function(f) { return f.key; }));
    const syntheticNativeFields = [];
    EVENTMAKER_NATIVE_FIELDS.forEach(function(key) {
      if (!existingKeys.has(key)) {
        syntheticNativeFields.push({
          key: key,
          label: nativeKeyToLabel(key),
          type: "text",
          _id: null,
          fieldKind: inferFieldKind(key, false),
          isNative: inferFieldKind(key, false) === "native",
          isApiProperty: inferFieldKind(key, false) === "api_property",
          availableValues: [],
          allowMultiple: false,
          code: null,
          parentFieldId: null,
          extracted: null,
          status: null,
          owner: null,
          notes: null,
          referencedBy: []
        });
      }
    });

    const atlas = {
      event: snapshot.event || null,
      guestCategories: normalizeGuestCategories(snapshot.guestCategories || []),
      fields: customFields.concat(syntheticNativeFields),
      segments: normalizeSegments(snapshot.segments || [], []),
      forms: (snapshot.forms || []).filter(Boolean).map(normalizeForm),
      emailTemplates: normalizeEmailTemplates(snapshot.emailTemplates || [], snapshot.guestCategories || [], snapshot.segments || []),
      pages: normalizePages(
        snapshot.website || null,
        snapshot.websitePages || [],
        [],
        Object.fromEntries((snapshot.websiteSectionTypes || []).map((entry) => [entry.filename, entry.schema || {}]))
      ),
      networking: normalizeNetworking(snapshot.event || null, snapshot.guestCategories || [], snapshot.segments || []),
      automations: normalizeAutomations(snapshot.workflows || [], snapshot.guestCategories || [], snapshot.segments || []),
      guestCategoriesById: {},
      fieldsByKey: {},
      fieldsById: {},
      segmentsById: {},
      formsById: {},
      emailTemplatesById: {},
      pagesById: {},
      pagesBySegmentId: {},
      pagesByFormId: {},
      automationsById: {},
      relations: [],
      relationsByEntity: {}
    };

    buildIndexes(atlas);
    buildEntityRelations(atlas);
    computeReverseReferences(atlas);

    atlas.overview = {
      stats: {
        fields: atlas.fields.length,
        guestCategories: atlas.guestCategories.length,
        segments: atlas.segments.length,
        forms: atlas.forms.length,
        emailTemplates: atlas.emailTemplates.length,
        pages: atlas.pages.length,
        networking: atlas.networking.length,
        automations: atlas.automations.length
      },
      anomalies: {
        fields: atlas.fields.filter(hasFieldAnomaly.bind(null, atlas)).length,
        segments: atlas.segments.filter(hasSegmentAnomaly.bind(null, atlas)).length,
        forms: atlas.forms.filter(hasFormAnomaly.bind(null, atlas)).length,
        emailTemplates: atlas.emailTemplates.filter(hasEmailTemplateAnomaly.bind(null, atlas)).length,
        networking: atlas.networking.filter(hasNetworkingAnomaly.bind(null, atlas)).length,
        automations: atlas.automations.filter(hasAutomationAnomaly.bind(null, atlas)).length,
        unusedCustomFields: atlas.fields.filter(function(f) {
          return f.fieldKind === "custom" && getFieldCoverage(f).total === 0;
        }).length,
        deletedSegments: atlas.segments.filter(function(s) { return s.isDeleted; }).length
      }
    };

    return atlas;
  }

  function normalizeFields(raw, annotations) {
    const annByKey = Object.fromEntries(annotations.map((a) => [a.key, a]));
    return raw.map((field) => {
      const ann = annByKey[field.key] || {};
      const extracted = field.type === "calculated" && field.code ? extractRefs(field.code) : null;
      return {
        key: field.key,
        label: field.label || field.key,
        type: field.type || "text",
        _id: field._id || null,
        fieldKind: inferFieldKind(field.key, Boolean(field._id)),
        isNative: inferFieldKind(field.key, Boolean(field._id)) === "native",
        isApiProperty: inferFieldKind(field.key, Boolean(field._id)) === "api_property",
        availableValues: field.available_values || [],
        allowMultiple: field.allow_multiple_values || false,
        code: field.code || null,
        parentFieldId: field.parent_guest_field_id || null,
        extracted,
        status: ann.status || null,
        owner: ann.owner || null,
        notes: ann.notes || null,
        referencedBy: []
      };
    });
  }

  function normalizeSegments(raw, annotations) {
    const annById = Object.fromEntries(annotations.map((a) => [a.id || a._id, a]));
    return raw.map((segment) => {
      const id = segment._id;
      const ann = annById[id] || {};
      return {
        id,
        label: segment.name || id,
        query: segment.search_query || "",
        isDeleted: Boolean(segment.deleted_at),
        createdBy: segment.user_name !== "-" ? segment.user_name : null,
        createdAt: segment.formatted_created_at || null,
        parsedRefs: parseSegmentQuery(segment.search_query),
        status: ann.status || null,
        owner: ann.owner || null,
        notes: ann.notes || null,
        referencedBy: []
      };
    });
  }

  function normalizeForm(raw) {
    const fieldWrites = new Set();
    const fieldConditions = new Set();
    const steps = (raw.form_steps || [])
      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
      .map((step) => ({
        id: step._id,
        title: step.title || step.key || "",
        rank: step.rank || 0,
        sections: (step.form_sections || [])
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
          .map((section) => ({
            id: section._id,
            title: section.title || "",
            items: (section.form_items || [])
              .sort((a, b) => (a.rank || 0) - (b.rank || 0))
              .map((item) => {
                if (item.key && !FORM_STRUCTURAL_TYPES.has(item.type)) fieldWrites.add(item.key);
                const conditions = (item.display_conditions || [])
                  .flat()
                  .filter((condition) => condition && condition.field)
                  .map((condition) => {
                    fieldConditions.add(condition.field);
                    return {
                      field: condition.field,
                      operation: condition.operation || "equal",
                      value: condition.value || ""
                    };
                  });

                return {
                  id: item._id,
                  key: item.key || null,
                  label: item.label || "",
                  type: item.type || "unknown",
                  rank: item.rank || 0,
                  conditions
                };
              })
          }))
      }));

    return {
      id: raw._id,
      title: raw.title || "Formulaire sans titre",
      steps,
      fieldWrites,
      fieldConditions,
      referencedBy: []
    };
  }

  function normalizeGuestCategories(raw) {
    const categories = Array.isArray(raw) ? raw : [];
    return categories.map(function(category) {
      return {
        id: category._id,
        label: category.name || category._id,
        name: category.name || category._id,
        populationType: category.population_type || null,
        registrationFormId: category.registration_form_id || null,
        defaultForPopulation: Boolean(category.default_for_population),
        hidden: Boolean(category.hidden),
        archived: Boolean(category.archived || category.deleted_at),
        raw: category
      };
    });
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncateText(value, maxLength) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  function classifyGuestReference(key) {
    if (!key) return null;
    const canonicalKey = canonicalLiquidKey(key);
    const liquidMeta = getLiquidSymbolMeta(canonicalKey) || getLiquidSymbolMeta(key);
    if (liquidMeta) {
      if (liquidMeta.kind === "field_alias" && liquidMeta.target) {
        return classifyGuestReference(liquidMeta.target);
      }
      return {
        kind: "liquid_only",
        key: canonicalKey
      };
    }
    if (EVENTMAKER_NATIVE_FIELDS.has(canonicalKey) || EVENTMAKER_PLATFORM_FIELDS.has(canonicalKey)) {
      return {
        kind: "native",
        key: canonicalKey
      };
    }
    return {
      kind: "field",
      key: canonicalKey
    };
  }

  function pushEmailTemplateFieldRef(bucket, key, context) {
    const classified = classifyGuestReference(key);
    if (!classified || !classified.key) return;
    if (classified.kind === "field") bucket.fieldKeys.add(classified.key);
    if (classified.kind === "native") bucket.nativeFieldKeys.add(classified.key);
    if (classified.kind === "liquid_only") bucket.liquidRefs.add(classified.key);
    if (bucket.fieldRefs.some(function(ref) {
      return ref.kind === classified.kind && ref.key === classified.key && ref.context === context;
    })) return;
    bucket.fieldRefs.push({
      kind: classified.kind,
      key: classified.key,
      context: context || "content"
    });
  }

  function collectEmailTemplateRefsFromString(value, bucket, context) {
    const text = String(value || "");
    const patterns = [
      /<<\s*guest\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.[^>]*)?\s*>>/g,
      /{{\s*guest\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.[^}]*)?\s*}}/g
    ];
    patterns.forEach(function(regex) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        pushEmailTemplateFieldRef(bucket, match[1], context);
      }
    });
  }

  function collectEmailTemplateRefsFromValue(value, bucket, keyHint, pathHint) {
    if (value == null || value === "") return;

    if (Array.isArray(value)) {
      value.forEach(function(entry, index) {
        collectEmailTemplateRefsFromValue(entry, bucket, keyHint, `${pathHint || keyHint || "value"}[${index}]`);
      });
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(function(entry) {
        const childKey = entry[0];
        collectEmailTemplateRefsFromValue(entry[1], bucket, childKey, pathHint ? `${pathHint}.${childKey}` : childKey);
      });
      return;
    }

    if (typeof value !== "string") return;

    const context = pathHint || keyHint || "value";
    if (keyHint === "guest_category_id" && value) {
      bucket.categoryIds.add(String(value));
      bucket.categoryRefs.push({
        id: String(value),
        context
      });
    }
    if ((keyHint === "segment_id" || keyHint === "segment_ids") && value) {
      bucket.segmentIds.add(String(value));
      bucket.segmentRefs.push({
        id: String(value),
        context
      });
    }
    collectEmailTemplateRefsFromString(value, bucket, context);
  }

  function summarizeEmailTemplateSection(sectionKey, sectionEntry) {
    const type = sectionEntry?.type || sectionKey;
    const settings = sectionEntry?.settings || {};
    if (type === "text" && settings.text?.html) {
      return truncateText(stripHtml(settings.text.html), 110) || "Bloc texte";
    }
    if (type === "button") {
      const label = settings.button_label || "Bouton";
      const target = settings.button_type || "action";
      return `${label} · ${target}`;
    }
    if (type === "banner") {
      return settings.image ? "Bannière image" : "Bannière";
    }
    if (type === "header") {
      return settings.email_browser_1 || "En-tête email";
    }
    if (type === "footer") {
      return settings.footer_text ? truncateText(settings.footer_text, 110) : "Pied de page";
    }
    return truncateText(stripHtml(JSON.stringify(settings)), 110) || type;
  }

  function normalizeEmailTemplates(raw, guestCategories, rawSegments) {
    const templates = Array.isArray(raw) ? raw : [];
    const guestCategoryIds = new Set((Array.isArray(guestCategories) ? guestCategories : []).map(function(category) {
      return category?._id || category?.id;
    }).filter(Boolean));
    const segmentIds = new Set((Array.isArray(rawSegments) ? rawSegments : []).map(function(segment) {
      return segment?._id || segment?.id;
    }).filter(Boolean));

    return templates.map(function(template) {
      const bucket = {
        fieldKeys: new Set(),
        nativeFieldKeys: new Set(),
        liquidRefs: new Set(),
        categoryIds: new Set(),
        segmentIds: new Set(),
        fieldRefs: [],
        categoryRefs: [],
        segmentRefs: []
      };
      const settingsData = template?.settings_data || {};
      const sectionsByKey = settingsData.sections || {};
      const sectionOrder = uniqueStrings([
        ...(Array.isArray(template?.layout?.sections) ? template.layout.sections : []),
        ...(Array.isArray(settingsData.sections_order) ? settingsData.sections_order : []),
        ...Object.keys(sectionsByKey)
      ]);
      const sections = sectionOrder.map(function(sectionKey, index) {
        const sectionEntry = sectionsByKey[sectionKey] || { type: sectionKey, settings: {} };
        collectEmailTemplateRefsFromValue(sectionEntry?.settings || {}, bucket, sectionKey, `sections.${sectionKey}.settings`);
        return {
          id: sectionKey,
          rank: index,
          type: sectionEntry?.type || sectionKey,
          title: sectionKey,
          summary: summarizeEmailTemplateSection(sectionKey, sectionEntry),
          fieldKeys: uniqueStrings(bucket.fieldRefs.filter(function(ref) {
            return ref.context && ref.context.indexOf(`sections.${sectionKey}.`) === 0 && ref.kind === "field";
          }).map(function(ref) { return ref.key; })),
          categoryIds: uniqueStrings(bucket.categoryRefs.filter(function(ref) {
            return ref.context && ref.context.indexOf(`sections.${sectionKey}.`) === 0;
          }).map(function(ref) { return ref.id; })),
          segmentIds: uniqueStrings(bucket.segmentRefs.filter(function(ref) {
            return ref.context && ref.context.indexOf(`sections.${sectionKey}.`) === 0;
          }).map(function(ref) { return ref.id; }))
        };
      });

      const guestCategoriesUses = (Array.isArray(template?.guest_categories_uses) ? template.guest_categories_uses : []).map(function(entry) {
        const id = entry?._id || entry?.id || null;
        if (id) bucket.categoryIds.add(id);
        return {
          id,
          name: entry?.name || template?.event_guest_categories?.[id] || id,
          labelColor: entry?.label_color || null
        };
      }).filter(function(entry) { return Boolean(entry.id); });

      return {
        id: template?._id,
        label: template?.name || template?._id || "Email sans nom",
        eventId: template?.event_id || null,
        createdAt: template?.created_at || null,
        updatedAt: template?.updated_at || null,
        eventThemeId: template?.event_theme_id || null,
        presetName: template?.presets_name || null,
        usesCount: Number(template?.uses_count || 0),
        layoutName: template?.layout?.name || template?.layout?.filename || null,
        layoutSections: Array.isArray(template?.layout?.sections) ? template.layout.sections : [],
        sectionOrder,
        sections,
        fieldKeys: [...bucket.fieldKeys],
        nativeFieldKeys: [...bucket.nativeFieldKeys],
        liquidRefs: [...bucket.liquidRefs],
        fieldRefs: bucket.fieldRefs,
        categoryIds: [...bucket.categoryIds],
        categoryRefs: bucket.categoryRefs,
        segmentIds: [...bucket.segmentIds],
        segmentRefs: bucket.segmentRefs,
        guestCategoriesUses,
        guestCampaignsUses: Array.isArray(template?.guest_campaigns_uses) ? template.guest_campaigns_uses : [],
        documentTemplateNames: Array.isArray(template?.document_templates_names) ? template.document_templates_names : [],
        accesspointTraits: Array.isArray(template?.accesspoints_traits) ? template.accesspoints_traits : [],
        missingCategoryIds: [...bucket.categoryIds].filter(function(id) { return !guestCategoryIds.has(id); }),
        missingSegmentIds: [...bucket.segmentIds].filter(function(id) { return !segmentIds.has(id); }),
        raw: template
      };
    }).filter(function(template) { return Boolean(template.id); });
  }

  function toDisplayLabel(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function normalizeRule(rule) {
    const scope = rule?.scope || "unknown";
    return {
      scope,
      segmentId: rule?.segment_id || null,
      columnsSetId: rule?.columns_set_id || null
    };
  }

  function normalizeNetworking(event, guestCategories, rawSegments) {
    if (!event || typeof event !== "object") return [];

    const categories = Array.isArray(guestCategories) ? guestCategories : [];
    const segments = Array.isArray(rawSegments) ? rawSegments : [];
    const populationTypes = new Set([
      ...Object.keys(event.networking_rules || {}),
      ...Object.keys(event.guest_view_rules || {}),
      ...(event.population_types || []),
      ...(event.matchmaking_population_types || [])
    ].filter(Boolean));
    const categoryBuckets = {};
    categories.forEach(function(category) {
      const populationType = category?.population_type || null;
      if (!populationType) return;
      if (!categoryBuckets[populationType]) categoryBuckets[populationType] = [];
      categoryBuckets[populationType].push({
        id: category.id || category._id,
        name: category.name || category.label || category._id,
        formId: category.registrationFormId || category.registration_form_id || null,
        defaultForPopulation: Boolean(category.defaultForPopulation || category.default_for_population)
      });
    });
    const segmentIds = new Set(segments.map(function(segment) { return segment?._id; }).filter(Boolean));

    return [...populationTypes]
      .sort(function(a, b) { return String(a).localeCompare(String(b), "fr"); })
      .map(function(populationType) {
        const networkingRules = event.networking_rules?.[populationType] || {};
        const guestViewRules = event.guest_view_rules?.[populationType] || {};
        const globalRule = normalizeRule(networkingRules.global);
        const meetingsRule = normalizeRule(networkingRules.meetings);
        const rules = {
          global: globalRule,
          meetings: meetingsRule
        };
        const usedSegmentIds = uniqueStrings([
          globalRule.segmentId,
          meetingsRule.segmentId
        ]);
        const missingSegmentIds = usedSegmentIds.filter(function(id) { return !segmentIds.has(id); });
        const views = Object.entries(guestViewRules).map(function(entry) {
          const target = entry[0];
          const normalized = normalizeRule(entry[1]);
          return {
            target,
            scope: normalized.scope,
            columnsSetId: normalized.columnsSetId
          };
        });

        return {
          id: populationType,
          label: toDisplayLabel(populationType),
          populationType,
          categories: categoryBuckets[populationType] || [],
          rules,
          views,
          usedSegmentIds,
          missingSegmentIds,
          inPopulationTypes: (event.population_types || []).includes(populationType),
          inMatchmakingPopulationTypes: (event.matchmaking_population_types || []).includes(populationType),
          meetingsEnabled: Boolean(event.networking_meetings_enabled),
          messagingEnabled: Boolean(event.networking_messaging_enabled),
          strictRulesEnabled: Boolean(event.strict_networking_rules_enabled)
        };
      });
  }

  function resolveAutomationHandlebarPath(path) {
    const normalized = String(path || "").trim();
    if (!normalized) return null;
    const parts = normalized.split(".").filter(Boolean);
    if (parts.length < 2) return null;
    const scope = parts[1];
    const sub = parts[2] || null;

    if (parts[0] === "credentials" || scope === "data") {
      return { kind: "step_output" };
    }

    if (scope === "guest_metadata_hash" && sub) {
      return { kind: "field", key: canonicalLiquidKey(sub) };
    }
    if (scope === "guest_category_id") {
      return { kind: "guest_category_ref" };
    }
    if (scope === "guest_category" && sub) {
      return { kind: "guest_category_prop", key: sub };
    }
    if (EVENTMAKER_NATIVE_FIELDS.has(scope) || EVENTMAKER_PLATFORM_FIELDS.has(scope)) {
      return { kind: "native", key: scope };
    }
    if (scope === "_id" || scope === "id") {
      return { kind: "native", key: "_id" };
    }
    return { kind: "field", key: canonicalLiquidKey(scope) };
  }

  function extractAutomationTemplateRefs(value) {
    const refs = [];
    const text = String(value || "");
    const regex = /{{\s*([^}]+)\s*}}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const resolved = resolveAutomationHandlebarPath(match[1]);
      if (resolved) refs.push(resolved);
    }
    return refs;
  }

  function pushDetailedAutomationRef(collection, payload) {
    if (!payload) return;
    const key = [
      payload.kind || "",
      payload.key || payload.id || payload.url || "",
      payload.context || ""
    ].join(":");
    if (collection.some(function(entry) {
      return [
        entry.kind || "",
        entry.key || entry.id || entry.url || "",
        entry.context || ""
      ].join(":") === key;
    })) return;
    collection.push(payload);
  }

  function collectAutomationRefsFromValue(value, bucket, keyHint, pathHint) {
    if (value == null || value === "") return;

    if (Array.isArray(value)) {
      value.forEach(function(entry, index) {
        collectAutomationRefsFromValue(entry, bucket, keyHint, `${pathHint || keyHint || "value"}[${index}]`);
      });
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(function(entry) {
        const childKey = entry[0];
        collectAutomationRefsFromValue(entry[1], bucket, childKey, pathHint ? `${pathHint}.${childKey}` : childKey);
      });
      return;
    }

    if (typeof value === "string") {
      const context = pathHint || keyHint || "value";
      if (keyHint === "segment_id") {
        bucket.segmentIds.add(value);
        pushDetailedAutomationRef(bucket.segmentRefs, { kind: "segment", id: value, context });
      }
      if (keyHint === "guest_category_id") {
        bucket.categoryIds.add(value);
        pushDetailedAutomationRef(bucket.categoryRefs, { kind: "guest_category", id: value, context });
      }
      if (keyHint === "email_template_id") bucket.emailTemplateIds.add(value);
      if (keyHint === "url" && /^https?:\/\//i.test(value)) {
        pushDetailedAutomationRef(bucket.externalEndpoints, { kind: "external_endpoint", url: value, context });
      }
      extractAutomationTemplateRefs(value).forEach(function(ref) {
        if (ref.kind === "field" && ref.key) {
          bucket.fieldKeys.add(ref.key);
          pushDetailedAutomationRef(bucket.fieldRefs, { kind: "field", key: ref.key, context });
        } else if (ref.kind === "native" && ref.key) {
          bucket.nativeFieldKeys.add(ref.key);
          pushDetailedAutomationRef(bucket.nativeFieldRefs, { kind: "native", key: ref.key, context });
        } else if (ref.kind === "guest_category_ref") {
          pushDetailedAutomationRef(bucket.categoryRefs, { kind: "guest_category_ref", context });
        } else if (ref.kind === "step_output") {
          pushDetailedAutomationRef(bucket.stepOutputRefs, { kind: "step_output", context });
        }
      });
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return;
    }
  }

  function collectAutomationRefsFromStep(step) {
    const bucket = {
      fieldKeys: new Set(),
      nativeFieldKeys: new Set(),
      categoryIds: new Set(),
      segmentIds: new Set(),
      emailTemplateIds: new Set(),
      fieldRefs: [],
      nativeFieldRefs: [],
      categoryRefs: [],
      segmentRefs: [],
      externalEndpoints: [],
      stepOutputRefs: []
    };

    const triggerSettings = step?.settings || {};
    const conditions = Array.isArray(step?.conditions) ? step.conditions : [];

    Object.entries(triggerSettings).forEach(function(entry) {
      const key = entry[0];
      const value = entry[1];
      if (key === "guest_category_ids" && Array.isArray(value)) {
        value.forEach(function(categoryId, index) {
          if (!categoryId) return;
          bucket.categoryIds.add(categoryId);
          pushDetailedAutomationRef(bucket.categoryRefs, { kind: "guest_category", id: categoryId, context: `settings.${key}[${index}]` });
        });
        return;
      }
      if (key === "segment_ids" && Array.isArray(value)) {
        value.forEach(function(segmentId, index) {
          if (!segmentId) return;
          bucket.segmentIds.add(segmentId);
          pushDetailedAutomationRef(bucket.segmentRefs, { kind: "segment", id: segmentId, context: `settings.${key}[${index}]` });
        });
        return;
      }
      collectAutomationRefsFromValue(value, bucket, key, `settings.${key}`);
    });

    conditions.forEach(function(group, groupIndex) {
      (Array.isArray(group) ? group : []).forEach(function(condition, conditionIndex) {
        if (!condition || typeof condition !== "object") return;
        if (condition.field) {
          extractAutomationTemplateRefs(condition.field).forEach(function(ref) {
            const context = `conditions[${groupIndex}][${conditionIndex}].field`;
            if (ref.kind === "field" && ref.key) {
              bucket.fieldKeys.add(ref.key);
              pushDetailedAutomationRef(bucket.fieldRefs, { kind: "field", key: ref.key, context });
            } else if (ref.kind === "native" && ref.key) {
              bucket.nativeFieldKeys.add(ref.key);
              pushDetailedAutomationRef(bucket.nativeFieldRefs, { kind: "native", key: ref.key, context });
            }
          });
        }
        if (condition.value) collectAutomationRefsFromValue(condition.value, bucket, "value", `conditions[${groupIndex}][${conditionIndex}].value`);
      });
    });

    return {
      fieldKeys: [...bucket.fieldKeys],
      nativeFieldKeys: [...bucket.nativeFieldKeys],
      categoryIds: [...bucket.categoryIds],
      segmentIds: [...bucket.segmentIds],
      emailTemplateIds: [...bucket.emailTemplateIds],
      fieldRefs: bucket.fieldRefs,
      nativeFieldRefs: bucket.nativeFieldRefs,
      categoryRefs: bucket.categoryRefs,
      segmentRefs: bucket.segmentRefs,
      externalEndpoints: bucket.externalEndpoints,
      stepOutputRefs: bucket.stepOutputRefs
    };
  }

  function normalizeAutomationStep(step, categoryById, index) {
    const refs = collectAutomationRefsFromStep(step);
    return {
      id: step?._id || null,
      index: Number.isFinite(index) ? index : null,
      type: step?.type || "unknown",
      strategy: step?.strategy || "unknown",
      label: humanizeAutomationStep(step, Number.isFinite(index) ? index : 0),
      nextStepId: step?.next_step_id || null,
      conditions: Array.isArray(step?.conditions) ? step.conditions : [],
      settings: step?.settings || {},
      sourcePath: Number.isFinite(index) ? `current_workflow_version.ordered_steps[${index}]` : null,
      fieldKeys: refs.fieldKeys,
      nativeFieldKeys: refs.nativeFieldKeys,
      fieldRefs: refs.fieldRefs,
      nativeFieldRefs: refs.nativeFieldRefs,
      categoryIds: refs.categoryIds,
      categoryRefs: refs.categoryRefs,
      segmentIds: refs.segmentIds,
      segmentRefs: refs.segmentRefs,
      emailTemplateIds: refs.emailTemplateIds,
      externalEndpoints: refs.externalEndpoints,
      stepOutputRefs: refs.stepOutputRefs,
      categories: refs.categoryIds.map(function(id) { return categoryById[id]; }).filter(Boolean)
    };
  }

  function normalizeAutomations(raw, guestCategories, rawSegments) {
    const workflows = Array.isArray(raw) ? raw : [];
    const categories = Array.isArray(guestCategories) ? guestCategories : [];
    const categoryById = Object.fromEntries(categories.map(function(category) {
      const categoryId = category.id || category._id;
      return [categoryId, {
        id: categoryId,
        name: category.name || category.label || category._id,
        registrationFormId: category.registrationFormId || category.registration_form_id || null,
        populationType: category.populationType || category.population_type || null
      }];
    }));
    const segmentIds = new Set((Array.isArray(rawSegments) ? rawSegments : []).map(function(segment) {
      return segment?._id;
    }).filter(Boolean));

    return workflows.map(function(workflow) {
      const currentVersion = workflow?.current_workflow_version
        || workflow?.currentWorkflowVersion
        || workflow?.online_version
        || workflow?.draft_version
        || workflow?.onlineVersion
        || workflow?.draftVersion
        || workflow?.workflow_version
        || workflow?.workflowVersion
        || workflow?.workflow_versions?.[0]
        || workflow?.workflowVersions?.[0]
        || workflow?.workflow?.current_workflow_version
        || null;
      const orderedSteps = Array.isArray(currentVersion?.ordered_steps)
        ? currentVersion.ordered_steps
        : Array.isArray(currentVersion?.orderedSteps)
          ? currentVersion.orderedSteps
          : Array.isArray(currentVersion?.steps)
            ? currentVersion.steps
          : Array.isArray(workflow?.ordered_steps)
            ? workflow.ordered_steps
            : Array.isArray(workflow?.orderedSteps)
              ? workflow.orderedSteps
              : Array.isArray(workflow?.steps)
                ? workflow.steps
              : [];
      const steps = orderedSteps.map(function(step, index) {
        return normalizeAutomationStep(step, categoryById, index);
      });
      const fieldKeys = uniqueStrings(steps.flatMap(function(step) { return step.fieldKeys; }));
      const nativeFieldKeys = uniqueStrings(steps.flatMap(function(step) { return step.nativeFieldKeys; }));
      const categoryIds = uniqueStrings(steps.flatMap(function(step) { return step.categoryIds; }));
      const segmentRefs = uniqueStrings(steps.flatMap(function(step) { return step.segmentIds; }));
      const emailTemplateIds = uniqueStrings(steps.flatMap(function(step) { return step.emailTemplateIds; }));

      return {
        id: workflow._id,
        label: workflow.name || workflow._id,
        enabled: Boolean(workflow.enabled),
        triggerEvent: workflow.trigger_event || null,
        runsCount: workflow.runs_count || 0,
        versionNumber: workflow.version_number || currentVersion?.version_number || null,
        createdAt: workflow.created_at || null,
        updatedAt: workflow.updated_at || null,
        onlineVersionId: workflow.online_version_id || null,
        userIdentity: currentVersion?.user_identity || null,
        currentVersionId: currentVersion?._id || null,
        hasCurrentVersion: Boolean(currentVersion),
        rawWorkflowKeys: Object.keys(workflow || {}),
        rawVersionKeys: currentVersion && typeof currentVersion === "object" ? Object.keys(currentVersion) : [],
        steps,
        fieldKeys,
        nativeFieldKeys,
        categoryIds,
        segmentIds: segmentRefs,
        emailTemplateIds,
        categories: categoryIds.map(function(id) { return categoryById[id]; }).filter(Boolean),
        missingFieldKeys: fieldKeys.filter(function(key) { return !EVENTMAKER_NATIVE_FIELDS.has(key) && !EVENTMAKER_PLATFORM_FIELDS.has(key); }),
        missingCategoryIds: categoryIds.filter(function(id) { return !categoryById[id]; }),
        missingSegmentIds: segmentRefs.filter(function(id) { return !segmentIds.has(id); })
      };
    });
  }

  function uniqueStrings(values) {
    return [...new Set((values || []).filter(Boolean).map(String))];
  }

  function extractSegmentIds(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return uniqueStrings(value.flatMap((item) => {
        if (typeof item === "string") return [item];
        if (item && typeof item === "object") return extractSegmentIds(item.segment_id || item.id || item._id || item);
        return [];
      }));
    }
    if (typeof value === "string") return [value];
    if (typeof value === "object") return extractSegmentIds(value.segment_id || value.id || value._id);
    return [];
  }

  function normalizeWebsitePagePath(rawPath) {
    if (!rawPath) return null;
    return String(rawPath).replace(/^\/+/, "").replace(/\/__id__.*$/, "").replace(/\/+$/, "") || null;
  }

  function extractWebsiteSettingsDependencies(settings) {
    const segmentIds = new Set();
    const fieldKeys = new Set();
    const fieldIds = new Set();
    const guestCategoryIds = new Set();
    const pagePaths = new Set();

    function walk(value, key) {
      if (value == null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, key));
        return;
      }
      if (typeof value === "object") {
        Object.entries(value).forEach(([childKey, childValue]) => walk(childValue, childKey));
        return;
      }
      if (!["string", "number", "boolean"].includes(typeof value)) return;

      if (typeof value === "string") {
        const extractedRefs = extractRefs(value);
        [...extractedRefs.fields, ...extractedRefs.nativeRefs].forEach((fieldKey) => {
          fieldKeys.add(normalizeWebsiteFieldKey(fieldKey));
        });
      }

      if (key === "segment_id" || key === "segments") {
        extractSegmentIds(value).forEach((id) => segmentIds.add(id));
      } else if (key === "guest_category_id" && value) {
        guestCategoryIds.add(String(value));
      } else if (key === "liquid_field" && value) {
        fieldIds.add(String(value));
      } else if (key === "link_from_guest_field" && value) {
        fieldKeys.add(normalizeWebsiteFieldKey(String(value)));
      } else if (/(?:page_path|page_url)$/i.test(key) && value) {
        const path = normalizeWebsitePagePath(value);
        if (path) pagePaths.add(path);
      }
    }

    walk(settings || {}, "");
    return {
      segmentIds: [...segmentIds],
      fieldKeys: [...fieldKeys],
      fieldIds: [...fieldIds],
      guestCategoryIds: [...guestCategoryIds],
      pagePaths: [...pagePaths]
    };
  }

  function normalizeWebsiteFieldKey(key) {
    const raw = String(key || "").trim();
    return raw;
  }

  function inferWebsiteSectionTitle(sectionId, section, sectionSchema) {
    const settings = section.settings || {};
    return settings.title
      || settings.heading
      || settings.button_label
      || sectionSchema.name_translations?.fr
      || sectionSchema.name
      || section.type
      || sectionId;
  }

  function normalizeWebsiteSection(sectionId, section, guestCategoryById, sectionTypesByFilename) {
    const sectionType = section?.type || null;
    const sectionSchema = sectionType ? (sectionTypesByFilename[sectionType] || {}) : {};
    if (!section) {
      return {
        id: sectionId,
        type: "section_unknown",
        title: sectionId,
        settings: {},
        blocks: [],
        blockCount: 0,
        segmentIds: [],
        guestCategoryIds: [],
        guestCategories: [],
        fieldKeys: [],
        fieldIds: [],
        pagePaths: [],
        conditionalDisplay: false,
        isPrivate: false,
        publicOnly: false
      };
    }

    const settings = section.settings || {};
    const deps = extractWebsiteSettingsDependencies(settings);
    const blockEntries = section.blocks || {};
    const blocksOrder = Array.isArray(section.blocks_order) && section.blocks_order.length > 0
      ? section.blocks_order
      : Object.keys(blockEntries);

    const blocks = blocksOrder
      .map((blockId) => [blockId, blockEntries[blockId]])
      .filter(([, block]) => Boolean(block))
      .map(([blockId, block]) => {
        const blockSettings = block.settings || {};
        const blockDeps = extractWebsiteSettingsDependencies(blockSettings);
        return {
          id: blockId,
          type: block.type || "block",
          title: blockSettings.title || blockSettings.button_label || blockSettings.column_label || blockId,
          settings: blockSettings,
          segmentIds: blockDeps.segmentIds,
          guestCategoryIds: blockDeps.guestCategoryIds,
          fieldKeys: blockDeps.fieldKeys,
          fieldIds: blockDeps.fieldIds,
          pagePaths: blockDeps.pagePaths,
          conditionalDisplay: Boolean(blockSettings.conditional_display),
          isPrivate: Boolean(blockSettings.private),
          publicOnly: Boolean(blockSettings.public_only)
        };
      });

    const segmentIds = new Set(deps.segmentIds);
    const guestCategoryIds = new Set(deps.guestCategoryIds);
    const fieldKeys = new Set(deps.fieldKeys);
    const fieldIds = new Set(deps.fieldIds);
    const pagePaths = new Set(deps.pagePaths);
    blocks.forEach((block) => {
      block.segmentIds.forEach((id) => segmentIds.add(id));
      block.guestCategoryIds.forEach((id) => guestCategoryIds.add(id));
      block.fieldKeys.forEach((key) => fieldKeys.add(key));
      block.fieldIds.forEach((id) => fieldIds.add(id));
      block.pagePaths.forEach((path) => pagePaths.add(path));
    });

    return {
      id: sectionId,
      type: section.type || "section",
      title: inferWebsiteSectionTitle(sectionId, section, sectionSchema),
      settings,
      blocks,
      blockCount: blocks.length,
      segmentIds: [...segmentIds],
      guestCategoryIds: [...guestCategoryIds],
      guestCategories: [...guestCategoryIds].map((id) => guestCategoryById[id]).filter(Boolean),
      fieldKeys: [...fieldKeys],
      fieldIds: [...fieldIds],
      pagePaths: [...pagePaths],
      conditionalDisplay: Boolean(settings.conditional_display),
      isPrivate: Boolean(settings.private),
      publicOnly: Boolean(settings.public_only)
    };
  }

  function cloneSectionWithMatch(section, inferredMode, inferredReason) {
    return {
      ...section,
      blocks: section.blocks.map((block) => ({ ...block })),
      inferredMode,
      inferredReason
    };
  }

  function toWebsiteSettingsPageKey(pathName) {
    if (!pathName) return null;
    return String(pathName)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .split("/")
      .map((part) => part.replace(/-/g, "_"))
      .join("/");
  }

  function resolveWebsitePageSectionIds(pathName, runtimePage, pageSettings, presetPageDefs) {
    const candidates = uniqueStrings([
      runtimePage?.filename,
      runtimePage?.path_name,
      pathName,
      toWebsiteSettingsPageKey(pathName)
    ]);

    for (const key of candidates) {
      const value = pageSettings?.[key];
      if (Array.isArray(value) && value.length > 0) {
        return { sectionIds: uniqueStrings(value), source: "settings_data_page", key };
      }
    }

    const presetSections = presetPageDefs?.[pathName];
    if (Array.isArray(presetSections) && presetSections.length > 0) {
      return { sectionIds: uniqueStrings(presetSections), source: "page_definition", key: pathName };
    }

    return { sectionIds: [], source: null, key: null };
  }

  function inferSectionsForPage(pathName, allSectionsById) {
    const inferred = [];
    const registrationMatch = pathName.match(/^registration\/([^/]+)(?:\/confirmation)?$/);
    const isConfirmationPage = /\/confirmation$/.test(pathName);

    Object.values(allSectionsById).forEach((section) => {
      if (!section || section.id === "dynamic_content_for_page") return;
      if (!registrationMatch) return;

      const guestCategoryId = registrationMatch[1];
      if (!section.guestCategoryIds.includes(guestCategoryId)) return;

      if (!isConfirmationPage && section.type === "form-builder") {
        inferred.push(cloneSectionWithMatch(section, "inferred", "guest_category_registration"));
        return;
      }

      if (isConfirmationPage) {
        const looksLikeConfirmationSection =
          section.type !== "form-builder"
          || section.id.includes(guestCategoryId)
          || Boolean(section.settings.confirmation_page_known_visitors)
          || String(section.settings.button_label_confirmation_page_known_visitors || "").trim() !== "";
        if (looksLikeConfirmationSection) inferred.push(cloneSectionWithMatch(section, "inferred", "guest_category_confirmation"));
      }
    });

    return inferred;
  }

  function normalizePages(raw, rawPages, annotations, sectionTypesByFilename) {
    if (!raw || typeof raw !== "object") return [];

    const annById = Object.fromEntries((annotations || []).map((annotation) => [annotation.id || annotation._id, annotation]));
    const activePresetName = raw.presets_name || "default";
    const presetRoot = raw.settings_presets?.[activePresetName]?.default || raw.settings_presets?.default?.default || {};
    const pageDefs = presetRoot.pages || {};
    const menus = Array.isArray(presetRoot.menus) ? presetRoot.menus : [];
    const pageSettings = raw.settings_data?.pages || {};
    const sectionsCatalog = { ...(presetRoot.sections || {}), ...(raw.settings_data?.sections || {}) };
    const guestCategoryById = Object.fromEntries((raw.guest_categories || []).map((category) => [category._id, category]));
    const runtimePagesByPath = Object.fromEntries((rawPages || []).filter((page) => page?.path_name).map((page) => [page.path_name, page]));
    const allPathNames = uniqueStrings([
      ...Object.keys(pageDefs || {}),
      ...(rawPages || []).map((page) => page?.path_name).filter(Boolean)
    ]);
    const menuLabelByPage = {};
    const allSectionsById = Object.fromEntries(
      Object.entries(sectionsCatalog).map(([sectionId, section]) => [
        sectionId,
        normalizeWebsiteSection(sectionId, section, guestCategoryById, sectionTypesByFilename || {})
      ])
    );

    menus.forEach((menu) => {
      (menu.menu_items_attributes || []).forEach((item) => {
        if (item.type !== "website_page" || !item.page_path_name || menuLabelByPage[item.page_path_name]) return;
        menuLabelByPage[item.page_path_name] = item.name || item.page_path_name;
      });
    });

    const pages = allPathNames.map((pathName) => {
      const runtimePage = runtimePagesByPath[pathName] || null;
      const ann = annById[pathName] || {};
      const runtimeSectionIds = uniqueStrings([...(runtimePage?.layout?.sections || []), ...(runtimePage?.sections || [])])
        .filter((sectionId) => sectionId !== "dynamic_content_for_page");
      const mappedSections = resolveWebsitePageSectionIds(pathName, runtimePage, pageSettings, pageDefs);
      const explicitSections = uniqueStrings([...mappedSections.sectionIds, ...runtimeSectionIds])
        .map((sectionId) => allSectionsById[sectionId]
          ? cloneSectionWithMatch(
              allSectionsById[sectionId],
              "explicit",
              mappedSections.sectionIds.includes(sectionId) ? mappedSections.source : "runtime_page"
            )
          : null)
        .filter(Boolean);
      const inferredSections = inferSectionsForPage(pathName, allSectionsById);
      const sections = [];
      const seenSectionIds = new Set();
      [...explicitSections, ...inferredSections].forEach((section) => {
        if (!section || seenSectionIds.has(section.id)) return;
        seenSectionIds.add(section.id);
        sections.push(section);
      });

      const segmentIds = new Set([
        ...extractSegmentIds(runtimePage?.segments || []),
        ...extractSegmentIds(runtimePage?.guests_segments || [])
      ]);
      const fieldKeys = new Set();
      const fieldIds = new Set();
      const guestCategoryIds = new Set();
      const linkedPagePaths = new Set();
      let conditionalSectionsCount = 0;
      let conditionalBlocksCount = 0;

      sections.forEach((section) => {
        section.segmentIds.forEach((id) => segmentIds.add(id));
        section.fieldKeys.forEach((key) => fieldKeys.add(key));
        section.fieldIds.forEach((id) => fieldIds.add(id));
        section.guestCategoryIds.forEach((id) => guestCategoryIds.add(id));
        section.pagePaths.forEach((linkedPath) => {
          if (linkedPath !== pathName) linkedPagePaths.add(linkedPath);
        });
        if (section.conditionalDisplay || section.isPrivate || section.publicOnly) conditionalSectionsCount += 1;
        section.blocks.forEach((block) => {
          if (block.conditionalDisplay || block.isPrivate || block.publicOnly || block.segmentIds.length > 0) conditionalBlocksCount += 1;
        });
      });

      return {
        id: runtimePage?._id || pathName,
        runtimeId: runtimePage?._id || null,
        label: runtimePage?.name || menuLabelByPage[pathName] || pathName,
        pathName,
        fileName: runtimePage?.filename || null,
        isHomepage: runtimePage ? Boolean(runtimePage.is_homepage) : pathName === "index",
        isPrivate: runtimePage ? Boolean(runtimePage.is_private) : (sections.length > 0 && sections.every((section) => section.isPrivate)),
        publicOnly: runtimePage ? Boolean(runtimePage.public_only) : sections.some((section) => section.publicOnly),
        online: runtimePage ? Boolean(runtimePage.online) : true,
        seoIndex: runtimePage ? Boolean(runtimePage.seo_index) : Boolean(raw.seo_enabled),
        sections,
        segmentIds: [...segmentIds],
        fieldKeys: [...fieldKeys],
        fieldIds: [...fieldIds],
        guestCategoryIds: [...guestCategoryIds],
        guestCategories: [...guestCategoryIds].map((id) => guestCategoryById[id]).filter(Boolean),
        linkedPagePaths: [...linkedPagePaths],
        sectionCount: sections.length,
        blockCount: sections.reduce((sum, section) => sum + section.blockCount, 0),
        conditionalSectionsCount,
        conditionalBlocksCount,
        source: runtimePage && pageDefs[pathName] ? "website_preset+runtime" : (runtimePage ? "website_pages_runtime" : "website_preset"),
        createdAt: runtimePage?.created_at || raw.created_at || null,
        updatedAt: runtimePage?.updated_at || raw.updated_at || null,
        status: ann.status || null,
        owner: ann.owner || null,
        notes: ann.notes || null
      };
    });

    return pages;
  }

  function stripSurroundingQuotes(value) {
    if (!value) return "";
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
    return value;
  }

  function normalizeSegmentValue(value) {
    return stripSurroundingQuotes((value || "").trim()).toLowerCase();
  }

  function splitSegmentValues(rawValue) {
    const values = [];
    let current = "";
    let inQuote = false;
    for (const char of rawValue || "") {
      if (char === '"') {
        inQuote = !inQuote;
        current += char;
      } else if (char === "," && !inQuote) {
        if (current.trim()) values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) values.push(current.trim());
    return values;
  }

  function parseSegmentQuery(query) {
    const refs = [];
    if (!query || !query.trim()) return refs;
    const tokens = [];
    let current = "";
    let inQuote = false;
    for (const char of query) {
      if (char === '"') {
        inQuote = !inQuote;
        current += char;
      } else if (char === " " && !inQuote) {
        if (current) tokens.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    if (current) tokens.push(current);

    tokens.forEach((token) => {
      const negated = token.startsWith("-");
      const raw = negated ? token.slice(1) : token;
      const colonIndex = raw.indexOf(":");
      if (colonIndex === -1) return;
      const key = raw.slice(0, colonIndex);
      const rawValue = raw.slice(colonIndex + 1);
      const values = splitSegmentValues(rawValue);
      if (key === "no") {
        if (rawValue) refs.push({ key: rawValue, negated: false, empty: true, values: [], rawValue });
      } else if (!SEGMENT_NATIVE_OPERATORS.has(key)) {
        refs.push({
          key,
          negated,
          empty: false,
          rawValue,
          values,
          normalizedValues: values.map(normalizeSegmentValue).filter(Boolean)
        });
      }
    });

    return refs;
  }

  function extractRefs(code) {
    const result = {
      fields: new Set(),
      eventMetas: new Set(),
      nativeRefs: new Set(),
      liquidRefs: new Set(),
      categoryRefs: new Set(),
      relationalRefs: [],
      relationalOps: new Set(),
      warnings: []
    };

    function addFieldLikeRef(key) {
      if (!key) return;
      const canonicalKey = canonicalLiquidKey(key);
      const liquidMeta = getLiquidSymbolMeta(canonicalKey) || getLiquidSymbolMeta(key);
      if (liquidMeta) {
        result.liquidRefs.add(key);
        if (liquidMeta.kind === "field_alias" && liquidMeta.target) {
          addFieldLikeRef(liquidMeta.target);
        }
        return;
      }
      if (EVENTMAKER_NATIVE_FIELDS.has(canonicalKey) || EVENTMAKER_PLATFORM_FIELDS.has(canonicalKey)) result.nativeRefs.add(canonicalKey);
      else result.fields.add(canonicalKey);
    }

    let match;
    const doubleDot = /guest\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = doubleDot.exec(code)) !== null) {
      result.warnings.push({ type: "double_dot", match: match[0], target: match[1] });
    }

    const relationalGuestMetadata = /guest\.(person_parent|personParent|main_exhibitor|mainExhibitor)\.(guest_metadata|guestMetadata)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = relationalGuestMetadata.exec(code)) !== null) {
      const op = canonicalLiquidKey(match[1]);
      const field = canonicalLiquidKey(match[3]);
      result.relationalRefs.push({ op, field: `guest_metadata.${field}` });
      result.fields.add(field);
    }

    const relationalCategoryTraits = /guest\.(person_parent|personParent|main_exhibitor|mainExhibitor)\.(guest_category|guestCategory|guest_cateogry)\.traits\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = relationalCategoryTraits.exec(code)) !== null) {
      const op = canonicalLiquidKey(match[1]);
      const categoryKey = canonicalLiquidKey(match[2]);
      result.relationalRefs.push({ op, field: `${categoryKey}.traits.${match[3]}` });
      result.categoryRefs.add(`guest_category.traits.${match[3]}`);
    }

    const relationalCategory = /guest\.(person_parent|personParent|main_exhibitor|mainExhibitor)\.(guest_category|guestCategory|guest_cateogry)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/g;
    while ((match = relationalCategory.exec(code)) !== null) {
      const op = canonicalLiquidKey(match[1]);
      const categoryKey = canonicalLiquidKey(match[2]);
      const sub = canonicalLiquidKey(match[3]);
      result.relationalRefs.push({ op, field: sub ? `${categoryKey}.${sub}` : categoryKey });
      if (!sub || sub !== "traits") result.categoryRefs.add(sub ? `guest_category.${sub}` : "guest_category");
    }

    const relationalDirect = /guest\.(person_parent|personParent|main_exhibitor|mainExhibitor)\.([a-zA-Z_][a-zA-Z0-9_]*)(?=$|[^a-zA-Z0-9_.])/g;
    while ((match = relationalDirect.exec(code)) !== null) {
      const op = canonicalLiquidKey(match[1]);
      const field = canonicalLiquidKey(match[2]);
      if (field === "guest_metadata" || field === "guest_category" || field === "guest_cateogry" || field === "event") continue;
      result.relationalRefs.push({ op, field });
      addFieldLikeRef(field);
    }

    const categoryTraits = /guest\.(guest_category|guestCategory|guest_cateogry)\.traits\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = categoryTraits.exec(code)) !== null) {
      result.categoryRefs.add(`guest_category.traits.${match[2]}`);
    }

    const normal = /guest\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/g;
    while ((match = normal.exec(code)) !== null) {
      const key = canonicalLiquidKey(match[1]);
      const sub = canonicalLiquidKey(match[2]);
      if (key === "event") {
        if (sub) result.eventMetas.add(`event.${sub}`);
      } else if (key === "guest_category" || key === "guest_cateogry") {
        if (!sub || sub !== "traits") result.categoryRefs.add(sub ? `guest_category.${sub}` : "guest_category");
      } else if (key === "guest_metadata") {
        if (sub) addFieldLikeRef(sub);
      } else if (EVENTMAKER_RELATIONAL_OPERATORS.includes(key)) {
        if (sub) result.relationalRefs.push({ op: key, field: sub });
        else result.relationalOps.add(key);
      } else {
        addFieldLikeRef(key);
      }
    }

    return result;
  }

  function buildIndexes(atlas) {
    atlas.guestCategoriesById = Object.fromEntries((atlas.guestCategories || []).map(function(category) {
      return [category.id, category];
    }));
    atlas.fieldsByKey = {};
    atlas.fieldsById = {};
    atlas.segmentsById = {};
    atlas.formsById = {};
    atlas.emailTemplatesById = {};
    atlas.pagesById = {};
    atlas.pagesBySegmentId = {};
    atlas.pagesByFormId = {};
    atlas.automationsById = {};
    atlas.relations = [];
    atlas.relationsByEntity = {};

    atlas.fields.forEach((field) => {
      atlas.fieldsByKey[field.key] = field;
      if (field._id) atlas.fieldsById[field._id] = field;
      field.referencedBy = [];
    });
    atlas.segments.forEach((segment) => {
      atlas.segmentsById[segment.id] = segment;
    });
    atlas.forms.forEach((form) => {
      atlas.formsById[form.id] = form;
    });
    atlas.emailTemplates.forEach((emailTemplate) => {
      atlas.emailTemplatesById[emailTemplate.id] = emailTemplate;
    });
    atlas.pages.forEach((page) => {
      atlas.pagesById[page.id] = page;
      if (page.pathName) atlas.pagesById[page.pathName] = page;
      if (page.runtimeId) atlas.pagesById[page.runtimeId] = page;
      page.segmentIds.forEach((segmentId) => {
        if (!atlas.pagesBySegmentId[segmentId]) atlas.pagesBySegmentId[segmentId] = [];
        atlas.pagesBySegmentId[segmentId].push(page);
      });
      page.guestCategories.forEach((category) => {
        const formId = category?.registration_form_id || category?.registrationFormId;
        if (!formId) return;
        if (!atlas.pagesByFormId[formId]) atlas.pagesByFormId[formId] = [];
        atlas.pagesByFormId[formId].push(page);
      });
    });
    atlas.automations.forEach((automation) => {
      atlas.automationsById[automation.id] = automation;
    });
  }

  function getHierarchicalBaseKey(key) {
    if (!key) return null;
    const match = key.match(/^(.*)_level_(\d+)$/);
    return match ? (match[1] || null) : null;
  }

  function resolveFieldKeyAlias(atlas, key) {
    if (!key) return null;
    if (atlas.fieldsByKey[key]) return key;
    const baseKey = getHierarchicalBaseKey(key);
    if (!baseKey || !atlas.fieldsByKey[baseKey]) return key;
    return baseKey;
  }

  function computeReverseReferences(atlas) {
    atlas.fields.forEach((field) => {
      field.referencedBy = [];
    });

    atlas.fields.forEach((field) => {
      const inbound = getEntityRelations(atlas, "field", field.key, { direction: "in" });
      inbound.forEach((relation) => {
        if (relation.targetType === "field") {
          const sourceField = atlas.fieldsByKey[relation.targetId];
          if (!sourceField || sourceField.key === field.key) return;
          field.referencedBy.push({
            from: relation.type === "field_hierarchy" ? "field_child" : "field",
            key: sourceField.key,
            label: sourceField.label,
            context: relation.context || null
          });
          return;
        }
        if (relation.targetType === "segment") {
          const segment = atlas.segmentsById[relation.targetId];
          if (!segment) return;
          field.referencedBy.push({ from: "segment", key: segment.id, label: segment.label, context: relation.context || null });
          return;
        }
        if (relation.targetType === "form") {
          const form = atlas.formsById[relation.targetId];
          if (!form) return;
          field.referencedBy.push({
            from: relation.type === "form_field_condition" ? "form_condition" : "form",
            key: form.id,
            label: form.title,
            context: relation.context || null
          });
          return;
        }
        if (relation.targetType === "page") {
          const page = atlas.pagesById[relation.targetId];
          if (!page) return;
          field.referencedBy.push({ from: "page", key: page.id, label: page.label, context: relation.context || null });
          return;
        }
        if (relation.targetType === "email_template") {
          const emailTemplate = atlas.emailTemplatesById[relation.targetId];
          if (!emailTemplate) return;
          field.referencedBy.push({
            from: "email",
            key: emailTemplate.id,
            label: emailTemplate.label,
            context: relation.context || null
          });
          return;
        }
        if (relation.targetType === "automation_step") {
          const automation = atlas.automationsById[relation.sourceObjectId || relation.targetId];
          if (!automation) return;
          field.referencedBy.push({
            from: "automation",
            key: automation.id,
            label: automation.label,
            context: relation.context || null,
            stepId: relation.targetId,
            stepPath: relation.sourcePath || null
          });
        }
      });
    });
  }

  function entityKey(type, id) {
    return `${type}:${id}`;
  }

  function addEntityRelation(atlas, fromType, fromId, toType, toId, relationType, options) {
    if (!fromId || !toId) return;
    const meta = typeof options === "string" || options == null
      ? { context: options || null }
      : options;
    const fromKey = entityKey(fromType, fromId);
    const toKey = entityKey(toType, toId);
    if (!atlas.relationsByEntity[fromKey]) atlas.relationsByEntity[fromKey] = [];
    if (!atlas.relationsByEntity[toKey]) atlas.relationsByEntity[toKey] = [];
    atlas.relations.push({
      fromType,
      fromId,
      toType,
      toId,
      relationType,
      context: meta.context || null,
      sourceObjectId: meta.sourceObjectId || null,
      sourcePath: meta.sourcePath || null,
      confidence: meta.confidence || "high"
    });

    atlas.relationsByEntity[fromKey].push({
      direction: "out",
      type: relationType,
      targetType: toType,
      targetId: toId,
      context: meta.context || null,
      sourceObjectId: meta.sourceObjectId || null,
      sourcePath: meta.sourcePath || null,
      confidence: meta.confidence || "high"
    });
    atlas.relationsByEntity[toKey].push({
      direction: "in",
      type: relationType,
      targetType: fromType,
      targetId: fromId,
      context: meta.context || null,
      sourceObjectId: meta.sourceObjectId || null,
      sourcePath: meta.sourcePath || null,
      confidence: meta.confidence || "high"
    });
  }

  function buildEntityRelations(atlas) {
    atlas.relations = [];
    atlas.relationsByEntity = {};
    atlas.fields.forEach((field) => {
      if (field.extracted) {
        field.extracted.fields.forEach((targetKey) => {
          const resolvedKey = resolveFieldKeyAlias(atlas, targetKey);
          if (resolvedKey && atlas.fieldsByKey[resolvedKey] && resolvedKey !== field.key) {
            addEntityRelation(atlas, "field", field.key, "field", resolvedKey, "calculated_field_read", {
              context: "Liquid",
              sourceObjectId: field.key,
              sourcePath: "code"
            });
          }
        });
      }
      if (field.parentFieldId && atlas.fieldsById[field.parentFieldId]) {
        addEntityRelation(atlas, "field", field.key, "field", atlas.fieldsById[field.parentFieldId].key, "field_hierarchy", {
          context: "Hiérarchie",
          sourceObjectId: field.key,
          sourcePath: "parentFieldId"
        });
      }
    });

    atlas.segments.forEach((segment) => {
      if (segment.isDeleted) return;
      const seen = new Set();
      segment.parsedRefs.forEach((ref) => {
        const resolvedKey = resolveFieldKeyAlias(atlas, ref.key);
        if (!resolvedKey || seen.has(resolvedKey) || !atlas.fieldsByKey[resolvedKey]) return;
        seen.add(resolvedKey);
        addEntityRelation(atlas, "segment", segment.id, "field", resolvedKey, "segment_field", {
          context: "search_query",
          sourceObjectId: segment.id,
          sourcePath: "search_query"
        });
      });
    });

    atlas.forms.forEach((form) => {
      const seenWrites = new Set();
      form.fieldWrites.forEach((key) => {
        const resolvedKey = resolveFieldKeyAlias(atlas, key);
        if (!resolvedKey || seenWrites.has(resolvedKey) || !atlas.fieldsByKey[resolvedKey]) return;
        seenWrites.add(resolvedKey);
        addEntityRelation(atlas, "form", form.id, "field", resolvedKey, "form_field_write", {
          context: "Écriture formulaire",
          sourceObjectId: form.id
        });
      });

      const seenConditions = new Set();
      form.fieldConditions.forEach((key) => {
        const resolvedKey = resolveFieldKeyAlias(atlas, key);
        if (!resolvedKey || seenConditions.has(resolvedKey) || !atlas.fieldsByKey[resolvedKey]) return;
        seenConditions.add(resolvedKey);
        addEntityRelation(atlas, "form", form.id, "field", resolvedKey, "form_field_condition", {
          context: "Condition formulaire",
          sourceObjectId: form.id
        });
      });
    });

    atlas.emailTemplates.forEach(function(emailTemplate) {
      const seenFields = new Set();
      emailTemplate.fieldKeys.forEach(function(fieldKey) {
        const resolvedKey = resolveFieldKeyAlias(atlas, fieldKey);
        if (!resolvedKey || seenFields.has(resolvedKey) || !atlas.fieldsByKey[resolvedKey]) return;
        seenFields.add(resolvedKey);
        addEntityRelation(atlas, "email_template", emailTemplate.id, "field", resolvedKey, "email_template_field", {
          context: "settings_data",
          sourceObjectId: emailTemplate.id
        });
      });

      const seenCategories = new Set();
      emailTemplate.categoryIds.forEach(function(categoryId) {
        if (!categoryId || seenCategories.has(categoryId) || !atlas.guestCategoriesById[categoryId]) return;
        seenCategories.add(categoryId);
        addEntityRelation(atlas, "email_template", emailTemplate.id, "guest_category", categoryId, "email_template_guest_category", {
          context: "settings_data",
          sourceObjectId: emailTemplate.id
        });
      });

      const seenSegments = new Set();
      emailTemplate.segmentIds.forEach(function(segmentId) {
        if (!segmentId || seenSegments.has(segmentId) || !atlas.segmentsById[segmentId]) return;
        seenSegments.add(segmentId);
        addEntityRelation(atlas, "email_template", emailTemplate.id, "segment", segmentId, "email_template_segment", {
          context: "settings_data",
          sourceObjectId: emailTemplate.id
        });
      });
    });

    atlas.pages.forEach((page) => {
      const pageId = page.id;
      page.sections.forEach((section) => {
        const sectionContext = `section:${section.title}`;
        section.segmentIds.forEach((segmentId) => addEntityRelation(atlas, "page", pageId, "segment", segmentId, "website_segment", sectionContext));
        section.fieldKeys.forEach((fieldKey) => {
          const resolvedKey = resolveFieldKeyAlias(atlas, fieldKey);
          if (resolvedKey) addEntityRelation(atlas, "page", pageId, "field", resolvedKey, "website_field", sectionContext);
        });
        section.fieldIds.forEach((fieldId) => {
          const fieldKey = atlas.fieldsById[fieldId]?.key;
          if (fieldKey) addEntityRelation(atlas, "page", pageId, "field", resolveFieldKeyAlias(atlas, fieldKey), "website_field", sectionContext);
        });
        section.pagePaths.forEach((path) => {
          const linkedPage = atlas.pagesById[path];
          if (linkedPage && linkedPage.id !== pageId) addEntityRelation(atlas, "page", pageId, "page", linkedPage.id, "website_page_link", sectionContext);
        });

        section.blocks.forEach((block) => {
          const blockContext = `section:${section.title} / bloc:${block.title}`;
          block.segmentIds.forEach((segmentId) => addEntityRelation(atlas, "page", pageId, "segment", segmentId, "website_segment", blockContext));
          block.fieldKeys.forEach((fieldKey) => {
            const resolvedKey = resolveFieldKeyAlias(atlas, fieldKey);
            if (resolvedKey) addEntityRelation(atlas, "page", pageId, "field", resolvedKey, "website_field", blockContext);
          });
          block.fieldIds.forEach((fieldId) => {
            const fieldKey = atlas.fieldsById[fieldId]?.key;
            if (fieldKey) addEntityRelation(atlas, "page", pageId, "field", resolveFieldKeyAlias(atlas, fieldKey), "website_field", blockContext);
          });
          block.pagePaths.forEach((path) => {
            const linkedPage = atlas.pagesById[path];
            if (linkedPage && linkedPage.id !== pageId) addEntityRelation(atlas, "page", pageId, "page", linkedPage.id, "website_page_link", blockContext);
          });
        });
      });

      page.guestCategories.forEach((category) => {
        const categoryId = category?._id || category?.id;
        if (categoryId && atlas.guestCategoriesById[categoryId]) {
          addEntityRelation(atlas, "page", pageId, "guest_category", categoryId, "website_guest_category", {
            context: `guest_category:${category.name || category.label || categoryId}`,
            sourceObjectId: pageId
          });
        }
        const formId = category?.registration_form_id || category?.registrationFormId;
        if (!formId || !atlas.formsById[formId]) return;
        addEntityRelation(atlas, "page", pageId, "form", formId, "website_form", `guest_category:${category.name || category.label || categoryId}`);
      });
    });

    atlas.guestCategories.forEach((category) => {
      if (category.registrationFormId && atlas.formsById[category.registrationFormId]) {
        addEntityRelation(atlas, "guest_category", category.id, "form", category.registrationFormId, "category_form", {
          context: "Formulaire principal",
          sourceObjectId: category.id
        });
      }
    });

    atlas.networking.forEach(function(ruleSet) {
      ruleSet.usedSegmentIds.forEach(function(segmentId) {
        addEntityRelation(atlas, "networking", ruleSet.id, "segment", segmentId, "networking_segment", "networking_rule");
      });
      ruleSet.categories.forEach(function(category) {
        if (category?.id && atlas.guestCategoriesById[category.id]) {
          addEntityRelation(atlas, "networking", ruleSet.id, "guest_category", category.id, "networking_guest_category", {
            context: ruleSet.label,
            sourceObjectId: ruleSet.id
          });
        }
      });
    });

    atlas.automations.forEach(function(automation) {
      automation.steps.forEach(function(step, index) {
        if (!step.id) return;
        addEntityRelation(atlas, "automation", automation.id, "automation_step", step.id, "automation_step", {
          context: step.label || `Étape ${index + 1}`,
          sourceObjectId: automation.id,
          sourcePath: step.sourcePath || `current_workflow_version.ordered_steps[${index}]`
        });
        step.fieldRefs.forEach(function(ref) {
          const resolvedKey = resolveFieldKeyAlias(atlas, ref.key);
          if (resolvedKey) addEntityRelation(atlas, "automation_step", step.id, "field", resolvedKey, "automation_field_read", {
            context: `${step.label || `Étape ${index + 1}`} · ${ref.context}`,
            sourceObjectId: automation.id,
            sourcePath: `${step.sourcePath || `current_workflow_version.ordered_steps[${index}]`}.${ref.context || "value"}`
          });
        });
        step.nativeFieldRefs.forEach(function(ref) {
          const resolvedKey = resolveFieldKeyAlias(atlas, ref.key);
          if (resolvedKey && atlas.fieldsByKey[resolvedKey]) addEntityRelation(atlas, "automation_step", step.id, "field", resolvedKey, "automation_field_read", {
            context: `${step.label || `Étape ${index + 1}`} · ${ref.context}`,
            sourceObjectId: automation.id,
            sourcePath: `${step.sourcePath || `current_workflow_version.ordered_steps[${index}]`}.${ref.context || "value"}`
          });
        });
        step.segmentRefs.forEach(function(ref) {
          addEntityRelation(atlas, "automation_step", step.id, "segment", ref.id, "automation_segment", {
            context: `${step.label || `Étape ${index + 1}`} · ${ref.context}`,
            sourceObjectId: automation.id,
            sourcePath: `${step.sourcePath || `current_workflow_version.ordered_steps[${index}]`}.${ref.context || "value"}`
          });
        });
        step.categoryRefs.forEach(function(ref) {
          if (!ref.id) return;
          addEntityRelation(atlas, "automation_step", step.id, "guest_category", ref.id, "automation_guest_category", {
            context: `${step.label || `Étape ${index + 1}`} · ${ref.context}`,
            sourceObjectId: automation.id,
            sourcePath: `${step.sourcePath || `current_workflow_version.ordered_steps[${index}]`}.${ref.context || "value"}`
          });
        });
        step.emailTemplateIds.forEach(function(emailTemplateId) {
          if (!atlas.emailTemplatesById[emailTemplateId]) return;
          addEntityRelation(atlas, "automation_step", step.id, "email_template", emailTemplateId, "automation_email_template", {
            context: `${step.label || `Étape ${index + 1}`} · email_template_id`,
            sourceObjectId: automation.id,
            sourcePath: `${step.sourcePath || `current_workflow_version.ordered_steps[${index}]`}.settings`
          });
        });
      });
      automation.categories.forEach(function(category) {
        const formId = category?.registrationFormId;
        if (formId && atlas.formsById[formId]) {
          addEntityRelation(atlas, "automation", automation.id, "form", formId, "automation_form", `guest_category:${category.name || category.id}`);
        }
      });
    });
  }

  function getEntityRelations(atlas, type, id, options) {
    const all = atlas.relationsByEntity[entityKey(type, id)] || [];
    const filtered = all.filter((relation) => {
      if (options?.direction && relation.direction !== options.direction) return false;
      if (options?.targetType && relation.targetType !== options.targetType) return false;
      if (options?.type && relation.type !== options.type) return false;
      return true;
    });
    const deduped = new Map();
    filtered.forEach((relation) => {
      const key = `${relation.direction}:${relation.type}:${relation.targetType}:${relation.targetId}:${relation.context || ""}`;
      if (!deduped.has(key)) deduped.set(key, relation);
    });
    return [...deduped.values()];
  }

  function humanizeAutomationStep(step, index) {
    const number = index + 1;
    const type = step?.type || "step";
    const strategy = step?.strategy || "unknown";
    const kind = type === "trigger"
      ? "Déclencheur"
      : type === "filter"
        ? "Condition"
        : type === "action"
          ? "Action"
          : "Étape";
    return `${number}. ${kind} · ${strategy}`;
  }

  function getFieldUsageDetails(atlas, field) {
    const inbound = getEntityRelations(atlas, "field", field.key, { direction: "in" });
    const byAutomation = new Map();
    const details = {
      dependencies: [],
      usages: [],
      automations: [],
      graphImpact: {
        fields: [],
        segments: [],
        forms: [],
        pages: [],
        emails: [],
        automations: []
      }
    };

    if (field.extracted) {
      details.dependencies = [...field.extracted.fields].map((key) => {
        const resolvedKey = atlas.fieldsByKey[key] ? key : key.replace(/_level_\d+$/, "");
        const target = atlas.fieldsByKey[resolvedKey];
        return {
          title: key,
          subtitle: target ? target.label : "champ référencé",
          navType: target ? "fields" : null,
          navId: target ? target.key : null
        };
      });
    }

    inbound.forEach((relation) => {
      if (relation.targetType === "field") {
        const sourceField = atlas.fieldsByKey[relation.targetId];
        if (!sourceField || sourceField.key === field.key) return;
        const from = relation.type === "field_hierarchy" ? "field_child" : "field";
        details.usages.push({
          from,
          key: sourceField.key,
          label: sourceField.label,
          context: relation.context || null,
          navType: "fields",
          navId: sourceField.key
        });
        details.graphImpact.fields.push({ key: sourceField.key, label: sourceField.label });
        return;
      }
      if (relation.targetType === "segment") {
        const segment = atlas.segmentsById[relation.targetId];
        if (!segment) return;
        details.usages.push({
          from: "segment",
          key: segment.id,
          label: segment.label,
          context: relation.context || null,
          navType: "segments",
          navId: segment.id
        });
        details.graphImpact.segments.push({ key: segment.id, label: segment.label });
        return;
      }
      if (relation.targetType === "form") {
        const form = atlas.formsById[relation.targetId];
        if (!form) return;
        const from = relation.type === "form_field_condition" ? "form_condition" : "form";
        details.usages.push({
          from,
          key: form.id,
          label: form.title,
          context: relation.context || null,
          navType: "forms",
          navId: form.id
        });
        details.graphImpact.forms.push({ key: form.id, label: form.title });
        return;
      }
      if (relation.targetType === "page") {
        const page = atlas.pagesById[relation.targetId];
        if (!page) return;
        details.usages.push({
          from: "page",
          key: page.id,
          label: page.label,
          context: relation.context || null,
          navType: "pages",
          navId: page.id
        });
        details.graphImpact.pages.push({ key: page.id, label: page.label });
        return;
      }
      if (relation.targetType === "email_template") {
        const emailTemplate = atlas.emailTemplatesById[relation.targetId];
        if (!emailTemplate) return;
        details.usages.push({
          from: "email",
          key: emailTemplate.id,
          label: emailTemplate.label,
          context: relation.context || null,
          navType: "emails",
          navId: emailTemplate.id
        });
        details.graphImpact.emails.push({ key: emailTemplate.id, label: emailTemplate.label });
        return;
      }
      if (relation.targetType === "automation_step") {
        const automation = atlas.automationsById[relation.sourceObjectId || relation.targetId];
        if (!automation) return;
        const automationKey = `${automation.id}:${relation.targetId}`;
        if (!byAutomation.has(automationKey)) {
          byAutomation.set(automationKey, {
            key: automation.id,
            title: automation.label,
            navType: "automations",
            navId: automation.id,
            stepId: relation.targetId,
            stepLabel: relation.context || "Étape automation",
            stepPath: relation.sourcePath || null
          });
        }
        details.usages.push({
          from: "automation",
          key: automation.id,
          label: automation.label,
          context: relation.context || null,
          navType: "automations",
          navId: automation.id,
          stepId: relation.targetId,
          stepPath: relation.sourcePath || null
        });
        details.graphImpact.automations.push({
          key: automation.id,
          label: automation.label,
          context: relation.context || null
        });
      }
    });

    details.automations = [...byAutomation.values()];
    return details;
  }

  function isKnownFieldKey(atlas, key) {
    if (!key) return false;
    const canonicalKey = canonicalLiquidKey(key);
    return Boolean(
      atlas.fieldsByKey[key]
      || atlas.fieldsByKey[canonicalKey]
      || atlas.fieldsByKey[resolveFieldKeyAlias(atlas, key)]
      || atlas.fieldsByKey[resolveFieldKeyAlias(atlas, canonicalKey)]
      || EVENTMAKER_NATIVE_FIELDS.has(key)
      || EVENTMAKER_NATIVE_FIELDS.has(canonicalKey)
      || EVENTMAKER_PLATFORM_FIELDS.has(key)
      || EVENTMAKER_PLATFORM_FIELDS.has(canonicalKey)
      || Boolean(getLiquidSymbolMeta(key))
      || Boolean(getLiquidSymbolMeta(canonicalKey))
    );
  }

  function isKnownCalculatedFieldRef(atlas, key) {
    if (!key) return false;
    const canonicalKey = canonicalLiquidKey(key);
    if (atlas.fieldsByKey[key] || atlas.fieldsByKey[canonicalKey] || atlas.fieldsByKey[resolveFieldKeyAlias(atlas, key)] || atlas.fieldsByKey[resolveFieldKeyAlias(atlas, canonicalKey)]) return true;
    if (EVENTMAKER_NATIVE_FIELDS.has(key) || EVENTMAKER_NATIVE_FIELDS.has(canonicalKey) || EVENTMAKER_PLATFORM_FIELDS.has(key) || EVENTMAKER_PLATFORM_FIELDS.has(canonicalKey)) return true;
    const liquidMeta = getLiquidSymbolMeta(key) || getLiquidSymbolMeta(canonicalKey);
    if (!liquidMeta) return false;
    if (liquidMeta.kind === "field_alias" && liquidMeta.target) {
      return isKnownCalculatedFieldRef(atlas, liquidMeta.target);
    }
    return liquidMeta.kind === "liquid_only";
  }

  function hasFieldAnomaly(atlas, field) {
    if (!field.extracted) return false;
    if (field.extracted.warnings.length > 0) return true;
    return [...field.extracted.fields].some((key) => !isKnownCalculatedFieldRef(atlas, key));
  }

  function hasSegmentAnomaly(atlas, segment) {
    return segment.parsedRefs.some((ref) => !isKnownFieldKey(atlas, ref.key));
  }

  function hasFormAnomaly(atlas, form) {
    return [...form.fieldWrites].some((key) => key && !isKnownFieldKey(atlas, key))
      || [...form.fieldConditions].some((key) => !isKnownFieldKey(atlas, key));
  }

  function hasEmailTemplateAnomaly(atlas, emailTemplate) {
    if (!emailTemplate) return false;
    const hasMissingFields = (emailTemplate.fieldKeys || []).some(function(key) {
      return !isKnownFieldKey(atlas, key);
    });
    return hasMissingFields || (emailTemplate.missingCategoryIds || []).length > 0 || (emailTemplate.missingSegmentIds || []).length > 0;
  }

  function hasGuestCategoryAnomaly(atlas, category) {
    if (!category) return false;
    if (category.registrationFormId && !atlas.formsById[category.registrationFormId]) return true;
    const inbound = getEntityRelations(atlas, "guest_category", category.id, { direction: "in" });
    const hasInboundUsage = inbound.some((relation) =>
      relation.targetType === "page"
      || relation.targetType === "email_template"
      || relation.targetType === "networking"
      || relation.targetType === "automation_step"
    );
    return !category.registrationFormId && !hasInboundUsage;
  }

  function hasNetworkingAnomaly(atlas, ruleSet) {
    if (!ruleSet) return false;
    return (ruleSet.missingSegmentIds || []).length > 0;
  }

  function hasAutomationAnomaly(atlas, automation) {
    if (!automation) return false;
    const missingFieldKeys = (automation.fieldKeys || []).filter(function(key) {
      return !isKnownFieldKey(atlas, key);
    });
    return missingFieldKeys.length > 0
      || (automation.missingCategoryIds || []).length > 0
      || (automation.missingSegmentIds || []).length > 0;
  }

  function uniqueRefKeys(refs) {
    return [...new Set(refs.map((ref) => `${ref.from}:${ref.key}`))];
  }

  function getFieldCoverage(field) {
    const fromCalculated = field.referencedBy.filter((ref) => ref.from === "field");
    const fromSegments = field.referencedBy.filter((ref) => ref.from === "segment");
    const fromForms = field.referencedBy.filter((ref) => ref.from === "form");
    const fromFormConditions = field.referencedBy.filter((ref) => ref.from === "form_condition");
    const fromPages = field.referencedBy.filter((ref) => ref.from === "page");
    const fromEmails = field.referencedBy.filter((ref) => ref.from === "email");
    const fromAutomations = field.referencedBy.filter((ref) => ref.from === "automation");
    const fromHierarchy = field.referencedBy.filter((ref) => ref.from === "field_child");

    return {
      calculated: uniqueRefKeys(fromCalculated).length,
      segments: uniqueRefKeys(fromSegments).length,
      forms: uniqueRefKeys(fromForms).length,
      formConditions: uniqueRefKeys(fromFormConditions).length,
      pages: uniqueRefKeys(fromPages).length,
      emails: uniqueRefKeys(fromEmails).length,
      automations: uniqueRefKeys(fromAutomations).length,
      hierarchyChildren: uniqueRefKeys(fromHierarchy).length,
      total:
        uniqueRefKeys(fromCalculated).length +
        uniqueRefKeys(fromSegments).length +
        uniqueRefKeys(fromForms).length +
        uniqueRefKeys(fromFormConditions).length +
        uniqueRefKeys(fromPages).length +
        uniqueRefKeys(fromEmails).length +
        uniqueRefKeys(fromAutomations).length +
        uniqueRefKeys(fromHierarchy).length
    };
  }

  function getPagesForSegment(atlas, segmentId) {
    return [...new Map((atlas.pagesBySegmentId[segmentId] || []).map((page) => [page.id, page])).values()];
  }

  function getPagesForForm(atlas, formId) {
    return [...new Map((atlas.pagesByFormId[formId] || []).map((page) => [page.id, page])).values()];
  }

  function fieldAliasMeta(atlas, key) {
    const baseKey = getHierarchicalBaseKey(key);
    if (!baseKey || !atlas.fieldsByKey[baseKey]) return null;
    const levelMatch = key.match(/_level_(\d+)$/);
    return {
      key,
      baseKey,
      level: levelMatch ? Number(levelMatch[1]) : null,
      baseField: atlas.fieldsByKey[baseKey]
    };
  }

  function getDerivedHierarchyLevels(atlas, field) {
    if (!field?.key) return [];
    return atlas.fields
      .filter((candidate) => getHierarchicalBaseKey(candidate.key) === field.key)
      .map((candidate) => {
        const meta = fieldAliasMeta(atlas, candidate.key);
        return meta ? {
          key: candidate.key,
          level: meta.level,
          label: candidate.label || candidate.key,
          field: candidate
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.level || 0) - (b.level || 0) || a.key.localeCompare(b.key));
  }

  function getValueUsageForField(atlas, field, rawValue) {
    const target = normalizeSegmentValue(rawValue);
    if (!target) return [];
    const matches = [];
    atlas.segments.forEach((segment) => {
      if (segment.isDeleted) return;
      const hasMatch = segment.parsedRefs.some((ref) =>
        ref.key === field.key && !ref.empty && (ref.normalizedValues || []).includes(target)
      );
      if (hasMatch) matches.push(segment);
    });
    return matches;
  }

  function pushImpactNode(bucket, kind, id, depth) {
    const existing = bucket.get(id);
    if (!existing || depth < existing.depth) {
      bucket.set(id, { kind, id, depth });
    }
  }

  function getFieldImpactAnalysis(atlas, sourceField) {
    const visitedFields = new Map([[sourceField.key, 0]]);
    const impactedFields = new Map();
    const impactedSegments = new Map();
    const impactedForms = new Map();
    const impactedEmails = new Map();
    const impactedAutomations = new Map();
    const queue = [{ key: sourceField.key, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const field = atlas.fieldsByKey[current.key];
      if (!field) continue;

      field.referencedBy.forEach((ref) => {
        const nextDepth = current.depth + 1;
        if (ref.from === "field" || ref.from === "field_child") {
          pushImpactNode(impactedFields, "field", ref.key, nextDepth);
          const knownDepth = visitedFields.get(ref.key);
          if (knownDepth == null || nextDepth < knownDepth) {
            visitedFields.set(ref.key, nextDepth);
            queue.push({ key: ref.key, depth: nextDepth });
          }
          return;
        }
        if (ref.from === "segment") {
          pushImpactNode(impactedSegments, "segment", ref.key, nextDepth);
          return;
        }
        if (ref.from === "form" || ref.from === "form_condition") {
          pushImpactNode(impactedForms, "form", ref.key, nextDepth);
          return;
        }
        if (ref.from === "email") {
          pushImpactNode(impactedEmails, "email", ref.key, nextDepth);
          return;
        }
        if (ref.from === "automation") {
          pushImpactNode(impactedAutomations, "automation", ref.key, nextDepth);
        }
      });
    }

    const levels = new Map();
    const addLevelNode = (node) => {
      if (!levels.has(node.depth)) levels.set(node.depth, []);
      levels.get(node.depth).push(node);
    };

    [...impactedFields.values(), ...impactedSegments.values(), ...impactedForms.values(), ...impactedEmails.values(), ...impactedAutomations.values()]
      .sort((a, b) => a.depth - b.depth || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
      .forEach(addLevelNode);

    return {
      sourceKey: sourceField.key,
      fields: [...impactedFields.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id)),
      segments: [...impactedSegments.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id)),
      forms: [...impactedForms.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id)),
      emails: [...impactedEmails.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id)),
      automations: [...impactedAutomations.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id)),
      levels: [...levels.entries()].sort((a, b) => a[0] - b[0])
    };
  }

  function getFieldSensitivityScore(atlas, field) {
    const coverage = getFieldCoverage(field);
    const anomalyWeight = hasFieldAnomaly(atlas, field) ? 8 : 0;
    const websiteWeight = coverage.pages * 2;
    const emailWeight = coverage.emails * 2;
    const segmentWeight = coverage.segments * 2;
    const formWeight = coverage.forms + coverage.formConditions;
    const calcWeight = coverage.calculated;
    return coverage.total + anomalyWeight + websiteWeight + emailWeight + segmentWeight + formWeight + calcWeight;
  }

  function getSegmentSensitivityScore(atlas, segment) {
    const linkedPages = getPagesForSegment(atlas, segment.id).length;
    const anomalyWeight = hasSegmentAnomaly(atlas, segment) ? 8 : 0;
    const activeWeight = segment.isDeleted ? 0 : 2;
    return segment.parsedRefs.length + (linkedPages * 3) + anomalyWeight + activeWeight;
  }

  function getPageComplexityMetrics(atlas, page) {
    const fieldRelationCount = getEntityRelations(atlas, "page", page.id, { direction: "out", targetType: "field", type: "website_field" }).length;
    const segmentRelationCount = getEntityRelations(atlas, "page", page.id, { direction: "out", targetType: "segment", type: "website_segment" }).length;
    const formRelationCount = getEntityRelations(atlas, "page", page.id, { direction: "out", targetType: "form", type: "website_form" }).length;
    const pageLinkCount = getEntityRelations(atlas, "page", page.id, { direction: "out", targetType: "page", type: "website_page_link" }).length;
    const conditionCount = page.conditionalSectionsCount + page.conditionalBlocksCount;
    const score =
      page.sectionCount +
      page.blockCount +
      (conditionCount * 2) +
      page.segmentIds.length +
      fieldRelationCount +
      formRelationCount +
      pageLinkCount;

    let level = "simple";
    if (score >= 18 || conditionCount >= 4 || page.blockCount >= 8) level = "complexe";
    else if (score >= 8 || conditionCount >= 2 || page.blockCount >= 4) level = "intermédiaire";

    return {
      score,
      level,
      conditionCount,
      fieldRelationCount,
      segmentRelationCount,
      formRelationCount,
      pageLinkCount
    };
  }

  window.AtlasCore = {
    buildAtlas,
    hasFieldAnomaly,
    hasSegmentAnomaly,
    hasFormAnomaly,
    hasEmailTemplateAnomaly,
    hasGuestCategoryAnomaly,
    hasNetworkingAnomaly,
    hasAutomationAnomaly,
    getFieldCoverage,
    getEntityRelations,
    getPagesForSegment,
    getPagesForForm,
    getFieldSensitivityScore,
    getSegmentSensitivityScore,
    getPageComplexityMetrics,
    getLiquidSymbolMeta,
    getFieldUsageDetails,
    fieldAliasMeta,
    getDerivedHierarchyLevels,
    getValueUsageForField,
    getFieldImpactAnalysis
  };
})();
