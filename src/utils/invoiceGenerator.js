import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Función auxiliar para cargar el logo de tu carpeta public
const getBase64ImageFromUrl = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            
            const maxWidth = 200;
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            const ctx = canvas.getContext('2d');
            
            // Rellenamos el fondo de blanco ANTES de dibujar el logo
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Ahora sí podemos usar JPEG sin fondo negro
            const compressed = canvas.toDataURL('image/jpeg', 0.6);
            
            URL.revokeObjectURL(objectUrl);
            resolve(compressed.split(',')[1]);
        };
        
        img.onerror = reject;
        img.src = objectUrl;
    });
};

// 🟢 NOTA: Ahora la función tiene la palabra "async" delante
export const generateInvoicePDF = async (orderId, orderData) => {
    const doc = new jsPDF();

    // --- 1. INTENTAMOS CARGAR EL LOGO ---
    try {
        // Carga el logo de tu carpeta public (puedes cambiarlo por /logonegro.png si queda mejor)
        const logoBase64 = await getBase64ImageFromUrl('/logo.png'); 
        doc.addImage(logoBase64, 'JPEG', 14, 12, 40, 15); // Posición X, Y, Ancho, Alto
    } catch (error) {
        console.warn("No se pudo cargar el logo para el PDF", error);
    }

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
    // Desplazamos la palabra FACTURA a la derecha para hacerle hueco al logo
    doc.text('FACTURA', 150, 22);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const invoiceNum = `FAC-${orderId.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('es-ES');
    
    doc.text(`Número de Factura: ${invoiceNum}`, 14, 38);
    doc.text(`Fecha de Expedición: ${dateStr}`, 14, 44);

    // --- 4. BLOQUES DE DATOS ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Datos del Emisor:', 14, 56);
    doc.text('Datos del Cliente:', 120, 56);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(emisor.nombre, 14, 62);
    doc.text(`NIF/CIF: ${emisor.nif}`, 14, 68);
    
    // jsPDF detecta el \n de tu dirección y pinta dos líneas sin chocar
    doc.text(emisor.direccion, 14, 74); 

    doc.text(receptor.nombre, 120, 62);
    doc.text(receptor.email, 120, 68);

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
        startY: 92, // Empezamos un poquito más abajo por seguridad
        headStyles: { fillColor: [16, 185, 129] },
        head: [['Concepto', 'Uds.', 'Precio ud. (Sin IVA)', 'Importe']],
        body: tableBody,
    });

    // --- 6. TOTALES ---
    const totalConIva = orderData.total || 0;
    const baseImponible = totalConIva / 1.21;
    const cuotaIva = totalConIva - baseImponible;

    const finalY = doc.lastAutoTable.finalY || 92;

    doc.setFontSize(10);
    // 🟢 ARREGLADO: Unimos los textos y los pegamos a la derecha. Ya nunca se chocarán.
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