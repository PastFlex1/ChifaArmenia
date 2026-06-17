import React, { useState } from 'react';
import { Printer, X, Receipt, ChefHat, CheckSquare, Download } from 'lucide-react';
import { Order } from '../types';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

import Swal from 'sweetalert2';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  order: Order;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: Props) {
  const [ticketType, setTicketType] = useState<'customer' | 'kitchen'>('customer');
  const formatPrice = (p: number) => `USD/ ${p.toFixed(2)}`;

  // Función para guardar el ticket en la nube de Firebase
  const printViaCloudQueue = async (type: 'customer' | 'kitchen') => {
    try {
      await addDoc(collection(db, 'print_jobs'), {
        order: order,
        ticketType: type,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error("Error enviando a cola de impresión:", e);
      return false;
    }
  };

  const handlePrintCustomer = async () => {
    setTicketType('customer');
    
    // 1. Enviamos a la nube
    const success = await printViaCloudQueue('customer');
    if (success) {
      Swal.fire('Enviado a Cola', 'Ticket en cola de impresión', 'success');
      return;
    }
    
    // 2. Fallback: Diálogo del navegador si no hay internet o falla Firebase
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintKitchen = async () => {
    setTicketType('kitchen');
    
    const success = await printViaCloudQueue('kitchen');
    if (success) {
      Swal.fire('Enviado a Cola', 'Comanda en cola de impresión de cocina', 'success');
      return;
    }

    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintBoth = async () => {
    setTicketType('customer');
    
    // Enviamos primero al cliente a la cola
    const successCustomer = await printViaCloudQueue('customer');
    
    setTimeout(async () => {
      setTicketType('kitchen');
      // Enviamos luego a cocina a la cola
      const successKitchen = await printViaCloudQueue('kitchen');
      
      if (successCustomer && successKitchen) {
        Swal.fire('Enviado a Cola', 'Ambos tickets en cola de impresión', 'success');
      } else {
        // Fallback total
        setTicketType('customer');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            setTicketType('kitchen');
            setTimeout(() => {
              window.print();
            }, 100);
          }, 500);
        }, 100);
      }
    }, 500);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-receipt');
    if (!element) return;

    try {
      // Temporarily constrain width for 80mm thermal proportion
      const originalWidth = element.style.width;
      const originalPadding = element.style.padding;
      const originalBackground = element.style.backgroundColor;
      
      element.style.width = '300px'; 
      element.style.padding = '10px';
      element.style.backgroundColor = 'white';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });
      
      // Revert styles
      element.style.width = originalWidth;
      element.style.padding = originalPadding;
      element.style.backgroundColor = originalBackground;

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 80; // 80mm width
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filenamePrefix = ticketType === 'customer' ? 'nota_venta' : 'comanda';
      pdf.save(`${filenamePrefix}_${String(order.orderNumber).padStart(5, '0')}.pdf`);
    } catch (e) {
      console.error("Error generating PDF:", e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm flex flex-col max-h-full print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Header - Hidden in Print */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden rounded-t-xl border-b-2 border-black shrink-0">
          <h2 className="font-black uppercase tracking-widest italic text-sm">Visor de Impresión</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded transition-colors focus:outline-none text-[#FFD700]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Hidden in Print */}
        <div className="flex bg-white border-b-2 border-black print:hidden shrink-0">
          <button 
            className={`flex-1 py-3 font-black uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 transition-colors ${ticketType === 'customer' ? 'bg-[#FFD700]' : 'opacity-60 hover:bg-slate-50 hover:opacity-100'}`}
            onClick={() => setTicketType('customer')}
          >
             <Receipt className="w-4 h-4" /> Factura
          </button>
          <button 
            className={`flex-1 py-3 font-black uppercase text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 border-l-2 border-black transition-colors ${ticketType === 'kitchen' ? 'bg-[#B91C1C] text-white' : 'opacity-60 hover:bg-slate-50 hover:opacity-100'}`}
            onClick={() => setTicketType('kitchen')}
          >
             <ChefHat className="w-4 h-4" /> Comanda
          </button>
        </div>

        {/* Receipt Content */}
        <div className="overflow-y-auto p-6 scrollbar-hide bg-[#F7F4F0] flex-1">
          <div id="printable-receipt" className="font-mono text-sm text-[#1A1A1A] tracking-tight">
            
            {ticketType === 'customer' ? (
              <>
                {/* Store Header */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-black mb-1 text-center w-full">CHIFA MEI HUA ARMENIA</h1>
                  <p className="text-xs font-bold uppercase mb-1">ALVAREZ ZAMORA RUTH GARDENIA</p>
                  <p className="text-xs font-bold uppercase mb-2">RUC: 0923809529001</p>
                  <div className="border-t-2 border-dashed border-black w-full mt-4 pt-4 text-left font-sans">
                    <p className="text-xs font-bold uppercase mb-1">Impreso: {new Date(order.date).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    <p className="text-xs font-bold uppercase mb-1">PEDIDO #{String(order.orderNumber).padStart(5, '0')}</p>
                    {order.tableNumber && (
                      <p className="text-xs font-bold uppercase mb-1">MESAS: {order.tableNumber}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-6 text-xs font-bold border-t-2 border-black border-dashed pt-4 font-sans text-left">
                  <p>CLIENTE: CONSUMIDOR FINAL</p>
                  <p>RUC/CI: 9999999999999</p>
                  <div className="flex justify-between w-full items-end mt-2 text-[10px]">
                    <span>PROPINA:</span>
                    <span className="flex-1 border-b border-black ml-2 mb-1"></span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-t-2 border-b-2 border-dashed border-black py-3 mb-5">
                  <table className="w-full text-xs font-bold font-sans">
                    <thead>
                      <tr className="text-left">
                        <th className="pb-2 w-8 uppercase">Cant</th>
                        <th className="pb-2 uppercase">Descripción</th>
                        <th className="pb-2 text-right uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-black/30">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 align-top">{item.quantity}</td>
                          <td className="py-2 align-top pr-2">
                            <span className="block uppercase">{item.menuItem.name}</span>
                          </td>
                          <td className="py-2 align-top text-right">
                            {formatPrice(item.menuItem.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col gap-1 mb-6 font-sans">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">SUBTOTAL:</span>
                    <span>{formatPrice(order.total / 1.15)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">BASE 15%:</span>
                    <span>{formatPrice(order.total / 1.15)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">BASE 0%:</span>
                    <span>{formatPrice(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">IVA 15%:</span>
                    <span>{formatPrice(order.total - (order.total / 1.15))}</span>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-black uppercase tracking-widest text-sm">TOTAL:</span>
                    <span className="font-black text-xl">{formatPrice(order.total)}</span>
                  </div>
                </div>

                {/* Footer */}
                {order.sellerName && (
                  <div className="text-left font-bold text-[10px] uppercase mb-4 font-sans border-t-2 border-black border-dashed pt-4">
                    ATENDIDO POR: {order.sellerName}
                  </div>
                )}
                
                <div className="text-center text-[10px] font-bold uppercase mt-6">
                  <p>¡Gracias por su preferencia!</p>
                </div>
              </>
            ) : (
              <>
                {/* Kitchen Ticket */}
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-black mb-1 uppercase">COMANDA</h1>
                  <div className="border-t-4 border-black w-full mt-4 pt-4">
                    {order.tableNumber && <h2 className="text-4xl font-black uppercase">MESA: {order.tableNumber}</h2>}
                    <p className="text-xl mt-2 font-black">PEDIDO #{String(order.orderNumber).padStart(5, '0')}</p>
                  </div>
                </div>

                <div className="mb-6 text-sm font-bold font-sans">
                  <div className="flex justify-between mb-1">
                    <span className="opacity-60 uppercase">Hora:</span>
                    <span>{new Date(order.date).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  {order.sellerName && (
                    <div className="flex justify-between mb-1">
                      <span className="opacity-60 uppercase">Mesero:</span>
                      <span className="uppercase">{order.sellerName}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="border-t-2 border-black pt-4">
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center border-b border-dashed border-gray-400 pb-4">
                        <span className="text-4xl font-black text-[#B91C1C] min-w-[40px] tracking-tighter">{item.quantity}</span>
                        <span className="text-2xl font-bold uppercase leading-tight">{item.menuItem.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t-2 border-black text-center">
                    <p className="font-black text-lg uppercase tracking-widest italic opacity-50">FIN DE COMANDA</p>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Actions - Hidden in Print */}
        <div className="p-4 bg-slate-50 border-t-2 border-black flex flex-col gap-2 print:hidden rounded-b-xl shrink-0">
          <button
            className="w-full py-4 bg-[#FFD700] text-black border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-2"
            onClick={handlePrintBoth}
          >
            <CheckSquare className="w-5 h-5" />
            Imprimir Todo Secuencialmente
          </button>
          
          <div className="flex gap-2">
            <button
              className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex justify-center items-center gap-1"
              onClick={handlePrintCustomer}
            >
              <Receipt className="w-4 h-4" />
              Solo Factura
            </button>
            <button
              className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex justify-center items-center gap-1"
              onClick={handlePrintKitchen}
            >
              <ChefHat className="w-4 h-4" />
              Solo Comanda
            </button>
          </div>

          <button
            className="w-full py-3 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex justify-center items-center gap-2"
            onClick={handleDownloadPDF}
          >
            <Download className="w-4 h-4" />
            Descargar {ticketType === 'customer' ? 'Factura' : 'Comanda'} (PDF)
          </button>

          <button
            className="w-full mt-2 py-3 bg-white opacity-60 hover:opacity-100! font-black uppercase text-xs transition-all tracking-widest"
             onClick={onClose}
          >
            Cerrar Sin Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
