// src/firebase/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQfwgr8vAQA3n215AUdIo5kZY209iqTc0",
  authDomain: "gsscout-3b010.firebaseapp.com",
  projectId: "gsscout-3b010",
  storageBucket: "gsscout-3b010.firebasestorage.app",
  messagingSenderId: "397427518112",
  appId: "1:397427518112:web:33314827ffda5b7c5",
  measurementId: "G-HW1X8WSCY7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
