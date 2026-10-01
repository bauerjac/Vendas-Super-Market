import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'supermarket_supabase_url';
const STORAGE_KEY_KEY = 'supermarket_supabase_anon_key';

export const getStoredSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL) || envUrl;
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY) || envKey;

  return {
    url: storedUrl.trim(),
    anonKey: storedKey.trim(),
    hasCredentials: Boolean(storedUrl.trim() && storedKey.trim())
  };
};

export const saveStoredSupabaseConfig = (url: string, anonKey: string) => {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  _clientInstance = null; // Reset cached client
};

export const clearStoredSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  _clientInstance = null;
};

let _clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (_clientInstance) return _clientInstance;

  const { url, anonKey, hasCredentials } = getStoredSupabaseConfig();
  if (!hasCredentials) return null;

  try {
    _clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    return _clientInstance;
  } catch (error) {
    console.error('Erro ao instanciar cliente Supabase:', error);
    return null;
  }
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; tablesExist?: boolean }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL ou Chave Anon do Supabase não configuradas.' };
  }

  try {
    // Try querying the produtos table
    const { error } = await client.from('produtos').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        // relation does not exist
        return { 
          success: true, 
          tablesExist: false, 
          message: 'Conectado ao Supabase! Porém as tabelas ainda não foram criadas. Copie e execute o script SQL.' 
        };
      }
      return { success: false, message: `Erro de conexão: ${error.message}` };
    }

    return { 
      success: true, 
      tablesExist: true, 
      message: 'Conexão com o Supabase estabelecida com sucesso! Tabelas prontas.' 
    };
  } catch (err: any) {
    return { success: false, message: `Falha ao conectar: ${err?.message || 'Verifique sua URL e Chave'}` };
  }
};

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SUPERMARKET PRO - ESQUEMA DO BANCO DE DADOS SUPABASE
-- Copie e cole este código no SQL Editor do seu Supabase
-- e clique em "RUN" para criar as tabelas do sistema.
-- ========================================================

-- 1. TABELA DE PRODUTOS / ESTOQUE
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    preco_venda NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estoque_atual NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    estoque_minimo NUMERIC(12, 3) NOT NULL DEFAULT 5.000,
    unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
    validade DATE,
    fornecedor VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cupom BIGSERIAL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(50) NOT NULL,
    valor_pago NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    troco NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'concluida',
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE ITENS DA VENDA
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    nome_produto VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(100),
    quantidade NUMERIC(12, 3) NOT NULL,
    preco_unitario NUMERIC(12, 2) NOT NULL,
    preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (Histórico)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    nome_produto VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'entrada', 'saida_venda', 'saida_perda', 'ajuste'
    quantidade NUMERIC(12, 3) NOT NULL,
    estoque_anterior NUMERIC(12, 3) NOT NULL,
    estoque_novo NUMERIC(12, 3) NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON public.vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);

-- HABILITAR POLÍTICAS DE ACESSO (Permitir leitura e escrita para chaves anon/pública)
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total produtos" ON public.produtos;
CREATE POLICY "Acesso total produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total vendas" ON public.vendas;
CREATE POLICY "Acesso total vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total itens_venda" ON public.itens_venda;
CREATE POLICY "Acesso total itens_venda" ON public.itens_venda FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Acesso total movimentacoes" ON public.movimentacoes_estoque FOR ALL USING (true) WITH CHECK (true);
`;
