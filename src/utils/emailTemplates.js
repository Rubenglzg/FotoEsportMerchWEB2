import { AVAILABLE_COLORS } from '../config/constants';

/* * ============================================================================
 * ✉️ PLANTILLAS DE CORREOS ELECTRÓNICOS CORREGIDAS
 * ============================================================================
 */

// 🟢 FUNCIÓN DE LIMPIEZA GLOBAL: Evita que aparezcan tallas o datos vacíos/falsos
const isValid = (val) => {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    // Filtramos cadenas vacías, el texto "null", "undefined", guiones o el valor false
    const forbidden = ['', 'null', 'undefined', 'false', '-', 'n/a'];
    return !forbidden.includes(str.toLowerCase());
};

// --- 1. PLANTILLA: EMAIL PREVISIÓN STOCK (Para Proveedores) ---
export const generateStockEmailHTML = (supplierName, batchId, clubName, productsList) => {
    const rows = productsList.map(p => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${isValid(p.size) ? p.size : 'Única'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${p.qty}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>body { font-family: sans-serif; color: #333; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }</style>
    </head>
    <body>
        <h2 style="color: #059669;">Previsión de Stock - ${clubName}</h2>
        <p>Buenas <strong>${supplierName}</strong>,</p>
        <p>Adjuntamos la previsión de productos para el <strong>Lote #${batchId}</strong>.</p>
        <table>
            <thead><tr><th width="50%">Producto</th><th width="25%" style="text-align: center;">Talla / Detalle</th><th width="25%" style="text-align: center;">Cantidad</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </body>
    </html>`;
};

// --- 2. PLANTILLA: CAMBIO DE ESTADO DEL PEDIDO (Para Clientes) ---
export const generateEmailHTML = (order, newStatus, clubName) => {
    const statusMessages = {
        'recopilando': 'Tu pedido ha sido validado y está en fase de recopilación.',
        'en_produccion': '¡Buenas noticias! Tu pedido ha entrado en fábrica para su producción.',
        'entregado_club': '¡Ya está aquí! Tu pedido ha llegado al club y está listo para ser recogido.',
        'pendiente_validacion': 'Tu pedido está registrado pendiente de pago/validación.'
    };

    const statusColor = { 'recopilando': '#3b82f6', 'en_produccion': '#9333ea', 'entregado_club': '#10b981', 'pendiente_validacion': '#f59e0b' }[newStatus] || '#333';
    const LOGO_FULL_URL = "https://raw.githubusercontent.com/Rubenglzg/FotoEsportMerchWEB2/b740c87f99da10c1044474dbfdc8993c413347ff/public/logo.png"; 

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden; }
            .header { background-color: #000; padding: 15px; text-align: center; border-bottom: 4px solid #10b981; }
            .logo-img { height: 120px; width: auto; }
            .content { padding: 30px; background-color: #ffffff; }
            .status-badge { background-color: ${statusColor}; color: white; padding: 10px 20px; border-radius: 50px; display: inline-block; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
            .order-details { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .order-details th { text-align: left; background-color: #f3f4f6; padding: 10px; font-size: 11px; text-transform: uppercase; }
            .order-details td { border-bottom: 1px solid #eee; padding: 10px; font-size: 13px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><img src="${LOGO_FULL_URL}" alt="FotoEsport" class="logo-img" /></div>
            <div class="content">
                <h2>Hola, ${order.customer.name}</h2>
                <p>El estado de tu pedido para <strong>${clubName}</strong> es ahora:</p>
                <div style="text-align: center;"><div class="status-badge">${newStatus.replace(/_/g, ' ')}</div></div>
                <p style="text-align: center;">${statusMessages[newStatus] || 'Actualizado.'}</p>
                <table class="order-details">
                    <thead><tr><th>Producto</th><th>Detalles</th><th style="text-align:right;">Cant.</th></tr></thead>
                    <tbody>
                        ${order.items.map(item => {
                            const colorObj = AVAILABLE_COLORS.find(c => c.id === item.color);
                            const colorName = colorObj ? colorObj.label : item.color;
                            const detailsList = [
                                isValid(item.playerName) ? `Nombre: <strong>${item.playerName}</strong>` : null,
                                isValid(item.playerNumber) ? `Dorsal: <strong>${item.playerNumber}</strong>` : null,
                                isValid(item.size) ? `Talla: <strong>${item.size}</strong>` : null,
                                isValid(item.color) ? `Color: <strong>${colorName}</strong>` : null
                            ].filter(Boolean).join(', ');
                            return `<tr><td>${item.name}</td><td>${detailsList || '-'}</td><td style="text-align:right;">${item.quantity || 1}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>`;
};

// --- 3. PLANTILLA: FACTURA / CONFIRMACIÓN ---
export const generateInvoiceEmailHTML = (order, clubName) => {
    const LOGO_FULL_URL = "https://raw.githubusercontent.com/Rubenglzg/FotoEsportMerchWEB2/b740c87f99da10c1044474dbfdc8993c413347ff/public/logo.png"; 
    const orderDate = new Date().toLocaleDateString();

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', Arial, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
            .header { background: #000; padding: 20px; text-align: center; border-bottom: 4px solid #10b981; }
            .content { padding: 30px; background: #fff; }
            .invoice-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { text-align: left; padding: 10px; background: #f3f4f6; color: #666; text-transform: uppercase; font-size: 11px; }
            td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; }
            .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 16px; color: #10b981; }
            .footer { text-align: center; padding: 20px; font-size: 11px; color: #999; background: #f9fafb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><img src="${LOGO_FULL_URL}" alt="FotoEsport" style="height: 150px;" /></div>
            <div class="content">
                <h2>Confirmación de Pedido</h2>
                <p>Hola <strong>${order.customer.name}</strong>, tu pedido para <strong>${clubName}</strong> ha sido registrado correctamente.</p>
                <div class="invoice-box">
                    <p><strong>Referencia:</strong> #${order.id.slice(0,8)} | <strong>Fecha:</strong> ${orderDate}</p>
                </div>
                <table>
                    <thead><tr><th width="60%">Producto / Detalles</th><th width="15%" style="text-align:center">Cant.</th><th width="25%" style="text-align:right">Precio</th></tr></thead>
                    <tbody>
                        ${order.items.map(item => {
                            const p1Name = item.playerName || item.name1;
                            const p1Num = item.playerNumber || item.number1;
                            const p2Obj = item.details?.player2 || {};
                            const p2Name = p2Obj.name || item.player2Name || item.name2;
                            const p2Num = p2Obj.number || item.player2Number || item.number2;
                            const p3Obj = item.details?.player3 || {};
                            const p3Name = p3Obj.name || item.player3Name || item.name3;
                            const p3Num = p3Obj.number || item.player3Number || item.number3;

                            return `
                            <tr>
                                <td>
                                    <strong>${item.name}</strong>
                                    <div style="margin-top: 4px; font-size: 12px; color: #555;">
                                        ${isValid(item.size) ? `• Talla: <strong>${item.size}</strong><br>` : ''}
                                        ${isValid(p1Name) ? `• Nombre: <strong>${p1Name}</strong><br>` : ''}
                                        ${isValid(p1Num) ? `• Número: <strong>${p1Num}</strong><br>` : ''}
                                        ${isValid(item.photoFileName) ? `• 📸 Foto: <strong style="color:#059669;">${item.photoFileName}</strong><br>` : ''}

                                        ${(isValid(p2Name) || isValid(p2Num) || isValid(item.photoFileName2)) ? `
                                            <div style="margin-top: 6px; border-top: 1px dashed #ddd; padding-top: 4px;">
                                                <strong>Jugador 2:</strong><br>
                                                ${isValid(p2Name) ? `• Nombre: <strong>${p2Name}</strong><br>` : ''}
                                                ${isValid(p2Num) ? `• Número: <strong>${p2Num}</strong><br>` : ''}
                                                ${isValid(item.photoFileName2) ? `• 📸 Foto: <strong>${item.photoFileName2}</strong>` : ''}
                                            </div>
                                        ` : ''}

                                        ${(isValid(p3Name) || isValid(p3Num) || isValid(item.photoFileName3)) ? `
                                            <div style="margin-top: 6px; border-top: 1px dashed #ddd; padding-top: 4px;">
                                                <strong>Jugador 3:</strong><br>
                                                ${isValid(p3Name) ? `• Nombre: <strong>${p3Name}</strong><br>` : ''}
                                                ${isValid(p3Num) ? `• Número: <strong>${p3Num}</strong><br>` : ''}
                                                ${isValid(item.photoFileName3) ? `• 📸 Foto: <strong>${item.photoFileName3}</strong>` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                </td>
                                <td style="text-align:center">${item.quantity || 1}</td>
                                <td style="text-align:right">${item.price.toFixed(2)}€</td>
                            </tr>`;
                        }).join('')}
                        <tr class="total-row"><td colspan="2" style="text-align:right">TOTAL</td><td style="text-align:right">${order.total.toFixed(2)}€</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="footer"><p>© ${new Date().getFullYear()} FotoEsport Merch</p></div>
        </div>
    </body>
    </html>`;
};