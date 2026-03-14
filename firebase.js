// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsQ4-f0ucy8qUJv8P6NxAXP8KFtZ9OuFI",
  authDomain: "raidex.firebaseapp.com",
  projectId: "raidex",
  storageBucket: "raidex.firebasestorage.app",
  messagingSenderId: "171217233796",
  appId: "1:171217233796:web:8a6c3a9551732f4c991fd1",
  measurementId: "G-KGFNH740QD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
