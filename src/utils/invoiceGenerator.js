import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePDF = async (orderId, orderData) => {
    const doc = new jsPDF();

    // --- 2. DATOS FISCALES ---
    const emisor = {
        nombre: "FotoEsport Merch",
        nif: "24336512M",
        direccion: "Carrer de Miguel Galan Mestre, n° 8, Bajo Izq\nBenicalap, 46025 València, Valencia", 
        email: "fotoesportmerch@gmail.com"
    };

    const receptor = {
        nombre: orderData.customer?.invoiceName || orderData.customer?.name || "Cliente Final",
        nif: orderData.customer?.invoiceDni || "No especificado",
        direccion: orderData.customer?.invoiceAddress || "No especificada",
        email: orderData.customer?.email || "",
    };

    // --- 3. CABECERA ---
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); 
    doc.text('FACTURA', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const invoiceNum = `FAC-${orderId.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('es-ES');
    
    doc.text(`Número de Factura: ${invoiceNum}`, 14, 34);
    doc.text(`Fecha de Expedición: ${dateStr}`, 14, 40);

    // --- 4. BLOQUES DE DATOS ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Datos del Emisor:', 14, 52);
    doc.text('Datos del Cliente:', 120, 52);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    // Emisor
    doc.text(emisor.nombre, 14, 58);
    doc.text(`D.N.I.: ${emisor.nif}`, 14, 64);
    const emisorLines = doc.splitTextToSize(emisor.direccion, 90);
    doc.text(emisorLines, 14, 70); 

    // Receptor
    doc.text(receptor.nombre, 120, 58);
    doc.text(`DNI/CIF: ${receptor.nif}`, 120, 64);
    // Controlamos el salto de línea por si la dirección es muy larga
    const receptorLines = doc.splitTextToSize(receptor.direccion, 80);
    doc.text(receptorLines, 120, 70);
    
    const emailY = 70 + (receptorLines.length * 5);
    doc.text(receptor.email, 120, emailY);

    // --- 5. TABLA DE PRODUCTOS ---
    const tableBody = (orderData.items || []).map(item => {
        const precioConIva = item.price || 0;
        const precioSinIva = precioConIva / 1.21;
        const cantidad = item.quantity || 1;
        const totalLinea = precioConIva * cantidad;

        return [
            item.name, // El concepto de compra (nombre del producto)
            cantidad,
            `${precioSinIva.toFixed(2)} €`,
            `${totalLinea.toFixed(2)} €`
        ];
    });

    autoTable(doc, {
        startY: Math.max(90, emailY + 10), // Calculamos dinámicamente para que no pise la dirección
        headStyles: { fillColor: [16, 185, 129] },
        head: [['Concepto', 'Uds.', 'Precio ud. (Sin IVA)', 'Importe']],
        body: tableBody,
    });

    // --- 6. TOTALES Y FORMA DE PAGO ---
    const totalConIva = orderData.total || 0;
    const baseImponible = totalConIva / 1.21;
    const cuotaIva = totalConIva - baseImponible;

    const finalY = doc.lastAutoTable.finalY || 90;

    doc.setFontSize(10);
    
    // Traducción y muestreo de la forma de pago
    const paymentMap = { 'card': 'Tarjeta de Crédito/Débito', 'cash': 'Efectivo' };
    const paymentStr = paymentMap[orderData.paymentMethod] || orderData.paymentMethod || 'No especificada';
    doc.text(`Forma de pago: ${paymentStr}`, 14, finalY + 15);

    doc.text(`Base Imponible:   ${baseImponible.toFixed(2)} €`, 190, finalY + 15, { align: 'right' });
    doc.text(`IVA (21%):   ${cuotaIva.toFixed(2)} €`, 190, finalY + 22, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL FACTURA:   ${totalConIva.toFixed(2)} €`, 190, finalY + 32, { align: 'right' });

    // Pie legal
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Operación sujeta a la Ley del Impuesto sobre el Valor Añadido (IVA).', 14, 280);

    const pdfDataUri = doc.output('datauristring');
    return pdfDataUri.split(',')[1];
};