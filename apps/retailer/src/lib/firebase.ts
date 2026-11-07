import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForDevelopment123456789",
  authDomain: "distribupro-e33eb.firebaseapp.com",
  projectId: "distribupro-e33eb",
  storageBucket: "distribupro-e33eb.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
