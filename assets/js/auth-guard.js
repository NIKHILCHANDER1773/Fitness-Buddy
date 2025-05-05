import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { AppConfig } from "./config.js";
import { redirectTo } from "./utils/navigation.js";
import { handleLogout } from "./utils/auth.js";

function updateNavbarUI(user) {
  const loggedInElements = document.querySelectorAll(".auth-required");
  const loggedOutElements = document.querySelectorAll(".auth-guest");
  const userGreeting = document.getElementById("navbar-user-greeting");
  const logoutButton = document.getElementById("logout-btn");

  if (user) {
    loggedInElements.forEach(
      (el) => (el.style.display = el.tagName === "LI" ? "list-item" : "flex")
    );
    loggedOutElements.forEach((el) => (el.style.display = "none"));

    if (userGreeting) {
      userGreeting.textContent = `Welcome, ${
        user.displayName || user.email || "User"
      }!`;
    }

    if (logoutButton && !logoutButton.dataset.listenerAttached) {
      console.log("Attaching logout listener in auth-guard");
      logoutButton.addEventListener("click", handleLogout);
      logoutButton.dataset.listenerAttached = "true";
    }
  } else {
    loggedInElements.forEach((el) => (el.style.display = "none"));
    loggedOutElements.forEach(
      (el) => (el.style.display = el.tagName === "DIV" ? "block" : "flex")
    );

    if (userGreeting) {
      userGreeting.textContent = "";
    }
  }

  if (typeof setActiveNavLink === "function") {
    setActiveNavLink();
  }
}

onAuthStateChanged(auth, (user) => {
  const checkNavbarAndUpdate = () => {
    const navbar = document.querySelector(
      AppConfig.DOM_SELECTORS.NAVBAR || "#navbar"
    );
    if (navbar && navbar.innerHTML.trim() !== "") {
      console.log(
        "Auth state changed, updating navbar UI for user:",
        user ? user.uid : "null"
      );
      updateNavbarUI(user);
    } else {
      console.log("Navbar not ready, retrying UI update soon...");
      setTimeout(checkNavbarAndUpdate, 200);
    }
  };
  checkNavbarAndUpdate();

  const currentPath = window.location.pathname;
  const normalizedCurrentPath =
    currentPath.endsWith("/") && currentPath.length > 1
      ? currentPath.slice(0, -1)
      : currentPath;

  const publicPages = [
    AppConfig.ROUTES.HOME,
    AppConfig.ROUTES.INDEX,
    AppConfig.ROUTES.SIGNUP,
    AppConfig.ROUTES.AUTH,
    AppConfig.ROUTES.ABOUT,
    AppConfig.ROUTES.BLOG,
  ].filter((p) => p);
  const authPages = [
    AppConfig.ROUTES.SIGNUP,
    AppConfig.ROUTES.LOGIN,
    AppConfig.ROUTES.AUTH,
  ].filter((p) => p);

  const isPublicPage = publicPages.some((page) => {
    const normalizedPage =
      page.endsWith("/") && page.length > 1 ? page.slice(0, -1) : page;
    if (normalizedPage === "/" || normalizedPage === "/index.html") {
      return (
        normalizedCurrentPath === "/" || normalizedCurrentPath === "/index.html"
      );
    }
    return normalizedCurrentPath === normalizedPage;
  });

  const isAuthPage = authPages.some((page) => {
    const normalizedPage =
      page.endsWith("/") && page.length > 1 ? page.slice(0, -1) : page;
    return normalizedCurrentPath === normalizedPage;
  });

  console.log(
    `Auth Guard Check: User=${
      user ? user.uid : "null"
    }, Path=${currentPath}, IsAuthPage=${isAuthPage}, IsPublicPage=${isPublicPage}`
  );

  if (user) {
    if (isAuthPage) {
      console.log(
        "Auth Guard: User logged in, on auth page. Redirecting to Dashboard."
      );
      redirectTo("DASHBOARD", true);
    }
  } else {
    if (!isPublicPage) {
      console.log(
        "Auth Guard: User not logged in, on protected page. Redirecting to Sign Up/Login."
      );
      redirectTo("SIGNUP", true);
    }
  }
});

console.log("Auth Guard initialized with Navbar UI update logic.");
