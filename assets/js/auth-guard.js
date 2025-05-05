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

  let currentPath = window.location.pathname;
  if (currentPath.endsWith("/index.html")) {
    currentPath = "/";
  } else if (currentPath !== "/" && currentPath.endsWith("/")) {
    currentPath = currentPath.slice(0, -1);
  }

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

  const isAuthPage = authPages.includes(currentPath);
  const isPublicPage = publicPages.includes(currentPath);
  const isProtectedPage = !isPublicPage && !isAuthPage;

  console.log(
    `Auth Guard Check: User=${user ? user.uid : "null"}, Path=${
      window.location.pathname
    } (Normalized: ${currentPath}), IsAuthPage=${isAuthPage}, IsPublicPage=${isPublicPage}, IsProtectedPage=${isProtectedPage}`
  );

  if (user) {
    if (isAuthPage) {
      console.log(
        "Auth Guard: User logged in, on auth page. Redirecting to Dashboard."
      );

      redirectTo("DASHBOARD", true);
    } else {
      console.log(
        "Auth Guard: User logged in, not on auth page. No redirect needed."
      );
    }
  } else {
    if (isProtectedPage) {
      console.log(
        "Auth Guard: User not logged in, on protected page. Redirecting to Sign Up."
      );
      redirectTo("SIGNUP", true);
    } else {
      console.log(
        "Auth Guard: User not logged in, on public/auth page. No redirect needed."
      );
    }
  }
});

console.log(
  "Auth Guard initialized with improved path normalization and redirection logic."
);
