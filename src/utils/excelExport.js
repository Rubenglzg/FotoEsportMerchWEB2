/* * ============================================================================
 * 📊 GENERADOR DE EXCEL / CSV
 * ============================================================================
 * Esta función toma los datos de un lote de pedidos y genera un archivo .csv
 * listo para abrirse en Excel y enviar a fábrica.
 */

import ExcelJS from 'exceljs';

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

// --- NUEVO: Generador del Excel de Temporada Completa ---
export const generateSeasonExcel = async (seasonId, seasons, orders, clubs, financialConfig, showNotification) => {
    const season = seasons.find(s => s.id === seasonId);
    if (!season) return;

    const start = new Date(season.startDate).getTime();
    const end = new Date(season.endDate).getTime();

    const seasonOrders = orders.filter(o => {
        if (o.manualSeasonId) return o.manualSeasonId === season.id;
        if (o.manualSeasonId && o.manualSeasonId !== season.id) return false;
        const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
        return d >= start && d <= end;
    });

    if (seasonOrders.length === 0) {
        showNotification('No hay pedidos en esta temporada', 'error');
        return;
    }

    const safeNum = (val) => (typeof val === 'number' && !isNaN(val)) ? val : 0;

    const calculateStats = (ordersToProcess) => {
        let grossSales = 0;
        let supplierCost = 0;
        let gatewayCost = 0;
        let totalClubComm = 0;
        let totalCommComm = 0;

        const monthly = {};
        const payment = {};
        const categories = {};
        const productsStats = {};
        
        let incidentCount = 0;
        const responsibility = { internal: 0, club: 0, supplier: 0 };
        const costAssumed = { internal: 0, club: 0, supplier: 0 };
        const productIncidents = {}; 

        ordersToProcess.forEach(order => {
            const isIncident = order.type === 'replacement' || order.paymentMethod === 'incident' || String(order.globalBatch).startsWith('ERR');

            if (!isIncident) {
                const total = safeNum(order.total);
                grossSales += total;

                const orderCost = order.items.reduce((sum, item) => sum + (safeNum(item.cost) * (item.quantity || 1)), 0);
                supplierCost += orderCost;

                let rawMethod = order.paymentMethod || 'card';
                let methodLabel = 'tarjeta';
                if (rawMethod === 'cash') methodLabel = 'efectivo';
                else if (rawMethod === 'bizum' || rawMethod === 'transfer') methodLabel = 'transferencia/bizum';
                
                let orderGatewayFee = 0;
                if (methodLabel === 'tarjeta') {
                    orderGatewayFee = (total * safeNum(financialConfig.gatewayPercentFee)) + safeNum(financialConfig.gatewayFixedFee);
                    gatewayCost += orderGatewayFee;
                }

                const orderClub = clubs.find(c => c.id === order.clubId);
                const clubPct = orderClub ? (safeNum(orderClub.commission) || 0) : 0; 
                const currentClubComm = total * clubPct;
                totalClubComm += currentClubComm;

                const commBase = total - orderCost - currentClubComm - orderGatewayFee;
                const currentCommComm = commBase > 0 ? commBase * safeNum(financialConfig.commercialCommissionPct) : 0;
                totalCommComm += currentCommComm;

                if (!payment[methodLabel]) payment[methodLabel] = { total: 0, count: 0 };
                payment[methodLabel].total += total;
                payment[methodLabel].count += 1;

                const date = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
                const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                const sortKey = date.getFullYear() * 100 + date.getMonth();
                if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0, sort: sortKey };
                monthly[monthKey].total += total;
                monthly[monthKey].count += 1;

                order.items.forEach(item => {
                    const qty = item.quantity || 1;
                    const subtotal = qty * safeNum(item.price);
                    const itemTotalCost = qty * safeNum(item.cost); 

                    let catName = item.category || 'General';
                    const normCat = catName.trim().replace(/\s+[A-Z0-9]$/i, '');
                    if (!categories[normCat]) categories[normCat] = { total: 0, subCats: new Set() };
                    categories[normCat].total += subtotal;
                    
                    if (!productsStats[item.name]) productsStats[item.name] = { qty: 0, total: 0, cost: 0 };
                    productsStats[item.name].qty += qty;
                    productsStats[item.name].total += subtotal;
                    productsStats[item.name].cost += itemTotalCost;
                });

            } else {
                incidentCount++;
                const details = order.incidentDetails || {};
                const resp = details.responsibility || 'internal';
                const incCost = order.items.reduce((sum, i) => sum + ((i.cost || 0) * (i.quantity || 1)), 0);
                const incPrice = order.total;

                if (responsibility[resp] !== undefined) responsibility[resp]++;
                else responsibility.internal++;

                if (resp === 'club') costAssumed.club += incPrice;
                else if (resp === 'supplier') costAssumed.supplier += incCost;
                else costAssumed.internal += incCost;

                order.items.forEach(item => {
                    const qty = item.quantity || 1;
                    let cleanName = item.name.replace(/\s*\[.*?\]/g, '').trim(); 
                    if (!productIncidents[cleanName]) productIncidents[cleanName] = 0;
                    productIncidents[cleanName] += qty;
                });
            }
        });

        const validOrdersCount = ordersToProcess.filter(o => !['replacement','incident'].includes(o.paymentMethod) && !String(o.globalBatch).startsWith('ERR')).length;
        const avgTicket = validOrdersCount > 0 ? grossSales / validOrdersCount : 0;
        const netIncome = grossSales - supplierCost - gatewayCost - totalClubComm - totalCommComm;

        const processedProducts = Object.entries(productsStats).map(([k,v]) => {
            const profit = v.total - v.cost;
            const margin = v.total > 0 ? (profit / v.total) : 0;
            return { name: k, ...v, profit, margin };
        });

        return {
            count: validOrdersCount,
            grossSales,
            supplierCost,
            gatewayCost,
            commClub: totalClubComm,
            commCommercial: totalCommComm,
            netIncome,
            avgTicket,
            incidentData: { count: incidentCount, responsibility, costAssumed },
            sortedMonths: Object.entries(monthly).map(([k,v]) => ({name: k, ...v})).sort((a,b) => a.sort - b.sort),
            sortedPayment: Object.entries(payment).map(([k,v]) => ({name: k, ...v})).sort((a,b) => b.total - a.total),
            sortedCats: Object.entries(categories).map(([k,v]) => ({name: k, total: v.total})).sort((a,b) => b.total - a.total),
            sortedProds: processedProducts.sort((a,b) => b.qty - a.qty).slice(0, 10),
            sortedProdsProfit: processedProducts.sort((a,b) => b.profit - a.profit).slice(0, 20),
            sortedProductIncidents: Object.entries(productIncidents)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
        };
    };

    const adjustColumnWidths = (worksheet) => {
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                if (cell.isMerged) return;
                const v = cell.value ? cell.value.toString() : '';
                if (v.length > maxLength) maxLength = v.length;
            });
            column.width = Math.max(maxLength + 2, 15);
        });
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FotoEsport Admin';
    workbook.created = new Date();

    const styles = {
        header: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }, font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }, alignment: { horizontal: 'center' } },
        subHeader: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }, font: { bold: true } },
        title: { font: { bold: true, size: 16 } },
        sectionTitle: { font: { color: { argb: 'FF10B981' }, bold: true, size: 12 } },
        currency: { numFmt: '#,##0.00 "€"' },
        currencyRed: { numFmt: '#,##0.00 "€"', font: { color: { argb: 'FFDC2626' } } },
        currencyBold: { numFmt: '#,##0.00 "€"', font: { bold: true } },
        percent: { numFmt: '0.00%' }
    };

    // --- HOJA 1: VISTA GLOBAL ---
    const globalStats = calculateStats(seasonOrders);
    const wsGlobal = workbook.addWorksheet('Vista Global');
    
    wsGlobal.columns = [{key:'A'},{key:'B'},{key:'C'},{key:'D'},{key:'E'},{key:'F'},{key:'G'}, {key:'H'}];

    wsGlobal.addRow([`Reporte Global - ${season.name}`]);
    wsGlobal.getCell('A1').font = styles.title.font;
    wsGlobal.mergeCells('A1:H1');
    wsGlobal.addRow([]);

    wsGlobal.addRow(['Resumen General']);
    wsGlobal.getCell('A3').font = styles.sectionTitle.font;
    wsGlobal.addRow(['Total Pedidos', globalStats.count]);
    const rFact = wsGlobal.addRow(['Facturación Total', globalStats.grossSales]);
    rFact.getCell(2).numFmt = styles.currencyBold.numFmt;
    const rTicket = wsGlobal.addRow(['Ticket Medio', globalStats.avgTicket]);
    rTicket.getCell(2).numFmt = styles.currency.numFmt;
    const rNet = wsGlobal.addRow(['Beneficio Neto Global', globalStats.netIncome]);
    rNet.getCell(2).numFmt = styles.currencyBold.numFmt;
    wsGlobal.addRow([]);

    wsGlobal.addRow(['Reporte Financiero Detallado por Club']);
    wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
    wsGlobal.mergeCells(`A${wsGlobal.lastRow.number}:H${wsGlobal.lastRow.number}`);

    const headerRow = wsGlobal.addRow(['Club', 'Pedidos', 'Facturación', 'Coste Prov.', 'Pasarela/Gastos', 'Com. Club', 'Neto Comercial', 'Beneficio Neto']);
    for(let i=1; i<=8; i++) Object.assign(headerRow.getCell(i), styles.header);

    let totalTableGross = 0, totalTableSupp = 0, totalTableGate = 0, totalTableClub = 0, totalTableComm = 0, totalTableNet = 0;

    clubs.forEach(c => {
        const cStats = calculateStats(seasonOrders.filter(o => o.clubId === c.id));
        const commClub = cStats.commClub;
        const commCommercial = cStats.commCommercial;
        const net = cStats.netIncome;

        totalTableGross += cStats.grossSales;
        totalTableSupp += cStats.supplierCost;
        totalTableGate += cStats.gatewayCost;
        totalTableClub += commClub;
        totalTableComm += commCommercial;
        totalTableNet += net;

        const row = wsGlobal.addRow([
            c.name, cStats.count, cStats.grossSales, -cStats.supplierCost, -cStats.gatewayCost, -commClub, 
            -commCommercial,
            net
        ]);
        row.getCell(3).numFmt = styles.currency.numFmt;
        Object.assign(row.getCell(4), styles.currencyRed);
        Object.assign(row.getCell(5), styles.currencyRed);
        Object.assign(row.getCell(6), styles.currencyRed);
        Object.assign(row.getCell(7), styles.currencyRed); 
        Object.assign(row.getCell(8), styles.currencyBold);
    });

    const totalRow = wsGlobal.addRow(['TOTALES', globalStats.count, totalTableGross, -totalTableSupp, -totalTableGate, -totalTableClub, -totalTableComm, totalTableNet]); 
    for(let i=1; i<=8; i++) {
        Object.assign(totalRow.getCell(i), styles.subHeader);
        if(i > 2) totalRow.getCell(i).numFmt = styles.currency.numFmt;
    }
    wsGlobal.addRow([]);

    // Tablas Laterales
    const rSecTitle = wsGlobal.addRow(['Evolución Mensual', '', '', 'Métodos de Pago', '', '', 'Facturación por Categoría']);
    [1, 4, 7].forEach(i => rSecTitle.getCell(i).font = styles.sectionTitle.font);
    
    const rSecHead = wsGlobal.addRow(['Mes', 'Ventas', '', 'Método', 'Total', '', 'Categoría', 'Total']);
    [1,2, 4,5, 7,8].forEach(i => Object.assign(rSecHead.getCell(i), styles.subHeader));

    const maxRows = Math.max(globalStats.sortedMonths.length, globalStats.sortedPayment.length, globalStats.sortedCats.length);

    for(let i=0; i<maxRows; i++){
        const m = globalStats.sortedMonths[i];
        const p = globalStats.sortedPayment[i];
        const c = globalStats.sortedCats[i];

        const row = wsGlobal.addRow([
            m ? m.name : '', m ? m.total : '', '', 
            p ? p.name.toUpperCase() : '', p ? p.total : '', '', 
            c ? c.name : '', c ? c.total : ''
        ]);
        if(m) row.getCell(2).numFmt = styles.currency.numFmt;
        if(p) row.getCell(5).numFmt = styles.currency.numFmt;
        if(c) row.getCell(8).numFmt = styles.currency.numFmt;
    }
    wsGlobal.addRow([]);

    // Productos Estrella
    wsGlobal.addRow(['Productos Estrella (Top Ventas)']);
    wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
    const headProd = wsGlobal.addRow(['Producto', 'Unidades Vendidas', 'Facturación']);
    [1,2,3].forEach(i => Object.assign(headProd.getCell(i), styles.subHeader));
    globalStats.sortedProds.forEach(prod => {
        const r = wsGlobal.addRow([prod.name, prod.qty, prod.total]);
        r.getCell(3).numFmt = styles.currency.numFmt;
    });
    wsGlobal.addRow([]);

    // Rentabilidad
    wsGlobal.addRow(['Rentabilidad Real por Producto (Top Beneficio)']);
    wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
    const headRent = wsGlobal.addRow(['Producto', 'Unidades', 'Facturación', 'Coste Total', 'Beneficio Real', 'Margen %']);
    [1,2,3,4,5,6].forEach(i => Object.assign(headRent.getCell(i), styles.subHeader));
    globalStats.sortedProdsProfit.forEach(prod => {
        const r = wsGlobal.addRow([prod.name, prod.qty, prod.total, prod.cost, prod.profit, prod.margin]);
        r.getCell(3).numFmt = styles.currency.numFmt;
        r.getCell(4).numFmt = styles.currencyRed.numFmt;
        r.getCell(5).numFmt = styles.currencyBold.numFmt;
        r.getCell(6).numFmt = styles.percent.numFmt;
    });
    wsGlobal.addRow([]);

    // Incidencias
    wsGlobal.addRow(['Control de Incidencias y Calidad']);
    wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
    const incData = globalStats.incidentData;
    const errorRate = (incData.count / (globalStats.count + incData.count)) * 100 || 0;
    
    wsGlobal.addRow(['Tasa de Incidencias', `${errorRate.toFixed(2)}% (${incData.count} pedidos afectados)`]);
    const headInc = wsGlobal.addRow(['Responsabilidad', 'Cantidad', 'Coste Asumido']);
    [1,2,3].forEach(i => Object.assign(headInc.getCell(i), styles.subHeader));
    
    const rInt = wsGlobal.addRow(['Interno / Fábrica', incData.responsibility.internal, incData.costAssumed.internal]);
    rInt.getCell(3).numFmt = styles.currencyRed.numFmt;
    const rClub = wsGlobal.addRow(['Club (Facturable)', incData.responsibility.club, incData.costAssumed.club]);
    rClub.getCell(3).numFmt = styles.currency.numFmt;
    const rSupp = wsGlobal.addRow(['Proveedor (Garantía)', incData.responsibility.supplier, incData.costAssumed.supplier]);
    rSupp.getCell(3).numFmt = styles.currency.numFmt;
    wsGlobal.addRow([]);

    if(globalStats.sortedProductIncidents.length > 0){
        wsGlobal.addRow(['Productos más Problemáticos (Top Fallos)']);
        wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
        const headProb = wsGlobal.addRow(['Producto', 'Unidades Fallidas/Repuestas']);
        [1,2].forEach(i => Object.assign(headProb.getCell(i), styles.subHeader));
        globalStats.sortedProductIncidents.forEach(p => wsGlobal.addRow([p.name, p.count]));
    }

    adjustColumnWidths(wsGlobal);

    // ==========================
    // HOJAS POR CLUB
    // ==========================
    clubs.forEach(club => {
        const clubOrders = seasonOrders.filter(o => o.clubId === club.id);
        const cStats = calculateStats(clubOrders);
        const clubCommPct = safeNum(club.commission) || 0.12;
        
        const commClub = cStats.commClub; 
        const commComm = cStats.commCommercial; 
        const net = cStats.grossSales - cStats.supplierCost - cStats.gatewayCost - commClub - commComm;

        const sheetName = club.name.replace(/[*?:\/\[\]]/g, '').substring(0, 30);
        const ws = workbook.addWorksheet(sheetName);
        
        ws.columns = [
            { key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }, { key: 'E' }, 
            { key: 'F' }, { key: 'G' }, { key: 'H' }, { key: 'I' }, { key: 'J' },
            { key: 'K' }, { key: 'L' }, { key: 'M' }, { key: 'N' }, { key: 'O' }, 
            { key: 'P' }, { key: 'Q' }, { key: 'R' }, { key: 'S' }
        ];

        ws.addRow([`${club.name} - Resumen`]);
        ws.getCell('A1').font = styles.title.font;
        ws.mergeCells('A1:J1');
        ws.addRow([]);

        const kpiHead = ws.addRow(['Métrica', 'Valor']);
        Object.assign(kpiHead.getCell(1), styles.subHeader);
        Object.assign(kpiHead.getCell(2), styles.subHeader);
        ws.addRow(['Total Pedidos', cStats.count]);
        const rTk = ws.addRow(['Ticket Medio', cStats.avgTicket]);
        rTk.getCell(2).numFmt = styles.currency.numFmt;
        ws.addRow([]);

        ws.addRow(['Reporte Financiero']);
        ws.getCell(`A${ws.lastRow.number}`).font = styles.sectionTitle.font;
        const finHead = ws.addRow(['Concepto', 'Importe']);
        Object.assign(finHead.getCell(1), styles.subHeader);
        Object.assign(finHead.getCell(2), styles.subHeader);
        
        const addFin = (label, val, style) => { const r = ws.addRow([label, val]); if(style) Object.assign(r.getCell(2), style); else r.getCell(2).numFmt = styles.currency.numFmt; };
        
        addFin('Facturación Total', cStats.grossSales);
        addFin('Coste Proveedores', -cStats.supplierCost, styles.currencyRed);
        addFin('Pasarela/Gastos', -cStats.gatewayCost, styles.currencyRed); 
        addFin('Comisión Club', -commClub, styles.currencyRed);
        addFin('Neto Comercial', -commComm, styles.currencyRed); 
        addFin('Beneficio Neto', net, styles.currencyBold);
        
        ws.addRow([]);

        ws.addRow(['Listado Detallado de Pedidos y Contabilidad']);
        ws.getCell(`A${ws.lastRow.number}`).font = styles.title.font;
        ws.mergeCells(`A${ws.lastRow.number}:S${ws.lastRow.number}`);

        const headers = [
            'ID', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'Cant.', 'Productos', 'Total Venta', 'Método Pago', 'Lote',
            'Fecha Cobro', 'Estado Cobro',
            'Coste Prov.', 'Fecha Pago Prov.', 'Estado Prov.',
            'Comisión Club', 'Fecha Pago Club', 'Estado Club',
            'Comisión Com.', 'Fecha Pago Com.', 'Estado Com.'
        ];
        const hRow = ws.addRow(headers);
        hRow.eachCell(c => Object.assign(c, styles.header));

        clubOrders.forEach(o => {
            const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : '-';
            const totalItems = o.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
            const productsStr = o.items.map(i => {
                const sizeStr = i.size ? `(${i.size})` : '';
                return `${i.name} ${sizeStr}`.trim();
            }).join('; ');

            const batchId = o.globalBatch;
            const log = club.accountingLog?.[batchId] || {};
            
            const isCash = o.paymentMethod === 'cash';
            let fechaCobro = isCash ? (log.cashCollectedDate ? new Date(log.cashCollectedDate).toLocaleDateString() : '-') : date; 
            let estadoCobro = isCash ? (log.cashCollected ? 'Recogido' : 'Pdte. Entrega') : 'Pagado TPV';
            
            const oCost = o.items.reduce((s, i) => s + (safeNum(i.cost) * (i.quantity||1)), 0);
            const fechaProv = log.supplierPaidDate ? new Date(log.supplierPaidDate).toLocaleDateString() : '-';
            const estadoProv = log.supplierPaid ? 'Pagado' : 'Pendiente';

            const oCommClub = safeNum(o.total) * clubCommPct;
            const fechaClub = log.clubPaidDate ? new Date(log.clubPaidDate).toLocaleDateString() : '-';
            const estadoClub = log.clubPaid ? 'Pagado' : 'Pendiente';

            const isErrorOrder = String(o.globalBatch).startsWith('ERR') || o.type === 'replacement' || ['replacement', 'incident'].includes(o.paymentMethod);

            let oCommComm = 0;
            if (!isErrorOrder) {
                const fees = (o.paymentMethod === 'card') ? (o.total * safeNum(financialConfig.gatewayPercentFee) + safeNum(financialConfig.gatewayFixedFee)) : 0;
                const baseComm = o.total - oCost - oCommClub - fees;
                if (baseComm > 0) oCommComm = baseComm * safeNum(financialConfig.commercialCommissionPct);
            }
            
            const fechaComm = log.commercialPaidDate ? new Date(log.commercialPaidDate).toLocaleDateString() : '-';
            const estadoComm = log.commercialPaid ? 'Pagado' : 'Pendiente';

            const r = ws.addRow([
                o.id.slice(0,8), date, o.customer.name, o.customer.email, o.customer.phone, 
                totalItems, productsStr, safeNum(o.total), o.paymentMethod || 'card', batchId,
                fechaCobro, estadoCobro,
                oCost, fechaProv, estadoProv,
                oCommClub, fechaClub, estadoClub,
                oCommComm, fechaComm, estadoComm
            ]);

            r.getCell(8).numFmt = styles.currency.numFmt; 
            r.getCell(13).numFmt = styles.currency.numFmt; 
            r.getCell(16).numFmt = styles.currency.numFmt; 
            r.getCell(19).numFmt = styles.currency.numFmt; 
        });

        adjustColumnWidths(ws);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${season.name.replace(/\s+/g, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// --- NUEVO: Generador de Excel de Base de Datos de Clientes ---
export const generateCustomersExcel = async (orders, clubs) => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'FotoEsport Admin';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('Base de Datos Clientes');

        // Configurar las columnas
        ws.columns = [
            { header: 'Nombre del Cliente', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Teléfono', key: 'phone', width: 15 },
            { header: 'Club de Origen', key: 'club', width: 25 },
            { header: 'Aceptó Actualizaciones (Pedidos)', key: 'updates', width: 30 },
            { header: 'Aceptó Publicidad (Marketing)', key: 'marketing', width: 30 }
        ];

        // Estilo de la cabecera
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        headerRow.alignment = { horizontal: 'center' };

        // Usamos un Map para evitar duplicados por email
        const customersMap = new Map();

        orders.forEach(order => {
            if (!order.customer || !order.customer.email) return;

            const email = order.customer.email.toLowerCase().trim();
            const orderClub = clubs.find(c => c.id === order.clubId);
            const clubName = orderClub ? orderClub.name : 'Desconocido';

            // Leemos los campos exactos según CartView.jsx
            const acceptsUpdates = order.customer.emailUpdates ? 'SÍ' : 'NO';
            const acceptsMarketing = order.customer.marketingConsent ? 'SÍ' : 'NO';

            if (!customersMap.has(email)) {
                // Nuevo cliente
                customersMap.set(email, {
                    name: order.customer.name || 'Sin nombre',
                    email: email,
                    phone: order.customer.phone || 'Sin teléfono',
                    club: clubName,
                    updates: acceptsUpdates,
                    marketing: acceptsMarketing
                });
            } else {
                // Si el cliente ya existe porque compró antes, actualizamos sus preferencias si ahora dijo que "SÍ"
                const existing = customersMap.get(email);
                if (acceptsMarketing === 'SÍ') existing.marketing = 'SÍ';
                if (acceptsUpdates === 'SÍ') existing.updates = 'SÍ';
            }
        });

        // Añadir las filas al Excel
        customersMap.forEach(customerData => {
            ws.addRow(customerData);
        });

        // Generar y descargar el archivo
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Base_Datos_Clientes_FotoEsport.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } catch (e) {
        console.error("Error generando Excel de clientes:", e);
        alert("Hubo un error al generar la base de datos. Por favor revisa la consola.");
    }
};