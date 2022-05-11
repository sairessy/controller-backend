// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0osTfy-jyA5J46LFL_yJ9SzWBmCujRYQ",
  authDomain: "files-cd172.firebaseapp.com",
  projectId: "files-cd172",
  storageBucket: "files-cd172.appspot.com",
  messagingSenderId: "262882446048",
  appId: "1:262882446048:web:e4e7bd7239dbac42e1de85"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

export default firebaseApp