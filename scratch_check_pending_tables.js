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

async function checkActiveTablesTotals() {
  const activeSnap = await getDocs(collection(db, 'active_tables'));
  console.log(`Total active_tables in DB: ${activeSnap.docs.length}`);
  
  let totalPending = 0;
  activeSnap.docs.forEach(doc => {
    const data = doc.data();
    const items = data.items || [];
    const total = items.reduce((sum, it) => sum + (it.menuItem?.price || 0) * (it.quantity || 0), 0);
    totalPending += total;
    console.log(`Table "${doc.id}" | Updated: ${data.updatedAt} | Seller: ${data.sellerName} | Items: ${items.length} | Total: $${total.toFixed(2)}`);
  });

  console.log(`\n>>> TOTAL UNCHARGED MONEY STUCK IN ACTIVE TABLES: $${totalPending.toFixed(2)} <<<`);
  process.exit(0);
}

checkActiveTablesTotals().catch(console.error);
