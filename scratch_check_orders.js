import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

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

async function checkRecent() {
  const snap = await getDocs(collection(db, 'orders'));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Sort by date desc
  orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  console.log(`Total orders in DB: ${orders.length}`);
  console.log("--- 20 MOST RECENT ORDERS ---");
  const recent = orders.slice(0, 25);
  for (const o of recent) {
    const d = new Date(o.date);
    console.log(`Order #${o.orderNumber} | Date ISO: ${o.date} | Local (EC): ${d.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} | Table: ${o.tableNumber} | Total: $${o.total} | Status: ${o.status || 'active'} | Seller: ${o.sellerName}`);
  }

  // Check orders grouped by Ecuador local date
  const byDate = {};
  for (const o of orders) {
    if (o.status === 'voided') continue;
    const d = new Date(o.date);
    const dateStr = d.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });
    if (!byDate[dateStr]) byDate[dateStr] = { count: 0, total: 0 };
    byDate[dateStr].count++;
    byDate[dateStr].total += o.total;
  }
  console.log("\n--- TOTALS BY ECUADOR DATE (Last 10 days with sales) ---");
  const dates = Object.keys(byDate).slice(-10);
  for (const date of dates) {
    console.log(`Date: ${date} -> Orders: ${byDate[date].count}, Total Revenue: $${byDate[date].total.toFixed(2)}`);
  }

  process.exit(0);
}

checkRecent().catch(console.error);
