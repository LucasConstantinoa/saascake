/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Produto, Venda, Insumo } from '../types';
import { Plus, ShoppingCart, Trash2, Calendar, DollarSign, Wallet, ArrowUpRight, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoricoVendasProps {
  vendas: Venda[];
  produtos: Produto[];
  insumos: Insumo[];
  onAddVenda: (venda: Venda, baixarEstoque: boolean) => void;
  onDeleteVenda: (id: string) => void;
}

export default function HistoricoVendas({
  vendas,
  produtos,
  insumos,
  onAddVenda,
  onDeleteVenda,
}: HistoricoVendasProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmingDeleteVendaId, setConfirmingDeleteVendaId] = useState<string | null>(null);

  // States do formulário de venda
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [precoPersonalizado, setPrecoPersonalizado] = useState('');
  const [baixarEstoqueAutomatico, setBaixarEstoqueAutomatico] = useState(true);

  // Ao alterar o produto selecionado, carregar o preco padrão
  const handleProdutoChange = (id: string) => {
    setProdutoId(id);
    const prod = produtos.find((p) => p.id === id);
    if (prod) {
      setPrecoPersonalizado(prod.precoVenda.toString());
    } else {
      setPrecoPersonalizado('');
    }
  };

  // Abrir o formulário de vendas e resetar estados
  const abrirFormVenda = () => {
    if (produtos.length > 0) {
      setProdutoId(produtos[0].id);
      setPrecoPersonalizado(produtos[0].precoVenda.toString());
    } else {
      setProdutoId('');
      setPrecoPersonalizado('');
    }
    setQuantidade('1');
    setBaixarEstoqueAutomatico(true);
    setIsFormOpen(true);
  };

  // Calcular o custo real a partir da receita de um produto
  const calcularCustoReceitaProduto = (prod: Produto) => {
    return prod.ingredientes.reduce((total, item) => {
      const insumo = insumos.find((ins) => ins.id === item.insumoId);
      if (!insumo) return total;
      return total + (insumo.custoUnitario * (Number(item.quantidadeNecessaria) || 0));
    }, 0);
  };

  // Submeter nova venda
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId || !quantidade || !precoPersonalizado) return;

    const prodSelected = produtos.find((p) => p.id === produtoId);
    if (!prodSelected) return;

    const qtdNum = Math.max(1, parseInt(quantidade, 10));
    const precoVendaNum = Math.max(0, Number(precoPersonalizado));
    const custoIndividual = calcularCustoReceitaProduto(prodSelected);

    const novaVenda: Venda = {
      id: `venda-${Date.now()}`,
      produtoId,
      quantidade: qtdNum,
      precoPraticado: precoVendaNum,
      custoTotalPraticado: custoIndividual * qtdNum,
      dataVenda: new Date().toISOString(),
    };

    onAddVenda(novaVenda, baixarEstoqueAutomatico);
    setIsFormOpen(false);
  };

  // Totais globais de vendas registradas
  const faturamentoTotalVendas = vendas.reduce((acc, v) => acc + (v.precoPraticado * v.quantidade), 0);
  const lucroAcumuladoVendas = faturamentoTotalVendas - vendas.reduce((acc, v) => acc + (v.custoTotalPraticado || 0), 0);

  // Ordenar vendas por data decrescente (mais recente primeiro)
  const vendasOrdenadas = [...vendas].sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime());

  // Obter o nome do produto das vendas
  const obterNomeProduto = (id: string) => {
    const prod = produtos.find((p) => p.id === id);
    return prod ? prod.nome : 'Produto Deletado';
  };

  return (
    <div className="px-5 pt-4 text-white pb-12 bg-black">
      {/* Título de seção e adição */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vendas</h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">Histórico financeiro e recebíveis</p>
        </div>
        <button
          id="btn-add-nova-venda"
          onClick={abrirFormVenda}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#30D158] hover:opacity-95 font-semibold text-xs text-white shadow-lg transition-all duration-300 cursor-pointer animate-none"
          type="button"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          Registrar Venda
        </button>
      </div>

      {/* Cartões Financeiros Rápidos */}
      <div className="grid grid-cols-2 gap-3.5 mb-6 select-none">
        <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wide">Faturamento Geral</span>
          <div>
            <p className="text-xl font-extrabold text-white mt-1.5 truncate">
              R$ {faturamentoTotalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wide flex items-center gap-1">
            Lucro Histórico <ArrowUpRight className="w-3.5 h-3.5 text-[#30D158] shrink-0" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-[#30D158] mt-1.5 truncate">
              R$ {lucroAcumuladoVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Histórico Deslizante de Vendas */}
      <h3 className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase mb-3.5">Log de Transações</h3>

      <div className="space-y-3">
        {vendasOrdenadas.length === 0 ? (
          <div className="py-12 text-center text-[#8E8E93] text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl bg-black">
            <ShoppingCart className="w-8 h-8 text-zinc-850" />
            Nenhuma venda registrada na aplicação.
          </div>
        ) : (
          vendasOrdenadas.map((venda) => {
            const dataVendaFormatada = new Date(venda.dataVenda).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            const receitaVenda = venda.precoPraticado * venda.quantidade;
            const lucroVenda = receitaVenda - (venda.custoTotalPraticado || 0);
            const p = produtos.find((prod) => prod.id === venda.produtoId);

            return (
              <motion.div
                key={venda.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:opacity-95 transition-all"
                id={`sale-card-${venda.id}`}
              >
                <div className="max-w-[190px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: p?.corHex || '#a2a2a2' }}
                    />
                    <h4 className="font-bold text-[13px] text-white truncate max-w-[140px]">
                      {obterNomeProduto(venda.produtoId)}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#8E8E93] mt-1 font-semibold">
                    R$ {venda.precoPraticado.toFixed(2)} x {venda.quantidade} un. = R$ {receitaVenda.toFixed(2)}
                  </p>
                  <p className="text-[9.5px] text-[#8E8E93] flex items-center gap-1 uppercase tracking-wider font-semibold mt-1.5">
                    <Calendar className="w-3 h-3 text-[#0A84FF]" /> {dataVendaFormatada}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 self-stretch justify-between">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#30D158] block pb-0.5">
                      + R$ {lucroVenda.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-[#8E8E93] block font-semibold uppercase tracking-wider">
                      Lucro Líquido
                    </span>
                  </div>

                  {confirmingDeleteVendaId === venda.id ? (
                    <div className="flex items-center gap-1.5 select-none animate-fade-in self-end">
                      <button
                        onClick={() => {
                          onDeleteVenda(venda.id);
                          setConfirmingDeleteVendaId(null);
                        }}
                        className="text-[10px] font-bold text-white bg-red-600 border border-red-500 rounded-lg px-2 py-1.5 hover:bg-red-500 cursor-pointer transition-all active:scale-95 shrink-0"
                        title="Sim, estornar"
                      >
                        Estornar
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteVendaId(null)}
                        className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 border border-white/5 rounded-lg px-2 py-1.5 hover:text-white cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`btn-delete-sale-${venda.id}`}
                      onClick={() => {
                        setConfirmingDeleteVendaId(venda.id);
                      }}
                      className="text-[#8E8E93] hover:text-[#FF453A] p-1 bg-black border border-white/5 rounded-lg hover:border-white/10 transition-all cursor-pointer animate-none"
                      title="Excluir venda"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Slide Sheet Modal de Venda estilo iOS bottom helper */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 170 }}
              className="absolute bottom-0 left-0 right-0 h-[72%] bg-[#1C1C1E] border-t border-white/5 rounded-t-[32px] z-50 flex flex-col shadow-2xl overflow-hidden text-white"
            >
              {/* Alça de arraste */}
              <div className="h-6 flex justify-center items-center shrink-0 cursor-pointer" onClick={() => setIsFormOpen(false)}>
                <div className="w-12 h-1 bg-white/10 rounded-full" />
              </div>

              {/* Cabeçalho */}
              <div className="px-6 pb-4 border-b border-white/5 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Registrar Venda
                </h2>
                <button
                  id="close-sale-sheet"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 px-2.5 rounded-full bg-black/40 text-[#8E8E93] hover:text-white border border-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-none pb-12 select-none">
                {produtos.length === 0 ? (
                  <div className="py-6 text-center text-[#8E8E93] text-xs">
                    Adicione pelo menos um produto na aba "Estoque" para poder registrar uma venda.
                  </div>
                ) : (
                  <>
                    {/* Produto selector */}
                    <div>
                      <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Produto Vendido</label>
                      <select
                        id="form-sale-prod"
                        value={produtoId}
                        onChange={(e) => handleProdutoChange(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#0A84FF] font-semibold"
                        required
                      >
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} (Estoque: {p.estoqueAtual} un)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantidade e Preço unitário */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Quantidade de Venda</label>
                        <input
                          id="form-sale-qty"
                          type="number"
                          min="1"
                          required
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value)}
                          placeholder="1"
                          className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A84FF] font-bold text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Preço Unitário (R$)</label>
                        <input
                          id="form-sale-custom-price"
                          type="number"
                          step="0.01"
                          required
                          value={precoPersonalizado}
                          onChange={(e) => setPrecoPersonalizado(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A84FF] font-semibold text-white"
                        />
                      </div>
                    </div>

                    {/* Checkbox de Baixar Estoque Automaticamente */}
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                      <input
                        id="form-sale-stock-deduct"
                        type="checkbox"
                        checked={baixarEstoqueAutomatico}
                        onChange={(e) => setBaixarEstoqueAutomatico(e.target.checked)}
                        className="w-4.5 h-4.5 rounded-md border-white/5 bg-black text-[#0A84FF] focus:ring-0 focus:ring-offset-0"
                      />
                      <label htmlFor="form-sale-stock-deduct" className="text-xs text-zinc-300 font-semibold cursor-pointer select-none">
                        Deduzir quantidade vendida do estoque do produto automaticamente
                      </label>
                    </div>

                    {/* Resumo do faturamento e lucratividade simulados */}
                    {quantidade && precoPersonalizado && (() => {
                      const selProd = produtos.find((p) => p.id === produtoId);
                      if (!selProd) return null;

                      const custoUnit = calcularCustoReceitaProduto(selProd);
                      const faturamentoEst = Number(quantidade) * Number(precoPersonalizado);
                      const custoEstTotal = custoUnit * Number(quantidade);
                      const lucroEstTotal = faturamentoEst - custoEstTotal;
                      const roiEstVenda = custoEstTotal > 0 ? (lucroEstTotal / custoEstTotal) * 100 : 0;

                      return (
                        <div className="bg-black border border-white/10 rounded-2xl p-3.5 space-y-1.5 text-xs text-[#8E8E93] select-none">
                          <div className="flex justify-between font-medium">
                            <span>Faturamento Recebido:</span>
                            <span className="font-bold text-white">R$ {faturamentoEst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Custos das Matérias-Primas:</span>
                            <span className="font-bold text-[#FF453A]">R$ {custoEstTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-2 border-dashed text-zinc-300">
                            <strong>Lucro Líquido Real:</strong>
                            <strong className="text-[#30D158]">R$ {lucroEstTotal.toFixed(2)} ({roiEstVenda.toFixed(0)}% ROI)</strong>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Botões do formulário */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        id="form-submit-sale-btn"
                        className="w-full bg-[#30D158] hover:opacity-90 py-3 rounded-xl font-bold text-white transition-colors text-center shadow-lg cursor-pointer"
                      >
                        Confirmar Lançamento
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
