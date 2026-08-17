/* ==========================================================================
   Launchpad Sites — shared behavior
   Vanilla JS, no dependencies. Loaded on every page.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Page enter transition ---------- */
  document.body.classList.add("page-ready");

  /* ---------- Page exit transition on internal link clicks ---------- */
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
    if (/^https?:\/\//i.test(href)) return; // external links (Calendly, Echo Studio, etc.)

    var isHtmlNav = href.indexOf(".html") !== -1 || href === "/" || href === "./";
    if (!isHtmlNav) return;

    e.preventDefault();

    if (prefersReducedMotion) {
      window.location.href = href;
      return;
    }

    document.body.classList.remove("page-ready");
    document.body.classList.add("page-exit");
    setTimeout(function () {
      window.location.href = href;
    }, 260);
  });

  /* ---------- Nav: shrink on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScrollHeader() {
    if (!header) return;
    if (window.scrollY > 24) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Nav: inline vs. hamburger, decided by actual measured fit ----------
     Rather than guessing a viewport-width breakpoint (which shifts with real
     font metrics, browser zoom, and OS), this measures whether the logo, all
     nine links, and the CTA actually fit in one row and only then swaps to
     the hamburger menu. */
  (function () {
    var navInner = document.querySelector(".nav-inner");
    var navLinksEl = document.querySelector(".nav-links");
    var toggleEl = document.querySelector(".nav-toggle");
    if (!navInner) return;

    function updateNavMode() {
      document.body.classList.remove("nav-compact");
      var fits = navInner.scrollWidth <= navInner.clientWidth + 1;

      if (!fits) {
        document.body.classList.add("nav-compact");
      } else if (navLinksEl && toggleEl) {
        navLinksEl.classList.remove("is-open");
        toggleEl.classList.remove("is-open");
        toggleEl.setAttribute("aria-expanded", "false");
      }
    }

    updateNavMode();
    // Re-check after layout has definitely settled (fonts/images finishing,
    // etc. can shift widths slightly after the first synchronous pass).
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(updateNavMode);
    });
    window.addEventListener("load", updateNavMode);

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateNavMode, 120);
    });
  })();

  /* ---------- Nav: active link ---------- */
  (function markActiveLink() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a[href]").forEach(function (a) {
      var linkPath = a.getAttribute("href").split("/").pop();
      if (linkPath === path) {
        a.classList.add("active");
      }
    });
  })();

  /* ---------- Nav: mobile toggle ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
      );
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* ---------- Animated stat counters ---------- */
  var counters = document.querySelectorAll("[data-count-to]");
  if (counters.length) {
    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute("data-count-to"));
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
      var duration = 1400;
      var startTime = null;

      if (prefersReducedMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }

      function step(ts) {
        if (startTime === null) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = target * eased;
        el.textContent = prefix + value.toFixed(decimals) + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
        }
      }
      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      var countObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach(function (el) { countObserver.observe(el); });
    } else {
      counters.forEach(animateCount);
    }
  }

  /* ---------- Parallax on hero ---------- */
  var parallaxEls = document.querySelectorAll("[data-parallax]");
  if (parallaxEls.length && !prefersReducedMotion) {
    var ticking = false;
    function updateParallax() {
      var scrollY = window.scrollY;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var offset = scrollY * speed;
        el.style.transform = "translate3d(0, " + offset + "px, 0)";
      });
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------- FAQ accordion ---------- */
  var accTriggers = document.querySelectorAll(".acc-trigger");
  accTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var item = trigger.closest(".acc-item");
      var panel = item.querySelector(".acc-panel");
      var isOpen = item.classList.contains("is-open");

      if (isOpen) {
        panel.style.maxHeight = null;
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  /* ---------- Contact form validation (client-side only, no backend) ---------- */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var phonePattern = /^[0-9()+\-.\s]{7,}$/;

    function setError(field, message) {
      var wrap = field.closest(".field");
      wrap.classList.add("has-error");
      var err = wrap.querySelector(".field-error");
      if (err) err.textContent = message;
    }

    function clearError(field) {
      var wrap = field.closest(".field");
      wrap.classList.remove("has-error");
    }

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;

      var name = contactForm.querySelector("#cf-name");
      var business = contactForm.querySelector("#cf-business");
      var email = contactForm.querySelector("#cf-email");
      var phone = contactForm.querySelector("#cf-phone");
      var message = contactForm.querySelector("#cf-message");

      [name, business, email, phone, message].forEach(clearError);

      if (!name.value.trim()) { setError(name, "Please enter your name."); valid = false; }
      if (!business.value.trim()) { setError(business, "Please enter your business name."); valid = false; }
      if (!email.value.trim() || !emailPattern.test(email.value.trim())) {
        setError(email, "Please enter a valid email address.");
        valid = false;
      }
      if (!phone.value.trim() || !phonePattern.test(phone.value.trim())) {
        setError(phone, "Please enter a valid phone number.");
        valid = false;
      }
      if (!message.value.trim()) { setError(message, "Tell us a little about your business."); valid = false; }

      var status = document.getElementById("form-status");

      if (!valid) {
        if (status) {
          status.textContent = "Please fix the fields above and try again.";
          status.classList.add("is-visible");
        }
        return;
      }

      // NOTE: This form has no backend yet. Wire up a form handler
      // (e.g. Formspree, Netlify Forms, or a custom endpoint) before going live.
      if (status) {
        status.textContent = "Thanks! This demo form isn't wired to send yet — once a form handler is connected, your message will come straight to us.";
        status.classList.add("is-visible");
      }
      contactForm.reset();
    });
  }
})();
