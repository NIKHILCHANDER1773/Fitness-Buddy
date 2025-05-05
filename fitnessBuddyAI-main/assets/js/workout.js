import { app, auth, db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { redirectTo } from "./utils/navigation.js";
import { showNotification } from "./utils/ui-helpers.js";
import { AppConfig } from "./config.js";

let exercises = [];

const addExerciseBtn = document.getElementById("add-exercise");
const exerciseList = document.getElementById("exercise-list");
const form = document.getElementById("workout-form");
const historyContainer = document.getElementById("history-container");
const noHistory = document.getElementById("no-history");
const loadingHistory = document.querySelector(".loading-history");
const logoutBtn = document.getElementById("logout-btn");
const planCardsContainer = document.querySelector(".plans-container");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log("Workout Page: User not logged in, redirecting...");
    redirectTo("SIGNUP");
  } else {
    console.log("Workout Page: User logged in:", user.uid);
    loadWorkoutHistory(user.uid);
  }
});

if (addExerciseBtn) {
  addExerciseBtn.addEventListener("click", () => {
    const name = prompt("Exercise Name:");
    if (!name) return;
    const sets = prompt("Sets:");
    if (!sets) return;
    const reps = prompt("Reps (e.g., 12 or 45s):");
    if (!reps) return;
    const parsedSets = parseInt(sets);
    if (isNaN(parsedSets) || parsedSets <= 0) {
      showNotification("Invalid sets.", "error");
      return;
    }
    const exercise = { name: name.trim(), sets: parsedSets, reps: reps.trim() };
    exercises.push(exercise);
    addExerciseToList(exercise.name, exercise.sets, exercise.reps);
  });
}
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateInput = document.getElementById("workout-date");
    const typeInput = document.getElementById("workout-type");
    const durationInput = document.getElementById("workout-duration");
    const notesInput = document.getElementById("workout-notes");
    const date = dateInput?.value;
    const type = typeInput?.value;
    const duration = durationInput?.value;
    const notes = notesInput?.value || "";
    if (!date || !type || !duration) {
      showNotification("Date, Type, and Duration are required.", "error");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      showNotification("Must be logged in.", "error");
      redirectTo("SIGNUP");
      return;
    }
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      showNotification("Invalid duration.", "error");
      return;
    }
    if (exercises.length === 0 && !confirm("No exercises added. Save anyway?"))
      return;
    const workoutData = {
      uid: user.uid,
      date,
      type,
      duration: durationNum,
      notes,
      exercises,
      timestamp: Timestamp.fromDate(new Date()),
    };
    const submitButton = form.querySelector(".btn-submit");
    if (submitButton) submitButton.disabled = true;
    try {
      await addDoc(
        collection(db, AppConfig.FIRESTORE_COLLECTIONS.WORKOUTS),
        workoutData
      );
      showNotification("Workout saved!", "success");
      form.reset();
      exerciseList.innerHTML = "";
      exercises = [];
      loadWorkoutHistory(user.uid);
    } catch (error) {
      console.error("Save error:", error);
      showNotification("Error saving workout.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Logout?")) {
      signOut(auth)
        .then(() => {
          showNotification("Logged out.", "info");
          redirectTo("SIGNUP");
        })
        .catch((error) => {
          console.error("Logout Error:", error);
          showNotification("Logout failed.", "error");
        });
    }
  });
}
if (planCardsContainer) {
  planCardsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-load-plan");
    if (button) {
      const planCard = button.closest(".plan-card");
      if (planCard) {
        const planName = planCard.dataset.plan;
        if (planName) loadWorkoutPlan(planName);
      }
    }
  });
}

function addExerciseToList(name, sets, reps) {
  if (!exerciseList) return;
  const li = document.createElement("li");
  li.className = "exercise-list-item";
  li.dataset.name = name;
  li.dataset.sets = sets;
  li.dataset.reps = reps;
  li.innerHTML = `<div class="exercise-details">${name}</div><div>${sets} sets × ${reps}</div>`;
  const removeBtn = document.createElement("span");
  removeBtn.textContent = " ❌";
  removeBtn.className = "remove-exercise";
  removeBtn.style.cursor = "pointer";
  removeBtn.style.marginLeft = "10px";
  removeBtn.setAttribute("aria-label", `Remove ${name}`);
  removeBtn.onclick = () => {
    li.remove();
    const indexToRemove = exercises.findIndex(
      (ex) => ex.name === name && ex.sets === sets && ex.reps === reps
    );
    if (indexToRemove > -1) exercises.splice(indexToRemove, 1);
    console.log("Exercises after removal:", exercises);
  };
  li.appendChild(removeBtn);
  exerciseList.appendChild(li);
}

async function loadWorkoutHistory(userId) {
  if (!historyContainer || !noHistory || !loadingHistory) return;
  if (!userId) {
    console.log("No user ID for history.");
    historyContainer.innerHTML = "<p>Please log in to see history.</p>";
    noHistory.style.display = "none";
    loadingHistory.style.display = "none";
    return;
  }

  loadingHistory.style.display = "block";
  noHistory.style.display = "none";
  historyContainer.innerHTML = "";

  try {
    const workoutsRef = collection(
      db,
      AppConfig.FIRESTORE_COLLECTIONS.WORKOUTS
    );

    const q = query(workoutsRef, where("uid", "==", userId));

    const querySnapshot = await getDocs(q);
    loadingHistory.style.display = "none";

    if (querySnapshot.empty) {
      noHistory.style.display = "block";
    } else {
      noHistory.style.display = "none";

      const workoutDocs = querySnapshot.docs;

      workoutDocs.sort((docA, docB) => {
        const timeA = docA.data().timestamp?.toMillis() || 0;
        const timeB = docB.data().timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      workoutDocs.forEach((doc) => {
        const workout = doc.data();
        const div = document.createElement("div");
        div.className = "history-card";

        const workoutDate = workout.timestamp
          ? workout.timestamp.toDate().toLocaleDateString()
          : workout.date || "Unknown Date";

        div.innerHTML = `
          <h4>${workoutDate} - ${workout.type || "Workout"}</h4>
          <p><strong>Duration:</strong> ${workout.duration || "?"} minutes</p>
          ${
            workout.notes
              ? `<p><strong>Notes:</strong> ${workout.notes}</p>`
              : ""
          }
          ${
            workout.exercises && workout.exercises.length > 0
              ? `
            <h5>Exercises Logged:</h5>
            <ul class="exercise-list">
              ${workout.exercises
                .map(
                  (ex) => `
              <li class="exercise-list-item">
                  <div class="exercise-details">${ex.name || "?"}</div>
                  <div>${ex.sets || "?"} sets × ${ex.reps || "?"} reps</div>
              </li>`
                )
                .join("")}
            </ul>`
              : ""
          }
        `;
        historyContainer.appendChild(div);
      });
    }
  } catch (error) {
    console.error("Error loading workout history:", error);

    if (error.code === "permission-denied") {
      showNotification(
        "Error: Permissions missing to read workout history.",
        "error"
      );
      historyContainer.innerHTML =
        "<p>Could not load history due to permissions.</p>";
    } else {
      showNotification("Failed to load workout history.", "error");
      historyContainer.innerHTML =
        "<p>Error loading history. Please try refreshing.</p>";
    }
    noHistory.style.display = "none";
    loadingHistory.style.display = "none";
  }
}

function loadWorkoutPlan(planName) {
  exercises = [];
  if (exerciseList) exerciseList.innerHTML = "";
  const PRESET_PLANS = {
    "full-body": [
      { name: "Squats", sets: 3, reps: 12 },
      { name: "Push-ups", sets: 3, reps: 15 },
      { name: "Bent-Over Rows", sets: 3, reps: 12 },
      { name: "Overhead Press", sets: 3, reps: 10 },
    ],
    "upper-body": [
      { name: "Bench Press", sets: 3, reps: 10 },
      { name: "Shoulder Press", sets: 3, reps: 12 },
      { name: "Pull-ups / Lat Pulldown", sets: 3, reps: 8 },
      { name: "Bicep Curls", sets: 3, reps: 12 },
    ],
    "lower-body": [
      { name: "Squats", sets: 3, reps: 10 },
      { name: "Romanian Deadlifts", sets: 3, reps: 12 },
      { name: "Leg Press", sets: 3, reps: 15 },
      { name: "Calf Raises", sets: 3, reps: 20 },
    ],
    core: [
      { name: "Plank", sets: 3, reps: "60s" },
      { name: "Crunches", sets: 3, reps: 20 },
      { name: "Russian Twists", sets: 3, reps: 15 },
      { name: "Bird Dog", sets: 3, reps: 12 },
    ],
    hiit: [
      { name: "Jumping Jacks", sets: 1, reps: "45s work, 15s rest" },
      { name: "High Knees", sets: 1, reps: "45s work, 15s rest" },
      { name: "Burpees", sets: 1, reps: "45s work, 15s rest" },
      { name: "Mountain Climbers", sets: 1, reps: "45s work, 15s rest" },
    ],
    custom: [],
  };
  const planExercises = PRESET_PLANS[planName];
  const typeDropdown = document.getElementById("workout-type");
  if (planName === "custom") {
    showNotification("Add exercises manually below.", "info");
    if (typeDropdown) typeDropdown.value = "Custom";
  } else if (planExercises && planExercises.length > 0) {
    if (typeDropdown) {
      const matchingOption = Array.from(typeDropdown.options).find((opt) =>
        opt.value.toLowerCase().includes(planName.split("-")[0])
      );
      typeDropdown.value = matchingOption ? matchingOption.value : "Custom";
    }
    planExercises.forEach((ex) => {
      exercises.push(ex);
      addExerciseToList(ex.name, ex.sets, ex.reps);
    });
    showNotification(
      `${planName.replace("-", " ").toUpperCase()} plan loaded.`,
      "success"
    );
  } else if (planExercises) {
    showNotification(
      `No exercises defined for ${planName} plan. Add manually.`,
      "info"
    );
    if (typeDropdown) typeDropdown.value = "Custom";
  } else {
    showNotification(`Unknown plan: ${planName}`, "error");
  }
}

console.log("workout.js loaded (Client-side history sorting).");
