// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1nlImVlNwOEViLtvGAk9A42sqA0YYjYU",
  authDomain: "naruyo-6bf58.firebaseapp.com",
  projectId: "naruyo-6bf58",
  storageBucket: "naruyo-6bf58.firebasestorage.app",
  messagingSenderId: "18344240696",
  appId: "1:18344240696:web:46543ea2cb707a44cc28cd",
  measurementId: "G-44MXR8702Y"
};

// Log what config we're using
console.log("Firebase initializing with config for naruyo-6bf58");

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