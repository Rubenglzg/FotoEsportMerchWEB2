import { AVAILABLE_COLORS } from '../config/constants';


/* * ============================================================================
 * ✉️ PLANTILLAS DE CORREOS ELECTRÓNICOS
 * ============================================================================
 * Aquí guardamos el código HTML (el diseño visual) de los correos automáticos 
 * que envía el sistema. Separarlo aquí mantiene nuestra App principal limpia.
 */

// --- 1. PLANTILLA: EMAIL PREVISIÓN STOCK (Para Proveedores) ---
export const generateStockEmailHTML = (supplierName, batchId, clubName, productsList) => {
    const rows = productsList.map(p => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${p.size || 'Única'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${p.qty}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: sans-serif; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <h2 style="color: #059669;">Previsión de Stock - ${clubName}</h2>
        <p>Buenas <strong>${supplierName}</strong>,</p>
        <p>Adjuntamos la previsión de productos necesarios para el <strong>Pedido Global #${batchId}</strong> del club <strong>${clubName}</strong>.</p>
        <p>Por favor, revisad si disponéis de stock mientras preparamos los diseños.</p>
        
        <table border="0" cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th width="50%">Producto</th>
                    <th width="25%" style="text-align: center;">Talla / Detalle</th>
                    <th width="25%" style="text-align: center;">Cantidad</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Este es un correo automático de previsión generado por FotoEsport Merch.
        </p>
    </body>
    </html>
    `;
};

// --- 2. PLANTILLA: CAMBIO DE ESTADO DEL PEDIDO (Para Clientes) ---
export const generateEmailHTML = (order, newStatus, clubName) => {
    // Definir textos según estado
    const statusMessages = {
        'recopilando': 'Tu pedido ha sido validado y está en fase de recopilación.',
        'en_produccion': '¡Buenas noticias! Tu pedido ha entrado en fábrica para su producción.',
        'entregado_club': '¡Ya está aquí! Tu pedido ha llegado al club y está listo para ser recogido.',
        'pendiente_validacion': 'Tu pedido está registrado pendiente de pago/validación.'
    };

    const statusColor = {
        'recopilando': '#3b82f6', // Azul
        'en_produccion': '#9333ea', // Morado
        'entregado_club': '#10b981', // Verde
        'pendiente_validacion': '#f59e0b' // Naranja
    }[newStatus] || '#333';

    // URL DEL LOGO
    const LOGO_FULL_URL = "https://raw.githubusercontent.com/Rubenglzg/FotoEsportMerchWEB2/b740c87f99da10c1044474dbfdc8993c413347ff/public/logo.png"; 

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            
            /* Cabecera negra compacta */
            .header { background-color: #000000; padding: 10px 0; text-align: center; border-bottom: 4px solid #10b981; }
            
            /* Logo grande */
            .logo-img { height: 150px; width: auto; display: block; margin: 0 auto; }
            
            .content { padding: 40px 30px; background-color: #ffffff; }
            .status-badge { 
                background-color: ${statusColor}; color: white; padding: 12px 24px; 
                border-radius: 50px; display: inline-block; font-weight: bold; margin: 25px 0;
                font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase;
            }
            .order-details { width: 100%; border-collapse: collapse; margin-top: 25px; background-color: #f9fafb; border-radius: 8px; overflow: hidden; }
            .order-details th { text-align: left; background-color: #f3f4f6; padding: 12px 15px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
            .order-details td { border-bottom: 1px solid #e5e7eb; padding: 12px 15px; font-size: 14px; vertical-align: top; }
            .item-meta { display: block; color: #555; font-size: 13px; margin-top: 4px; line-height: 1.4; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${LOGO_FULL_URL}" alt="FotoEsport Merch" class="logo-img" />
            </div>
            <div class="content">
                <h2 style="color: #111827; margin-top: 0;">Hola, ${order.customer.name}</h2>
                <p style="color: #4b5563;">Te informamos que el estado de tu pedido para el club <strong>${clubName}</strong> ha cambiado.</p>
                
                <div style="text-align: center;">
                    <div class="status-badge">
                        ${newStatus.replace(/_/g, ' ')}
                    </div>
                </div>
                
                <p style="text-align: center; color: #374151; font-weight: 500;">${statusMessages[newStatus] || 'Estado actualizado.'}</p>

                <h3 style="margin-top: 30px; font-size: 16px; color: #111827;">Resumen del Pedido #${order.id.slice(0, 6)}</h3>
                <table class="order-details">
                    <thead>
                        <tr>
                            <th width="40%">Producto</th>
                            <th width="45%">Detalles</th>
                            <th width="15%" style="text-align:right;">Cant.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => {
                            // Obtener nombre del color
                            const colorObj = AVAILABLE_COLORS.find(c => c.id === item.color);
                            const colorName = colorObj ? colorObj.label : item.color;
                            
                            // Lista de detalles
                            const detailsList = [
                                item.playerName ? `Nombre: <strong>${item.playerName}</strong>` : null,
                                item.playerNumber ? `Dorsal: <strong>${item.playerNumber}</strong>` : null,
                                item.size ? `Talla: <strong>${item.size}</strong>` : null,
                                item.color ? `Color: <strong>${colorName}</strong>` : null
                            ].filter(Boolean).join(', ');

                            return `
                            <tr>
                                <td style="font-weight: 600; color: #111;">${item.name}</td>
                                <td>
                                    <span class="item-meta">
                                        ${detailsList || '-'}
                                    </span>
                                </td>
                                <td style="text-align:right; font-weight: bold;">${item.quantity || 1}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; text-align: right; padding-right: 15px;">
                    <p style="font-size: 18px; color: #10b981; font-weight: bold; margin: 0;">Total: ${order.total.toFixed(2)}€</p>
                    <p style="font-size: 15px; color: #4b5563; font-weight: bold; margin: 8px 0 0;">
                        Lote Global: #${order.globalBatch || 1}
                    </p>
                </div>

                <div style="margin-top: 30px; padding: 15px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px; display: flex; align-items: start; gap: 10px;">
                    <span>ℹ️</span>
                    <span>Si tienes alguna duda sobre la entrega o los plazos, por favor contacta directamente con los responsables de <strong>${clubName}</strong>.</span>
                </div>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} FotoEsport Merch - Gestión Integral de Clubes</p>
                <p>Mensaje automático. Por favor, no respondas a este correo.</p>
            </div>
        </div>
    </body>
    </html>
    `;
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
            .meta-info { font-size: 11px; color: #666; display: block; margin-top: 2px; }
            .footer { text-align: center; padding: 20px; font-size: 11px; color: #999; background: #f9fafb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${LOGO_FULL_URL}" alt="FotoEsport" style="height: 160px;" />
            </div>
            <div class="content">
                <h2 style="color: #111; margin-top: 0;">Confirmación de Pedido</h2>
                <p>Hola <strong>${order.customer.name}</strong>,</p>
                <p>Tu pedido para el club <strong>${clubName}</strong> ha sido registrado correctamente.</p>
                
                <div class="invoice-box">
                    <p style="margin: 5px 0;"><strong>Referencia:</strong> #${order.id.slice(0,8)}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${orderDate}</p>
                    <p style="margin: 5px 0;"><strong>Método de Pago:</strong> ${order.paymentMethod === 'cash' ? 'Efectivo (Validado)' : 'Tarjeta / Online'}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="60%">Producto / Detalles</th>
                            <th width="15%" style="text-align:center">Cant.</th>
                            <th width="25%" style="text-align:right">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => {
                            // 1. Datos Jugador 1 (Raíz)
                            const p1Name = item.playerName || item.name1;
                            const p1Num = item.playerNumber || item.number1;

                            // 2. Datos Jugador 2 (Dentro de details.player2 O en raíz)
                            const p2Obj = item.details?.player2 || {};
                            const p2Name = p2Obj.name || item.player2Name || item.name2;
                            const p2Num = p2Obj.number || item.player2Number || item.number2;

                            // 3. Datos Jugador 3 (Dentro de details.player3 O en raíz)
                            const p3Obj = item.details?.player3 || {};
                            const p3Name = p3Obj.name || item.player3Name || item.name3;
                            const p3Num = p3Obj.number || item.player3Number || item.number3;

                            return `
                            <tr>
                                <td>
                                    <strong>${item.name}</strong>
                                    ${item.category ? `<span class="meta-info">Categoría: ${item.category}</span>` : ''}

                                    <div style="margin-top: 4px; font-size: 12px; color: #555;">
                                        ${item.size ? `• Talla: <strong>${item.size}</strong><br>` : ''}
                                        
                                        ${p1Name ? `• Nombre: <strong>${p1Name}</strong><br>` : ''}
                                        ${p1Num ? `• Número: <strong>${p1Num}</strong>` : ''}

                                        ${(p2Name || p2Num) ? `
                                            <div class="sub-player">
                                                <strong>Jugador 2:</strong><br>
                                                ${p2Name ? `• Nombre: <strong>${p2Name}</strong><br>` : ''}
                                                ${p2Num ? `• Número: <strong>${p2Num}</strong>` : ''}
                                            </div>
                                        ` : ''}

                                        ${(p3Name || p3Num) ? `
                                            <div class="sub-player">
                                                <strong>Jugador 3:</strong><br>
                                                ${p3Name ? `• Nombre: <strong>${p3Name}</strong><br>` : ''}
                                                ${p3Num ? `• Número: <strong>${p3Num}</strong>` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                </td>
                                <td style="text-align:center">${item.quantity || 1}</td>
                                <td style="text-align:right">${item.price.toFixed(2)}€</td>
                            </tr>
                            `;
                        }).join('')}
                        <tr class="total-row">
                            <td colspan="2" style="text-align:right">TOTAL</td>
                            <td style="text-align:right">${order.total.toFixed(2)}€</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="footer">
                <p>Gracias por confiar en FotoEsport Merch.</p>
                <p>Recibirás un nuevo aviso cuando tu pedido esté listo o cambie de estado.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};