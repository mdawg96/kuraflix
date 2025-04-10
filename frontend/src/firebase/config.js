// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzZ9nr48Rfk3EPVa1mP1xh5_j4VFOO9D0",
  authDomain: "debatenow-83826.firebaseapp.com",
  projectId: "debatenow-83826",
  storageBucket: "debatenow-83826.firebasestorage.app",
  messagingSenderId: "60690203398",
  appId: "1:60690203398:web:7e7661758d1ff9bd0d9487",
  measurementId: "G-3Y0KJK5N6L"
};

// Log what config we're using
console.log("Firebase initializing with hardcoded config for debatenow-83826");

// Initialize Firebase with default app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

console.log("Firebase services initialized:", {
  appName: app.name,
  projectId: app.options.projectId,
  databaseId: db._databaseId?.projectId || 'unknown'
});

// Subscribe to auth state changes for debugging
auth.onAuthStateChanged((user) => {
  console.log("Firebase Auth State Changed:", {
    user: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified
    } : "Not authenticated"
  });
});

// Export initialized services
export { auth, db, app, storage, googleProvider, analytics }; 