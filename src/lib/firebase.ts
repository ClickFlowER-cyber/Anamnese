import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuração de Firebase fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyBsNi8pSGtbDQ0Jpk5rpgoKHHDc2_Akm2k",
  authDomain: "anamnese-42e22.firebaseapp.com",
  projectId: "anamnese-42e22",
  storageBucket: "anamnese-42e22.firebasestorage.app",
  messagingSenderId: "301260831737",
  appId: "1:301260831737:web:9badffd1c27795b234db28",
  measurementId: "G-0L79G1DZ52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export default app;
