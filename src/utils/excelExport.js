/* * ============================================================================
 * 📊 GENERADOR DE EXCEL / CSV
 * ============================================================================
 * Esta función toma los datos de un lote de pedidos y genera un archivo .csv
 * listo para abrirse en Excel y enviar a fábrica.
 */

export const generateBatchExcel = (batchId, orders, clubName) => {
    try {
        const today = new Date().toLocaleDateString();
        
        // Usamos \ufeff para BOM (Byte Order Mark) para que Excel reconozca acentos correctamente
        let csvBody = '\ufeff'; 
        
        // Encabezado
        csvBody += `REPORTE DETALLADO DE PEDIDO GLOBAL\n`;
        csvBody += `LOTE NUMERO:;${batchId || 'N/A'}\n`;
        csvBody += `CLUB:;${clubName || 'Desconocido'}\n`;
        csvBody += `FECHA EMISION:;${today}\n`;
        csvBody += `TOTAL PEDIDOS:;${orders ? orders.length : 0}\n\n`;

        // Columnas (Añadida "Detalles Extra")
        csvBody += "ID Pedido;Fecha Pedido;Cliente;Tipo Pedido;Producto;Cantidad;Precio Unit.;Subtotal;Pers. Nombre;Pers. Dorsal;Talla;Color;Detalles Extra;Estado Actual\n";

        let grandTotal = 0;

        if (orders && orders.length > 0) {
            orders.forEach(order => {
                const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : '-';
                
                order.items.forEach(item => {
                    const quantity = item.quantity || 1;
                    const price = item.price || 0;
                    const lineTotal = quantity * price;
                    grandTotal += lineTotal;

                    // Limpieza de datos
                    const clean = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

                    // --- LÓGICA DE EXTRAS ---
                    let extras = [];
                    if (item.details) {
                         if (item.details.variant) extras.push(`[${item.details.variant}]`);
                         
                         // JUGADOR 2
                         if (item.details.player2) {
                             let p2Str = `J2: ${item.details.player2.name} #${item.details.player2.number}`;
                             if (item.details.player2.category) p2Str += ` (Cat: ${item.details.player2.category})`;
                             extras.push(p2Str);
                         }
                         
                         // JUGADOR 3
                         if (item.details.player3) {
                             let p3Str = `J3: ${item.details.player3.name} #${item.details.player3.number}`;
                             if (item.details.player3.category) p3Str += ` (Cat: ${item.details.player3.category})`;
                             extras.push(p3Str);
                         }
                    }
                    // Añadir también la categoría principal si existe
                    if (item.category) extras.unshift(`Cat J1: ${item.category}`);

                    const extrasStr = extras.join(' | ');

                    const row = [
                        clean(order.id ? order.id.slice(0,8) : 'ID-ERROR'),
                        clean(orderDate),
                        clean(order.customer ? order.customer.name : 'Sin Nombre'),
                        clean(order.type === 'special' ? 'ESPECIAL' : 'WEB'),
                        clean(item.name),
                        quantity,
                        price.toFixed(2).replace('.', ','), 
                        lineTotal.toFixed(2).replace('.', ','),
                        clean(item.playerName),
                        clean(item.playerNumber),
                        clean(item.size),
                        clean(item.color),
                        clean(extrasStr), // <--- Nueva columna
                        clean(order.status)
                    ].join(";");
                    csvBody += row + "\n";
                });
            });
        }

        csvBody += `\n;;;;;;;TOTAL LOTE:;${grandTotal.toFixed(2).replace('.', ',')} €\n`;

        const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Lote_Global_${batchId}_${clubName ? clubName.replace(/\s+/g, '_') : 'Club'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); 

    } catch (e) {
        console.error("Error generando Excel:", e);
        alert("Hubo un error al generar el Excel. Por favor revisa la consola.");
    }
};