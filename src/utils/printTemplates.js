/* * ============================================================================
 * 🖨️ PLANTILLAS DE IMPRESIÓN (ALBARANES)
 * ============================================================================
 * Función que abre una nueva ventana en el navegador y genera el documento 
 * HTML listo para imprimir (Albarán de entrega para el club).
 */

export const printBatchAlbaran = (batchId, orders, clubName, commissionPct) => {
    const safeCommission = (typeof commissionPct === 'number' && !isNaN(commissionPct)) ? commissionPct : 0;
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString();
    
    const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity || 1), 0), 0);
    
    const commissionAmount = totalAmount * safeCommission;
    const netAmount = totalAmount - commissionAmount;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Albarán Lote Global #${batchId}</title>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #111; max-width: 900px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
                .logo-text { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
                .logo-sub { color: #10b981; }
                .batch-title { text-align: right; }
                .batch-title h1 { margin: 0; font-size: 22px; color: #111; text-transform: uppercase; }
                .batch-title p { margin: 5px 0 0; font-size: 14px; color: #666; }
                .summary-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; border: 1px solid #e5e7eb; }
                .summary-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px; }
                .summary-item span { font-size: 16px; font-weight: bold; color: #111; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px; }
                th { background: #10b981; color: white; padding: 10px; text-align: left; text-transform: uppercase; font-size: 11px; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; }
                .order-sep { background-color: #f0fdf4; font-weight: bold; color: #064e3b; border-top: 2px solid #ccc; }
                .text-right { text-align: right; }
                .financial-section { display: flex; justify-content: flex-end; margin-bottom: 50px; }
                .financial-table { width: 400px; border-collapse: collapse; border: 1px solid #ddd; }
                .financial-table td { padding: 12px; border-bottom: 1px solid #eee; }
                .f-label { text-align: left; color: #555; }
                .f-value { text-align: right; font-weight: bold; font-family: monospace; font-size: 14px; }
                .f-row-total td { border-top: 2px solid #333; font-weight: 900; font-size: 18px; background: #ecfdf5; color: #047857; }
                .f-subtext { display: block; font-size: 10px; color: #999; font-weight: normal; margin-top: 2px;}
                .signature-section { margin-top: 20px; page-break-inside: avoid; border: 2px dashed #9ca3af; border-radius: 8px; padding: 30px; height: 100px; position: relative; }
                .signature-label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #6b7280; position: absolute; top: 10px; left: 10px; }
                .signature-line { position: absolute; bottom: 30px; left: 30px; right: 30px; border-bottom: 1px solid #333; }
                .signature-text { position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 11px; color: #6b7280; }
                @media print { body { -webkit-print-color-adjust: exact; padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo-text">FOTOESPORT<span class="logo-sub">MERCH</span></div>
                    <p style="font-size: 12px; margin: 5px 0 0; color: #666;">Albarán de Entrega y Liquidación</p>
                </div>
                <div class="batch-title">
                    <h1>Lote Global #${batchId}</h1>
                    <p><strong>${clubName}</strong></p>
                    <p style="font-size: 12px;">Fecha Emisión: ${today}</p>
                </div>
            </div>

            <div class="summary-box">
                <div class="summary-item"><strong>Club Destino</strong><span>${clubName}</span></div>
                <div class="summary-item"><strong>Pedidos Totales</strong><span>${orders.length}</span></div>
                <div class="summary-item"><strong>Artículos</strong><span>${totalItems}</span></div>
                <div class="summary-item text-right"><strong>Valor Mercancía</strong><span>${totalAmount.toFixed(2)}€</span></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="40%">Producto</th>
                        <th width="40%">Detalle / Personalización</th>
                        <th width="5%" class="text-right">Cant.</th>
                        <th width="15%" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr class="order-sep">
                            <td colspan="4">
                                🔹 Pedido Ref: <strong>#${order.id.slice(0,6)}</strong> - ${order.customer.name}
                                <span style="font-size:10px; color:#666; margin-left:10px;">(${order.type === 'special' ? 'Especial' : 'Web'})</span>
                            </td>
                        </tr>
                        ${order.items.map(item => {
                            // EXTRAER DATOS EXTRA PARA IMPRESIÓN
                            let extraInfo = '';
                            if (item.details) {
                                 const parts = [];
                                 
                                 // J2
                                 if (item.details.player2) {
                                     let txt = `J2: ${item.details.player2.name} #${item.details.player2.number}`;
                                     if(item.details.player2.category) txt += ` [${item.details.player2.category}]`;
                                     parts.push(txt);
                                 }
                                 
                                 // J3
                                 if (item.details.player3) {
                                     let txt = `J3: ${item.details.player3.name} #${item.details.player3.number}`;
                                     if(item.details.player3.category) txt += ` [${item.details.player3.category}]`;
                                     parts.push(txt);
                                 }
                                 
                                 if (parts.length > 0) extraInfo = parts.join(' | ');
                            }

                            return `
                            <tr>
                                <td style="padding-left: 20px;">
                                    ${item.name}
                                    ${item.category ? `<br><span style="font-size:10px;color:#666;">Cat: ${item.category}</span>` : ''}
                                    ${item.details?.variant ? `<br><span style="font-size:10px;color:#059669;font-weight:bold;">[${item.details.variant}]</span>` : ''}
                                </td>
                                <td style="color: #555; font-size: 11px;">
                                    ${[
                                        item.playerName ? `Nom: ${item.playerName}` : '',
                                        item.playerNumber ? `Num: ${item.playerNumber}` : '',
                                        item.size ? `Talla: ${item.size}` : '',
                                        item.color ? `Color: ${item.color}` : '',
                                        extraInfo ? `<strong style="color:#000;">${extraInfo}</strong>` : ''
                                    ].filter(Boolean).join(' | ')}
                                </td>
                                <td class="text-right">${item.quantity || 1}</td>
                                <td class="text-right">${((item.quantity || 1) * item.price).toFixed(2)}€</td>
                            </tr>
                        `}).join('')}
                    `).join('')}
                </tbody>
            </table>

            <div class="financial-section">
                <table class="financial-table">
                    <tr>
                        <td class="f-label">Importe Total Pedido</td>
                        <td class="f-value">${totalAmount.toFixed(2)}€</td>
                    </tr>
                    <tr>
                        <td class="f-label" style="color: #dc2626;">(-) Retención / Comisión Club (${(safeCommission * 100).toFixed(0)}%)</td>
                        <td class="f-value" style="color: #dc2626;">-${commissionAmount.toFixed(2)}€</td>
                    </tr>
                    <tr class="f-row-total">
                        <td class="f-label" style="color: #065f46;">IMPORTE A COBRAR</td>
                        <td class="f-value">${netAmount.toFixed(2)}€</td>
                    </tr>
                </table>
            </div>

            <div class="signature-section">
                <div class="signature-label">Conformidad de Entrega (Sello y Firma):</div>
                <div class="signature-line"></div>
                <div class="signature-text">Recibido por: _____________________________ Fecha: ___/___/_____</div>
            </div>
            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};