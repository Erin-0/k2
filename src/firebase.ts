import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDlWowXiwgWELXeeDKlHJkoaBvEwnaI4k4",
    authDomain: "k21111.firebaseapp.com",
    projectId: "k21111",
    storageBucket: "k21111.firebasestorage.app",
    messagingSenderId: "1018659715124",
    appId: "1:1018659715124:web:f9808f2c3651db36f3b261",
    measurementId: "G-R6XPH5S6W9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);