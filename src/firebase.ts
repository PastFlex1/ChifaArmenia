import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3JbrBLOAiX99IGWroPSsCqx9Zj42QQoQ",
  authDomain: "chifa-52865.firebaseapp.com",
  projectId: "chifa-52865",
  storageBucket: "chifa-52865.firebasestorage.app",
  messagingSenderId: "377719806828",
  appId: "1:377719806828:web:b3f6d9db02356ff92bf149",
  measurementId: "G-KP74G1XL2D"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
// export const auth = getAuth(app); // Descomenta esto cuando habilites Authentication en la consola de Firebase
