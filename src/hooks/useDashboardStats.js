import { useMemo } from 'react';

export function useDashboardStats({
    orders,
    seasons,
    clubs,
    financialConfig,
    financeSeasonId,
    statsClubFilter,
    filterClubId
}) {
    // --- FILTRADO POR TEMPORADA ---
    const financialOrders = useMemo(() => {
        const cleanOrders = orders.filter(o => 
            o.type !== 'replacement' && 
            o.paymentMethod !== 'incident' && 
            !String(o.globalBatch).startsWith('ERR')
        );

        if (financeSeasonId === 'all') return cleanOrders;

        const season = seasons.find(s => s.id === financeSeasonId);
        if (!season) return cleanOrders;
        
        const start = new Date(season.startDate).getTime();
        const end = new Date(season.endDate).getTime();
        
        return cleanOrders.filter(o => {
            if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
            if (o.manualSeasonId && o.manualSeasonId !== financeSeasonId) return false;
            
            const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
            return d >= start && d <= end;
        });
    }, [orders, financeSeasonId, seasons]);

    // --- LISTA COMPLETA PARA GESTIÓN (INCLUYE ERRORES Y MANUALES) ---
    const visibleOrders = useMemo(() => {
        let list = orders;
        if (financeSeasonId !== 'all') {
            const season = seasons.find(s => s.id === financeSeasonId);
            if (season) {
                const start = new Date(season.startDate).getTime();
                const end = new Date(season.endDate).getTime();
                list = list.filter(o => {
                    if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
                    if (o.manualSeasonId && o.manualSeasonId !== financeSeasonId) return false;
                    
                    const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
                    return d >= start && d <= end;
                });
            }
        }
        return list;
    }, [orders, financeSeasonId, seasons]);

    // --- ESTADÍSTICAS GLOBALES ---
    const statsData = useMemo(() => {
        let filteredOrders = financialOrders;
        if (statsClubFilter !== 'all') {
            filteredOrders = filteredOrders.filter(o => o.clubId === statsClubFilter);
        }

        const categorySales = {}; 
        const productSales = {};  
        const monthlySales = {};  
        const paymentStats = {}; 

        filteredOrders.forEach(order => {
            const isIncident = order.type === 'replacement' || order.paymentMethod === 'incident' || String(order.globalBatch).startsWith('ERR');

            if (!isIncident) {
                let pMethod = order.paymentMethod || 'card';
                if (pMethod === 'bizum' || pMethod === 'transfer') pMethod = 'transfer_bizum'; 

                if (!paymentStats[pMethod]) paymentStats[pMethod] = { amount: 0, count: 0 };
                paymentStats[pMethod].amount += order.total;
                paymentStats[pMethod].count += 1;

                const date = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
                const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                const sortKey = date.getFullYear() * 100 + date.getMonth();
                
                if (!monthlySales[monthKey]) monthlySales[monthKey] = { total: 0, sort: sortKey };
                monthlySales[monthKey].total += order.total;

                order.items.forEach(item => {
                    const qty = item.quantity || 1;
                    const subtotal = qty * item.price;

                    let teamCat = item.category;
                    if (teamCat && teamCat !== 'General' && teamCat !== 'Servicios') {
                        const normCat = teamCat.trim().replace(/\s+[A-Z0-9]$/i, ''); 
                        if (!categorySales[normCat]) categorySales[normCat] = { total: 0, subCats: new Set() };
                        categorySales[normCat].total += subtotal;
                        categorySales[normCat].subCats.add(`${order.clubId}-${teamCat}`);
                    }

                    if (!item.name.includes('[REP]')) {
                        if (!productSales[item.name]) productSales[item.name] = { qty: 0, total: 0, cost: 0 };
                        productSales[item.name].qty += qty;
                        productSales[item.name].total += subtotal;
                        productSales[item.name].cost += (item.cost || 0) * qty;
                    }
                });
            }
        });

        const sortedCategories = Object.entries(categorySales)
            .map(([name, data]) => ({ name, value: data.total, count: data.subCats.size }))
            .sort((a, b) => b.value - a.value).slice(0, 8);

        const allProductsStats = Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data, margin: data.total - data.cost }))
            .sort((a, b) => b.margin - a.margin); 

        const sortedProducts = allProductsStats.slice(0, 5);

        const sortedPaymentMethods = Object.entries(paymentStats)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => {
                const priorities = { card: 1, cash: 2, transfer_bizum: 3 };
                return (priorities[a.name] || 99) - (priorities[b.name] || 99);
            });

        const sortedMonths = Object.entries(monthlySales)
            .map(([name, data]) => ({ name, value: data.total, sort: data.sort }))
            .sort((a, b) => a.sort - b.sort);

        const isComparisonMode = statsClubFilter !== 'all' && financeSeasonId === 'all';
        let reportRows = [];
        
        const calculateMetrics = (ordersList, clubObj, rowId, rowName) => {
            const validOrders = ordersList.filter(o => 
              o.type !== 'replacement' && o.paymentMethod !== 'incident' && !String(o.globalBatch).startsWith('ERR')
            );
            
            let grossSales = 0, supplierCost = 0, gatewayCost = 0;
            
            validOrders.forEach(order => {
               grossSales += order.total;
               supplierCost += order.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);
               if ((order.paymentMethod || 'card') === 'card') {
                   gatewayCost += (order.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee;
               }
            });
            
            const currentClubCommission = clubObj && clubObj.commission !== undefined ? clubObj.commission : 0.12;
            const commClub = grossSales * currentClubCommission;
            const commercialBase = grossSales - supplierCost - commClub - gatewayCost;
            const commCommercial = commercialBase > 0 ? (commercialBase * financialConfig.commercialCommissionPct) : 0;
            const netIncome = grossSales - supplierCost - commClub - commCommercial - gatewayCost;
            
            return { id: rowId, name: rowName, ordersCount: validOrders.length, grossSales, supplierCost, commClub, commCommercial, gatewayCost, netIncome };
        };

        if (isComparisonMode) {
            const selectedClub = clubs.find(c => c.id === statsClubFilter);
            reportRows = seasons.map(season => {
                const start = new Date(season.startDate).getTime();
                const end = new Date(season.endDate).getTime();
                const seasonOrders = financialOrders.filter(o => {
                    if (o.clubId !== statsClubFilter) return false;
                    if (o.manualSeasonId) return o.manualSeasonId === season.id;
                    if (o.manualSeasonId && o.manualSeasonId !== season.id) return false;
                    const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
                    return d >= start && d <= end;
                });
                return calculateMetrics(seasonOrders, selectedClub, season.id, season.name);
            }).sort((a,b) => b.grossSales - a.grossSales); 
        } else {
            const relevantClubs = statsClubFilter === 'all' ? clubs : clubs.filter(c => c.id === statsClubFilter);
            reportRows = relevantClubs.map(club => {
                const clubOrders = financialOrders.filter(o => o.clubId === club.id);
                return calculateMetrics(clubOrders, club, club.id, club.name);
            }).sort((a, b) => b.grossSales - a.grossSales);
        }

        return { sortedCategories, sortedProducts, sortedPaymentMethods, sortedMonths, financialReport: reportRows, allProductsStats };
    }, [financialOrders, statsClubFilter, clubs, financialConfig, seasons, financeSeasonId]);

    // --- ESTADÍSTICAS DE ERRORES ---
    const errorStats = useMemo(() => {
        let relevantOrders = orders;
        
        if (financeSeasonId !== 'all') {
            const season = seasons.find(s => s.id === financeSeasonId);
            if (season) {
                const start = new Date(season.startDate).getTime();
                const end = new Date(season.endDate).getTime();
                relevantOrders = relevantOrders.filter(o => {
                    if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
                    const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
                    return d >= start && d <= end;
                });
            }
        }

        if (statsClubFilter !== 'all') relevantOrders = relevantOrders.filter(o => o.clubId === statsClubFilter);

        const normalOrders = relevantOrders.filter(o => o.type !== 'replacement' && o.paymentMethod !== 'incident' && !String(o.globalBatch).startsWith('ERR'));
        const incidentOrders = relevantOrders.filter(o => o.type === 'replacement' || o.paymentMethod === 'incident' || String(o.globalBatch).startsWith('ERR'));

        const totalOrdersCount = normalOrders.length + incidentOrders.length;
        const errorCount = incidentOrders.length;
        const errorRate = totalOrdersCount > 0 ? (errorCount / totalOrdersCount) * 100 : 0;

        const responsibility = { internal: 0, club: 0, supplier: 0 };
        const costAssumed = { internal: 0, club: 0, supplier: 0 };
        const productErrors = {};
        
        incidentOrders.forEach(ord => {
            const details = ord.incidentDetails || {};
            const resp = details.responsibility || 'internal';
            const cost = ord.items.reduce((sum, i) => sum + ((i.cost || 0) * (i.quantity || 1)), 0);
            const price = ord.total;

            if (responsibility[resp] !== undefined) responsibility[resp]++;
            else responsibility.internal++;

            if (resp === 'club') costAssumed.club += price;
            else if (resp === 'supplier') costAssumed.supplier += cost; 
            else costAssumed.internal += cost;

            ord.items.forEach(item => {
                const name = item.name.replace(/\[REP\]/g, '').trim();
                const qty = item.quantity || 1;
                productErrors[name] = (productErrors[name] || 0) + qty;
            });
        });

        const sortedProductErrors = Object.entries(productErrors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return { totalOrdersCount, errorCount, errorRate, responsibility, costAssumed, sortedProductErrors };
    }, [orders, financeSeasonId, statsClubFilter, seasons]);

    // --- AGRUPACIÓN DE PEDIDOS (CONTABILIDAD Y LOTES) ---
    const accountingData = useMemo(() => {
        const visibleClubs = filterClubId === 'all' ? clubs : clubs.filter(c => c.id === filterClubId);

        return visibleClubs.map(club => {
            const clubOrders = visibleOrders.filter(o => o.clubId === club.id); 
            const batches = {};
            
            clubOrders.forEach(order => {
                let batchId = order.globalBatch || 1;
                if (!(typeof batchId === 'string' && batchId.startsWith('ERR'))) {
                    if (order.type === 'special') batchId = 'SPECIAL';
                    if (batchId === 'INDIVIDUAL') batchId = 'INDIVIDUAL';
                }
                
                if (!batches[batchId]) batches[batchId] = [];
                batches[batchId].push(order);
            });

            if (club.activeGlobalOrderId && !batches[club.activeGlobalOrderId]) batches[club.activeGlobalOrderId] = [];
            const activeErr = `ERR-${club.activeErrorBatchId || 1}`;
            if (!batches[activeErr]) batches[activeErr] = [];

            const sortedBatches = Object.entries(batches)
                .map(([id, orders]) => {
                    const isError = typeof id === 'string' && id.startsWith('ERR');
                    return { id: (id === 'SPECIAL' || id === 'INDIVIDUAL' || isError) ? id : parseInt(id), orders, isError };
                })
                .sort((a, b) => {
                    if (a.id === 'SPECIAL') return -1;
                    if (b.id === 'SPECIAL') return 1;
                    if (a.isError && b.isError) {
                        const numA = parseInt(a.id.split('-')[1]);
                        const numB = parseInt(b.id.split('-')[1]);
                        return numB - numA; 
                    }
                    if (a.isError) return -1; 
                    if (b.isError) return 1;
                    if (a.id === 'INDIVIDUAL') return 1;
                    if (b.id === 'INDIVIDUAL') return -1;
                    return b.id - a.id; 
                });

            return { club, batches: sortedBatches };
        });
    }, [clubs, visibleOrders, filterClubId]);

    // --- TOTALES GLOBALES DE CONTABILIDAD ---
    const globalAccountingStats = useMemo(() => {
        const stats = {
            cardTotal: 0, cardFees: 0, totalNetProfit: 0,
            cash: { collected: 0, pending: 0, listPending: [], listCollected: [] },
            supplier: { paid: 0, pending: 0, listPending: [], listPaid: [] },
            commercial: { paid: 0, pending: 0, listPending: [], listPaid: [] },
            club: { paid: 0, pending: 0, listPending: [], listPaid: [] }
        };

        accountingData.forEach(({ club, batches }) => {
            batches.forEach(batch => {
                const log = club.accountingLog?.[batch.id] || {};
                const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                const isCommissionExempt = isErrorBatch; 

                const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
                const nonCashOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');

                const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);
                const nonCashRevenue = nonCashOrders.reduce((sum, o) => sum + o.total, 0);
                const totalBatchRevenue = cashRevenue + nonCashRevenue;

                const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                const totalFees = batch.orders.reduce((sum, o) => {
                    if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                    return sum;
                }, 0);

                const commissionableOrders = batch.orders.filter(o => o.paymentMethod !== 'incident' && o.paymentMethod !== 'gift' && o.type !== 'replacement');
                const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
                const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                const commFees = commissionableOrders.reduce((sum, o) => {
                    if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                    return sum;
                }, 0);

                const clubCommissionRate = isCommissionExempt ? 0 : (club.commission !== undefined ? club.commission : 0.12);
                const commClub = commRevenue * clubCommissionRate;
                const commercialBase = commRevenue - commFees - commCost - commClub;
                const commComm = isCommissionExempt ? 0 : (commercialBase * financialConfig.commercialCommissionPct);

                const batchNetProfit = totalBatchRevenue - totalCost - commClub - commComm - totalFees;

                stats.cardTotal += nonCashRevenue; 
                stats.cardFees += totalFees;
                stats.totalNetProfit += batchNetProfit;

                const cashVal = cashRevenue + (log.cashUnder || 0) - (log.cashOver || 0);
                if (log.cashCollected) {
                    stats.cash.collected += cashVal;
                    if(cashVal > 0) stats.cash.listCollected.push({ club: club.name, batch: batch.id, amount: cashVal });
                } else {
                    stats.cash.pending += cashVal;
                    if(cashVal > 0) stats.cash.listPending.push({ club: club.name, batch: batch.id, amount: cashVal });
                }

                const suppVal = totalCost + (log.supplierUnder || 0) - (log.supplierOver || 0);
                if (log.supplierPaid) {
                    stats.supplier.paid += suppVal;
                    if(suppVal > 0) stats.supplier.listPaid.push({ club: club.name, batch: batch.id, amount: suppVal });
                } else {
                    stats.supplier.pending += suppVal;
                    if(suppVal > 0) stats.supplier.listPending.push({ club: club.name, batch: batch.id, amount: suppVal });
                }

                if (commComm > 0) {
                    const commVal = commComm + (log.commercialUnder || 0) - (log.commercialOver || 0);
                    if (log.commercialPaid) {
                        stats.commercial.paid += commVal;
                        if(commVal > 0) stats.commercial.listPaid.push({ club: club.name, batch: batch.id, amount: commVal });
                    } else {
                        stats.commercial.pending += commVal;
                        if(commVal > 0) stats.commercial.listPending.push({ club: club.name, batch: batch.id, amount: commVal });
                    }
                }

                if (commClub > 0) {
                    const clubVal = commClub + (log.clubUnder || 0) - (log.clubOver || 0);
                    if (log.clubPaid) {
                        stats.club.paid += clubVal;
                        if(clubVal > 0) stats.club.listPaid.push({ club: club.name, batch: batch.id, amount: clubVal });
                    } else {
                        stats.club.pending += clubVal;
                        if(clubVal > 0) stats.club.listPending.push({ club: club.name, batch: batch.id, amount: clubVal });
                    }
                }
            });
        });
        return stats;
    }, [accountingData, financialConfig]);

    // --- TOTALES RÁPIDOS ---
    const totalRevenue = financialOrders.reduce((sum, o) => sum + o.total, 0);
    const totalIncidentCosts = financialOrders.reduce((sum, o) => sum + (o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0), 0);
    const averageTicket = totalRevenue / (financialOrders.length || 1);

    const netProfit = financialOrders.reduce((total, o) => {
        const club = clubs.find(c => c.id === o.clubId);
        const clubCommPct = club && club.commission !== undefined ? club.commission : 0.12;
        const cost = o.items ? o.items.reduce((s, i) => s + ((i.cost || 0) * (i.quantity || 1)), 0) : (o.cost || 0);
        const incidentCost = o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0;
        const commClub = o.total * clubCommPct;
        const commComm = o.total * financialConfig.commercialCommissionPct;
        
        return total + (o.total - cost - incidentCost - commClub - commComm);
    }, 0);

    return {
        financialOrders,
        visibleOrders,
        statsData,
        errorStats,
        accountingData,
        globalAccountingStats,
        totalRevenue,
        totalIncidentCosts,
        netProfit,
        averageTicket
    };
}