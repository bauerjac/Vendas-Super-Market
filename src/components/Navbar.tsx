import React from 'react';
import { 
  Store, 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Database, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'estoque' | 'vendas';
  onSelectTab: (tab: 'dashboard' | 'estoque' | 'vendas') => void;
  isSupabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
  lowStockAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isSupabaseConnected,
  onOpenSupabaseModal,
  lowStockAlertCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                <span>SuperMarket</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Gestão de Vendas &amp; Estoque</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                currentTab === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('estoque')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition relative ${
                currentTab === 'estoque'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque</span>
              {lowStockAlertCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {lowStockAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('vendas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                currentTab === 'vendas'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Vendas (PDV)</span>
            </button>
          </nav>

          {/* Supabase Connection Status Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenSupabaseModal}
              title="Configurar Conexão com o Supabase"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition shadow-2xs ${
                isSupabaseConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {isSupabaseConnected ? 'Supabase Conectado' : 'Conectar Supabase'}
              </span>
              {isSupabaseConnected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              currentTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('estoque')}
            className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              currentTab === 'estoque' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'
            }`}
          >
            <Package className="w-4 h-4" />
            Estoque
            {lowStockAlertCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                {lowStockAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('vendas')}
            className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              currentTab === 'vendas' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Vendas (PDV)
          </button>
        </div>
      </div>
    </header>
  );
};
