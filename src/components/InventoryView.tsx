import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  History, 
  TrendingUp, 
  Download, 
  Upload, 
  Barcode, 
  Check, 
  X,
  Layers,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Product, ProductCategory, UnitType, StockMovement } from '../types';
import { saveProduct, deleteProduct, adjustProductStock } from '../services/storageService';

const CATEGORIES: ProductCategory[] = [
  'Mercearia',
  'Hortifruti',
  'Açougue e Carnes',
  'Padaria e Confeitaria',
  'Bebidas',
  'Laticínios e Frios',
  'Limpeza',
  'Higiene e Perfumaria',
  'Congelados',
  'Snacks e Doces',
  'Outros',
];

const UNITS: UnitType[] = ['UN', 'KG', 'G', 'LT', 'ML', 'PCT', 'CX', 'FD'];

interface InventoryViewProps {
  products: Product[];
  movements: StockMovement[];
  onDataChanged: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ products, movements, onDataChanged }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'baixo' | 'zerado' | 'vencendo'>('todos');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Product Form State
  const [formData, setFormData] = useState({
    codigo_barras: '',
    nome: '',
    categoria: 'Mercearia' as ProductCategory,
    preco_custo: '',
    preco_venda: '',
    estoque_atual: '',
    estoque_minimo: '5',
    unidade: 'UN' as UnitType,
    validade: '',
    fornecedor: '',
    observacoes: '',
  });

  // Adjust Form State
  const [adjustData, setAdjustData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida_perda' | 'ajuste',
    quantidade: '',
    motivo: '',
  });

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      codigo_barras: '',
      nome: '',
      categoria: 'Mercearia',
      preco_custo: '',
      preco_venda: '',
      estoque_atual: '',
      estoque_minimo: '5',
      unidade: 'UN',
      validade: '',
      fornecedor: '',
      observacoes: '',
    });
    setIsProductModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      codigo_barras: p.codigo_barras,
      nome: p.nome,
      categoria: p.categoria as ProductCategory,
      preco_custo: p.preco_custo.toString(),
      preco_venda: p.preco_venda.toString(),
      estoque_atual: p.estoque_atual.toString(),
      estoque_minimo: p.estoque_minimo.toString(),
      unidade: p.unidade,
      validade: p.validade || '',
      fornecedor: p.fornecedor || '',
      observacoes: p.observacoes || '',
    });
    setIsProductModalOpen(true);
  };

  // Open modal for Stock Quick Adjust
  const handleOpenAdjustModal = (p: Product) => {
    setAdjustTargetProduct(p);
    setAdjustData({
      tipo: 'entrada',
      quantidade: '',
      motivo: '',
    });
    setIsAdjustModalOpen(true);
  };

  // Generate random barcode if user doesn't have one
  const handleGenerateBarcode = () => {
    const randomCode = '789' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setFormData((prev) => ({ ...prev, codigo_barras: randomCode }));
  };

  // Save product submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('Por favor, informe o nome do produto.');
      return;
    }
    if (!formData.codigo_barras.trim()) {
      alert('Por favor, informe ou gere o código de barras do produto.');
      return;
    }

    const custo = parseFloat(formData.preco_custo.replace(',', '.')) || 0;
    const venda = parseFloat(formData.preco_venda.replace(',', '.')) || 0;
    const atual = parseFloat(formData.estoque_atual.replace(',', '.')) || 0;
    const minimo = parseFloat(formData.estoque_minimo.replace(',', '.')) || 0;

    await saveProduct({
      id: editingProduct?.id,
      codigo_barras: formData.codigo_barras.trim(),
      nome: formData.nome.trim(),
      categoria: formData.categoria,
      preco_custo: custo,
      preco_venda: venda,
      estoque_atual: atual,
      estoque_minimo: minimo,
      unidade: formData.unidade,
      validade: formData.validade || undefined,
      fornecedor: formData.fornecedor?.trim() || undefined,
      observacoes: formData.observacoes?.trim() || undefined,
    });

    setIsProductModalOpen(false);
    onDataChanged();
  };

  // Delete product
  const handleDelete = async (p: Product) => {
    if (confirm(`Tem certeza que deseja remover o produto "${p.nome}" do estoque?`)) {
      await deleteProduct(p.id);
      onDataChanged();
    }
  };

  // Submit Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetProduct) return;
    const qtd = parseFloat(adjustData.quantidade.replace(',', '.'));
    if (!qtd || qtd <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    await adjustProductStock(
      adjustTargetProduct.id,
      qtd,
      adjustData.tipo,
      adjustData.motivo || (adjustData.tipo === 'entrada' ? 'Reposição de estoque' : 'Saída / Descarte')
    );

    setIsAdjustModalOpen(false);
    onDataChanged();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      alert('Não há produtos para exportar.');
      return;
    }

    const headers = ['Código de Barras', 'Nome', 'Categoria', 'Preço Custo', 'Preço Venda', 'Estoque Atual', 'Estoque Mínimo', 'Unidade', 'Validade', 'Fornecedor'];
    const rows = products.map((p) => [
      `"${p.codigo_barras}"`,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.categoria}"`,
      p.preco_custo.toFixed(2),
      p.preco_venda.toFixed(2),
      p.estoque_atual,
      p.estoque_minimo,
      p.unidade,
      p.validade || '',
      `"${(p.fornecedor || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estoque_supermercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    return products.filter((p) => {
      const matchesSearch =
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.fornecedor && p.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'todas' || p.categoria === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'baixo') {
        matchesStatus = p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo;
      } else if (statusFilter === 'zerado') {
        matchesStatus = p.estoque_atual <= 0;
      } else if (statusFilter === 'vencendo') {
        if (!p.validade) matchesStatus = false;
        else {
          const valDate = new Date(p.validade);
          matchesStatus = valDate >= today && valDate <= in30Days;
        }
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, statusFilter]);

  // Inventory Quick Stats
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.reduce((acc, p) => acc + p.estoque_atual, 0);
    const totalCost = products.reduce((acc, p) => acc + p.preco_custo * p.estoque_atual, 0);
    const totalRetail = products.reduce((acc, p) => acc + p.preco_venda * p.estoque_atual, 0);
    const lowStockCount = products.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length;
    const zeroStockCount = products.filter((p) => p.estoque_atual <= 0).length;

    return { totalItems, totalStock, totalCost, totalRetail, lowStockCount, zeroStockCount };
  }, [products]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Markup calculation helper
  const formCost = parseFloat(formData.preco_custo.replace(',', '.')) || 0;
  const formPrice = parseFloat(formData.preco_venda.replace(',', '.')) || 0;
  const unitProfit = formPrice - formCost;
  const marginPct = formCost > 0 ? (unitProfit / formCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-600" />
            Controle de Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastre seus produtos, acompanhe quantidades e faça reposições em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl flex items-center gap-2 transition"
            title="Ver movimentações de estoque"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>Movimentações</span>
          </button>

          {products.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl flex items-center gap-2 transition"
              title="Exportar produtos para CSV"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Exportar</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-xs transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Produtos Cadastrados</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalItems}</div>
          <div className="text-xs text-slate-500 mt-1">{stats.totalStock.toFixed(1)} unidades no total</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Patrimônio (Custo)</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalCost)}</div>
          <div className="text-xs text-slate-500 mt-1">Investimento imobilizado</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Potencial de Venda</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRetail)}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            Lucro est.: {formatCurrency(stats.totalRetail - stats.totalCost)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertas de Reposição</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</span>
            <span className="text-xs text-slate-500">críticos</span>
            {stats.zeroStockCount > 0 && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                {stats.zeroStockCount} zerados
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">Abaixo do estoque mínimo</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, código de barras ou fornecedor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              <option value="todas">Todas as Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              <option value="todos">Todos os Status</option>
              <option value="baixo">Estoque Baixo / Crítico</option>
              <option value="zerado">Estoque Zerado</option>
              <option value="vencendo">Vencendo nos Próximos 30 Dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table or Clean Zero-Data Slate */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum produto cadastrado no estoque</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            O seu estoque está pronto para receber os seus produtos. Clique no botão abaixo para começar a cadastrar as mercadorias do seu supermercado.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl inline-flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-5 h-5" />
            <span>Cadastrar Primeiro Produto</span>
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs">
          <p className="text-slate-600 font-medium mb-1">Nenhum produto encontrado com os filtros atuais.</p>
          <p className="text-xs text-slate-400">Tente ajustar a busca ou limpar os filtros de categoria/status.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Código / EAN</th>
                  <th className="py-3.5 px-4">Produto &amp; Categoria</th>
                  <th className="py-3.5 px-4 text-right">Preço Custo</th>
                  <th className="py-3.5 px-4 text-right">Preço Venda</th>
                  <th className="py-3.5 px-4 text-right">Margem</th>
                  <th className="py-3.5 px-4 text-center">Estoque Atual</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const isZero = p.estoque_atual <= 0;
                  const isLow = !isZero && p.estoque_atual <= p.estoque_minimo;
                  const profit = p.preco_venda - p.preco_custo;
                  const margin = p.preco_custo > 0 ? (profit / p.preco_custo) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {p.codigo_barras}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.nome}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {p.categoria}
                          </span>
                          {p.validade && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Val: {new Date(p.validade).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        {formatCurrency(p.preco_custo)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.preco_venda)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          margin >= 40 ? 'bg-emerald-50 text-emerald-700' :
                          margin >= 20 ? 'bg-blue-50 text-blue-700' :
                          margin > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {margin.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">
                          {p.estoque_atual} <span className="text-xs font-normal text-slate-500">{p.unidade}</span>
                        </span>
                        <div className="text-[10px] text-slate-400">Min: {p.estoque_minimo}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Zerado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjustModal(p)}
                            title="Entrada / Saída Rápida de Estoque"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar Dados do Produto"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Excluir Produto"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Mostrando {filteredProducts.length} de {products.length} produtos</span>
            <span>Total em valor de venda: {formatCurrency(filteredProducts.reduce((acc, p) => acc + p.preco_venda * p.estoque_atual, 0))}</span>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar / Editar Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Barcode & Generate Button */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Código de Barras / SKU *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.codigo_barras}
                      onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                      placeholder="Ex: 7891234567890"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition"
                  >
                    Gerar Código
                  </button>
                </div>
              </div>

              {/* Row 2: Nome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Arroz Branco Tipo 1 5kg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Row 3: Categoria e Unidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value as UnitType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Preço Custo, Preço Venda, Margem Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.preco_custo}
                    onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.preco_venda}
                    onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Margem Estimada
                  </label>
                  <div className="py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs">
                    <div className="font-bold text-slate-800">
                      {marginPct.toFixed(1)}% ({formatCurrency(unitProfit)})
                    </div>
                    <div className="text-[10px] text-slate-400">Lucro por unidade</div>
                  </div>
                </div>
              </div>

              {/* Row 5: Estoque Atual e Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Estoque Atual (Qtd) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={formData.estoque_atual}
                    onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 6: Validade e Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Data de Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.validade}
                    onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    placeholder="Ex: Distribuidora Silva"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 7: Observações */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais, localização na gôndola, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-xs transition"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajuste Rápido de Estoque (Entrada / Saída) */}
      {isAdjustModalOpen && adjustTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Ajuste de Estoque</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Produto selecionado:</div>
                <div className="font-bold text-slate-900 text-base">{adjustTargetProduct.nome}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Estoque atual: <span className="font-bold">{adjustTargetProduct.estoque_atual} {adjustTargetProduct.unidade}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, tipo: 'entrada' })}
                    className={`py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                      adjustData.tipo === 'entrada'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + Entrada (Reposição)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, tipo: 'saida_perda' })}
                    className={`py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                      adjustData.tipo === 'saida_perda'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    - Saída (Perda / Descarte)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Quantidade a movimentar ({adjustTargetProduct.unidade}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={adjustData.quantidade}
                  onChange={(e) => setAdjustData({ ...adjustData, quantidade: e.target.value })}
                  placeholder="Ex: 10"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-base font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  value={adjustData.motivo}
                  onChange={(e) => setAdjustData({ ...adjustData, motivo: e.target.value })}
                  placeholder={adjustData.tipo === 'entrada' ? 'Ex: NF 1234 fornecedor' : 'Ex: Produto avariado ou vencido'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-xs"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Histórico de Movimentações */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Histórico de Movimentações de Estoque</h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {movements.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">Nenhuma movimentação registrada ainda</p>
                  <p className="text-xs text-slate-400 mt-1">As entradas, saídas e vendas aparecerão registradas aqui automaticamente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                        <th className="py-2.5 px-3">Data/Hora</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3 text-right">Qtd</th>
                        <th className="py-2.5 px-3 text-center">Antes &gt; Depois</th>
                        <th className="py-2.5 px-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {new Date(m.created_at).toLocaleDateString('pt-BR')} {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{m.nome_produto}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded font-semibold ${
                              m.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700' :
                              m.tipo === 'saida_venda' ? 'bg-blue-50 text-blue-700' :
                              m.tipo === 'saida_perda' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {m.tipo === 'entrada' ? '+ Entrada' :
                               m.tipo === 'saida_venda' ? '- Venda' :
                               m.tipo === 'saida_perda' ? '- Perda' : 'Ajuste'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">{m.quantidade}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {m.estoque_anterior} &rarr; <span className="font-bold text-slate-900">{m.estoque_novo}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">{m.motivo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
