import { Product, Sale, SaleItem, StockMovement } from '../types';
import { getSupabaseClient } from './supabaseClient';

const STORAGE_KEY_PRODUCTS = 'supermarket_products_v1';
const STORAGE_KEY_SALES = 'supermarket_sales_v1';
const STORAGE_KEY_MOVEMENTS = 'supermarket_movements_v1';

// Generate consistent unique UUID or ID
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
};

// Local storage helpers - Starts completely EMPTY (no mock data)
export const getLocalProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setLocalProducts = (products: Product[]) => {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
};

export const getLocalSales = (): Sale[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setLocalSales = (sales: Sale[]) => {
  localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
};

export const getLocalMovements = (): StockMovement[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setLocalMovements = (movements: StockMovement[]) => {
  localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
};

// Product Operations
export const fetchProducts = async (): Promise<{ products: Product[]; source: 'supabase' | 'local' }> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (!error && data) {
        const formatted: Product[] = data.map((item: any) => ({
          id: item.id,
          codigo_barras: item.codigo_barras,
          nome: item.nome,
          categoria: item.categoria,
          preco_custo: Number(item.preco_custo) || 0,
          preco_venda: Number(item.preco_venda) || 0,
          estoque_atual: Number(item.estoque_atual) || 0,
          estoque_minimo: Number(item.estoque_minimo) || 0,
          unidade: item.unidade || 'UN',
          validade: item.validade || undefined,
          fornecedor: item.fornecedor || undefined,
          observacoes: item.observacoes || undefined,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        }));
        setLocalProducts(formatted); // Sync local mirror
        return { products: formatted, source: 'supabase' };
      }
    } catch (e) {
      console.warn('Falha ao ler produtos do Supabase, usando local:', e);
    }
  }

  return { products: getLocalProducts(), source: 'local' };
};

export const saveProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Product> => {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const id = productData.id || generateId();

  const product: Product = {
    ...productData,
    id,
    created_at: now,
    updated_at: now,
  };

  // 1. Update local state
  const localList = getLocalProducts();
  const existingIndex = localList.findIndex((p) => p.id === id || p.codigo_barras === product.codigo_barras);
  let updatedList: Product[];

  if (existingIndex >= 0) {
    const existing = localList[existingIndex];
    product.id = existing.id;
    product.created_at = existing.created_at;
    updatedList = [...localList];
    updatedList[existingIndex] = product;
  } else {
    updatedList = [product, ...localList];
  }
  setLocalProducts(updatedList);

  // 2. Persist to Supabase if connected
  if (supabase) {
    try {
      const payload = {
        id: product.id,
        codigo_barras: product.codigo_barras,
        nome: product.nome,
        categoria: product.categoria,
        preco_custo: product.preco_custo,
        preco_venda: product.preco_venda,
        estoque_atual: product.estoque_atual,
        estoque_minimo: product.estoque_minimo,
        unidade: product.unidade,
        validade: product.validade || null,
        fornecedor: product.fornecedor || null,
        observacoes: product.observacoes || null,
        updated_at: now,
      };

      await supabase.from('produtos').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.error('Erro ao salvar produto no Supabase:', err);
    }
  }

  return product;
};

export const deleteProduct = async (productId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  // Remove locally
  const localList = getLocalProducts();
  setLocalProducts(localList.filter((p) => p.id !== productId));

  if (supabase) {
    try {
      await supabase.from('produtos').delete().eq('id', productId);
    } catch (err) {
      console.error('Erro ao deletar produto no Supabase:', err);
    }
  }
  return true;
};

// Stock Adjustment
export const adjustProductStock = async (
  productId: string,
  delta: number,
  tipo: 'entrada' | 'saida_perda' | 'ajuste',
  motivo?: string
): Promise<Product | null> => {
  const localList = getLocalProducts();
  const index = localList.findIndex((p) => p.id === productId);
  if (index === -1) return null;

  const target = localList[index];
  const anterior = target.estoque_atual;
  const novo = Math.max(0, tipo === 'entrada' ? anterior + delta : anterior - delta);

  target.estoque_atual = novo;
  target.updated_at = new Date().toISOString();
  localList[index] = target;
  setLocalProducts(localList);

  // Register movement
  const movement: StockMovement = {
    id: generateId(),
    produto_id: productId,
    nome_produto: target.nome,
    tipo,
    quantidade: delta,
    estoque_anterior: anterior,
    estoque_novo: novo,
    motivo: motivo || 'Ajuste manual de estoque',
    created_at: new Date().toISOString(),
  };

  const movements = [movement, ...getLocalMovements()];
  setLocalMovements(movements);

  // Sync to Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('produtos')
        .update({ estoque_atual: novo, updated_at: target.updated_at })
        .eq('id', productId);

      await supabase.from('movimentacoes_estoque').insert({
        id: movement.id,
        produto_id: movement.produto_id,
        nome_produto: movement.nome_produto,
        tipo: movement.tipo,
        quantidade: movement.quantidade,
        estoque_anterior: movement.estoque_anterior,
        estoque_novo: movement.estoque_novo,
        motivo: movement.motivo,
        created_at: movement.created_at,
      });
    } catch (e) {
      console.warn('Erro ao atualizar estoque no Supabase:', e);
    }
  }

  return target;
};

// Sales Operations
export const fetchSales = async (): Promise<{ sales: Sale[]; source: 'supabase' | 'local' }> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: salesData, error: salesErr } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!salesErr && salesData) {
        // Fetch all items
        const { data: itemsData } = await supabase.from('itens_venda').select('*');
        const itemsMap: Record<string, SaleItem[]> = {};

        if (itemsData) {
          itemsData.forEach((it: any) => {
            if (!itemsMap[it.venda_id]) itemsMap[it.venda_id] = [];
            itemsMap[it.venda_id].push({
              id: it.id,
              venda_id: it.venda_id,
              produto_id: it.produto_id,
              nome_produto: it.nome_produto,
              codigo_barras: it.codigo_barras,
              quantidade: Number(it.quantidade) || 0,
              preco_unitario: Number(it.preco_unitario) || 0,
              preco_custo: Number(it.preco_custo) || 0,
              subtotal: Number(it.subtotal) || 0,
              unidade: it.unidade || 'UN',
            });
          });
        }

        const formattedSales: Sale[] = salesData.map((s: any) => ({
          id: s.id,
          numero_cupom: Number(s.numero_cupom) || 1,
          total: Number(s.total) || 0,
          subtotal: Number(s.subtotal) || 0,
          desconto: Number(s.desconto) || 0,
          forma_pagamento: s.forma_pagamento,
          valor_pago: Number(s.valor_pago) || Number(s.total) || 0,
          troco: Number(s.troco) || 0,
          itens: itemsMap[s.id] || [],
          observacao: s.observacao || undefined,
          status: s.status || 'concluida',
          created_at: s.created_at,
        }));

        setLocalSales(formattedSales);
        return { sales: formattedSales, source: 'supabase' };
      }
    } catch (e) {
      console.warn('Falha ao buscar vendas do Supabase, usando local:', e);
    }
  }

  return { sales: getLocalSales(), source: 'local' };
};

export const createSale = async (saleInput: {
  itens: SaleItem[];
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: any;
  valor_pago: number;
  troco: number;
  observacao?: string;
}): Promise<Sale> => {
  const now = new Date().toISOString();
  const saleId = generateId();
  const currentSales = getLocalSales();
  const nextCupom = currentSales.length > 0 ? Math.max(...currentSales.map((s) => s.numero_cupom || 0)) + 1 : 1;

  const sale: Sale = {
    id: saleId,
    numero_cupom: nextCupom,
    subtotal: saleInput.subtotal,
    desconto: saleInput.desconto,
    total: saleInput.total,
    forma_pagamento: saleInput.forma_pagamento,
    valor_pago: saleInput.valor_pago,
    troco: saleInput.troco,
    itens: saleInput.itens.map((it) => ({ ...it, id: generateId(), venda_id: saleId })),
    observacao: saleInput.observacao,
    status: 'concluida',
    created_at: now,
  };

  // 1. Save sale locally
  setLocalSales([sale, ...currentSales]);

  // 2. Deduct product inventory locally & create movements
  const products = getLocalProducts();
  const movements = getLocalMovements();

  for (const item of sale.itens) {
    const pIndex = products.findIndex((p) => p.id === item.produto_id);
    if (pIndex >= 0) {
      const prev = products[pIndex].estoque_atual;
      const nextStock = Math.max(0, prev - item.quantidade);
      products[pIndex].estoque_atual = nextStock;
      products[pIndex].updated_at = now;

      movements.unshift({
        id: generateId(),
        produto_id: item.produto_id,
        nome_produto: item.nome_produto,
        tipo: 'saida_venda',
        quantidade: item.quantidade,
        estoque_anterior: prev,
        estoque_novo: nextStock,
        motivo: `Venda Cupom #${sale.numero_cupom}`,
        created_at: now,
      });
    }
  }
  setLocalProducts(products);
  setLocalMovements(movements);

  // 3. Persist to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Insert sale record
      await supabase.from('vendas').insert({
        id: sale.id,
        numero_cupom: sale.numero_cupom,
        subtotal: sale.subtotal,
        desconto: sale.desconto,
        total: sale.total,
        forma_pagamento: sale.forma_pagamento,
        valor_pago: sale.valor_pago,
        troco: sale.troco,
        status: sale.status,
        observacao: sale.observacao || null,
        created_at: sale.created_at,
      });

      // Insert sale items
      if (sale.itens.length > 0) {
        const itemsPayload = sale.itens.map((it) => ({
          id: it.id,
          venda_id: sale.id,
          produto_id: it.produto_id,
          nome_produto: it.nome_produto,
          codigo_barras: it.codigo_barras || null,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          preco_custo: it.preco_custo,
          subtotal: it.subtotal,
          unidade: it.unidade || 'UN',
          created_at: sale.created_at,
        }));
        await supabase.from('itens_venda').insert(itemsPayload);
      }

      // Update product stocks in Supabase
      for (const item of sale.itens) {
        const updatedProduct = products.find((p) => p.id === item.produto_id);
        if (updatedProduct) {
          await supabase
            .from('produtos')
            .update({ estoque_atual: updatedProduct.estoque_atual, updated_at: now })
            .eq('id', item.produto_id);
        }
      }
    } catch (e) {
      console.error('Erro ao sincronizar venda com Supabase:', e);
    }
  }

  return sale;
};

export const cancelSale = async (saleId: string): Promise<boolean> => {
  const sales = getLocalSales();
  const saleIndex = sales.findIndex((s) => s.id === saleId);
  if (saleIndex === -1) return false;

  const targetSale = sales[saleIndex];
  if (targetSale.status === 'cancelada') return false;

  targetSale.status = 'cancelada';
  sales[saleIndex] = targetSale;
  setLocalSales(sales);

  // Restore inventory
  const products = getLocalProducts();
  const movements = getLocalMovements();
  const now = new Date().toISOString();

  for (const item of targetSale.itens) {
    const pIndex = products.findIndex((p) => p.id === item.produto_id);
    if (pIndex >= 0) {
      const prev = products[pIndex].estoque_atual;
      const nextStock = prev + item.quantidade;
      products[pIndex].estoque_atual = nextStock;
      products[pIndex].updated_at = now;

      movements.unshift({
        id: generateId(),
        produto_id: item.produto_id,
        nome_produto: item.nome_produto,
        tipo: 'entrada',
        quantidade: item.quantidade,
        estoque_anterior: prev,
        estoque_novo: nextStock,
        motivo: `Estorno de Venda Cupom #${targetSale.numero_cupom}`,
        created_at: now,
      });
    }
  }
  setLocalProducts(products);
  setLocalMovements(movements);

  // Supabase sync
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', saleId);
      for (const item of targetSale.itens) {
        const updatedProd = products.find((p) => p.id === item.produto_id);
        if (updatedProd) {
          await supabase
            .from('produtos')
            .update({ estoque_atual: updatedProd.estoque_atual, updated_at: now })
            .eq('id', item.produto_id);
        }
      }
    } catch (e) {
      console.warn('Erro ao cancelar venda no Supabase:', e);
    }
  }

  return true;
};

// Batch sync local data to Supabase (e.g., when user connects after creating items)
export const syncAllLocalToSupabase = async (): Promise<{ success: boolean; message: string; count: number }> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase não está configurado.', count: 0 };
  }

  try {
    const localProducts = getLocalProducts();
    const localSales = getLocalSales();
    let count = 0;

    if (localProducts.length > 0) {
      const payloadProds = localProducts.map((p) => ({
        id: p.id,
        codigo_barras: p.codigo_barras,
        nome: p.nome,
        categoria: p.categoria,
        preco_custo: p.preco_custo,
        preco_venda: p.preco_venda,
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo,
        unidade: p.unidade,
        validade: p.validade || null,
        fornecedor: p.fornecedor || null,
        observacoes: p.observacoes || null,
        updated_at: p.updated_at || new Date().toISOString(),
      }));

      const { error: pErr } = await supabase.from('produtos').upsert(payloadProds, { onConflict: 'id' });
      if (pErr) throw pErr;
      count += localProducts.length;
    }

    if (localSales.length > 0) {
      for (const s of localSales) {
        await supabase.from('vendas').upsert({
          id: s.id,
          numero_cupom: s.numero_cupom,
          subtotal: s.subtotal,
          desconto: s.desconto,
          total: s.total,
          forma_pagamento: s.forma_pagamento,
          valor_pago: s.valor_pago,
          troco: s.troco,
          status: s.status,
          observacao: s.observacao || null,
          created_at: s.created_at,
        }, { onConflict: 'id' });

        if (s.itens && s.itens.length > 0) {
          const itemsPayload = s.itens.map((it) => ({
            id: it.id || generateId(),
            venda_id: s.id,
            produto_id: it.produto_id,
            nome_produto: it.nome_produto,
            codigo_barras: it.codigo_barras || null,
            quantidade: it.quantidade,
            preco_unitario: it.preco_unitario,
            preco_custo: it.preco_custo,
            subtotal: it.subtotal,
            unidade: it.unidade || 'UN',
            created_at: s.created_at,
          }));
          await supabase.from('itens_venda').upsert(itemsPayload, { onConflict: 'id' });
        }
      }
      count += localSales.length;
    }

    return { 
      success: true, 
      message: `${count} registros sincronizados com o Supabase com sucesso!`, 
      count 
    };
  } catch (err: any) {
    return { success: false, message: `Erro na sincronização: ${err.message}`, count: 0 };
  }
};
