import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import net from 'net';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

// CONFIGURACIÓN DE TUS 2 IMPRESORAS
const PRINTER_IP_KITCHEN = '192.168.100.60';  // Impresora de la Cocina (IP confirmada)
const CAJA_IS_USB = true; // Cambiar a false si alguna vez la conectan por red
const PRINTER_SHARED_NAME_CAJA = 'caja'; // Nombre con el que compartirás la impresora USB en Windows
const PRINTER_IP_CUSTOMER = '192.168.100.X'; // Solo se usa si CAJA_IS_USB es false
const PRINTER_PORT = 9100;

// Configuración de Firebase (copiada de tu frontend)
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

function formatPrice(p) {
  return `USD/ ${p.toFixed(2)}`;
}

function textToBuffer(text) {
  const cleanText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return Buffer.from(cleanText + '\n', 'latin1');
}

// ESC/POS Constants
const INIT = Buffer.from([0x1B, 0x40]);
const ALIGN_LEFT = Buffer.from([0x1B, 0x61, 0x00]);
const ALIGN_CENTER = Buffer.from([0x1B, 0x61, 0x01]);
const ALIGN_RIGHT = Buffer.from([0x1B, 0x61, 0x02]);
const BOLD_ON = Buffer.from([0x1B, 0x45, 0x01]);
const BOLD_OFF = Buffer.from([0x1B, 0x45, 0x00]);
const NORMAL_SIZE = Buffer.from([0x1D, 0x21, 0x00]);
const DOUBLE_HEIGHT = Buffer.from([0x1D, 0x21, 0x01]);
const DOUBLE_WIDTH_HEIGHT = Buffer.from([0x1D, 0x21, 0x11]);
const CUT = Buffer.from([0x1D, 0x56, 0x41, 0x10]);

// Función principal de impresión
function printTicket(jobId, order, ticketType) {
  return new Promise((resolve, reject) => {
    console.log(`[+] Intentando imprimir trabajo ${jobId} (Tipo: ${ticketType})...`);
      try {
        let buffers = [];
        const writeData = (data) => {
          if (typeof data === 'string') {
             buffers.push(Buffer.from(data, 'latin1'));
          } else {
             buffers.push(data);
          }
        };

        writeData(INIT);
        
        if (ticketType === 'customer') {
          writeData(ALIGN_CENTER);
          writeData(BOLD_ON);
          writeData(textToBuffer('CHIFA MEI HUA ARMENIA'));
          writeData(NORMAL_SIZE);
          writeData(textToBuffer('ALVAREZ ZAMORA RUTH GARDENIA'));
          writeData(textToBuffer('RUC: 0923809529001'));
          writeData(textToBuffer('--------------------------------'));
          
          writeData(ALIGN_LEFT);
          writeData(textToBuffer(`IMPRESO: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`));
          writeData(textToBuffer(`PEDIDO #${String(order.orderNumber).padStart(5, '0')}`));
          if (order.tableNumber) {
            const normT = order.tableNumber.trim().toLowerCase();
            if (normT === 'pedidosya' || normT === 'pedidos ya' || normT.startsWith('pedidos')) writeData(textToBuffer('TIPO: PEDIDOS YA'));
            else if (normT === 'rappi') writeData(textToBuffer('TIPO: RAPPI'));
            else if (normT === 'uber' || normT === 'uber eats' || normT.startsWith('uber')) writeData(textToBuffer('TIPO: UBER EATS'));
            else if (normT === 'domicilio' || normT === 'para llevar') writeData(textToBuffer('TIPO: DOMICILIO'));
            else writeData(textToBuffer(`MESA: ${order.tableNumber}`));
          }
          
          writeData(textToBuffer('--------------------------------'));
          writeData(textToBuffer('Cliente: .......................'));
          writeData(textToBuffer('C.I: ...........................'));
          writeData(textToBuffer('Correo: ........................'));
          writeData(textToBuffer('Telf: ..........................'));
          writeData(textToBuffer('Dir: ...........................'));
          writeData(textToBuffer('F.Nacimiento: ..................'));
          writeData(textToBuffer('--------------------------------'));
          
          writeData(textToBuffer('\n'));
          writeData(ALIGN_CENTER);
          writeData(BOLD_ON);
          writeData(textToBuffer('PROPINA: $ __________________'));
          writeData(BOLD_OFF);
          writeData(textToBuffer('\n\n'));
          
          writeData(ALIGN_LEFT);
          writeData(textToBuffer('--------------------------------'));
          writeData(textToBuffer('CANT   DESCRIPCION       TOTAL'));
          writeData(textToBuffer('--------------------------------'));
          
          order.items.forEach(item => {
            let name = item.menuItem.name.substring(0, 16).padEnd(16);
            let qty = item.quantity.toString().padEnd(4);
            let price = formatPrice(item.quantity * item.menuItem.price).padStart(10);
            writeData(textToBuffer(`${qty} ${name} ${price}`));
          });
          
          writeData(textToBuffer('--------------------------------'));
          writeData(ALIGN_RIGHT);
          writeData(textToBuffer(`SUBTOTAL: ${formatPrice(order.total / 1.15)}`));
          writeData(textToBuffer(`IVA 15%: ${formatPrice(order.total - (order.total / 1.15))}`));
          writeData(BOLD_ON);
          writeData(DOUBLE_HEIGHT);
          writeData(textToBuffer(`TOTAL: ${formatPrice(order.total)}`));
          writeData(NORMAL_SIZE);
          writeData(BOLD_OFF);
          
          writeData(ALIGN_CENTER);
          writeData(textToBuffer('--------------------------------'));
          writeData(textToBuffer('!GRACIAS POR SU PREFERENCIA!'));
          writeData(textToBuffer(`ATENDIDO POR ${order.sellerName ? order.sellerName.toUpperCase() : 'CAJERO'}`));
          
        } else {
          writeData(ALIGN_CENTER);
          writeData(BOLD_ON);
          writeData(textToBuffer('COMANDA'));
          
          if (order.tableNumber) {
            const norm = order.tableNumber.trim().toLowerCase();
            if (norm === 'pedidosya' || norm === 'pedidos ya' || norm.startsWith('pedidos')) writeData(textToBuffer('PEDIDOS YA'));
            else if (norm === 'rappi') writeData(textToBuffer('RAPPI'));
            else if (norm === 'uber' || norm === 'uber eats' || norm.startsWith('uber')) writeData(textToBuffer('UBER EATS'));
            else if (norm === 'domicilio' || norm === 'para llevar') writeData(textToBuffer('DOMICILIO'));
            else writeData(textToBuffer(`MESA: ${order.tableNumber}`));
          }
          if (order.customerName) {
            writeData(textToBuffer(`CLIENTE/DIR: ${order.customerName}`));
          }
          writeData(textToBuffer(`PEDIDO #${String(order.orderNumber).padStart(5, '0')}`));
          
          writeData(ALIGN_LEFT);
          writeData(textToBuffer('--------------------------------'));
          
          order.items.forEach(item => {
            writeData(textToBuffer(`[${item.quantity}] x ${item.menuItem.name}`));
          });
          
          writeData(ALIGN_CENTER);
          writeData(textToBuffer('--------------------------------'));
          writeData(textToBuffer('FIN DE COMANDA'));
        }
        
        writeData('\n\n\n\n');
        writeData(CUT);
        
        const finalBuffer = Buffer.concat(buffers);

        // LOGICA DE IMPRESIÓN (USB COMPARTIDA O RED TCP)
        if (ticketType === 'customer' && CAJA_IS_USB) {
           const tempFile = path.join(process.cwd(), `ticket_${jobId}.bin`);
           fs.writeFileSync(tempFile, finalBuffer);
           
           // En Windows, enviar archivo raw a impresora compartida
           const computerName = process.env.COMPUTERNAME || '127.0.0.1';
           const command = `copy /b "${tempFile}" "\\\\${computerName}\\${PRINTER_SHARED_NAME_CAJA}"`;
           console.log(`[+] Enviando ticket por USB compartido: ${command}`);
           
           exec(command, (error) => {
              try { fs.unlinkSync(tempFile); } catch(e){} // Limpiar archivo temporal
              
              if (error) {
                 reject(new Error(`Error enviando a USB: ¿Compartiste la impresora con el nombre '${PRINTER_SHARED_NAME_CAJA}'?`));
              } else {
                 resolve();
              }
           });
           
        } else {
           // IMPRESION POR RED IP (COCINA)
           const TARGET_IP = ticketType === 'kitchen' ? PRINTER_IP_KITCHEN : PRINTER_IP_CUSTOMER;
           console.log(`[+] Conectando a IP ${TARGET_IP}:${PRINTER_PORT} para ticket de ${ticketType}...`);
           
           const client = new net.Socket();
           client.setTimeout(3000);

           client.on('timeout', () => {
             client.destroy();
             reject(new Error(`Timeout de conexión a la impresora ${TARGET_IP}. ¿Está encendida?`));
           });

           client.on('error', (err) => {
             client.destroy();
             reject(err);
           });

           client.connect(PRINTER_PORT, TARGET_IP, function() {
             client.write(finalBuffer);
             client.end();
             resolve();
           });
        }
        
      } catch (e) {
        reject(e);
      }
  });
}

// Iniciar listener de Firebase
console.log(`========================================`);
console.log(`☁️ SERVIDOR DE COLA DE IMPRESION INICIADO`);
console.log(`========================================`);
console.log(`Conectado a Firebase: ${firebaseConfig.projectId}`);
console.log(`Impresora Cajera: ${PRINTER_IP_CUSTOMER}:${PRINTER_PORT}`);
console.log(`Impresora Cocina: ${PRINTER_IP_KITCHEN}:${PRINTER_PORT}`);
console.log(`Escuchando nuevos tickets en tiempo real...`);
console.log(`Deje esta ventana negra abierta mientras trabaje.`);
console.log(`========================================`);

const q = query(collection(db, "print_jobs"), where("status", "==", "pending"));

onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === "added") {
      const job = change.doc.data();
      const jobId = change.doc.id;
      
      try {
        await printTicket(jobId, job.order, job.ticketType);
        console.log(`[OK] Trabajo ${jobId} impreso con éxito.`);
        
        // Actualizar en Firebase para no volver a imprimir
        await updateDoc(doc(db, "print_jobs", jobId), {
          status: "printed",
          printedAt: new Date()
        });
      } catch (error) {
        console.error(`[ERROR] Fallo al imprimir ${jobId}:`, error.message);
        await updateDoc(doc(db, "print_jobs", jobId), {
          status: "error",
          error: error.message
        });
      }
    }
  });
}, (error) => {
  console.error("Error escuchando Firebase:", error);
});
