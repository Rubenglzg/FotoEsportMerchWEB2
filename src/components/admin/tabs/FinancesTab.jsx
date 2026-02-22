import React from 'react';
import { Calendar, Store, BarChart3, Users, Package, AlertTriangle, Table, CreditCard, Banknote, Landmark } from 'lucide-react';
import { StatCard } from '../ui/StatCard'; // Reutilizamos el componente del Paso 1

export const FinancesTab = ({
    financeSeasonId, setFinanceSeasonId,
    statsClubFilter, setStatsClubFilter,
    seasons, clubs,
    totalRevenue, netProfit, financialOrdersCount, averageTicket,
    statsData, errorStats
}) => {
    
    // Función auxiliar para calcular porcentajes de ancho en gráficas (Movida aquí)
    const getWidth = (val, max) => max > 0 ? `${(val / max) * 100}%` : '0%';

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* CABECERA Y FILTROS */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                        <BarChart3 className="w-8 h-8 text-emerald-600"/> 
                        Cuadro de Mando Integral
                    </h2>
                    <p className="text-gray-500 text-sm">Visión 360º del rendimiento económico y comercial.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-500"/>
                        <select className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" value={financeSeasonId} onChange={(e) => setFinanceSeasonId(e.target.value)}>
                            <option value="all">Histórico Completo</option>
                            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <Store className="w-4 h-4 text-gray-500"/>
                        <select className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" value={statsClubFilter} onChange={(e) => setStatsClubFilter(e.target.value)}>
                            <option value="all">Todos los Clubes</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ventas Totales" value={`${totalRevenue.toFixed(2)}€`} color="#3b82f6" />
                <StatCard title="Beneficio Neto" value={`${netProfit.toFixed(2)}€`} color="#10b981" highlight />
                <StatCard title="Pedidos Totales" value={financialOrdersCount} color="#f59e0b" />
                <StatCard title="Ticket Medio" value={`${averageTicket.toFixed(2)}€`} color="#6b7280" />
            </div>

            {/* FILA 1: EVOLUCIÓN Y MÉTODOS DE PAGO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico Temporal */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600"/> Evolución Mensual de Ventas
                    </h3>
                    <div className="flex items-end justify-between h-48 gap-2 pt-4 border-b border-gray-100 pb-2">
                        {statsData.sortedMonths.length > 0 ? statsData.sortedMonths.map((m, idx) => {
                            const maxVal = Math.max(...statsData.sortedMonths.map(i => i.value));
                            const heightPct = (m.value / maxVal) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col justify-end items-center group">
                                    <div className="text-[10px] font-bold text-blue-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{m.value.toFixed(0)}€</div>
                                    <div className="w-full bg-blue-100 rounded-t-sm relative hover:bg-blue-200 transition-colors" style={{ height: `${heightPct}%` }}>
                                        <div className="absolute top-0 w-full h-1 bg-blue-400 opacity-50"></div>
                                    </div>
                                    <div className="text-[9px] text-gray-400 mt-2 uppercase font-bold rotate-0 truncate w-full text-center">{m.name}</div>
                                </div>
                            );
                        }) : <p className="w-full text-center text-gray-400 self-center">Sin datos temporales</p>}
                    </div>
                </div>

                {/* GRÁFICO MÉTODOS DE PAGO (CAJONES) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-purple-600"/> Métodos de Pago
                    </h3>
                    <div className="flex-1 flex flex-col gap-4">
                        {statsData.sortedPaymentMethods.map((method, idx) => (
                            <div 
                                key={idx} 
                                className={`flex-1 p-6 rounded-2xl border-l-8 shadow-sm flex flex-col justify-center transition-transform hover:scale-[1.02] ${
                                    method.name === 'card' ? 'bg-blue-50 border-blue-500' :
                                    method.name === 'cash' ? 'bg-green-50 border-green-500' :
                                    'bg-gray-50 border-gray-400'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className={`font-black text-sm uppercase tracking-widest ${
                                        method.name === 'card' ? 'text-blue-700' :
                                        method.name === 'cash' ? 'text-green-700' : 'text-gray-600'
                                    }`}>
                                        {method.name === 'card' ? 'Pago con Tarjeta' : 
                                         method.name === 'cash' ? 'Pago en Efectivo' : 
                                         method.name === 'transfer_bizum' ? 'Transferencia / Bizum' : 
                                         method.name}
                                    </span>
                                    {method.name === 'card' && <CreditCard className="w-8 h-8 text-blue-300"/>}
                                    {method.name === 'cash' && <Banknote className="w-8 h-8 text-green-300"/>}
                                    {method.name === 'transfer_bizum' && <Landmark className="w-8 h-8 text-gray-300"/>}
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <span className={`text-3xl font-black ${
                                        method.name === 'card' ? 'text-blue-900' :
                                        method.name === 'cash' ? 'text-green-900' : 'text-gray-800'
                                    }`}>
                                        {method.amount.toFixed(2)}€
                                    </span>
                                    <span className={`text-2xl font-light ${
                                        method.name === 'card' ? 'text-blue-300' :
                                        method.name === 'cash' ? 'text-green-300' : 'text-gray-300'
                                    }`}>/</span>
                                    <span className={`text-xl font-bold ${
                                        method.name === 'card' ? 'text-blue-600' :
                                        method.name === 'cash' ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                        {method.count} peds.
                                    </span>
                                </div>
                            </div>
                        ))}
                        {statsData.sortedPaymentMethods.length === 0 && (
                            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed h-full flex items-center justify-center">
                                Sin datos de pago
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FILA 2: CATEGORÍAS Y PRODUCTOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Facturación por Categoría */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600"/> 
                        Facturación por Categoría
                        <span className="text-xs font-normal text-gray-400 ml-auto">(Equipos agrupados)</span>
                    </h3>
                    <div className="space-y-4">
                        {statsData.sortedCategories.length > 0 ? statsData.sortedCategories.map((cat, idx) => (
                            <div key={idx} className="relative">
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="capitalize text-gray-600">{cat.name}</span>
                                    <span className="text-indigo-700 font-bold">
                                        {cat.value.toFixed(2)}€ / {cat.count} categorias
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: getWidth(cat.value, statsData.sortedCategories[0].value) }}></div>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-400 text-sm py-10">No hay datos de ventas.</p>}
                    </div>
                </div>

                {/* Top Productos */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5 text-emerald-600"/> Productos Estrella
                    </h3>
                    <div className="space-y-5">
                        {statsData.sortedProducts.length > 0 ? statsData.sortedProducts.map((prod, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">#{idx+1}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm font-medium mb-1">
                                        <span className="text-gray-800">{prod.name}</span>
                                        <span className="text-emerald-700 font-bold">{prod.total.toFixed(0)}€ / {prod.qty} uds</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: getWidth(prod.qty, statsData.sortedProducts[0].qty) }}></div>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-400 text-sm py-10">No hay productos vendidos.</p>}
                    </div>
                </div>
            </div>

            {/* Rentabilidad de Productos (Margen vs Cantidad) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600"/> 
                    Rentabilidad Real por Producto
                    <span className="text-xs font-normal text-gray-400 ml-auto">Margen Real vs Cantidad Vendida</span>
                </h3>
                <div className="max-h-96 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    {statsData.allProductsStats && statsData.allProductsStats.map((prod, idx) => {
                        const maxMargin = statsData.allProductsStats[0].margin;
                        const maxQty = Math.max(...statsData.allProductsStats.map(p => p.qty));
                        
                        return (
                            <div key={idx} className="flex items-center gap-4 text-sm">
                                <div className="w-48 truncate font-medium text-gray-700" title={prod.name}>{prod.name}</div>
                                
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-500">Margen</span>
                                        <span className="text-xs font-bold text-emerald-600">{prod.margin.toFixed(2)}€</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: getWidth(prod.margin, maxMargin) }}></div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-500">Ventas</span>
                                        <span className="text-xs font-bold text-blue-600">{prod.qty} uds</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-blue-500 h-full rounded-full" style={{ width: getWidth(prod.qty, maxQty) }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CONTROL DE CALIDAD Y ERRORES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 mt-8">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-red-100 pb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600"/> Control de Incidencias y Calidad
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <div className="bg-red-50 rounded-xl p-6 flex flex-col justify-center items-center text-center border border-red-200">
                        <p className="text-red-800 font-bold text-sm uppercase mb-2">Tasa de Error Global</p>
                        <p className="text-5xl font-black text-red-600 mb-2">{errorStats.errorRate.toFixed(2)}%</p>
                        <p className="text-xs text-red-700">
                            <strong>{errorStats.errorCount}</strong> incidencias de <strong>{errorStats.totalOrdersCount}</strong> pedidos totales.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Responsabilidad y Coste Asumido</h4>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-gray-700">Nosotros (Interno)</span>
                                <span className="text-xs font-bold bg-gray-200 px-2 py-0.5 rounded text-gray-600">{errorStats.responsibility.internal} casos</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Coste asumido:</span>
                                <span className="font-bold text-red-600">-{errorStats.costAssumed.internal.toFixed(2)}€</span>
                            </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-blue-800">Club (Error Cliente)</span>
                                <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-700">{errorStats.responsibility.club} casos</span>
                            </div>
                            <div className="flex justify-between text-xs text-blue-600">
                                <span>Pagado por Club:</span>
                                <span className="font-bold">+{errorStats.costAssumed.club.toFixed(2)}€</span>
                            </div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-orange-800">Proveedor (Garantía)</span>
                                <span className="text-xs font-bold bg-orange-100 px-2 py-0.5 rounded text-orange-700">{errorStats.responsibility.supplier} casos</span>
                            </div>
                            <div className="flex justify-between text-xs text-orange-600">
                                <span>Valor repuesto:</span>
                                <span className="font-bold">{errorStats.costAssumed.supplier.toFixed(2)}€</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Productos más problemáticos</h4>
                        <div className="space-y-3">
                            {errorStats.sortedProductErrors.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4">Sin datos de incidencias.</p>
                            ) : (
                                errorStats.sortedProductErrors.map(([name, count], idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                                            <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">{name}</span>
                                        </div>
                                        <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded">{count} fallos</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA FINANCIERA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Table className="w-5 h-5 text-blue-600"/> Reporte Financiero Detallado
                    </h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">{statsClubFilter !== 'all' && financeSeasonId === 'all' ? 'Temporada' : 'Club'}</th>
                                <th className="px-6 py-4 text-center">Pedidos</th>
                                <th className="px-6 py-4 text-right text-blue-800">Facturación</th>
                                <th className="px-6 py-4 text-right text-red-800">Coste Prov.</th>
                                <th className="px-6 py-4 text-right text-purple-800">Com. Club</th>
                                <th className="px-6 py-4 text-right text-orange-800">Neto Comercial</th>
                                <th className="px-6 py-4 text-right text-gray-500">Gasto Pasarela</th>
                                <th className="px-6 py-4 text-right bg-emerald-50 text-emerald-800">Beneficio Neto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {statsData.financialReport.map(cf => (
                                <tr key={cf.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{cf.name}</td>
                                    <td className="px-6 py-4 text-center"><span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">{cf.ordersCount}</span></td>
                                    <td className="px-6 py-4 text-right font-medium">{cf.grossSales.toFixed(2)}€</td>
                                    <td className="px-6 py-4 text-right text-red-600 font-medium">-{cf.supplierCost.toFixed(2)}€</td>
                                    <td className="px-6 py-4 text-right text-purple-600">-{cf.commClub.toFixed(2)}€</td>
                                    <td className="px-6 py-4 text-right text-orange-600">+{cf.commCommercial.toFixed(2)}€</td>
                                    <td className="px-6 py-4 text-right text-gray-500 text-xs">-{cf.gatewayCost.toFixed(2)}€</td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/50">{cf.netIncome.toFixed(2)}€</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="px-6 py-4">TOTALES</td>
                                <td className="px-6 py-4 text-center">{financialOrdersCount}</td>
                                <td className="px-6 py-4 text-right">{statsData.financialReport.reduce((s, c) => s + c.grossSales, 0).toFixed(2)}€</td>
                                <td className="px-6 py-4 text-right text-red-700">-{statsData.financialReport.reduce((s, c) => s + c.supplierCost, 0).toFixed(2)}€</td>
                                <td className="px-6 py-4 text-right text-purple-700">-{statsData.financialReport.reduce((s, c) => s + c.commClub, 0).toFixed(2)}€</td>
                                <td className="px-6 py-4 text-right text-orange-700">+{statsData.financialReport.reduce((s, c) => s + c.commCommercial, 0).toFixed(2)}€</td>
                                <td className="px-6 py-4 text-right text-gray-500">-{statsData.financialReport.reduce((s, c) => s + c.gatewayCost, 0).toFixed(2)}€</td>
                                <td className="px-6 py-4 text-right text-emerald-700">{statsData.financialReport.reduce((s, c) => s + c.netIncome, 0).toFixed(2)}€</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};