import { app, auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  collection,
  query,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  updateDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { AppConfig } from "./config.js";
import { showNotification } from "./utils/ui-helpers.js";

const partnerListContainer = document.getElementById("partner-list-container");
const newPartnerOptionsDiv = document.getElementById("new-partner-options");
const chatWithHeader = document.getElementById("chat-with-header");
const chatHeaderDiv = document.getElementById("chat-header");
const chatMessagesDiv = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const starterMessageButtons = document.querySelectorAll(".starter-message-btn");
const togglePartnersBtn = document.getElementById("toggle-partners-btn");
const messagesLayout = document.getElementById("messages-layout");

let currentUserId = null;
let currentUserData = null;
let selectedPartnerId = null;
let unsubscribeChat = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    const userRef = doc(
      db,
      AppConfig.FIRESTORE_COLLECTIONS.USERS,
      currentUserId
    );
    try {
      let userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.warn(
          `Messaging: User profile document not found for ID: ${currentUserId}. Attempting to create one.`
        );
        showNotification("Finalizing your profile setup...", "info");
        try {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || "N/A",
            name:
              user.displayName ||
              user.email ||
              `User ${user.uid.substring(0, 5)}`,
            createdAt: serverTimestamp(),
            partnerId: null,
          });
          userSnap = await getDoc(userRef);
          if (!userSnap.exists())
            throw new Error("Failed to fetch profile after creation.");
          showNotification("Profile setup complete!", "success");
        } catch (creationError) {
          console.error("Msg: Failed create profile:", creationError);
          showErrorState(
            creationError.code === "permission-denied"
              ? "Error: Perms missing."
              : "Could not create profile."
          );
          setChatInputEnabled(false);
          return;
        }
      }
      currentUserData = userSnap.data();
      setChatInputEnabled(true);
      await checkUserPartnerStatus(currentUserId, currentUserData);
    } catch (error) {
      console.error("Msg: Error fetching user data:", error);
      showErrorState("Error loading user data.");
      setChatInputEnabled(false);
    }
  } else {
    currentUserId = null;
    currentUserData = null;
    selectedPartnerId = null;
    if (unsubscribeChat) unsubscribeChat();
    unsubscribeChat = null;
    showErrorState("Please log in to use messaging.");
    setChatInputEnabled(false);
    if (partnerListContainer) partnerListContainer.innerHTML = "";
    if (chatMessagesDiv) chatMessagesDiv.innerHTML = "";
    if (newPartnerOptionsDiv) newPartnerOptionsDiv.innerHTML = "";
    messagesLayout?.classList.remove("partners-hidden");
  }
});

async function checkUserPartnerStatus(userId, userData) {
  clearErrorState();
  await fetchNewPartners(userId);

  messagesLayout?.classList.remove("partners-hidden");
  updateToggleButtonIcon(false);

  if (userData && userData.partnerId) {
    selectedPartnerId = userData.partnerId;
    const partnerRef = doc(
      db,
      AppConfig.FIRESTORE_COLLECTIONS.USERS,
      selectedPartnerId
    );
    try {
      const partnerSnap = await getDoc(partnerRef);
      const partnerName = partnerSnap.exists()
        ? partnerSnap.data().name ||
          partnerSnap.data().email ||
          `Buddy [${selectedPartnerId.substring(0, 5)}]`
        : "your buddy";
      await loadChat(userId, selectedPartnerId, partnerName);
      setChatInputEnabled(true);
    } catch (error) {
      console.error("Msg: Error fetching partner:", error);
      showErrorState("Could not load partner info.");
      await loadChat(userId, selectedPartnerId, "your buddy");
      setChatInputEnabled(true);
    }
  } else {
    selectedPartnerId = null;
    if (unsubscribeChat) unsubscribeChat();
    unsubscribeChat = null;
    if (chatWithHeader) chatWithHeader.textContent = "Find/Select Buddy";
    if (chatMessagesDiv)
      chatMessagesDiv.innerHTML =
        "<p><i>Select a buddy from the list to start chatting.</i></p>";

    setChatInputEnabled(false);
  }
}

async function fetchNewPartners(requestingUserId) {
  if (!newPartnerOptionsDiv) return;
  newPartnerOptionsDiv.innerHTML = "<p>Loading...</p>";
  try {
    const usersRef = collection(db, AppConfig.FIRESTORE_COLLECTIONS.USERS);
    const q = query(usersRef, limit(10));
    const querySnapshot = await getDocs(q);
    const partners = [];
    querySnapshot.forEach((doc) => {
      if (doc.id !== requestingUserId) {
        partners.push({ id: doc.id, ...doc.data() });
      }
    });
    if (partners.length > 0) {
      displayPartnerOptions(partners);
    } else {
      newPartnerOptionsDiv.innerHTML = "<p>No other users.</p>";
    }
  } catch (error) {
    console.error("Msg: Error fetching users:", error);
    newPartnerOptionsDiv.innerHTML = "<p>Error loading list.</p>";
  }
}

function displayPartnerOptions(partners) {
  if (!newPartnerOptionsDiv) return;
  newPartnerOptionsDiv.innerHTML = "<h4>Potential Buddies:</h4>";
  partners.forEach((partner) => {
    const partnerDiv = document.createElement("div");
    partnerDiv.classList.add("partner-item");
    const displayName =
      partner.name || partner.email || `User [${partner.id.substring(0, 5)}]`;
    partnerDiv.textContent = displayName;
    if (partner.partnerId && partner.partnerId !== currentUserId) {
      partnerDiv.textContent += " (Paired)";
      partnerDiv.style.opacity = "0.6";
      partnerDiv.style.cursor = "not-allowed";
      partnerDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        showNotification(`${displayName} is paired.`, "info");
      });
    } else if (partner.partnerId === currentUserId) {
      partnerDiv.textContent += " (Your Buddy)";
      partnerDiv.style.fontWeight = "bold";
      partnerDiv.style.cursor = "default";
    } else {
      partnerDiv.dataset.partnerId = partner.id;
      partnerDiv.dataset.partnerName = displayName;
      partnerDiv.addEventListener("click", () =>
        selectPartner(partner.id, displayName)
      );
    }
    newPartnerOptionsDiv.appendChild(partnerDiv);
  });
}

async function selectPartner(partnerId, partnerName) {
  if (!currentUserId || currentUserId === partnerId) {
    showNotification("Cannot select.", "error");
    return;
  }
  showNotification("Connecting...", "info");
  const usersCollection = AppConfig.FIRESTORE_COLLECTIONS.USERS;
  const currentUserRef = doc(db, usersCollection, currentUserId);
  const partnerUserRef = doc(db, usersCollection, partnerId);
  const batch = writeBatch(db);
  try {
    const partnerSnap = await getDoc(partnerUserRef);
    if (!partnerSnap.exists() || partnerSnap.data().partnerId) {
      showNotification("Buddy unavailable.", "error");
      await fetchNewPartners(currentUserId);
      return;
    }
    batch.update(currentUserRef, { partnerId: partnerId });
    batch.update(partnerUserRef, { partnerId: currentUserId });
    await batch.commit();
    selectedPartnerId = partnerId;
    if (currentUserData) currentUserData.partnerId = partnerId;
    await fetchNewPartners(currentUserId);
    showNotification(`Paired with ${partnerName}!`, "success");
    setChatInputEnabled(true);
    await loadChat(currentUserId, selectedPartnerId, partnerName);

    if (window.innerWidth > 768) {
      messagesLayout?.classList.add("partners-hidden");
      updateToggleButtonIcon(true);
    }
  } catch (error) {
    console.error("Msg: Error selecting partner:", error);
    showNotification("Pairing failed.", "error");
  }
}

function generateChatId(userId1, userId2) {
  return [userId1, userId2].sort().join("_");
}
async function loadChat(userId, partnerId, partnerName = "your buddy") {
  if (!userId || !partnerId || !chatMessagesDiv || !chatWithHeader) {
    showErrorState("Cannot load chat.");
    return;
  }
  clearErrorState();
  if (unsubscribeChat) unsubscribeChat();
  unsubscribeChat = null;
  chatWithHeader.textContent = `Chatting with ${partnerName}`;
  chatMessagesDiv.innerHTML = "<p><i>Loading...</i></p>";
  const chatId = generateChatId(userId, partnerId);
  const messagesRef = collection(
    db,
    AppConfig.FIRESTORE_COLLECTIONS.CHATS,
    chatId,
    AppConfig.FIRESTORE_COLLECTIONS.MESSAGES
  );
  const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
  try {
    unsubscribeChat = onSnapshot(
      q,
      (snapshot) => {
        const html = snapshot.docs
          .map((doc) => createMessageElementHtml(doc.data()))
          .join("");
        chatMessagesDiv.innerHTML = html || "<p><i>No messages yet.</i></p>";
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
      },
      (error) => {
        console.error("Msg listener error:", error);
        showErrorState("Msg load error.");
        if (unsubscribeChat) unsubscribeChat();
        unsubscribeChat = null;
      }
    );
    setChatInputEnabled(true);
  } catch (error) {
    console.error("Msg listener setup error:", error);
    showErrorState("Chat connection error.");
    setChatInputEnabled(false);
  }
}
function createMessageElementHtml(messageData) {
  const sanitized = (messageData.text || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
  const cls =
    messageData.senderId === currentUserId ? "my-message" : "partner-message";
  return `<div class="message ${cls}">${sanitized}</div>`;
}
async function sendMessage() {
  const txt = messageInput.value.trim();
  if (!txt || !selectedPartnerId || !currentUserId) return;
  setChatInputEnabled(false);
  const chatId = generateChatId(currentUserId, selectedPartnerId);
  const ref = collection(
    db,
    AppConfig.FIRESTORE_COLLECTIONS.CHATS,
    chatId,
    AppConfig.FIRESTORE_COLLECTIONS.MESSAGES
  );
  try {
    await addDoc(ref, {
      text: txt,
      senderId: currentUserId,
      receiverId: selectedPartnerId,
      timestamp: serverTimestamp(),
    });
    messageInput.value = "";
  } catch (error) {
    console.error("Send error:", error);
    showNotification("Send failed.", "error");
  } finally {
    setChatInputEnabled(true);
    messageInput.focus();
  }
}

function setChatInputEnabled(isEnabled) {
  if (messageInput) messageInput.disabled = !isEnabled;
  if (sendButton) sendButton.disabled = !isEnabled;
  starterMessageButtons.forEach((b) => (b.disabled = !isEnabled));
}
function showErrorState(message) {
  if (chatWithHeader) chatWithHeader.textContent = message;
  console.error("Messaging Error:", message);
}
function clearErrorState() {
  if (chatWithHeader && chatWithHeader.textContent.startsWith("Error")) {
    chatWithHeader.textContent = selectedPartnerId
      ? `Chatting with...`
      : "Select Buddy";
  }
}

function updateToggleButtonIcon(isPartnersHidden) {
  if (togglePartnersBtn) {
    const icon = togglePartnersBtn.querySelector("i");
    if (icon) {
      icon.className = isPartnersHidden
        ? "fas fa-chevron-right"
        : "fas fa-users";
    }
    togglePartnersBtn.title = isPartnersHidden
      ? "Show Buddy List"
      : "Hide Buddy List";
  }
}

if (sendButton) sendButton.addEventListener("click", sendMessage);
if (messageInput)
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !messageInput.disabled) {
      e.preventDefault();
      sendMessage();
    }
  });
starterMessageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (messageInput && !messageInput.disabled) {
      messageInput.value = button.getAttribute("data-message");
      messageInput.focus();
    }
  });
});

if (togglePartnersBtn && messagesLayout) {
  togglePartnersBtn.addEventListener("click", () => {
    const isHidden = messagesLayout.classList.toggle("partners-hidden");
    updateToggleButtonIcon(isHidden);
    console.log("Partner list toggled. Hidden:", isHidden);
  });
} else {
  console.warn("Could not find toggle button or messages layout for listener.");
}

setChatInputEnabled(false);
messagesLayout?.classList.remove("partners-hidden");
updateToggleButtonIcon(false);
console.log("messaging.js loaded with toggle logic.");
