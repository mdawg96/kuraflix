// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Values for the naruyo project
const API_KEY = "AIzaSyD1nlImVlNwOEViLtvGAk9A42sqA0YYjYU";
const AUTH_DOMAIN = "naruyo-6bf58.firebaseapp.com";
const PROJECT_ID = "naruyo-6bf58";
const STORAGE_BUCKET = "naruyo-6bf58.firebasestorage.app";
const MESSAGING_SENDER_ID = "18344240696";
const APP_ID = "1:18344240696:web:46543ea2cb707a44cc28cd";
const MEASUREMENT_ID = "G-44MXR8702Y";
const WEB_CLIENT_ID = "18344240696-m9p93r371045hkihi8cnu37i5ie8h05q.apps.googleusercontent.com";

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
const newApp = initializeApp(firebaseConfig, "naruyo-app");
const newAuth = getAuth(newApp);
const newDb = getFirestore(newApp);
const newStorage = getStorage(newApp);
const newAnalytics = getAnalytics(newApp);
const newGoogleProvider = new GoogleAuthProvider();
newGoogleProvider.setCustomParameters({
  'login_hint': 'user@example.com',
  'client_id': WEB_CLIENT_ID
});

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
  newGoogleProvider as googleProvider,
  newAnalytics as analytics
}; 