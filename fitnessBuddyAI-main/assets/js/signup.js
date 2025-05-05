import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { AppConfig } from "./config.js";
import { redirectTo } from "./utils/navigation.js";
import { showNotification } from "./utils/ui-helpers.js";

const signupTab = document.getElementById("signup-tab");
const loginTab = document.getElementById("login-tab");
const signupFormContainer = document.getElementById("signup-form-container");
const loginFormContainer = document.getElementById("login-form-container");
const toLoginLink = document.getElementById("to-login");
const toSignupLink = document.getElementById("to-signup");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const resetPasswordLink = document.getElementById("reset-password-link");

function showSignup() {
  loginTab?.classList.remove("active");
  signupTab?.classList.add("active");
  loginFormContainer?.classList.remove("active");
  signupFormContainer?.classList.add("active");
  clearErrorMessages();
}

function showLogin() {
  signupTab?.classList.remove("active");
  loginTab?.classList.add("active");
  signupFormContainer?.classList.remove("active");
  loginFormContainer?.classList.add("active");
  clearErrorMessages();
}

function clearErrorMessages() {
  document.querySelectorAll(".error-message").forEach((el) => {
    el.style.display = "none";
    el.textContent = "";
  });
}

function showError(formOrFieldId, message, isFormError = false) {
  const errorElement = !isFormError
    ? document.getElementById(formOrFieldId + "-error")
    : document.getElementById(formOrFieldId + "-form-error");

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  } else {
    console.warn(
      `Error element not found for ID: ${formOrFieldId}-${
        isFormError ? "form-" : ""
      }error`
    );
    showNotification(`Error: ${message}`, "error");
  }
}

function togglePasswordVisibility(targetInputId) {
  const passwordInput = document.getElementById(targetInputId);
  if (!passwordInput) return;

  const icon = passwordInput
    .closest(".password-container")
    ?.querySelector(".toggle-password");
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    if (icon) icon.textContent = "🔒";
  } else {
    passwordInput.type = "password";
    if (icon) icon.textContent = "👁️";
  }
}

function setLoadingState(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  const spinner = button.querySelector(".spinner");

  button.disabled = isLoading;
  if (spinner) {
    spinner.style.display = isLoading ? "inline-block" : "none";
  }
}

if (signupTab) signupTab.addEventListener("click", showSignup);
if (loginTab) loginTab.addEventListener("click", showLogin);
if (toLoginLink)
  toLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showLogin();
  });
if (toSignupLink)
  toSignupLink.addEventListener("click", (e) => {
    e.preventDefault();
    showSignup();
  });

document.addEventListener("click", function (event) {
  const target = event.target;
  if (target.classList.contains("toggle-password")) {
    const targetInputId = target.dataset.target;
    if (targetInputId) {
      togglePasswordVisibility(targetInputId);
    }
  }
});

if (signupForm) {
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrorMessages();

    const nameInput = document.getElementById("signup-name");
    const emailInput = document.getElementById("signup-email");
    const passwordInput = document.getElementById("signup-password");
    const confirmPasswordInput = document.getElementById("signup-confirm");

    const name = nameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";

    let isValid = true;
    if (!name) {
      showError("signup-name", "Full Name is required");
      isValid = false;
    }
    if (!email) {
      showError("signup-email", "Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      showError("signup-email", "Please enter a valid email address");
      isValid = false;
    }
    if (!password) {
      showError("signup-password", "Password is required");
      isValid = false;
    } else if (password.length < 6) {
      showError("signup-password", "Password must be at least 6 characters");
      isValid = false;
    }
    if (password !== confirmPassword) {
      showError("signup-confirm", "Passwords do not match");
      isValid = false;
    }

    if (!isValid) return;

    setLoadingState("signup-btn", true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Firebase Auth user created:", user.uid);

      await updateProfile(user, { displayName: name });
      console.log("Firebase Auth profile updated with display name:", name);

      const userDocRef = doc(
        db,
        AppConfig.FIRESTORE_COLLECTIONS.USERS,
        user.uid
      );
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: name,
        createdAt: serverTimestamp(),
        partnerId: null,
      });
      console.log("Firestore user document created for:", user.uid);

      showNotification(
        `Account created successfully for ${name}! Redirecting...`,
        "success"
      );
      this.reset();
      redirectTo("DASHBOARD");
    } catch (error) {
      console.error("Signup error:", error);
      console.error("Signup error code:", error.code);

      let errorMessage = "An unexpected error occurred. Please try again.";
      switch (error.code) {
        case "auth/email-already-in-use":
          showError("signup-email", "This email is already registered.");
          isValid = false;
          break;
        case "auth/invalid-email":
          showError("signup-email", "Please enter a valid email address.");
          isValid = false;
          break;
        case "auth/weak-password":
          showError(
            "signup-password",
            "Password is too weak (min. 6 characters)."
          );
          isValid = false;
          break;
        case "firestore/permission-denied":
          errorMessage = "Error saving profile. Please try again later.";
          break;
      }
      if (isValid) {
        showError("signup", errorMessage, true);
      }
    } finally {
      setLoadingState("signup-btn", false);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrorMessages();

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    let isValid = true;
    if (!email) {
      showError("login-email", "Email is required");
      isValid = false;
    }
    if (!password) {
      showError("login-password", "Password is required");
      isValid = false;
    }
    if (!isValid) return;

    setLoadingState("login-btn", true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      showNotification(
        `Welcome back, ${user.displayName || user.email}! Redirecting...`,
        "success"
      );
      this.reset();
      redirectTo("DASHBOARD");
    } catch (error) {
      console.error("Login error:", error);
      console.error("Login error code:", error.code);

      let errorMessage = "An unexpected error occurred. Please try again.";
      let showGeneralError = true;
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
        case "auth/wrong-password":
          showError("login", "Invalid email or password.", true);
          showGeneralError = false;
          break;
        case "auth/invalid-email":
          showError("login-email", "Please enter a valid email address.");
          showGeneralError = false;
          break;
        case "auth/user-disabled":
          showError("login", "This account has been disabled.", true);
          showGeneralError = false;
          break;
        case "auth/too-many-requests":
          errorMessage =
            "Access temporarily disabled due to too many attempts. Please reset your password or try again later.";
          break;
      }
      if (showGeneralError) {
        showError("login", errorMessage, true);
      }
    } finally {
      setLoadingState("login-btn", false);
    }
  });
}

if (resetPasswordLink) {
  resetPasswordLink.addEventListener("click", async function (e) {
    e.preventDefault();
    clearErrorMessages();

    const emailInput = document.getElementById("login-email");
    const email = emailInput?.value.trim() || "";

    if (!email) {
      showError(
        "login-email",
        "Enter your email address above first to reset password."
      );
      emailInput?.focus();
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      showError("login-email", "Please enter a valid email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showNotification(
        "Password reset email sent. Please check your inbox (and spam folder).",
        "success"
      );
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/invalid-email") {
        showError("login-email", "Please enter a valid email address.");
      } else if (error.code === "auth/user-not-found") {
        showError("login-email", "No account found with this email address.");
      } else {
        showError(
          "login",
          "Error sending password reset email. Please try again.",
          true
        );
      }
    }
  });
}

console.log("signup.js loaded and configured with Firestore integration.");
