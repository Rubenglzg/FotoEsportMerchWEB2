import React, { useState } from 'react';
import { Banknote, Store, Calendar, BarChart3, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { DelayedInput } from '../ui/DelayedInput'; // Importamos el componente que creamos en el paso 1

export const AccountingControlTab = ({
    clubs, seasons, filterClubId, setFilterClubId, financeSeasonId, setFinanceSeasonId,
    globalAccountingStats, accountingData, financialConfig,
    handlePaymentChange, updateBatchValue
}) => {
    // Este estado solo pertenece a esta vista, así que lo movemos aquí
    const [accDetailsModal, setAccDetailsModal] = useState({ active: false, title: '', items: [], type: '' });

    return (
        <div className="bg-white p-6 rounded-xl shadow space-y-8 animate-fade-in-up">
            {/* CABECERA Y FILTROS */}
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                        <Banknote className="w-8 h-8 text-emerald-600"/> 
                        Control de Contabilidad
                    </h2>
                    <p className="text-gray-500">Gestión de caja, pedidos especiales y lotes globales.</p>
                </div>
                
                <div className="flex gap-3">
                    {/* Selector Club */}
                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                        <Store className="w-4 h-4 text-gray-500"/>
                        <select 
                            className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" 
                            value={filterClubId} 
                            onChange={(e) => setFilterClubId(e.target.value)}
                        >
                            <option value="all">Todos los Clubes</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Selector Temporada */}
                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-gray-500"/>
                        <select 
                            className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" 
                            value={financeSeasonId} 
                            onChange={(e) => setFinanceSeasonId(e.target.value)}
                        >
                            <option value="all">Todas las Temporadas</option>
                            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- TARJETAS DE RESUMEN --- */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
                
                <div className="md:col-span-1 bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><BarChart3 className="w-16 h-16"/></div>
                  <p className="text-xs font-bold text-emerald-700 uppercase z-10">Beneficio Neto Total</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 z-10">{globalAccountingStats.totalNetProfit.toFixed(2)}€</p>
                  <p className="text-[9px] text-emerald-600/70 z-10 mt-1 leading-tight">Ganancia limpia tras gastos.</p>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase">Banco / Tarjeta</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{globalAccountingStats.cardTotal.toFixed(2)}€</p>
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>Pasarela:</span>
                          <span className="text-red-500 font-bold">-{globalAccountingStats.cardFees.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-blue-800">
                          <span>Neto Banco:</span>
                          <span>{(globalAccountingStats.cardTotal - globalAccountingStats.cardFees).toFixed(2)}€</span>
                      </div>
                  </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Caja Efectivo</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded" 
                             onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo YA Recogido', items: globalAccountingStats.cash.listCollected, type: 'success' })}>
                            <span className="text-gray-600">Recogido:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.cash.collected.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-red-50 p-1 rounded hover:bg-red-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo PENDIENTE de Recoger', items: globalAccountingStats.cash.listPending, type: 'error' })}>
                            <span className="text-red-800 font-bold">Pendiente:</span>
                            <span className="font-black text-red-600">{globalAccountingStats.cash.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Pagos Proveedor</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PAGADO', items: globalAccountingStats.supplier.listPaid, type: 'success' })}>
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.supplier.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-orange-50 p-1 rounded hover:bg-orange-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PENDIENTE', items: globalAccountingStats.supplier.listPending, type: 'warning' })}>
                            <span className="text-orange-800 font-bold">Deuda:</span>
                            <span className="font-black text-orange-600">{globalAccountingStats.supplier.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Com. Comercial</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PAGADO', items: globalAccountingStats.commercial.listPaid, type: 'success' })}>
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.commercial.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-blue-50 p-1 rounded hover:bg-blue-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PENDIENTE', items: globalAccountingStats.commercial.listPending, type: 'info' })}>
                            <span className="text-blue-800 font-bold">Deuda:</span>
                            <span className="font-black text-blue-600">{globalAccountingStats.commercial.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Pagos a Clubes</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Club PAGADO', items: globalAccountingStats.club.listPaid, type: 'success' })}>
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.club.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-purple-50 p-1 rounded hover:bg-purple-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Club PENDIENTE', items: globalAccountingStats.club.listPending, type: 'purple' })}>
                            <span className="text-purple-800 font-bold">Deuda:</span>
                            <span className="font-black text-purple-600">{globalAccountingStats.club.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLAS POR CLUB */}
            {accountingData.map(({ club, batches }) => {
                let totalPendingCash = 0; 
                let balanceProvider = 0; 
                let balanceCommercial = 0; 
                let balanceClub = 0;

                batches.forEach(batch => {
                    const log = club.accountingLog?.[batch.id] || {};
                    const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                    const isCommissionExempt = isErrorBatch;

                    const cashRevenue = batch.orders.filter(o => o.paymentMethod === 'cash').reduce((s,o)=>s+o.total,0);
                    const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                    
                    const commissionableOrders = batch.orders.filter(o => o.paymentMethod !== 'incident' && o.paymentMethod !== 'gift' && o.type !== 'replacement');
                    const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
                    const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                    const commFees = commissionableOrders.reduce((sum, o) => {
                        if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                        return sum;
                    }, 0);

                    const clubRate = isCommissionExempt ? 0 : (club.commission || 0.12);
                    const commClub = commRevenue * clubRate;
                    const commBase = commRevenue - commCost - commClub - commFees;
                    const commComm = isCommissionExempt ? 0 : (commBase * financialConfig.commercialCommissionPct);

                    totalPendingCash += (!log.cashCollected ? cashRevenue : 0) + (log.cashUnder||0) - (log.cashOver||0);
                    balanceProvider += (!log.supplierPaid ? totalCost : 0) + (log.supplierUnder||0) - (log.supplierOver||0);
                    balanceCommercial += (!log.commercialPaid ? commComm : 0) + (log.commercialUnder||0) - (log.commercialOver||0);
                    balanceClub += (!log.clubPaid ? commClub : 0) + (log.clubUnder||0) - (log.clubOver||0);
                });

                const renderBalance = (amount, labelPositive, labelNegative) => {
                    if (isNaN(amount) || Math.abs(amount) < 0.01) return <span className="text-green-600 font-bold">Al día (0.00€)</span>;
                    if (amount > 0) return <span className="text-red-600 font-bold">{labelPositive} {amount.toFixed(2)}€</span>; 
                    return <span className="text-blue-600 font-bold">{labelNegative} {Math.abs(amount).toFixed(2)}€</span>; 
                };

                return (
                    <div key={club.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-8">
                        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                                    {club.code?.slice(0,2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{club.name}</h3>
                                    <p className="text-xs text-gray-400">{batches.length} Bloques de Pedidos</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
                            <div className="bg-white p-4 text-center">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Caja Efectivo</p>
                                <p className="text-xl">{renderBalance(totalPendingCash, 'Faltan', 'Sobra')}</p>
                            </div>
                            <div className="bg-white p-4 text-center border-l border-gray-100">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Proveedor</p>
                                <p className="text-xl">{renderBalance(balanceProvider, 'Debemos', 'A favor')}</p>
                            </div>
                            <div className="bg-white p-4 text-center border-l border-gray-100">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Comercial</p>
                                <p className="text-xl">{renderBalance(balanceCommercial, 'Debemos', 'A favor')}</p>
                            </div>
                            <div className="bg-white p-4 text-center border-l border-gray-100">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Club</p>
                                <p className="text-xl">{renderBalance(balanceClub, 'Debemos', 'A favor')}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[120px]">Lote</th>
                                        <th className="px-4 py-3 text-right bg-blue-50/30">Banco / Tarjeta (Neto)</th>
                                        <th className="px-4 py-3 text-right bg-orange-50/30">Efectivo</th>
                                        <th className="px-4 py-3 text-center bg-orange-50/30 min-w-[160px]">Control Caja</th>
                                        <th className="px-4 py-3 min-w-[160px]">Pago Proveedor</th>
                                        <th className="px-4 py-3 min-w-[160px]">Pago Comercial</th>
                                        <th className="px-4 py-3 min-w-[160px]">Pago Club</th>
                                        <th className="px-4 py-3 min-w-[120px] text-right bg-emerald-50 text-emerald-800">Beneficio Neto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {batches.map(batch => {
                                        const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                                        const isCommissionExempt = isErrorBatch; 

                                        const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
                                        const nonCashOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');
                                        
                                        const revenueCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
                                        const revenueNonCash = nonCashOrders.reduce((sum, o) => sum + o.total, 0); 
                                        const totalBatchRevenue = revenueCash + revenueNonCash;

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

                                        const clubRate = isCommissionExempt ? 0 : (club.commission || 0.12);
                                        const commClub = commRevenue * clubRate;
                                        const commBase = commRevenue - commCost - commClub - commFees;
                                        const commComm = isCommissionExempt ? 0 : (commBase * financialConfig.commercialCommissionPct);

                                        const netProfit = totalBatchRevenue - totalCost - commClub - commComm - totalFees;
                                        const status = club.accountingLog?.[batch.id] || {};

                                        return (
                                            <tr key={batch.id} className={`align-top hover:bg-gray-50 transition-colors`}>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold px-2 py-1 rounded w-fit ${isErrorBatch ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {isErrorBatch ? `Lote Errores #${batch.id.split('-')[1]}` : batch.id === 'INDIVIDUAL' ? 'Individual' : batch.id === 'SPECIAL' ? 'Especial' : `Lote #${batch.id}`}
                                                        </span>
                                                        {isCommissionExempt && <span className="text-[9px] font-bold text-orange-500 mt-1 uppercase">Sin Comisión</span>}
                                                        <span className="text-[10px] text-gray-400 mt-1">{batch.orders.length} pedidos</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right bg-blue-50/30">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono font-bold text-blue-700">{(revenueNonCash - totalFees).toFixed(2)}€</span>
                                                        <span className="text-[9px] text-gray-400">Bruto: {revenueNonCash.toFixed(2)}€</span>
                                                        {totalFees > 0 && <span className="text-[9px] text-red-400">(-{totalFees.toFixed(2)}€ fees)</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right bg-orange-50/30"><span className="font-mono font-bold text-orange-700">{revenueCash.toFixed(2)}€</span></td>
                                                
                                                <td className="px-4 py-4 bg-orange-50/30">
                                                    {revenueCash > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <button 
                                                                onClick={() => handlePaymentChange(club, batch.id, 'cashCollected', status.cashCollected)} 
                                                                className={`w-full px-2 py-1.5 rounded text-[10px] font-bold border shadow-sm transition-all ${status.cashCollected ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-white text-orange-600 border-orange-200 hover:border-orange-400 animate-pulse'}`}
                                                            >
                                                                {status.cashCollected ? 'RECOGIDO' : 'PENDIENTE'}
                                                            </button>
                                                            {status.cashCollected && status.cashCollectedDate && (
                                                                <span className="text-[12px] text-emerald-600 mt-1 font-mono font-bold">
                                                                    {new Date(status.cashCollectedDate).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : <div className="text-center text-xs text-gray-300">-</div>}
                                                    
                                                    <div className="flex gap-2 mt-2">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] text-gray-400 block mb-0.5">De más</label>
                                                            <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.cashOver} onSave={(val) => updateBatchValue(club, batch.id, 'cashOver', val)}/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] text-gray-400 block mb-0.5">De menos</label>
                                                            <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.cashUnder} onSave={(val) => updateBatchValue(club, batch.id, 'cashUnder', val)}/>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col mb-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs text-red-500 font-bold">-{totalCost.toFixed(2)}€</span>
                                                            <button 
                                                                onClick={() => handlePaymentChange(club, batch.id, 'supplierPaid', status.supplierPaid)} 
                                                                className={`text-[10px] px-2 py-0.5 rounded border ${status.supplierPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                            >
                                                                {status.supplierPaid ? 'PAGADO' : 'PENDIENTE'}
                                                            </button>
                                                        </div>
                                                        {status.supplierPaid && status.supplierPaidDate && (
                                                            <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                {new Date(status.supplierPaidDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.supplierOver} onSave={(val) => updateBatchValue(club, batch.id, 'supplierOver', val)}/></div>
                                                        <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.supplierUnder} onSave={(val) => updateBatchValue(club, batch.id, 'supplierUnder', val)}/></div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    {isCommissionExempt ? <div className="text-center text-gray-300 text-xs">-</div> : (
                                                        <>
                                                            <div className="flex flex-col mb-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs text-blue-500 font-bold">+{commComm.toFixed(2)}€</span>
                                                                    <button 
                                                                        onClick={() => handlePaymentChange(club, batch.id, 'commercialPaid', status.commercialPaid)} 
                                                                        className={`text-[10px] px-2 py-0.5 rounded border ${status.commercialPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                    >
                                                                        {status.commercialPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                    </button>
                                                                </div>
                                                                {status.commercialPaid && status.commercialPaidDate && (
                                                                    <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                        {new Date(status.commercialPaidDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.commercialOver} onSave={(val) => updateBatchValue(club, batch.id, 'commercialOver', val)}/></div>
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.commercialUnder} onSave={(val) => updateBatchValue(club, batch.id, 'commercialUnder', val)}/></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    {isCommissionExempt ? <div className="text-center text-gray-300 text-xs">-</div> : (
                                                        <>
                                                            <div className="flex flex-col mb-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs text-purple-500 font-bold">-{commClub.toFixed(2)}€</span>
                                                                    <button 
                                                                        onClick={() => handlePaymentChange(club, batch.id, 'clubPaid', status.clubPaid)} 
                                                                        className={`text-[10px] px-2 py-0.5 rounded border ${status.clubPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                    >
                                                                        {status.clubPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                    </button>
                                                                </div>
                                                                {status.clubPaid && status.clubPaidDate && (
                                                                    <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                        {new Date(status.clubPaidDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.clubOver} onSave={(val) => updateBatchValue(club, batch.id, 'clubOver', val)}/></div>
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.clubUnder} onSave={(val) => updateBatchValue(club, batch.id, 'clubUnder', val)}/></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4 text-right font-black text-emerald-600 bg-emerald-50/30 border-l border-emerald-100">
                                                    {netProfit.toFixed(2)}€
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* MODAL DE DETALLES CONTABLES */}
            {accDetailsModal.active && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${
                            accDetailsModal.type === 'error' ? 'bg-red-50 border-red-100' :
                            accDetailsModal.type === 'success' ? 'bg-green-50 border-green-100' :
                            accDetailsModal.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                            'bg-blue-50 border-blue-100'
                        }`}>
                            <h3 className="font-bold text-lg text-gray-800">{accDetailsModal.title}</h3>
                            <button onClick={() => setAccDetailsModal({ ...accDetailsModal, active: false })}><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        
                        <div className="p-0 max-h-[60vh] overflow-y-auto">
                            {accDetailsModal.items.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No hay registros.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Club</th>
                                            <th className="px-4 py-3 text-center">Lote</th>
                                            <th className="px-4 py-3 text-right">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {accDetailsModal.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-700">{item.club}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                                                        #{item.batch}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold">
                                                    {item.amount.toFixed(2)}€
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t">
                                        <tr>
                                            <td className="px-4 py-3" colSpan="2">TOTAL</td>
                                            <td className="px-4 py-3 text-right">
                                                {accDetailsModal.items.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}€
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                        
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <Button variant="secondary" onClick={() => setAccDetailsModal({ ...accDetailsModal, active: false })}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};