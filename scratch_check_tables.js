import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3JbrBLOAiX99IGWroPSsCqx9Zj42QQoQ",
  authDomain: "chifa-52865.firebaseapp.com",
  projectId: "chifa-52865",
  storageBucket: "chifa-52865.firebasestorage.app",
  messagingSenderId: "377719806828",
  appId: "1:377719806828:web:b3f6d9db02356ff92bf149",
  measurementId: "G-KP74G1XL2D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFreedTables() {
  const freedSnap = await getDocs(collection(db, 'freed_tables'));
  console.log(`freed_tables count: ${freedSnap.docs.length}`);
  freedSnap.forEach(d => {
    console.log(`Freed Table: ${d.id} ->`, d.data());
  });

  const activeSnap = await getDocs(collection(db, 'active_tables'));
  console.log(`active_tables count: ${activeSnap.docs.length}`);
  activeSnap.forEach(d => {
    console.log(`Active Table: ${d.id} ->`, d.data());
  });

  process.exit(0);
}

checkFreedTables().catch(console.error);
