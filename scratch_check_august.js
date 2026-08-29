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

async function checkAugust() {
  const snap = await getDocs(collection(db, 'orders'));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Sort by date asc
  orders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Let's filter for August 2026
  const augOrders = orders.filter(o => o.date && o.date.startsWith('2026-08'));
  console.log(`August orders count: ${augOrders.length}`);

  const byDateEC = {};
  for (const o of augOrders) {
    const d = new Date(o.date);
    const dateStr = d.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });
    if (!byDateEC[dateStr]) byDateEC[dateStr] = { count: 0, total: 0, voidedCount: 0, voidedTotal: 0, orders: [] };
    if (o.status === 'voided') {
      byDateEC[dateStr].voidedCount++;
      byDateEC[dateStr].voidedTotal += o.total;
    } else {
      byDateEC[dateStr].count++;
      byDateEC[dateStr].total += o.total;
    }
    byDateEC[dateStr].orders.push(o);
  }

  for (const [date, data] of Object.entries(byDateEC)) {
    console.log(`\n=== DATE: ${date} ===`);
    console.log(`Active Orders: ${data.count} | Active Total: $${data.total.toFixed(2)}`);
    console.log(`Voided Orders: ${data.voidedCount} | Voided Total: $${data.voidedTotal.toFixed(2)}`);
    
    // Check order numbers continuity
    const orderNums = data.orders.map(o => o.orderNumber).sort((a,b) => a-b);
    console.log(`Order numbers range: ${orderNums[0]} - ${orderNums[orderNums.length - 1]}`);
    
    // Check if any missing order numbers or duplicate order numbers
    const duplicates = orderNums.filter((item, index) => orderNums.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log(`⚠️ DUPLICATE ORDER NUMBERS: ${duplicates.join(', ')}`);
    }
  }

  process.exit(0);
}

checkAugust().catch(console.error);
