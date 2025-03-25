import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDq3YwE5wbYmsEdlNR-B09kT6iMAN6Jf8E",
  authDomain: "jobtrackr-759ee.firebaseapp.com",
  projectId: "jobtrackr-759ee",
  storageBucket: "jobtrackr-759ee.appspot.com",
  messagingSenderId: "314587119148",
  appId: "1:314587119148:web:5529441e80d4495c4d5b89",
  measurementId: "G-WX1C2SQ2CB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app); 