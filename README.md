# FitnessBuddy

## Introduction

**FitnessBuddy** is a social fitness companion web app where users can log their workouts, connect with workout buddies, and message each other. The app helps fitness enthusiasts stay accountable and motivated by creating a supportive environment for goal tracking and community interaction. It uses Firebase for authentication, real-time messaging, and database storage.

## Project Type

Fullstack

## Deployed App

- **Frontend**: [https://myfitnessbuddy01.netlify.app](https://myfitnessbuddy01.netlify.app)
- **Backend**: Firebase Functions (if used), Firebase Authentication
- **Database**: Firebase Firestore

## Directory Structure

```
fitnessBuddyAI/
├── assets/               # Images, icons, etc.
├── components/           # UI components like forms, cards
├── public/               # Static assets
├── .vscode/              # VS Code settings
├── index.html            # Entry point of the app
├── about.html            # about page
| .
| .
| .
└── README.md
```

## Video Walkthrough of the Project

*A short 1–3 minute demo video showing login, buddy matching, messaging, and workout logging.*

## Video Walkthrough of the Codebase

*A 1–5 minute walkthrough of the repo structure and Firebase integration.*

## Features

- 🔐 **User Authentication** using Firebase
- 🏋️‍♂️ **Workout Logging** with time, type, and notes
- 🤝 **Buddy Matching** for pairing users with workout partners
- 💬 **Messaging System** powered by Firebase real-time database
- 📱 **Responsive UI** for mobile and desktop use

## Design Decisions or Assumptions

Program flow 
![flowchart](https://github.com/user-attachments/assets/f25ae920-7d81-4286-9553-b1d3d0ac0951)


- Chose **Firebase** for easy integration of authentication, real-time updates, and hosting.
- Frontend built as a **static site** using vanilla JS to keep things lightweight and fast.
- Assumes users prefer minimalist UI over feature-heavy dashboard.

## Installation & Getting Started

```bash
git clone https://github.com/kartikdotdev/fitnessBuddyAI.git
cd fitnessBuddyAI
```

1. Open `index.html` in your browser directly for testing, or use a local server (`live-server` or similar).
2. Setup your Firebase project:
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable **Email/Password Auth** and **Cloud Firestore**
   - Replace the Firebase config in `script.js` with your project credentials

## Usage

```bash
# Example usage:
1. Sign up / Log in
2. Log today's workout (e.g. "30 mins cardio")
3. Get matched with a buddy
4. Start chatting and keep each other accountable
```

### Screenshots

*(Add UI screenshots here: login page, workout log, messaging, etc.)*

## Credentials

*For demo purposes, here’s a test account:*

- **Email**: demo@fitnessbuddy.com  
- **Password**: DemoUser123

## APIs Used

- **Firebase Authentication** – User login and registration
- **Firebase Firestore** – Stores workouts and messages
- **Firebase Realtime Database** *(optional)* – Messaging (if you use it over Firestore)
- **Firebase Hosting** – Static site deployment

## API Endpoints

Since Firebase handles data via SDK, REST endpoints aren't manually defined, but data interactions include:

- `auth().createUserWithEmailAndPassword()` – Register
- `auth().signInWithEmailAndPassword()` – Login
- `firestore().collection('workouts').add()` – Log workouts
- `firestore().collection('messages').add()` – Send messages
- `firestore().collection('users').doc().set()` – Update buddy pairings

## Technology Stack

- **Frontend**:
  - HTML
  - CSS
  - JavaScript (Vanilla)

- **Backend / Infra**:
  - Firebase Authentication
  - Firebase Firestore
  - Firebase Hosting
