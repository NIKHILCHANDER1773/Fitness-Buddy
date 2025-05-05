import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { AppConfig } from "./config.js";

const app = initializeApp(AppConfig.FIREBASE_CONFIG);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
