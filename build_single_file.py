import re, base64, os

BASE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(BASE, path), "r", encoding="utf-8") as f:
        return f.read()

def extract_main(html):
    m = re.search(r"<main>(.*?)</main>", html, re.S)
    return m.group(1).strip("\n")

PAGES = [
    ("index", "index.html", "Launchpad Sites — Websites for Local Businesses"),
    ("work", "work.html", "Work — Launchpad Sites"),
    ("process", "process.html", "Process — Launchpad Sites"),
    ("pricing", "pricing.html", "Pricing — Launchpad Sites"),
    ("refunds", "refunds.html", "Refunds &amp; Policies — Launchpad Sites"),
    ("echo-studio", "echo-studio.html", "Echo Studio — Optional Add-On | Launchpad Sites"),
    ("about", "about.html", "About — Launchpad Sites"),
    ("faq", "faq.html", "FAQ — Launchpad Sites"),
    ("contact", "contact.html", "Contact — Launchpad Sites"),
]

# ---- base64 images ----
def b64(path):
    with open(os.path.join(BASE, path), "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")

rocket_uri = "data:image/png;base64," + b64("assets/img/rocket-mark.png")
rocket_lg_uri = "data:image/png;base64," + b64("assets/img/rocket-mark-lg.png")
fav16_uri = "data:image/png;base64," + b64("assets/img/favicon-16.png")
fav32_uri = "data:image/png;base64," + b64("assets/img/favicon-32.png")
fav180_uri = "data:image/png;base64," + b64("assets/img/favicon-180.png")

# ---- extract each page's <main> content ----
page_blocks = []
for key, fname, title in PAGES:
    html = read(fname)
    main_content = extract_main(html)
    main_content = main_content.replace("assets/img/rocket-mark-lg.png", rocket_lg_uri)
    active_class = " is-active" if key == "index" else ""
    block = '<div class="page-view%s" id="view-%s">\n%s\n</div>' % (active_class, key, main_content)
    page_blocks.append(block)

pages_html = "\n\n".join(page_blocks)

# ---- shared header/footer (from index.html), with data-page attrs added ----
index_html = read("index.html")
header_match = re.search(r"(<header class=\"site-header\">.*?</header>)", index_html, re.S)
header_html = header_match.group(1)
footer_match = re.search(r"(<footer class=\"site-footer\">.*?</footer>)", index_html, re.S)
footer_html = footer_match.group(1)

# map each known .html href to a data-page key, and add data-page attr
def add_data_page(html):
    for key, fname, title in PAGES:
        html = html.replace('href="%s"' % fname, 'href="%s" data-page="%s"' % (fname, key))
    return html

header_html = add_data_page(header_html)
footer_html = add_data_page(footer_html)

header_html = header_html.replace("assets/img/rocket-mark.png", rocket_uri)
footer_html = footer_html.replace("assets/img/rocket-mark.png", rocket_uri)

# ---- CSS ----
css = read("assets/css/styles.css")
css += "\n\n/* ---------- Single-file bundle: page-view sections ---------- */\n"
css += ".page-view { display: none; }\n"
css += ".page-view.is-active { display: block; }\n"

# ---- JS: main.js with page-transition + active-link replaced by SPA router ----
js = read("assets/js/main.js")

old_block_start = js.index('  /* ---------- Page enter transition ---------- */')
old_block_end = js.index('  /* ---------- Nav: shrink on scroll ---------- */')
transition_block_old = js[old_block_start:old_block_end]

old_active_start = js.index('  /* ---------- Nav: active link ---------- */')
old_active_end = js.index('  /* ---------- Nav: mobile toggle ---------- */')
active_block_old = js[old_active_start:old_active_end]

router_js = '''  /* ---------- Single-file router ----------
     This bundle contains every "page" as a hidden section in one document.
     Clicking a nav/content link swaps which section is visible instead of
     loading a new file, so the whole site works from one saved HTML file. */
  var PAGES = ["index", "work", "process", "pricing", "refunds", "echo-studio", "about", "faq", "contact"];
  var PAGE_TITLES = {
    "index": "Launchpad Sites \\u2014 Websites for Local Businesses",
    "work": "Work \\u2014 Launchpad Sites",
    "process": "Process \\u2014 Launchpad Sites",
    "pricing": "Pricing \\u2014 Launchpad Sites",
    "refunds": "Refunds & Policies \\u2014 Launchpad Sites",
    "echo-studio": "Echo Studio \\u2014 Optional Add-On | Launchpad Sites",
    "about": "About \\u2014 Launchpad Sites",
    "faq": "FAQ \\u2014 Launchpad Sites",
    "contact": "Contact \\u2014 Launchpad Sites"
  };
  var isProgrammaticHashChange = false;

  function keyFromHref(href) {
    var file = href.split("#")[0].split("?")[0].split("/").pop();
    if (!file) file = "index.html";
    var key = file.replace(/\\.html$/, "");
    return PAGES.indexOf(key) !== -1 ? key : null;
  }

  function showPage(key) {
    var target = document.getElementById("view-" + key);
    if (!target) return false;

    document.querySelectorAll(".page-view").forEach(function (v) {
      v.classList.remove("is-active");
    });
    target.classList.add("is-active");

    document.title = PAGE_TITLES[key] || document.title;

    document.querySelectorAll(".nav-links a[data-page]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === key);
    });

    // Instant, not smooth: this is a virtual "page load," not an in-page jump.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // The scroll-reveal IntersectionObserver was set up while every section
    // but the first was display:none, so anything above the fold on a
    // section we're switching into for the first time may never have been
    // observed as visible. Reveal whatever's already in view immediately;
    // anything further down the page still fades in on scroll as normal.
    var vh = window.innerHeight || document.documentElement.clientHeight;
    target.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        el.classList.add("is-visible");
      }
    });

    return true;
  }

  function navigateTo(key) {
    if (PAGES.indexOf(key) === -1) return;

    var doSwap = function () {
      isProgrammaticHashChange = true;
      window.location.hash = key;
      showPage(key);
    };

    if (prefersReducedMotion) {
      doSwap();
      return;
    }

    document.body.classList.remove("page-ready");
    document.body.classList.add("page-exit");
    setTimeout(function () {
      doSwap();
      document.body.classList.remove("page-exit");
      void document.body.offsetWidth; // force reflow so the fade-in restarts
      document.body.classList.add("page-ready");
    }, 260);
  }

  window.addEventListener("hashchange", function () {
    if (isProgrammaticHashChange) {
      isProgrammaticHashChange = false;
      return;
    }
    var key = (window.location.hash || "#index").slice(1);
    if (PAGES.indexOf(key) === -1) key = "index";
    showPage(key);
  });

  /* ---------- Page enter transition ---------- */
  document.body.classList.add("page-ready");

  /* ---------- Initial route (supports opening the file with #page in the URL) ---------- */
  (function initRoute() {
    var key = (window.location.hash || "#index").slice(1);
    if (PAGES.indexOf(key) === -1) key = "index";
    showPage(key);
  })();

  /* ---------- Internal link clicks swap sections instead of navigating ---------- */
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link) return;

    var href = link.getAttribute("href");
    if (!href) return;
    if (link.target === "_blank") return;
    if (link.hasAttribute("download")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href.indexOf("#") === 0) return;
    if (href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
    if (/^https?:\\/\\//i.test(href)) return; // external links (Calendly, Echo Studio, etc.)

    var key = keyFromHref(href);
    if (!key) return;

    e.preventDefault();
    navigateTo(key);
  });

'''

active_link_js = '''  /* ---------- Nav: active link (set on initial route + on every navigateTo) ---------- */

'''

js = js[:old_block_start] + router_js + js[old_block_end:]
js = js.replace(active_block_old, active_link_js)

# ---- assemble final document ----
head = '''<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Launchpad Sites</title>
<meta name="description" content="Launchpad Sites builds fast, professional websites for local businesses that don't have one yet. Starting at $500, live in 3-5 business days.">
<meta name="theme-color" content="#0A1E33">
<link rel="icon" type="image/png" sizes="32x32" href="%s">
<link rel="icon" type="image/png" sizes="16x16" href="%s">
<link rel="apple-touch-icon" href="%s">
<style>
%s
</style>''' % (fav32_uri, fav16_uri, fav180_uri, css)

doc = '''<!DOCTYPE html>
<html lang="en">
<head>
%s
</head>
<body>

%s

<main>

%s

</main>

%s

<script>
%s
</script>
</body>
</html>
''' % (head, header_html, pages_html, footer_html, js)

out_path = os.path.join(BASE, "launchpad-sites-single-file.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(doc)

print("wrote", out_path, len(doc), "chars")
