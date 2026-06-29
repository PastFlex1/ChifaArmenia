import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFGeneratorOptions {
  title: string;
  filename: string;
  columns: string[];
  data: (string | number)[][];
}

export const generateInventoryPDF = ({ title, filename, columns, data }: PDFGeneratorOptions) => {
  const doc = new jsPDF();

  // Título del documento
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Fecha de generación
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleString();
  doc.text(`Fecha de exportación: ${dateStr}`, 14, 30);

  // Tabla
  autoTable(doc, {
    startY: 35,
    head: [columns],
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: [185, 28, 28], // #B91C1C
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [247, 244, 240], // #F7F4F0
    }
  });

  doc.save(`${filename}_${new Date().getTime()}.pdf`);
};
