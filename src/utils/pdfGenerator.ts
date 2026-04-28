import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Guest } from '../types';

export const generateGuestsPdf = (guests: Guest[]) => {
  const doc = new jsPDF();
  
  const groupedGuests = guests.reduce((groups, guest) => {
    const cat = guest.categoria || 'Outros';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(guest);
    return groups;
  }, {} as Record<string, Guest[]>);

  const categories = Object.keys(groupedGuests).sort();

  // Title
  doc.setFontSize(22);
  doc.setTextColor(30);
  doc.text('Lista de Convidados', 14, 22);

  const confirmados = guests.filter(g => g.status === 'confirmado').length;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Total: ${guests.length} | Confirmados: ${confirmados} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  let startY = 40;

  categories.forEach((category) => {
    const catGuests = groupedGuests[category].sort((a, b) => a.nome.localeCompare(b.nome));
    const totalCatPessoas = catGuests.reduce((acc, g) => acc + (g.adultos || 0) + (g.criancas || 0), 0);
    
    // Add Category Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text(`${category.toUpperCase()}`, 14, startY);
    
    // Calcula a largura do texto COM a fonte 14 e negrito aplicada!
    const textWidth = doc.getTextWidth(`${category.toUpperCase()}`);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`   —  ${catGuests.length} convite(s) / ${totalCatPessoas} pessoa(s)`, 14 + textWidth + 2, startY);

    startY += 5;

    const tableData = catGuests.map(g => {
      let extra = '';
      if (g.children_names) extra += `\n+ ${g.children_names}`;
      if (g.observacoes) extra += `\nObs: ${g.observacoes}`;
      
      const statusStr = g.status.charAt(0).toUpperCase() + g.status.slice(1);
      
      return [
        `${g.nome}${extra}`,
        `${g.adultos || 0} A / ${g.criancas || 0} C`,
        statusStr,
        ""
      ];
    });

    autoTable(doc, {
      startY: startY,
      head: [['Nome Completo', 'Adultos / Cria.', 'Status', 'Presente?']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255], 
        fontStyle: 'bold' 
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4, 
        valign: 'middle' 
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 25, halign: 'center' },
      },
      didParseCell: function (data) {
        // You can conditionally format cells here if needed
        if (data.section === 'body' && data.column.index === 2) {
           const status = data.cell.raw;
           if (status === 'Confirmado') {
             data.cell.styles.textColor = [22, 163, 74]; // green-600
           } else if (status === 'Recusado') {
             data.cell.styles.textColor = [220, 38, 38]; // red-600
           } else {
             data.cell.styles.textColor = [202, 138, 4]; // yellow-600
           }
        }
      }
    });
    
    // update startY using the final y of the table
    const finalY = (doc as any).lastAutoTable.finalY || startY;
    startY = finalY + 12;

    if (startY > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      startY = 20;
    }
  });

  doc.save('wedplan-lista-convidados.pdf');
}
