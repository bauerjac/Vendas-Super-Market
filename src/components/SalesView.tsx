import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Receipt, 
  RotateCcw, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  AlertCircle,
  FileText,
  Clock,
  Printer,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Product, Sale, SaleItem, PaymentMethod } from '../types';
import { createSale, cancelSale } from '../services/storageService';
import { ReceiptModal } from './ReceiptModal';

interface SalesViewProps {
  products: Product[];
  sales: Sale[];
  onDataChanged: () => void;
  onNavigateToInventory: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  products,
  sales,
  onDataChanged,
  onNavigateToInventory,
}) => {
  const [activeTab, setActiveTab] = useState<'pdv' | 'historico'>('pdv');

  // PDV States
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [observation, setObservation] = useState<string>('');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<'todos' | 'hoje' | '7dias' | 'mes'>('todos');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter products matching search in PDV
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => p.nome.toLowerCase().includes(q) || p.codigo_barras.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, searchQuery]);

  // Calculations for PDV
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const numericReceived = parseFloat(amountReceived.replace(',', '.')) || (paymentMethod !== 'dinheiro' ? total : 0);
  const change = paymentMethod === 'dinheiro' && numericReceived >= total ? numericReceived - total : 0;
  const isCashInsufficient = paymentMethod === 'dinheiro' && numericReceived < total && numericReceived > 0;

  // Add product to cart
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    const existingIndex = cart.findIndex((it) => it.produto_id === product.id);

    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantidade + quantity;
      updated[existingIndex].quantidade = newQty;
      updated[existingIndex].subtotal = newQty * updated[existingIndex].preco_unitario;
      setCart(updated);
    } else {
      const newItem: SaleItem = {
        produto_id: product.id,
        nome_produto: product.nome,
        codigo_barras: product.codigo_barras,
        quantidade: quantity,
        preco_unitario: product.preco_venda,
        preco_custo: product.preco_custo,
        subtotal: quantity * product.preco_venda,
        unidade: product.unidade,
      };
      setCart([...cart, newItem]);
    }

    setSearchQuery('');
    setSelectedQty(1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Quick barcode or exact match enter
  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleAddToCart(searchResults[0], selectedQty);
      }
    }
  };

  // Update item quantity in cart
  const handleUpdateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    const updated = [...cart];
    updated[index].quantidade = newQty;
    updated[index].subtotal = newQty * updated[index].preco_unitario;
    setCart(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('Deseja limpar todos os itens do carrinho?')) {
      setCart([]);
      setDiscount(0);
      setAmountReceived('');
      setObservation('');
    }
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      alert('O carrinho está vazio! Adicione ao menos um produto.');
      return;
    }

    if (paymentMethod === 'dinheiro' && numericReceived < total) {
      alert(`Valor recebido em dinheiro insuficiente. Faltam ${formatCurrency(total - numericReceived)}`);
      return;
    }

    setIsProcessing(true);
    try {
      const newSale = await createSale({
        itens: cart,
        subtotal,
        desconto: discount,
        total,
        forma_pagamento: paymentMethod,
        valor_pago: paymentMethod === 'dinheiro' ? numericReceived : total,
        troco: change,
        observacao: observation.trim() || undefined,
      });

      // Clear PDV
      setCart([]);
      setDiscount(0);
      setAmountReceived('');
      setObservation('');
      setLastCompletedSale(newSale);
      setViewingReceipt(newSale);
      onDataChanged();
    } catch (err: any) {
      alert('Erro ao finalizar venda: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel / Refund sale
  const handleCancelSale = async (sale: Sale) => {
    if (sale.status === 'cancelada') return;

    const confirmed = confirm(
      `Deseja realmente CANCELAR a venda Cupom #${sale.numero_cupom}?\n\n` +
      `O status será alterado para cancelada e as quantidades vendidas retornarão automaticamente para o estoque.`
    );

    if (confirmed) {
      await cancelSale(sale.id);
      onDataChanged();
    }
  };

  // Filtered sales in history
  const filteredSales = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const past7Days = new Date();
    past7Days.setDate(past7Days.getDate() - 7);
    const past7Str = past7Days.toISOString().slice(0, 10);

    const past30Days = new Date();
    past30Days.setDate(past30Days.getDate() - 30);
    const past30Str = past30Days.toISOString().slice(0, 10);

    return sales.filter((s) => {
      const saleDate = s.created_at.slice(0, 10);

      let matchesDate = true;
      if (historyDateFilter === 'hoje') matchesDate = saleDate === today;
      else if (historyDateFilter === '7dias') matchesDate = saleDate >= past7Str;
      else if (historyDateFilter === 'mes') matchesDate = saleDate >= past30Str;

      let matchesSearch = true;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchesCupom = s.numero_cupom.toString().includes(q);
        const matchesItem = s.itens.some((it) => it.nome_produto.toLowerCase().includes(q));
        matchesSearch = matchesCupom || matchesItem;
      }

      return matchesDate && matchesSearch;
    });
  }, [sales, historyDateFilter, historySearch]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const paymentLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    vale_refeicao: 'Vale Refeição / Alimentação',
    fiado: 'A Prazo / Fiado',
    outro: 'Outro',
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-emerald-600" />
            Vendas &amp; Ponto de Venda (PDV)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registre vendas rápidas, emita comprovantes e consulte o histórico de transações.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('pdv')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'pdv'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Frente de Caixa (PDV)
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'historico'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico ({sales.length})
          </button>
        </div>
      </div>

      {/* Main Tab 1: Frente de Caixa / PDV */}
      {activeTab === 'pdv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Search & Cart Table (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search Box / Barcode scanner */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDownSearch}
                    placeholder="Digite o nome do produto ou passe o código de barras..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    title="Quantidade"
                    className="w-full text-center py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Autocomplete Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white max-h-64 overflow-y-auto shadow-md">
                  {searchResults.map((p) => {
                    const isOutOfStock = p.estoque_atual <= 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddToCart(p, selectedQty)}
                        className="w-full p-3 text-left hover:bg-emerald-50/70 flex items-center justify-between transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="font-semibold text-slate-900 text-sm truncate">{p.nome}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                            <span>{p.codigo_barras}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded font-sans">{p.categoria}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-slate-900 text-sm">
                            {formatCurrency(p.preco_venda)}
                          </div>
                          <div className={`text-[11px] font-medium ${isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                            Estoque: {p.estoque_atual} {p.unidade}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {products.length === 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                  <span>Você ainda não tem produtos cadastrados para vender.</span>
                  <button
                    onClick={onNavigateToInventory}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
                  >
                    Cadastrar no Estoque
                  </button>
                </div>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[380px]">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Itens da Venda</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {cart.reduce((acc, it) => acc + it.quantidade, 0)} itens
                  </span>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Carrinho
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 text-slate-200 mb-3 stroke-1" />
                  <p className="font-semibold text-slate-600 text-sm">Carrinho de compras vazio</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Busque os produtos pelo nome ou código de barras acima para adicioná-los à venda.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4">Item / Produto</th>
                        <th className="py-2.5 px-3 text-right">Preço Unit.</th>
                        <th className="py-2.5 px-3 text-center">Quantidade</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {cart.map((item, idx) => {
                        const productRef = products.find((p) => p.id === item.produto_id);
                        const isExceedingStock = productRef && item.quantidade > productRef.estoque_atual;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{item.nome_produto}</div>
                              {isExceedingStock && (
                                <div className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  Qtd maior que estoque ({productRef?.estoque_atual} {productRef?.unidade})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-600">
                              {formatCurrency(item.preco_unitario)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(idx, item.quantidade - 1)}
                                  className="p-1 hover:bg-slate-100 text-slate-600 transition"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-10 text-center font-bold text-xs text-slate-800">
                                  {item.quantidade}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(idx, item.quantidade + 1)}
                                  className="p-1 hover:bg-slate-100 text-slate-600 transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {formatCurrency(item.subtotal)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Checkout & Payment Details (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
                Pagamento &amp; Fechamento
              </h2>

              {/* Subtotal & Discount */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Desconto (R$):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={subtotal}
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-24 text-right px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Big Total */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total a Pagar:
                  </span>
                  <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition ${
                      paymentMethod === 'dinheiro'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-teal-600" />
                    <span>PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_credito')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition ${
                      paymentMethod === 'cartao_credito'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>C. Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_debito')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition ${
                      paymentMethod === 'cartao_debito'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-cyan-600" />
                    <span>C. Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vale_refeicao')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition ${
                      paymentMethod === 'vale_refeicao'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>🍽️</span>
                    <span>Vale / Ticket</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fiado')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-semibold transition ${
                      paymentMethod === 'fiado'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📝</span>
                    <span>A Prazo / Fiado</span>
                  </button>
                </div>
              </div>

              {/* Cash Change Calculator */}
              {paymentMethod === 'dinheiro' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Valor Recebido (R$):</label>
                    <button
                      type="button"
                      onClick={() => setAmountReceived(total.toFixed(2))}
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      Valor Exato
                    </button>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 50, 100].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => {
                          const current = parseFloat(amountReceived) || 0;
                          setAmountReceived((current + bill).toFixed(2));
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md transition"
                      >
                        +{bill}
                      </button>
                    ))}
                  </div>

                  {/* Change Preview */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-600">Troco a Devolver:</span>
                    <span className={`text-base font-bold ${change > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>

                  {isCashInsufficient && (
                    <div className="text-[11px] text-rose-600 font-bold">
                      Faltam {formatCurrency(total - numericReceived)}
                    </div>
                  )}
                </div>
              )}

              {/* Observation Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Observação do Pedido (Opcional)
                </label>
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Nome do cliente ou observação..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={cart.length === 0 || isProcessing}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition transform active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isProcessing ? 'Finalizando Venda...' : 'Finalizar Venda'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 2: Histórico de Vendas */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por cupom nº ou produto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="todos">Todo o Histórico</option>
                <option value="hoje">Hoje</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="mes">Últimos 30 dias</option>
              </select>
            </div>
          </div>

          {/* Sales Table */}
          {sales.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">Nenhuma venda realizada ainda</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                As vendas concluídas no caixa serão registradas aqui em tempo real.
              </p>
              <button
                onClick={() => setActiveTab('pdv')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
              >
                Ir para o Caixa
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Nenhuma venda encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Cupom Nº</th>
                      <th className="py-3 px-4">Data &amp; Hora</th>
                      <th className="py-3 px-4">Itens</th>
                      <th className="py-3 px-4">Forma Pagto</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredSales.map((sale) => {
                      const isCancelled = sale.status === 'cancelada';
                      return (
                        <tr key={sale.id} className={`hover:bg-slate-50/60 ${isCancelled ? 'opacity-60 bg-slate-50/40' : ''}`}>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{sale.numero_cupom.toString().padStart(6, '0')}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                            {new Date(sale.created_at).toLocaleDateString('pt-BR')} {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-medium text-slate-800">
                              {sale.itens.reduce((acc, it) => acc + it.quantidade, 0)} unid.
                            </span>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {sale.itens.map((it) => it.nome_produto).join(', ')}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {paymentLabels[sale.forma_pagamento] || sale.forma_pagamento}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isCancelled ? (
                              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Cancelada
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Concluída
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingReceipt(sale)}
                                title="Ver / Imprimir Cupom Fiscal"
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              {!isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelSale(sale)}
                                  title="Cancelar Venda e Devolver Estoque"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {viewingReceipt && (
        <ReceiptModal
          sale={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
};
