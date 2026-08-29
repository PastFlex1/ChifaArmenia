import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function testQuery() {
  const start = new Date(2026, 7, 28, 0, 0, 0, 0);
  const end = new Date(2026, 7, 28, 23, 59, 59, 999);
  
  console.log("Testing Firestore query for custom date range:", start.toISOString(), "to", end.toISOString());
  try {
    const q = query(collection(db, 'orders'), where('date', '>=', start.toISOString()), where('date', '<=', end.toISOString()));
    const snap = await getDocs(q);
    console.log(`Found ${snap.docs.length} orders for 2026-08-28`);
    let total = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data.status !== 'voided') total += data.total;
    });
    console.log(`Total: $${total.toFixed(2)}`);
  } catch (err) {
    console.error("Query ERROR:", err);
  }

  process.exit(0);
}

testQuery().catch(console.error);
