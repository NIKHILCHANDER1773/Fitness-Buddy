import { AppConfig } from "./config.js";
import { loadComponent } from "./utils/ui-helpers.js";

const navbarPath = AppConfig.COMPONENTS_PATH + "/navbar.html";
const footerPath = AppConfig.COMPONENTS_PATH + "/footer.html";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded. Loading components...");
  const navbarPlaceholder = document.querySelector(
    AppConfig.DOM_SELECTORS.NAVBAR || "#navbar"
  );
  const footerPlaceholder = document.querySelector(
    AppConfig.DOM_SELECTORS.FOOTER || "#footer"
  );

  const loadPromises = [];

  if (navbarPlaceholder) {
    loadPromises.push(
      loadComponent(AppConfig.DOM_SELECTORS.NAVBAR || "#navbar", navbarPath)
        .then(() => console.log("Navbar loaded."))
        .catch((error) => console.error("Error loading navbar:", error))
    );
  } else {
    console.warn("Navbar placeholder not found.");
  }

  if (footerPlaceholder) {
    loadPromises.push(
      loadComponent(AppConfig.DOM_SELECTORS.FOOTER || "#footer", footerPath)
        .then(() => console.log("Footer loaded."))
        .catch((error) => console.error("Error loading footer:", error))
    );
  } else {
    console.warn("Footer placeholder not found.");
  }

  Promise.all(loadPromises).then(() => {
    console.log("Components potentially loaded, initializing UI handlers.");
    initializeThemeToggle();
    initializeMobileMenu();
  });
});

function initializeThemeToggle() {
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const body = document.body;
  const lightIcon = themeToggleBtn?.querySelector(".theme-icon-light");
  const darkIcon = themeToggleBtn?.querySelector(".theme-icon-dark");

  if (!themeToggleBtn || !lightIcon || !darkIcon) {
    console.warn("Theme toggle button or icons not found.");
    return;
  }

  const applyTheme = (isDark) => {
    if (isDark) {
      body.classList.add("dark-mode");
      lightIcon.style.display = "none";
      darkIcon.style.display = "inline";
      themeToggleBtn.setAttribute("aria-label", "Switch to light theme");
    } else {
      body.classList.remove("dark-mode");
      lightIcon.style.display = "inline";
      darkIcon.style.display = "none";
      themeToggleBtn.setAttribute("aria-label", "Switch to dark theme");
    }
  };

  const savedTheme = localStorage.getItem("theme");

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  let isCurrentThemeDark =
    savedTheme === "dark" || (savedTheme === null && prefersDark);
  applyTheme(isCurrentThemeDark);

  themeToggleBtn.addEventListener("click", () => {
    isCurrentThemeDark = !isCurrentThemeDark;
    applyTheme(isCurrentThemeDark);

    localStorage.setItem("theme", isCurrentThemeDark ? "dark" : "light");
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (event) => {
      if (localStorage.getItem("theme") === null) {
        isCurrentThemeDark = event.matches;
        applyTheme(isCurrentThemeDark);
      }
    });

  console.log("Theme toggle initialized.");
}

function initializeMobileMenu() {
  const togglerBtn = document.getElementById("navbar-toggler-btn");
  const linksContainer = document.getElementById("navbar-links-container");

  if (!togglerBtn || !linksContainer) {
    console.warn("Mobile menu toggler or links container not found.");
    return;
  }

  togglerBtn.addEventListener("click", () => {
    const isActive = linksContainer.classList.toggle("active");
    togglerBtn.setAttribute("aria-expanded", isActive ? "true" : "false");

    togglerBtn.textContent = isActive ? "✕" : "☰";
  });

  document.addEventListener("click", (event) => {
    if (
      !togglerBtn.contains(event.target) &&
      !linksContainer.contains(event.target) &&
      linksContainer.classList.contains("active")
    ) {
      linksContainer.classList.remove("active");
      togglerBtn.setAttribute("aria-expanded", "false");
      togglerBtn.textContent = "☰";
    }
  });

  console.log("Mobile menu initialized.");
}

console.log("main.js initialized with UI handlers.");
