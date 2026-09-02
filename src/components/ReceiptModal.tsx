import React, { useState } from 'react';
import { Printer, X, Receipt, ChefHat, CheckSquare, Download } from 'lucide-react';
import { Order } from '../types';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

import Swal from 'sweetalert2';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface Props {
  order: Order;
  onClose: () => void;
  onKitchenPrint?: () => void;
  onConfirmCheckout?: () => void;
}

export function ReceiptModal({ order, onClose, onKitchenPrint, onConfirmCheckout }: Props) {
  const [ticketType, setTicketType] = useState<'customer' | 'kitchen'>('customer');
  const [isPrinting, setIsPrinting] = useState(false);
  const isPrintingRef = React.useRef(false);
  const formatPrice = (p: number) => `USD/ ${p.toFixed(2)}`;

  const appliedIvaRate = order.ivaRate || 15;
  const ivaDivisor = appliedIvaRate === 8 ? 1.08 : 1.15;

  const kitchenItems = order.items
    .filter(item => item.quantity > (item.printedQuantity || 0))
    .map(item => ({
      ...item,
      quantity: item.quantity - (item.printedQuantity || 0)
    }));

  // Función para guardar el ticket en la nube de Firebase
  const printViaCloudQueue = async (type: 'customer' | 'kitchen', orderToPrint: Order) => {
    try {
      await addDoc(collection(db, 'print_jobs'), {
        order: orderToPrint,
        ticketType: type,
        branchId: orderToPrint.branchId || '1',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Error enviando a cola de impresión:", e);
      return false;
    }
  };

  const handlePrintCustomer = async () => {
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;
    setIsPrinting(true);
    setTicketType('customer');
    
    // 1. Enviamos a la nube
    const success = await printViaCloudQueue('customer', order);
    if (success) {
      Swal.fire('Enviado a Cola', 'Ticket en cola de impresión', 'success');
      setIsPrinting(false);
      isPrintingRef.current = false;
      return;
    }
    
    // 2. Fallback: Diálogo del navegador si no hay internet o falla Firebase
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      isPrintingRef.current = false;
    }, 100);
  };

  const handlePrintKitchen = async () => {
    if (isPrintingRef.current) return;
    if (kitchenItems.length === 0) {
      Swal.fire('Atención', 'No hay productos nuevos para enviar a cocina.', 'info');
      return;
    }
    isPrintingRef.current = true;
    setIsPrinting(true);
    setTicketType('kitchen');
    
    const success = await printViaCloudQueue('kitchen', { ...order, items: kitchenItems });
    if (success) {
      Swal.fire('Enviado a Cola', 'Comanda en cola de impresión de cocina', 'success');
      setIsPrinting(false);
      isPrintingRef.current = false;
      onKitchenPrint?.();
      return;
    }

    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      isPrintingRef.current = false;
    }, 100);
  };

  const handlePrintBoth = async () => {
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;
    setIsPrinting(true);
    setTicketType('customer');
    
    // Enviamos primero al cliente a la cola
    const successCustomer = await printViaCloudQueue('customer', order);
    
    setTimeout(async () => {
      setTicketType('kitchen');
      // Enviamos luego a cocina a la cola
      let successKitchen = false;
      if (kitchenItems.length > 0) {
        successKitchen = await printViaCloudQueue('kitchen', { ...order, items: kitchenItems });
      } else {
        successKitchen = true;
      }
      
      if (successCustomer && successKitchen) {
        Swal.fire('Enviado a Cola', kitchenItems.length > 0 ? 'Ambos tickets en cola de impresión' : 'Ticket cliente en cola (sin productos nuevos para cocina)', 'success');
        setIsPrinting(false);
        isPrintingRef.current = false;
        if (kitchenItems.length > 0) {
          onKitchenPrint?.();
        }
      } else {
        // Fallback total
        setTicketType('customer');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            setTicketType('kitchen');
            setTimeout(() => {
              window.print();
              setIsPrinting(false);
              isPrintingRef.current = false;
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

        {order.id.startsWith('preview-') && (
          <div className="bg-amber-100 border-b-2 border-black p-3 text-center print:hidden shrink-0">
            <span className="text-xs font-black text-amber-900 uppercase block">
              ⚠️ PRE-CUENTA / BORRADOR
            </span>
            <span className="text-[10px] font-bold text-amber-800 uppercase block mt-0.5">
              Esta nota de venta aún NO ha sido cobrada ni registrada en el sistema.
            </span>
            {onConfirmCheckout && (
              <button
                onClick={() => {
                  onClose();
                  onConfirmCheckout();
                }}
                className="mt-2 w-full py-2 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(185,28,28,1)] hover:bg-[#B91C1C] hover:text-white transition-colors cursor-pointer"
              >
                🟢 COBRAR Y REGISTRAR VENTA EN SISTEMA
              </button>
            )}
          </div>
        )}

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
                  <h1 className="text-2xl font-black mb-1 text-center w-full">
                    {(order.branchId === '2' || order.branchName === 'Sucursal 2') ? 'CHIFA MEI HUA SAN RAFAEL' : 'CHIFA MEI HUA ARMENIA'}
                  </h1>
                  {order.branchName && (
                    <p className="text-xs font-black uppercase text-[#B91C1C] mb-1">📍 {order.branchName.toUpperCase()}</p>
                  )}
                  <p className="text-xs font-bold uppercase mb-1">ALVAREZ ZAMORA RUTH GARDENIA</p>
                  <p className="text-xs font-bold uppercase mb-2">RUC: 0923809529001</p>
                    {order.id.startsWith('preview-') ? (
                      <div className="my-1 py-1 px-2 border-2 border-black bg-amber-200 text-center font-black text-[11px] uppercase tracking-tight">
                        *** PRE-CUENTA (SOLO BORRADOR) ***
                      </div>
                    ) : (
                      <p className="text-xs font-bold uppercase mb-1">PEDIDO #{String(order.orderNumber).padStart(5, '0')}</p>
                    )}
                    {order.tableNumber && (
                      <p className="text-xs font-bold uppercase mb-1">
                        {(() => {
                          const norm = order.tableNumber.trim().toLowerCase();
                          if (norm === 'pedidosya' || norm === 'pedidos ya' || norm.startsWith('pedidos')) return '🛵 TIPO: PEDIDOS YA';
                          if (norm === 'rappi') return '🧡 TIPO: RAPPI';
                          if (norm === 'uber' || norm === 'uber eats' || norm.startsWith('uber')) return '🟢 TIPO: UBER EATS';
                          if (norm === 'domicilio' || norm === 'para llevar' || norm === 'llevar') return '🏠 TIPO: LLEVAR';
                          return `MESA: ${order.tableNumber}`;
                        })()}
                      </p>
                    )}
                    {/* Nombre del cliente: NO se muestra en nota de venta */}
                </div>

                <div className="flex flex-col gap-1 mb-4 text-xs font-bold border-t-2 border-black border-dashed pt-4 font-sans text-left">
                  <div className="flex justify-between w-full items-end mt-1 text-[10px]">
                    <span className="shrink-0 font-bold">CLIENTE:</span>
                    <span className="flex-1 border-b border-black ml-2 mb-[2px]"></span>
                  </div>
                  <div className="flex justify-between w-full items-end mt-1 text-[10px]">
                    <span>C.I:</span>
                    <span className="flex-1 border-b border-black ml-2 mb-[2px]"></span>
                  </div>
                  <div className="flex justify-between w-full items-end mt-1 text-[10px]">
                    <span>CORREO:</span>
                    <span className="flex-1 border-b border-black ml-2 mb-[2px]"></span>
                  </div>
                  <div className="flex justify-between w-full items-end mt-1 text-[10px]">
                    <span>TELF:</span>
                    <span className="flex-1 border-b border-black ml-2 mb-[2px]"></span>
                  </div>
                  <div className="flex justify-between w-full items-end mt-1 text-[10px]">
                    <span>DIR:</span>
                    <span className="flex-1 border-b border-black ml-2 mb-[2px]"></span>
                  </div>
                </div>

                {/* TIP COMPONENT */}
                <div className="mb-6 pt-4 pb-2 border-t-2 border-black border-dashed flex justify-center">
                  <div className="border-2 border-black rounded-lg px-4 py-2 w-full max-w-[200px] flex flex-col justify-center items-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-sm uppercase">Propina</span>
                    <span className="font-bold text-lg mt-1">$ ____________</span>
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
                    <span>{formatPrice(order.total / ivaDivisor)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">BASE {appliedIvaRate}%:</span>
                    <span>{formatPrice(order.total / ivaDivisor)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">BASE 0%:</span>
                    <span>{formatPrice(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="uppercase">IVA {appliedIvaRate}%:</span>
                    <span>{formatPrice(order.total - (order.total / ivaDivisor))}</span>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-black uppercase tracking-widest text-sm">TOTAL:</span>
                    <span className="font-black text-xl">{formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] font-bold uppercase mt-6">
                  <p>¡Gracias por su preferencia!</p>
                  <p className="mt-1">ATENDIDO POR: {order.sellerName ? order.sellerName : 'CAJERO'}</p>
                  <p className="mt-4 text-[8px] opacity-60">SIST. ELABORADO POR PALMA NEXUS SOLUTIONS</p>
                </div>
              </>
            ) : (
              <>
                {/* Kitchen Ticket */}
                <div className="text-center mb-4">
                  <h1 className="text-xl font-black mb-1 uppercase">COMANDA</h1>
                  {order.branchName && (
                    <p className="text-xs font-black uppercase text-[#B91C1C]">📍 {order.branchName.toUpperCase()}</p>
                  )}
                  <div className="border-t-2 border-black border-dashed w-full mt-2 pt-2">
                    {order.tableNumber && (
                      <h2 className="text-lg font-black uppercase">
                        {(() => {
                          const norm = order.tableNumber.trim().toLowerCase();
                          if (norm === 'pedidosya' || norm === 'pedidos ya' || norm.startsWith('pedidos')) return '🛵 PEDIDOS YA';
                          if (norm === 'rappi') return '🧡 RAPPI';
                          if (norm === 'uber' || norm === 'uber eats' || norm.startsWith('uber')) return '🟢 UBER EATS';
                          if (norm === 'domicilio' || norm === 'para llevar' || norm === 'llevar') return '🏠 LLEVAR';
                          return `MESA: ${order.tableNumber}`;
                        })()}
                      </h2>
                    )}
                    <p className="text-sm mt-1 font-bold">PEDIDO #{String(order.orderNumber).padStart(5, '0')}</p>
                  </div>
                </div>

                <div className="mb-6 text-sm font-bold font-sans">
                  {order.customerName && (
                    <div className="flex justify-between items-center mb-2 bg-black text-white p-1.5 rounded text-xs font-black">
                      <span className="uppercase opacity-80">CLIENTE / DIR:</span>
                      <span className="uppercase text-sm tracking-wide text-[#FFD700] truncate max-w-[65%]">{order.customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-1">
                    <span className="opacity-60 uppercase">Hora:</span>
                    <span>{new Date(order.date).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
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
                    {kitchenItems.length === 0 && (
                       <p className="text-center text-xs opacity-50 uppercase font-bold py-2">No hay productos nuevos</p>
                    )}
                    {kitchenItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-start pb-2">
                        <span className="text-xs font-black min-w-[20px]">{item.quantity}</span>
                        <span className="text-xs font-bold uppercase leading-tight">{item.menuItem.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t-2 border-black text-center">
                    {order.notes && (
                      <div className="mb-4 text-left bg-amber-50 border-2 border-black rounded p-2">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">📝 Observaciones:</p>
                        <p className="text-sm font-black uppercase leading-snug">{order.notes}</p>
                      </div>
                    )}
                    <p className="font-black text-lg uppercase tracking-widest italic opacity-50">FIN DE COMANDA</p>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Actions - Hidden in Print */}
        <div className="p-4 bg-slate-50 border-t-2 border-black flex flex-col gap-2 print:hidden rounded-b-xl shrink-0">
          <button
            className={`w-full py-4 bg-[#FFD700] text-black border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-2 ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handlePrintBoth}
            disabled={isPrinting}
          >
            <CheckSquare className="w-5 h-5" />
            {isPrinting ? 'Enviando...' : 'Imprimir Todo Secuencialmente'}
          </button>
          
          <div className="flex gap-2">
            <button
              className={`flex-1 py-3 bg-white border-2 border-black rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex justify-center items-center gap-1 ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handlePrintCustomer}
              disabled={isPrinting}
            >
              <Receipt className="w-4 h-4" />
              {isPrinting ? '...' : 'Solo Factura'}
            </button>
            <button
              className={`flex-1 py-3 bg-white border-2 border-black rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex justify-center items-center gap-1 ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handlePrintKitchen}
              disabled={isPrinting}
            >
              <ChefHat className="w-4 h-4" />
              {isPrinting ? '...' : 'Solo Comanda'}
            </button>
          </div>

          <button
            className="w-full py-3 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex justify-center items-center gap-2"
            onClick={handleDownloadPDF}
            disabled={isPrinting}
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
