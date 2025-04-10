// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Hardcoded values for the debatenow project
const API_KEY = "AIzaSyBzZ9nr48Rfk3EPVa1mP1xh5_j4VFOO9D0";
const AUTH_DOMAIN = "debatenow-83826.firebaseapp.com";
const PROJECT_ID = "debatenow-83826";
const STORAGE_BUCKET = "debatenow-83826.firebasestorage.app";
const MESSAGING_SENDER_ID = "60690203398";
const APP_ID = "1:60690203398:web:7e7661758d1ff9bd0d9487";
const MEASUREMENT_ID = "G-3Y0KJK5N6L";

console.log("New Firebase Config loading with:", { 
  PROJECT_ID, 
  AUTH_DOMAIN, 
  STORAGE_BUCKET 
});

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID,
  measurementId: MEASUREMENT_ID
};

// Initialize Firebase with a specific app name to avoid conflicts
const newApp = initializeApp(firebaseConfig, "debatenow-app");
const newAuth = getAuth(newApp);
const newDb = getFirestore(newApp);
const newStorage = getStorage(newApp);
const newGoogleProvider = new GoogleAuthProvider();

console.log("New Firebase instance initialized:", {
  appName: newApp.name,
  projectId: newApp.options.projectId,
  dbProjectId: newDb._databaseId ? newDb._databaseId.projectId : "unknown"
});

export {
  newApp as app,
  newAuth as auth,
  newDb as db,
  newStorage as storage,
  newGoogleProvider as googleProvider
}; 