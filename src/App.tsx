import React, { useState, useEffect, useCallback } from 'react';
import { Product, Sale, StockMovement } from './types';
import { 
  fetchProducts, 
  fetchSales, 
  getLocalMovements 
} from './services/storageService';
import { testSupabaseConnection, getStoredSupabaseConfig } from './services/supabaseClient';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { SalesView } from './components/SalesView';
import { SupabaseModal } from './components/SupabaseModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'estoque' | 'vendas'>('dashboard');
  
  // Application Data (Strictly empty at start - no mock data)
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase Status & Modal
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [prodRes, saleRes] = await Promise.all([
        fetchProducts(),
        fetchSales(),
      ]);

      setProducts(prodRes.products);
      setSales(saleRes.sales);
      setMovements(getLocalMovements());
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check Supabase connection status
  const checkSupabase = useCallback(async () => {
    const cfg = getStoredSupabaseConfig();
    if (!cfg.hasCredentials) {
      setIsSupabaseConnected(false);
      return;
    }
    const res = await testSupabaseConnection();
    setIsSupabaseConnected(res.success);
  }, []);

  useEffect(() => {
    loadData();
    checkSupabase();
  }, [loadData, checkSupabase]);

  // Handle updates when user creates products, sales, adjustments
  const handleDataChanged = () => {
    loadData();
  };

  const handleSupabaseConfigChanged = () => {
    checkSupabase();
    loadData();
  };

  const lowStockCount = products.filter(
    (p) => p.estoque_atual <= p.estoque_minimo
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        lowStockAlertCount={lowStockCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold">Carregando sistema...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                products={products}
                sales={sales}
                onNavigateToStock={() => setCurrentTab('estoque')}
                onNavigateToSales={() => setCurrentTab('vendas')}
              />
            )}

            {currentTab === 'estoque' && (
              <InventoryView
                products={products}
                movements={movements}
                onDataChanged={handleDataChanged}
              />
            )}

            {currentTab === 'vendas' && (
              <SalesView
                products={products}
                sales={sales}
                onDataChanged={handleDataChanged}
                onNavigateToInventory={() => setCurrentTab('estoque')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SuperMarket Pro &bull; Sistema de Gestão de Estoque e Vendas</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-slate-500 hover:text-emerald-700 underline"
            >
              Configurar Banco Supabase
            </button>
          </div>
        </div>
      </footer>

      {/* Supabase Connection & Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={handleSupabaseConfigChanged}
      />
    </div>
  );
}
