import { signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "../firebase-config.js";
import { showNotification } from "./ui-helpers.js";
import { redirectTo } from "./navigation.js";
import { AppConfig } from "../config.js";

export function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    console.log("Attempting logout...");
    signOut(auth)
      .then(() => {
        console.log("Logout successful via handleLogout");
        showNotification("Logged out successfully.", "info");

        redirectTo(AppConfig.ROUTES.SIGNUP ? "SIGNUP" : "HOME", true);
      })
      .catch((error) => {
        console.error("Logout Error:", error);
        showNotification(`Logout failed: ${error.message}`, "error");
      });
  } else {
    console.log("Logout cancelled.");
  }
}

console.log("auth utility loaded (handleLogout)");
