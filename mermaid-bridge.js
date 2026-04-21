(function () {
  if (window.__atlasMermaidBridgeInstalled) return;
  window.__atlasMermaidBridgeInstalled = true;

  const BRIDGE_READY_ATTR = "data-atlas-mermaid-bridge";
  const MERMAID_SRC = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js";
  let mermaidPromise = null;

  document.documentElement.setAttribute(BRIDGE_READY_ATTR, "installed");

  function ensureMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (mermaidPromise) return mermaidPromise;

    mermaidPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${MERMAID_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.mermaid), { once: true });
        existing.addEventListener("error", () => reject(new Error("Chargement Mermaid bloqué.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = MERMAID_SRC;
      script.async = true;
      script.onload = () => resolve(window.mermaid);
      script.onerror = () => reject(new Error("Chargement Mermaid bloqué par la page ou le navigateur."));
      document.head.appendChild(script);
    }).then((mermaid) => {
      if (!mermaid) throw new Error("Mermaid indisponible.");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "base"
      });
      document.documentElement.setAttribute(BRIDGE_READY_ATTR, "ready");
      return mermaid;
    }).catch((error) => {
      document.documentElement.setAttribute(BRIDGE_READY_ATTR, "error");
      throw error;
    });

    return mermaidPromise;
  }

  document.addEventListener("atlas:mermaid-render", async (event) => {
    const detail = event.detail || {};
    const target = detail.targetId ? document.getElementById(detail.targetId) : null;
    if (!target || !detail.graph) return;

    target.setAttribute("data-mermaid-status", "loading");
    try {
      const mermaid = await ensureMermaid();
      const renderId = `atlas_mermaid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const renderResult = await mermaid.render(renderId, detail.graph);
      target.innerHTML = renderResult.svg;
      const svg = target.querySelector("svg");
      if (svg && detail.svgCss) {
        const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.textContent = detail.svgCss;
        svg.prepend(styleEl);
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.style.maxWidth = "none";
      }
      target.setAttribute("data-mermaid-status", "ready");
    } catch (error) {
      target.setAttribute("data-mermaid-status", "error");
      target.innerHTML = `<div class="atlas-note">Graphe Mermaid indisponible : ${(error && error.message) || error}</div>`;
    }
  });
})();
