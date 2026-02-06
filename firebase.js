// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBovGN4oDz8VMyO5N-KzxQlyXwM20xKl5Q",
  authDomain: "raidexgames-98190.firebaseapp.com",
  projectId: "raidexgames-98190",
  storageBucket: "raidexgames-98190.firebasestorage.app",
  messagingSenderId: "821310885978",
  appId: "1:821310885978:web:df4fcb53b2b3a18e204863",
  measurementId: "G-43D486TC3H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
