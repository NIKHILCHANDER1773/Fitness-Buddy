import { auth, db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { AppConfig } from "./config.js";
import { redirectTo } from "./utils/navigation.js";
import { showNotification } from "./utils/ui-helpers.js";
import { handleLogout } from "./utils/auth.js";

const workoutForm = document.querySelector(
  AppConfig.DOM_SELECTORS.WORKOUT_FORM || "#workout-form"
);
const logoutBtn = document.querySelector(
  AppConfig.DOM_SELECTORS.LOGOUT_BUTTON || "#logout-btn"
);
const userDisplayNameSpan = document.getElementById("user-display-name");
const activityListElement = document.querySelector(".activity-list");
const statWeeklyActivityValue = document.getElementById("stat-weekly-value");
const statTotalMinutesValue = document.getElementById("stat-minutes-value");
const statCaloriesValue = document.getElementById("stat-calories-value");
const goalDescriptionText = document.getElementById("goal-description");
const goalProgressFill = document.getElementById("goal-progress-fill");
const goalProgressLabelCurrent = document.getElementById(
  "goal-progress-label-current"
);
const goalProgressLabelTotal = document.getElementById(
  "goal-progress-label-total"
);
const goalProgressPercent = document.getElementById("goal-progress-percent");
const goalContainer = document.getElementById("goal-container");
const noGoalMessage = document.getElementById("no-goal-message");

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Dashboard: User logged in", user.uid);
    if (userDisplayNameSpan) {
      userDisplayNameSpan.textContent =
        user.displayName || user.email || "User";
    }
    loadRecentActivity(user.uid);
    loadUserStats(user.uid);
    loadUserGoals(user.uid);
    if (
      logoutBtn &&
      typeof handleLogout === "function" &&
      !logoutBtn.dataset.listenerAttached
    ) {
      logoutBtn.addEventListener("click", handleLogout);
      logoutBtn.dataset.listenerAttached = "true";
    }
  } else {
    console.log("Dashboard: User not logged in...");
    redirectTo("SIGNUP");
  }
});

if (workoutForm) {
  workoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const typeElement = workoutForm.querySelector("#exercise-type");
    const durationElement = workoutForm.querySelector("#duration");
    const intensityElement = workoutForm.querySelector("#intensity");
    const notesElement = workoutForm.querySelector("#notes");
    const type = typeElement?.value;
    const duration = durationElement?.value;
    const intensity = intensityElement?.value;
    const notes = notesElement?.value || "";
    if (!type || !duration || !intensity) {
      showNotification("Type, Duration, Intensity required.", "error");
      return;
    }
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      showNotification("Invalid duration.", "error");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        showNotification("Must be logged in.", "error");
        redirectTo("SIGNUP");
        return;
      }
      await addDoc(collection(db, AppConfig.FIRESTORE_COLLECTIONS.WORKOUTS), {
        uid: user.uid,
        type,
        duration: durationNum,
        intensity,
        notes,
        timestamp: serverTimestamp(),
      });
      showNotification("Workout logged!", "success");
      workoutForm.reset();

      loadRecentActivity(user.uid);
      loadUserStats(user.uid);
      loadUserGoals(user.uid);
    } catch (error) {
      console.error("Log workout error:", error);
      showNotification("Error logging workout.", "error");
    }
  });
} else {
  console.warn("Workout form not found.");
}

function getDateRangeJS(rangeType) {
  const now = new Date();
  let startDate;
  let endDate = new Date(now);

  if (rangeType === "week") {
    const dayOfWeek = now.getDay();
    startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    );
    startDate.setHours(0, 0, 0, 0);
  } else if (rangeType === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    startDate = new Date(0);
  }

  return { startDate, endDate };
}

async function loadUserStats(userId) {
  console.log("Loading user stats for:", userId);

  if (statWeeklyActivityValue) statWeeklyActivityValue.textContent = "--";
  if (statTotalMinutesValue) statTotalMinutesValue.textContent = "-- min";
  if (statCaloriesValue) statCaloriesValue.textContent = "----";

  const workoutsRef = collection(db, AppConfig.FIRESTORE_COLLECTIONS.WORKOUTS);
  const { startDate: weekStartDateJS } = getDateRangeJS("week");

  const userWorkoutsQuery = query(workoutsRef, where("uid", "==", userId));

  try {
    const querySnapshot = await getDocs(userWorkoutsQuery);

    let weeklyCount = 0;
    let weeklyMinutes = 0;
    let weeklyCaloriesEstimate = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const workoutDate = data.timestamp?.toDate();

      if (workoutDate && workoutDate >= weekStartDateJS) {
        weeklyCount++;
        weeklyMinutes += data.duration || 0;

        const intensityMultiplier =
          data.intensity?.toLowerCase() === "high" ||
          data.intensity?.toLowerCase() === "extreme"
            ? 10
            : data.intensity?.toLowerCase() === "moderate"
            ? 7
            : 5;
        weeklyCaloriesEstimate += (data.duration || 0) * intensityMultiplier;
      }
    });

    console.log(
      `Stats (Client Filtered): Count=${weeklyCount}, Mins=${weeklyMinutes}, Cals=${weeklyCaloriesEstimate}`
    );

    if (statWeeklyActivityValue)
      statWeeklyActivityValue.textContent = `${weeklyCount} workout${
        weeklyCount !== 1 ? "s" : ""
      }`;
    if (statTotalMinutesValue)
      statTotalMinutesValue.textContent = `${weeklyMinutes} min`;
    if (statCaloriesValue)
      statCaloriesValue.textContent = weeklyCaloriesEstimate.toLocaleString();
  } catch (error) {
    console.error("Error loading user stats:", error);
    showNotification("Could not load workout stats.", "error");
  }
}

async function loadUserGoals(userId) {
  console.log("Loading user goals for:", userId);

  const monthlyWorkoutGoal = 20;
  const goalDesc = `Complete ${monthlyWorkoutGoal} workouts this month`;

  if (goalDescriptionText) goalDescriptionText.textContent = goalDesc;
  if (goalContainer) goalContainer.style.display = "block";
  if (noGoalMessage) noGoalMessage.style.display = "none";

  if (goalProgressFill) goalProgressFill.style.width = "0%";
  if (goalProgressLabelCurrent) goalProgressLabelCurrent.textContent = "--";
  if (goalProgressLabelTotal)
    goalProgressLabelTotal.textContent = `of ${monthlyWorkoutGoal} completed`;
  if (goalProgressPercent) goalProgressPercent.textContent = "--%";

  const workoutsRef = collection(db, AppConfig.FIRESTORE_COLLECTIONS.WORKOUTS);
  const { startDate: monthStartDateJS, endDate: monthEndDateJS } =
    getDateRangeJS("month");

  const userWorkoutsQuery = query(workoutsRef, where("uid", "==", userId));

  try {
    const querySnapshot = await getDocs(userWorkoutsQuery);

    let workoutsThisMonth = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const workoutDate = data.timestamp?.toDate();

      if (
        workoutDate &&
        workoutDate >= monthStartDateJS &&
        workoutDate <= monthEndDateJS
      ) {
        workoutsThisMonth++;
      }
    });

    console.log(
      `Goal Progress (Client Filtered): ${workoutsThisMonth} workouts this month`
    );

    const progressPercent = Math.min(
      100,
      Math.round((workoutsThisMonth / monthlyWorkoutGoal) * 100)
    );
    if (goalProgressLabelCurrent)
      goalProgressLabelCurrent.textContent = `${workoutsThisMonth}`;

    if (goalProgressPercent)
      goalProgressPercent.textContent = `${progressPercent}%`;
    if (goalProgressFill) goalProgressFill.style.width = `${progressPercent}%`;
  } catch (error) {
    console.error("Error loading goal progress:", error);
    showNotification("Could not load goal progress.", "error");
    if (goalDescriptionText)
      goalDescriptionText.textContent = "Goal progress unavailable";

    if (goalProgressFill) goalProgressFill.style.width = "0%";
    if (goalProgressLabelCurrent)
      goalProgressLabelCurrent.textContent = "Error";
    if (goalProgressLabelTotal) goalProgressLabelTotal.textContent = "";
    if (goalProgressPercent) goalProgressPercent.textContent = "";
  }
}

async function loadRecentActivity(userId) {
  if (!activityListElement) {
    console.warn("Activity list element missing.");
    return;
  }
  activityListElement.innerHTML =
    '<li class="activity-item text-center text-muted">Loading activity...</li>';
  try {
    const workoutsRef = collection(
      db,
      AppConfig.FIRESTORE_COLLECTIONS.WORKOUTS
    );
    const q = query(workoutsRef, where("uid", "==", userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      activityListElement.innerHTML =
        '<li class="activity-item text-center text-muted">No recent activity.</li>';
      return;
    }
    const workoutDocs = querySnapshot.docs;
    workoutDocs.sort(
      (a, b) =>
        (b.data().timestamp?.toMillis() || 0) -
        (a.data().timestamp?.toMillis() || 0)
    );
    const latestWorkouts = workoutDocs.slice(0, 5);
    let activityHtml = "";
    latestWorkouts.forEach((doc) => {
      const workout = doc.data();
      const date =
        workout.timestamp?.toDate().toLocaleDateString() || "Unknown";
      const iconClass = getIconForWorkoutType(workout.type);
      activityHtml += `<li class="activity-item"><div class="activity-icon"><i class="fas ${iconClass}"></i></div><div class="activity-details"><h4>${
        workout.type || "Workout"
      }</h4><p>${date} • ${workout.duration} min • ${
        workout.intensity || ""
      } intensity</p>${
        workout.notes ? `<p><small>Notes: ${workout.notes}</small></p>` : ""
      }</div></li>`;
    });
    activityListElement.innerHTML = activityHtml;
  } catch (error) {
    console.error("Load activity error:", error);
    showNotification("Could not load activity.", "error");
    activityListElement.innerHTML =
      '<li class="activity-item text-center text-muted">Error loading activity.</li>';
  }
}

function getIconForWorkoutType(type) {
  switch (type?.toLowerCase()) {
    case "running":
      return "fa-person-running";
    case "strength":
    case "strength training":
      return "fa-dumbbell";
    case "cycling":
      return "fa-person-biking";
    case "yoga":
      return "fa-person-praying";
    case "swimming":
      return "fa-person-swimming";
    case "cardio":
      return "fa-heart-pulse";
    default:
      return "fa-dumbbell";
  }
}

console.log("dashboard.js loaded (Client-side stats/goals filtering).");
