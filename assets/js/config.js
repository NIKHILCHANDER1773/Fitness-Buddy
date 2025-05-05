const secureApiKey = "AIzaSyAK2rLIcEm4ZIUodPWhyQwzwTVJM2wZWzo";

export const AppConfig = {
  MAPS_API_KEY: "AIzaSyD-spJYTf3CHXNY_OBcP588qGpT0De-wSQ",

  FIREBASE_CONFIG: {
    apiKey: secureApiKey || "AIzaSyAK2rLIcEm4ZIUodPWhyQwzwTVJM2wZWzo",
    authDomain: "fitness-buddy-e44f7.firebaseapp.com",
    projectId: "fitness-buddy-e44f7",
    storageBucket: "fitness-buddy-e44f7.appspot.com",
    messagingSenderId: "750411075422",
    appId: "1:750411075422:web:2ef218847e9c9fe74e09cf",
  },

  ROUTES: {
    HOME: "/",
    INDEX: "/index.html",
    SIGNUP: "/signup",
    LOGIN: "/signup",
    DASHBOARD: "/dashboard",
    ABOUT: "/about",
    BLOG: "/blog",
    MESSAGES: "/messages",
    WORKOUT: "/workout",
    GYM_LOCATOR: "/gym",
    FEEDBACK: "/feedback",
    AUTH: "/signup",
  },

  COMPONENTS_PATH: "/components",

  FIRESTORE_COLLECTIONS: {
    WORKOUTS: "workouts",
    USERS: "users",
    CHATS: "chats",
    MESSAGES: "messages",
  },

  DOM_SELECTORS: {
    NAVBAR: "#navbar",
    FOOTER: "#footer",
    LOGOUT_BUTTON: "#logout-btn",
    WORKOUT_FORM: "#workout-form",
  },
};

if (
  !AppConfig.FIREBASE_CONFIG.apiKey ||
  AppConfig.FIREBASE_CONFIG.apiKey === "YOUR_API_KEY"
) {
  console.warn(
    "%cFirebase config in /assets/js/config.js is using placeholder values! Replace them with your actual project keys.",
    "color: red; font-weight: bold; background-color: yellow; padding: 5px;"
  );
}

console.log("AppConfig loaded.");
