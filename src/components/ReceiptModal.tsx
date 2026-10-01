import React from 'react';
import { Printer, Check, X } from 'lucide-react';
import { Sale } from '../types';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Top Actions (hidden on print) */}
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Comprovante de Venda</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
              #{sale.numero_cupom.toString().padStart(6, '0')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Paper */}
        <div 
          id="printable-receipt" 
          className="p-6 bg-slate-50 font-mono text-xs text-slate-800 space-y-3.5 print:bg-white print:p-0 print:text-black"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
            <h1 className="font-extrabold text-base tracking-wider uppercase text-slate-900">
              SUPERMARKET PRO
            </h1>
            <p className="text-[10px] text-slate-500 uppercase">Comprovante de Venda Não Fiscal</p>
            <p className="text-[10px] text-slate-500">Sistema de Gestão &amp; PDV Integrado</p>
            <p className="text-[11px] font-bold text-slate-700">
              CUPOM Nº {sale.numero_cupom.toString().padStart(6, '0')}
            </p>
            <p className="text-[10px] text-slate-500">{formatDate(sale.created_at)}</p>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between font-bold text-[11px] text-slate-700 border-b border-slate-200 pb-1">
              <span>ITEM / DESCRIÇÃO</span>
              <span>TOTAL</span>
            </div>

            {sale.itens.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span className="truncate max-w-[200px]">
                    {idx + 1}. {item.nome_produto}
                  </span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                <div className="text-[10px] text-slate-500 pl-3">
                  {item.quantidade} {item.unidade || 'UN'} x {formatCurrency(item.preco_unitario)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 font-semibold">
            <div className="flex justify-between text-slate-600">
              <span>Qtd Total de Itens:</span>
              <span>{sale.itens.reduce((acc, it) => acc + it.quantidade, 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.desconto > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Desconto Aplicado:</span>
                <span>- {formatCurrency(sale.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
              <span>TOTAL A PAGAR:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-slate-700">
            <div className="flex justify-between">
              <span>Forma de Pagamento:</span>
              <span className="font-bold">{paymentLabels[sale.forma_pagamento] || sale.forma_pagamento}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor Recebido:</span>
              <span>{formatCurrency(sale.valor_pago)}</span>
            </div>
            {sale.troco > 0 && (
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Troco:</span>
                <span>{formatCurrency(sale.troco)}</span>
              </div>
            )}
          </div>

          {/* Barcode Simulation & Footer */}
          <div className="text-center pt-2 space-y-2">
            <div className="inline-block py-1 tracking-widest text-[9px] font-mono border-t border-b border-slate-300 px-4">
              ||| | |||| || ||||| |||| | ||| ||||||| |
            </div>
            <p className="text-[9px] text-slate-400">Obrigado pela preferência! Volte Sempre.</p>
          </div>
        </div>

        {/* Modal Bottom Actions (hidden on print) */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cupom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
