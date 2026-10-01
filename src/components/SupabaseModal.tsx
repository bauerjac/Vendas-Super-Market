import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle,
  Server,
  CloudUpload
} from 'lucide-react';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  clearStoredSupabaseConfig, 
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA 
} from '../services/supabaseClient';
import { syncAllLocalToSupabase } from '../services/storageService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onConfigChanged }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMessage({ type: 'warning', text: 'Por favor, informe a URL e a Anon Key do Supabase.' });
      return;
    }

    setIsTesting(true);
    setStatusMessage({ type: 'info', text: 'Testando conexão com o Supabase...' });

    saveStoredSupabaseConfig(url, anonKey);
    const result = await testSupabaseConnection();
    setIsTesting(false);

    if (result.success) {
      if (result.tablesExist) {
        setStatusMessage({ type: 'success', text: 'Conectado com sucesso! As tabelas do banco de dados estão prontas.' });
      } else {
        setStatusMessage({ 
          type: 'warning', 
          text: 'Conectado com sucesso! Mas as tabelas ainda não foram criadas. Copie o script SQL abaixo e execute no SQL Editor do seu Supabase.' 
        });
      }
      onConfigChanged();
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleDisconnect = () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setStatusMessage({ type: 'info', text: 'Desconectado do Supabase. O sistema está utilizando armazenamento local seguro.' });
    onConfigChanged();
  };

  const handleSyncLocalData = async () => {
    setIsSyncing(true);
    const res = await syncAllLocalToSupabase();
    setIsSyncing(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      onConfigChanged();
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Database className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Conexão com o Supabase</h2>
              <p className="text-xs text-emerald-100">Armazenamento em nuvem persistente para Estoque e Vendas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              statusMessage.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />}
              <span className="font-medium leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefg.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <p className="text-xs text-slate-500 mt-1">
                Disponível no painel do Supabase em: <span className="font-medium">Project Settings &gt; API &gt; Project URL</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Supabase Anon / Public Key (API Key)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <p className="text-xs text-slate-500 mt-1">
                Disponível no painel do Supabase em: <span className="font-medium">Project Settings &gt; API &gt; Project API keys &gt; anon/public</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-sm transition"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                  {isTesting ? 'Verificando...' : 'Salvar e Conectar'}
                </button>

                {url && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3.5 py-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-sm font-medium rounded-lg transition"
                  >
                    Desconectar
                  </button>
                )}
              </div>

              {url && (
                <button
                  type="button"
                  onClick={handleSyncLocalData}
                  disabled={isSyncing}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-2 transition"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <CloudUpload className="w-4 h-4 text-emerald-600" />}
                  <span>Sincronizar Dados Locais</span>
                </button>
              )}
            </div>
          </form>

          {/* SQL Schema helper box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold text-slate-800">Script SQL para Criar as Tabelas no Supabase</span>
              </div>
              <button
                onClick={copySqlToClipboard}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-md flex items-center gap-1.5 transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL'}
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Passo a passo rápido:
              <br />
              1. Acesse o painel do seu projeto no Supabase (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a>).
              <br />
              2. No menu lateral, clique em <strong>SQL Editor</strong> &gt; <strong>New Query</strong>.
              <br />
              3. Cole o código copiado e clique no botão verde <strong>RUN</strong>.
            </p>

            <button
              onClick={() => setShowSqlPreview(!showSqlPreview)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline"
            >
              {showSqlPreview ? 'Ocultar código SQL' : 'Visualizar código SQL'}
            </button>

            {showSqlPreview && (
              <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-lg text-xs font-mono overflow-x-auto max-h-48 scrollbar-thin">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg shadow-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
