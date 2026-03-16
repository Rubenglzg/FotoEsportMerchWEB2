import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePDF = async (orderId, orderData) => {
    const doc = new jsPDF();

    // --- 2. DATOS FISCALES ---
    const emisor = {
        nombre: "FOTOESPORT MERCH S.L.", // CÁMBIALO
        nif: "B12345678", // CÁMBIALO
        // 🟢 DIRECCIÓN EN DOS LÍNEAS (El \n hace el salto de línea automáticamente)
        direccion: "Calle Ejemplo 123, Bajo\n46000 Valencia", 
        email: "contacto@fotoesport.com"
    };

    const receptor = {
        nombre: orderData.customer?.name || "Cliente Final",
        email: orderData.customer?.email || "",
    };

    // --- 3. CABECERA ---
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); 
    
    // 🟢 Como hemos quitado el logo, alineamos la palabra FACTURA a la izquierda (eje X = 14)
    doc.text('FACTURA', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const invoiceNum = `FAC-${orderId.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('es-ES');
    
    // Bajamos un poco los textos para que respiren respecto al título
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
    doc.text(emisor.nombre, 14, 58);
    doc.text(`NIF/CIF: ${emisor.nif}`, 14, 64);
    
    doc.text(emisor.direccion, 14, 70); 

    doc.text(receptor.nombre, 120, 58);
    doc.text(receptor.email, 120, 64);

    // --- 5. TABLA DE PRODUCTOS ---
    const tableBody = (orderData.items || []).map(item => {
        const precioConIva = item.price || 0;
        const precioSinIva = precioConIva / 1.21;
        const cantidad = item.quantity || 1;
        const totalLinea = precioConIva * cantidad;

        return [
            item.name,
            cantidad,
            `${precioSinIva.toFixed(2)} €`,
            `${totalLinea.toFixed(2)} €`
        ];
    });

    autoTable(doc, {
        startY: 88, // Ajustado tras mover la cabecera
        headStyles: { fillColor: [16, 185, 129] },
        head: [['Concepto', 'Uds.', 'Precio ud. (Sin IVA)', 'Importe']],
        body: tableBody,
    });

    // --- 6. TOTALES ---
    const totalConIva = orderData.total || 0;
    const baseImponible = totalConIva / 1.21;
    const cuotaIva = totalConIva - baseImponible;

    const finalY = doc.lastAutoTable.finalY || 88;

    doc.setFontSize(10);
    doc.text(`Base Imponible:   ${baseImponible.toFixed(2)} €`, 180, finalY + 15, { align: 'right' });
    doc.text(`IVA (21%):   ${cuotaIva.toFixed(2)} €`, 180, finalY + 22, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL FACTURA:   ${totalConIva.toFixed(2)} €`, 180, finalY + 32, { align: 'right' });

    // Pie legal
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Operación sujeta a la Ley del Impuesto sobre el Valor Añadido (IVA).', 14, 280);

    const pdfDataUri = doc.output('datauristring');
    return pdfDataUri.split(',')[1];
};