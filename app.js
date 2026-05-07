// Shared site renderer — loads config.json and renders header/footer + page content
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
};

async function loadConfig() {
  const res = await fetch("./config.json");
  return res.json();
}

function windowBar(title, accent) {
  return el("div", { class: "window-bar" },
    el("span", { class: "dot dot-red" }),
    el("span", { class: "dot dot-yellow" }),
    el("span", { class: "dot dot-green" }),
    el("span", { class: "window-title" }, title, el("span", {}, accent ?? ""))
  );
}

function sectionLabel(text) {
  return el("div", { class: "section-label" }, text);
}

function normalizeRoute(path) {
  const url = new URL(path, location.href);
  let route = url.pathname.replace(/\/$/, "");
  if (!route) return "/";
  if (route.endsWith('.html')) route = route.slice(0, -5);
  return route || "/";
}

function fileFallbackPath(path) {
  return path === "/" ? "index.html" : `${path.replace(/^\//, "")}.html`;
}

function renderHeader(config) {
  const currentRoute = normalizeRoute(location.pathname || "/");
  const header = el("header", { class: "topbar" },
    el("div", { class: "topbar-inner" },
      el("a", { href: "/", class: "topbar-logo" }, config.identity.username),
      el("nav", { class: "topbar-nav" },
        ...config.nav.map(n => {
          const href = n.to || "/";
          const a = el("a", { href }, n.label);
          if (normalizeRoute(href) === currentRoute) {
            a.classList.add("active");
            a.setAttribute("aria-current", "page");
          }
          if (location.protocol === 'file:' && href !== "/") {
            a.addEventListener("click", e => {
              e.preventDefault();
              location.href = fileFallbackPath(href);
            });
          }
          return a;
        })
      )
    )
  );
  document.body.prepend(header);
}

function renderFooter(config) {
  const f = el("footer", {},
    el("div", { class: "footer-inner" },
      el("div", { class: "footer-left" }, el("span", {}, "// "), config.footer.text),
      el("div", { class: "footer-links" },
        ...config.footer.links.map(l => {
          const a = el("a", { href: l.url }, l.label);
          if (location.protocol === 'file:' && l.url.startsWith('/')) {
            a.addEventListener('click', e => {
              e.preventDefault();
              location.href = fileFallbackPath(l.url);
            });
          }
          return a;
        })
      )
    )
  );
  document.body.append(f);
}

function applyHead(config, page) {
  const id = config.identity;
  const titles = {
    index: `${id.name} | ${id.role}`,
    about: `About — ${id.name}`,
    portfolio: `Portfolio — ${id.name}`,
    contact: `Contact — ${id.name}`,
  };
  const pagePath = page === "index" ? "/" : `/${page}`;
  const origin = location.protocol === "file:" ? "" : location.origin;
  const pageUrl = `${origin}${pagePath}`;

  document.title = titles[page] || titles.index;

  const upsertMeta = (selector, attrs) => {
    let tag = document.head.querySelector(selector);
    if (!tag) {
      tag = document.createElement(attrs.tag || "meta");
      document.head.append(tag);
    }
    for (const [key, val] of Object.entries(attrs)) {
      if (key === "tag") continue;
      tag.setAttribute(key, val);
    }
    return tag;
  };

  const defaultKeywords = [id.role, "Minecraft", "resource developer", "web development", ...(config.about?.stack || [])];

  upsertMeta('meta[name="description"]', { tag: "meta", name: "description", content: id.tagline });
  upsertMeta('meta[name="keywords"]', { tag: "meta", name: "keywords", content: [...new Set(defaultKeywords)].join(", ") });
  upsertMeta('meta[name="robots"]', { tag: "meta", name: "robots", content: "index,follow" });
  upsertMeta('meta[name="author"]', { tag: "meta", name: "author", content: id.name });
  upsertMeta('meta[property="og:site_name"]', { tag: "meta", property: "og:site_name", content: "ZCraft Studios" });
  upsertMeta('meta[name="twitter:creator"]', { tag: "meta", name: "twitter:creator", content: "@zainabusal" });
  upsertMeta('meta[property="og:title"]', { tag: "meta", property: "og:title", content: titles[page] || titles.index });
  upsertMeta('meta[property="og:description"]', { tag: "meta", property: "og:description", content: id.tagline });
  upsertMeta('meta[property="og:type"]', { tag: "meta", property: "og:type", content: "website" });
  upsertMeta('meta[property="og:url"]', { tag: "meta", property: "og:url", content: pageUrl });
  upsertMeta('meta[property="og:image"]', { tag: "meta", property: "og:image", content: id.avatar });
  upsertMeta('meta[name="twitter:card"]', { tag: "meta", name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { tag: "meta", name: "twitter:title", content: titles[page] || titles.index });
  upsertMeta('meta[name="twitter:description"]', { tag: "meta", name: "twitter:description", content: id.tagline });
  upsertMeta('meta[name="twitter:image"]', { tag: "meta", name: "twitter:image", content: id.avatar });
  upsertMeta('meta[name="theme-color"]', { tag: "meta", name: "theme-color", content: "#0c0e10" });

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = pageUrl;

  let favicon = document.head.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.append(favicon);
  }
  favicon.href = id.avatar;
}

// ---------- Pages ----------

function renderIndex(config) {
  const { identity, stats = [], contact } = config;
  const parts = (identity.name || "").trim().split(/\s+/);
  const first = parts[0] ?? "";
  const rest = parts.slice(1).join(" ");
  const chips = identity.chips ?? [];
  const ci = contact?.items ?? [];

  const root = $("#app");
  root.append(
    el("section", { class: "hero", style: { paddingTop: "32px" } },
      el("div", { class: "hero-grid" },
        el("div", {},
          identity.status && el("div", { class: "status-row" },
            el("span", { class: "status-dot" }),
            el("span", { class: "status-text" }, identity.status)
          ),
          el("div", { class: "hero-prompt" }, "whoami"),
          el("h1", { class: "hero-name" }, first, rest && " ", rest && el("span", { class: "hero-name-accent" }, rest)),
          el("div", { class: "hero-role hero-cursor" }, identity.role),
          el("p", { class: "hero-desc" }, el("span", { class: "kw-comment" }, `/* ${identity.tagline} */`)),
          el("div", { class: "hero-actions" },
            el("a", {
            href: "/contact",
            class: "btn btn-primary",
            onClick: e => {
              if (location.protocol === 'file:') {
                e.preventDefault();
                location.href = fileFallbackPath('/contact');
              }
            }
          }, "get in touch"),
          el("a", {
            href: "/portfolio",
            class: "btn btn-ghost",
            onClick: e => {
              if (location.protocol === 'file:') {
                e.preventDefault();
                location.href = fileFallbackPath('/portfolio');
              }
            }
          }, "view work")
          )
        ),
        el("div", { class: "hero-skin-panel" },
          el("div", { class: "window skin-window" },
            windowBar("identity", ".card"),
            el("div", { class: "window-body" },
              el("div", { class: "profile-card" },
                identity.avatar && el("img", { src: identity.avatar, alt: `${identity.name} profile`, class: "skin-img", decoding: "async" }),
                el("div", { class: "profile-name" }, identity.name),
                identity.handle && el("div", { class: "profile-handle" }, identity.handle),
                identity.studio && el("div", { class: "profile-note" }, `Founder @ ${identity.studio}`),
                chips.length > 0 && el("div", { class: "profile-chips" },
                  ...chips.map(c => el("span", { class: "profile-chip" }, c))
                )
              )
            ),
            ci.length > 0 && el("div", { class: "skin-meta" },
              ...ci.slice(0, 2).map(c => el("a", { href: c.url, class: "profile-meta-link" }, c.platform))
            )
          )
        )
      )
    )
  );

  if (stats.length) {
    const cols = Math.min(stats.length, 4);
    root.append(
      el("section", {},
        el("div", { class: "stats-row", style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } },
          ...stats.map(s => el("div", { class: "stat-cell" },
            el("div", { class: "stat-n" }, s.value),
            el("div", { class: "stat-l" }, s.label)
          ))
        )
      )
    );
  }
}

function renderAbout(config) {
  const { about } = config;
  const skills = about.skills ?? [];
  const stack = about.stack ?? [];
  const alsoKnow = about.alsoKnow ?? [];
  const focus = about.developer?.focus ?? [];

  const bio = el("div", { class: "about-bio" });
  const focusHtml = focus.map((f, i) =>
    `<span class="kw-string">"${f}"</span>${i < focus.length - 1 ? ", " : ""}`
  ).join("");
  bio.innerHTML =
`<span class="kw-comment">// who is this guy?</span>
<span class="kw-fn">const</span> <span class="kw-var">developer</span> = {
  name: <span class="kw-string">"${about.developer.name}"</span>,
  alias: <span class="kw-string">"${about.developer.alias}"</span>,
  studio: <span class="kw-string">"${about.developer.studio}"</span>,
  focus: [${focusHtml}],
  status: <span class="kw-string">"${about.developer.status}"</span>
};

<span class="kw-comment">/* ${about.comment} */</span>`;

  $("#app").append(
    el("section", {},
      sectionLabel("about.md"),
      el("div", { class: "about-grid" },
        el("div", { class: "window" },
          windowBar("bio", ".txt"),
          el("div", { class: "window-body" },
            bio,
            stack.length > 0 && el("div", { class: "tech-group" },
              el("div", { class: "tech-group-label" }, "// stack"),
              el("div", { class: "tags" }, ...stack.map(t => el("span", { class: "tag" }, t)))
            )
          )
        ),
        el("div", { class: "window" },
          windowBar("skills", ".lst"),
          el("div", { class: "window-body" },
            el("div", { class: "skills-list" },
              ...skills.map(s => el("div", { class: "skill-row" },
                el("span", { class: "skill-row-name" }, s.name),
                el("div", { class: "skill-bar-track" },
                  el("div", { class: "skill-bar-fill", style: { width: `${s.level}%` } })
                ),
                el("span", { class: "skill-pct" }, `${s.level}%`)
              ))
            ),
            alsoKnow.length > 0 && el("div", { class: "tech-group" },
              el("div", { class: "tech-group-label" }, "// also know"),
              el("div", { class: "tags" }, ...alsoKnow.map(t => el("span", { class: "tag" }, t)))
            )
          )
        )
      )
    )
  );
}

function stars(n) {
  const r = Math.max(0, Math.min(5, Number(n) || 0));
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const span = el("span", { class: "stars", "aria-label": `${r} out of 5 stars`, title: `${r}/5` });
  for (let i = 0; i < full; i++) span.append(el("span", { class: "star star-full" }, "★"));
  if (half) span.append(el("span", { class: "star star-half" }, "★"));
  for (let i = 0; i < empty; i++) span.append(el("span", { class: "star star-empty" }, "★"));
  span.append(el("span", { class: "stars-num" }, r.toFixed(1)));
  return span;
}

function reviewCard(r) {
  return el("div", { class: "review-card" },
    el("div", { class: "review-head" },
      r.reviewer?.avatar && el("img", { src: r.reviewer.avatar, alt: r.reviewer?.name ?? "reviewer", class: "review-avatar", loading: "lazy", decoding: "async" }),
      el("div", { class: "review-meta" },
        el("div", { class: "review-name" }, r.reviewer?.name ?? "Anonymous"),
        r.reviewer?.handle && el("div", { class: "review-handle" }, r.reviewer.handle)
      ),
      typeof r.rating === "number" && stars(r.rating)
    ),
    r.text && el("p", { class: "review-text" }, `"${r.text}"`)
  );
}

function getReviews(item) {
  if (Array.isArray(item.reviews) && item.reviews.length) return item.reviews;
  if (item.review) return [item.review];
  return [];
}

function renderPortfolio(config) {
  const { mainProject, projects = [], commissions } = config;
  const root = $("#app");
  const sec = el("section", {}, sectionLabel("portfolio.json"));

  if (mainProject) {
    sec.append(
      el("div", { class: "window portfolio-window" },
        windowBar(mainProject.label?.split(" ")[0] ?? "main", ` | ${mainProject.title}`),
        el("div", { class: "portfolio-top" },
          mainProject.logo && el("div", { class: "portfolio-img-side" },
            el("img", { src: mainProject.logo, alt: mainProject.title, class: "portfolio-logo", loading: "lazy", decoding: "async" })
          ),
          el("div", { class: "portfolio-info" },
            el("h3", { class: "portfolio-title" }, mainProject.title),
            el("p", { class: "portfolio-desc" }, mainProject.description),
            mainProject.stats?.length > 0 && el("div", { class: "portfolio-nums" },
              ...mainProject.stats.map(s => el("div", {},
                el("div", { class: "p-num-val" }, s.value),
                el("div", { class: "p-num-lbl" }, s.label)
              ))
            ),
            mainProject.links?.length > 0 && el("div", { class: "hero-actions" },
              ...mainProject.links.map(l => el("a", { href: l.url, class: `btn ${l.primary ? "btn-primary" : "btn-ghost"}` }, l.label))
            )
          )
        )
      )
    );
  }

  if (projects.length) {
    const grid = el("div", { class: "projects-grid" });
    for (const p of projects) {
      const content = el("div", { class: "project-content" },
        el("div", { class: "project-head" },
          el("h4", { class: "project-name" }, p.name),
          p.brand && el("span", { class: "project-brand" }, p.brand)
        ),
        p.summary && el("p", { class: "project-summary" }, p.summary),
        p.tags?.length > 0 && el("div", { class: "tags" }, ...p.tags.map(t => el("span", { class: "tag" }, t))),
        p.url && p.url !== "#" && el("a", { href: p.url, class: "link-sm" }, "view project"),
        ...getReviews(p).map(reviewCard)
      );
      grid.append(
        el("div", { class: "window project-card" },
          windowBar(p.name.toLowerCase(), ` | ${p.brand}`),
          el("div", { class: "project-body" },
            p.image && el("img", { src: p.image, alt: p.name, class: "project-img", loading: "lazy", decoding: "async" }),
            content
          )
        )
      );
    }
    sec.append(grid);
  }
  root.append(sec);

  if (commissions?.items?.length) {
    root.append(
      el("section", {},
        el("div", { class: "window" },
          windowBar("commissions", " | other projects"),
          el("div", { class: "commissions-wrap" },
            commissions.intro && el("div", { class: "commissions-head" },
              el("span", { class: "kw-comment" }, `// ${commissions.intro}`)
            ),
            el("div", { class: "commissions-grid-fluid" },
              ...commissions.items.map(c => el("div", { class: "commission-card" },
                el("div", { class: "commission-title" }, c.title),
                el("div", { class: "commission-desc" }, c.desc),
                ...getReviews(c).map(reviewCard)
              ))
            )
          )
        )
      )
    );
  }
}

function renderContact(config) {
  const { contact } = config;
  const items = contact?.items ?? [];
  const primary = items[0];

  $("#app").append(
    el("section", {},
      sectionLabel("contact.sh"),
      el("div", { class: "window" },
        windowBar("reach_out", ".exe"),
        el("div", { class: "window-body" },
          el("div", { class: "contact-shell" },
            el("div", { class: "contact-lead" },
              el("div", { class: "contact-kicker" }, "open_channel()"),
              el("h1", { class: "contact-title" }, "Let's build something players remember."),
              contact?.intro && el("p", { class: "contact-copy" }, contact.intro),
              el("div", { class: "contact-notes" },
                el("div", { class: "contact-note-card" },
                  el("span", { class: "contact-note-label" }, "Best for"),
                  el("strong", {}, "custom plugins, server systems, branded web work")
                ),
                el("div", { class: "contact-note-card" },
                  el("span", { class: "contact-note-label" }, "Typical reply"),
                  el("strong", {}, "fastest on Discord, detailed follow-up by email if needed")
                )
              ),
              primary && el("a", { href: primary.url, class: "contact-primary-card" },
                el("div", { class: "contact-primary-badge" }, "recommended"),
                el("div", { class: "contact-primary-platform" }, primary.platform),
                el("div", { class: "contact-primary-handle" }, primary.handle),
                el("div", { class: "contact-primary-cta" }, "start here →")
              )
            ),
            el("div", { class: "contact-grid-fluid" },
              ...items.map((c, i) => el("a", { href: c.url, class: "contact-item", style: { animationDelay: `${0.08 * i}s` } },
                el("div", { class: "contact-icon" }, "◆"),
                el("div", {},
                  el("div", { class: "contact-text-platform" }, c.platform),
                  el("div", { class: "contact-text-handle" }, c.handle),
                  el("div", { class: "contact-text-meta" }, "available for inquiries, links, and follow-up")
                )
              ))
            )
          )
        )
      )
    )
  );
}

const PAGES = { index: renderIndex, about: renderAbout, portfolio: renderPortfolio, contact: renderContact };

(async function main() {
  const config = await loadConfig();
  const page = (document.body.dataset.page || "index").toLowerCase();
  applyHead(config, page);
  renderHeader(config);
  (PAGES[page] || PAGES.index)(config);
  renderFooter(config);
})();
