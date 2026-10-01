export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'vale_refeicao' | 'fiado' | 'outro';

export type ProductCategory = 
  | 'Mercearia'
  | 'Hortifruti'
  | 'Açougue e Carnes'
  | 'Padaria e Confeitaria'
  | 'Bebidas'
  | 'Laticínios e Frios'
  | 'Limpeza'
  | 'Higiene e Perfumaria'
  | 'Congelados'
  | 'Snacks e Doces'
  | 'Outros';

export type UnitType = 'UN' | 'KG' | 'G' | 'LT' | 'ML' | 'PCT' | 'CX' | 'FD';

export interface Product {
  id: string;
  codigo_barras: string;
  nome: string;
  categoria: ProductCategory | string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: UnitType;
  validade?: string;
  fornecedor?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id?: string;
  venda_id?: string;
  produto_id: string;
  nome_produto: string;
  codigo_barras?: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo: number;
  subtotal: number;
  unidade?: string;
}

export interface Sale {
  id: string;
  numero_cupom: number;
  total: number;
  subtotal: number;
  desconto: number;
  forma_pagamento: PaymentMethod;
  valor_pago: number;
  troco: number;
  itens: SaleItem[];
  observacao?: string;
  status: 'concluida' | 'cancelada';
  created_at: string;
}

export interface StockMovement {
  id: string;
  produto_id: string;
  nome_produto: string;
  tipo: 'entrada' | 'saida_venda' | 'saida_perda' | 'ajuste';
  quantidade: number;
  estoque_anterior: number;
  estoque_novo: number;
  motivo?: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSync?: string;
}
