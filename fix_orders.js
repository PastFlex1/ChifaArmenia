import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";

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

async function fixOrders() {
  console.log("Buscando todas las notas de venta...");
  const snapshot = await getDocs(collection(db, "orders"));
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Ordenar de la más antigua a la más reciente
  orders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const batch = writeBatch(db);
  let orderNumberCounter = 1;
  let fixedCount = 0;

  for (const order of orders) {
    if (order.orderNumber !== orderNumberCounter) {
      const orderRef = doc(db, "orders", order.id);
      batch.update(orderRef, { orderNumber: orderNumberCounter });
      fixedCount++;
    }
    orderNumberCounter++;
  }

  // Actualizar el contador global para el futuro
  const counterRef = doc(db, "counters", "orders");
  batch.set(counterRef, { count: orderNumberCounter - 1 }, { merge: true });

  if (fixedCount > 0) {
    console.log(`Guardando cambios para ${fixedCount} notas...`);
    await batch.commit();
    console.log("¡Éxito! Todas las notas de venta han sido enumeradas correctamente.");
  } else {
    console.log("Todas las notas ya estaban enumeradas correctamente.");
  }
  process.exit(0);
}

fixOrders().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
