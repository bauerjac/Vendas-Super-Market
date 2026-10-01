import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  Calendar, 
  Printer, 
  ArrowUpRight, 
  CheckCircle2, 
  PieChart as PieIcon, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Product, Sale } from '../types';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  onNavigateToStock: () => void;
  onNavigateToSales: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  onNavigateToStock,
  onNavigateToSales,
}) => {
  const [period, setPeriod] = useState<'hoje' | '7dias' | 'mes' | 'todos'>('todos');

  // Filter sales by selected period (only non-cancelled sales)
  const filteredSales = useMemo(() => {
    const activeSales = sales.filter((s) => s.status !== 'cancelada');
    const today = new Date().toISOString().slice(0, 10);

    const past7 = new Date();
    past7.setDate(past7.getDate() - 7);
    const past7Str = past7.toISOString().slice(0, 10);

    const past30 = new Date();
    past30.setDate(past30.getDate() - 30);
    const past30Str = past30.toISOString().slice(0, 10);

    if (period === 'hoje') {
      return activeSales.filter((s) => s.created_at.slice(0, 10) === today);
    }
    if (period === '7dias') {
      return activeSales.filter((s) => s.created_at.slice(0, 10) >= past7Str);
    }
    if (period === 'mes') {
      return activeSales.filter((s) => s.created_at.slice(0, 10) >= past30Str);
    }
    return activeSales;
  }, [sales, period]);

  // Overall Financial KPIs
  const metrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    
    // Calculate total cost of items sold in this period
    let totalCostOfGoodsSold = 0;
    filteredSales.forEach((s) => {
      s.itens.forEach((it) => {
        totalCostOfGoodsSold += (it.preco_custo || 0) * it.quantidade;
      });
    });

    const grossProfit = totalRevenue - totalCostOfGoodsSold;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const totalTransactions = filteredSales.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Inventory metrics (current active catalog)
    const inventoryCost = products.reduce((acc, p) => acc + p.preco_custo * p.estoque_atual, 0);
    const inventoryRetail = products.reduce((acc, p) => acc + p.preco_venda * p.estoque_atual, 0);
    const lowStockItems = products.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo);
    const zeroStockItems = products.filter((p) => p.estoque_atual <= 0);

    return {
      totalRevenue,
      totalCostOfGoodsSold,
      grossProfit,
      profitMargin,
      totalTransactions,
      averageTicket,
      inventoryCost,
      inventoryRetail,
      lowStockCount: lowStockItems.length,
      zeroStockCount: zeroStockItems.length,
      criticalProducts: [...zeroStockItems, ...lowStockItems].slice(0, 5),
    };
  }, [filteredSales, products]);

  // Sales by Payment Method
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number; label: string }> = {
      dinheiro: { count: 0, total: 0, label: 'Dinheiro' },
      pix: { count: 0, total: 0, label: 'PIX' },
      cartao_credito: { count: 0, total: 0, label: 'Cartão de Crédito' },
      cartao_debito: { count: 0, total: 0, label: 'Cartão de Débito' },
      vale_refeicao: { count: 0, total: 0, label: 'Vale Refeição' },
      fiado: { count: 0, total: 0, label: 'A Prazo / Fiado' },
      outro: { count: 0, total: 0, label: 'Outro' },
    };

    filteredSales.forEach((s) => {
      const pm = s.forma_pagamento || 'outro';
      if (!map[pm]) {
        map[pm] = { count: 0, total: 0, label: pm };
      }
      map[pm].count += 1;
      map[pm].total += s.total;
    });

    return Object.values(map).filter((item) => item.total > 0 || item.count > 0);
  }, [filteredSales]);

  // Top 5 Best Selling Products
  const topProducts = useMemo(() => {
    const itemMap: Record<string, { nome: string; quantidade: number; receita: number; unidade?: string }> = {};

    filteredSales.forEach((s) => {
      s.itens.forEach((it) => {
        if (!itemMap[it.produto_id]) {
          itemMap[it.produto_id] = {
            nome: it.nome_produto,
            quantidade: 0,
            receita: 0,
            unidade: it.unidade || 'UN',
          };
        }
        itemMap[it.produto_id].quantidade += it.quantidade;
        itemMap[it.produto_id].receita += it.subtotal;
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [filteredSales]);

  // Sales timeline grouped by day
  const salesByDay = useMemo(() => {
    const dayMap: Record<string, { date: string; displayDate: string; total: number; count: number }> = {};

    filteredSales.forEach((s) => {
      const rawDate = s.created_at.slice(0, 10);
      if (!dayMap[rawDate]) {
        const [year, month, day] = rawDate.split('-');
        dayMap[rawDate] = {
          date: rawDate,
          displayDate: `${day}/${month}`,
          total: 0,
          count: 0,
        };
      }
      dayMap[rawDate].total += s.total;
      dayMap[rawDate].count += 1;
    });

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  const maxDailyRevenue = useMemo(() => {
    if (salesByDay.length === 0) return 1;
    return Math.max(...salesByDay.map((d) => d.total));
  }, [salesByDay]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:border-none print:shadow-none">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            Dashboard &amp; Relatórios Gerenciais
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão consolidada e em tempo real dos seus produtos cadastrados e vendas realizadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(['hoje', '7dias', 'mes', 'todos'] as const).map((pKey) => {
              const labels = { hoje: 'Hoje', '7dias': '7 Dias', mes: 'Este Mês', todos: 'Tudo' };
              return (
                <button
                  key={pKey}
                  onClick={() => setPeriod(pKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    period === pKey
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labels[pKey]}
                </button>
              );
            })}
          </div>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <span className="font-semibold text-emerald-700">{metrics.totalTransactions} vendas</span>
            <span>no período</span>
          </div>
        </div>

        {/* Card 2: Lucro Bruto Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lucro Estimado</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-teal-700">
            {formatCurrency(metrics.grossProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <span className="font-bold text-teal-800">{metrics.profitMargin.toFixed(1)}%</span>
            <span>margem média</span>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.averageTicket)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Média gasta por cliente
          </div>
        </div>

        {/* Card 4: Patrimônio em Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Estoque (Custo)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.inventoryCost)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Potencial de venda: {formatCurrency(metrics.inventoryRetail)}
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales by Date Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Evolução Diária das Vendas</h2>
              <p className="text-xs text-slate-400">Total em reais faturado por dia</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
              {salesByDay.length} dia(s) com vendas
            </span>
          </div>

          {salesByDay.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400">
              <Calendar className="w-10 h-10 text-slate-200 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">Sem dados de vendas para este período</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Faça uma venda no Ponto de Venda para visualizar o gráfico.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="h-48 flex items-end gap-3 px-2 overflow-x-auto">
                {salesByDay.map((d) => {
                  const heightPct = Math.max(12, (d.total / maxDailyRevenue) * 100);
                  return (
                    <div key={d.date} className="flex-1 min-w-[48px] flex flex-col items-center gap-1.5 group">
                      <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatCurrency(d.total)}
                      </div>
                      <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-md transition-all group-hover:from-emerald-500 group-hover:to-teal-400"
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{d.displayDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Payment Methods Distribution (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-800 text-sm">Formas de Pagamento</h2>
            <p className="text-xs text-slate-400">Divisão de faturamento por método</p>
          </div>

          {paymentBreakdown.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400">
              <PieIcon className="w-10 h-10 text-slate-200 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">Nenhum pagamento registrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map((pm) => {
                const pct = metrics.totalRevenue > 0 ? (pm.total / metrics.totalRevenue) * 100 : 0;
                return (
                  <div key={pm.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{pm.label}</span>
                      <span className="text-slate-900">{formatCurrency(pm.total)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-emerald-600 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Top Selling Products & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 Products (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Top Produtos Mais Vendidos</h2>
              <p className="text-xs text-slate-400">Classificação por receita gerada</p>
            </div>
            <button
              onClick={onNavigateToSales}
              className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
            >
              Ver vendas
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma venda registrada ainda para classificar produtos.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topProducts.map((prod, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{prod.nome}</div>
                      <div className="text-[11px] text-slate-400">
                        {prod.quantidade} {prod.unidade} vendido(s)
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatCurrency(prod.receita)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Alerts / Reposition (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Alerta de Reposição de Estoque</h2>
                <p className="text-xs text-slate-400">Itens com estoque baixo ou zerado</p>
              </div>
            </div>
            <button
              onClick={onNavigateToStock}
              className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
            >
              Ir para Estoque
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.criticalProducts.length === 0 ? (
            <div className="py-8 text-center text-emerald-700 bg-emerald-50/50 rounded-xl text-xs flex flex-col items-center justify-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold">Estoque Saudável!</span>
              <span className="text-slate-500">Nenhum produto cadastrado abaixo do limite mínimo.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.criticalProducts.map((p) => {
                const isZero = p.estoque_atual <= 0;
                return (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{p.nome}</div>
                      <div className="text-slate-400">
                        Mínimo estipulado: {p.estoque_minimo} {p.unidade}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        isZero ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.estoque_atual} {p.unidade} {isZero ? '(Zerado)' : '(Baixo)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Printable Management Report (shown only when printing) */}
      <div className="hidden print:block font-mono text-xs p-6 space-y-4">
        <div className="text-center border-b border-black pb-3">
          <h1 className="text-lg font-bold uppercase">SUPERMARKET PRO - RELATÓRIO DE FECHAMENTO</h1>
          <p>Data de emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
          <p>Período selecionado: {period.toUpperCase()}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-black pb-3">
          <div>
            <p><strong>Total de Vendas:</strong> {metrics.totalTransactions}</p>
            <p><strong>Faturamento Total:</strong> {formatCurrency(metrics.totalRevenue)}</p>
            <p><strong>Ticket Médio:</strong> {formatCurrency(metrics.averageTicket)}</p>
          </div>
          <div>
            <p><strong>Custo Mercadorias:</strong> {formatCurrency(metrics.totalCostOfGoodsSold)}</p>
            <p><strong>Lucro Bruto Estimado:</strong> {formatCurrency(metrics.grossProfit)}</p>
            <p><strong>Margem de Lucro:</strong> {metrics.profitMargin.toFixed(1)}%</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold border-b border-black mb-2">VENDAS POR FORMA DE PAGAMENTO:</h3>
          {paymentBreakdown.map((pm) => (
            <div key={pm.label} className="flex justify-between py-0.5">
              <span>{pm.label} ({pm.count} transações):</span>
              <span>{formatCurrency(pm.total)}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-black text-center">
          <p>Assinatura do Gerente / Responsável: __________________________________</p>
        </div>
      </div>
    </div>
  );
};
