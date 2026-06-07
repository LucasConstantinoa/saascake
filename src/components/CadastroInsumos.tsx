/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Insumo } from '../types';
import { Plus, Trash2, Edit3, X, CreditCard, LayoutGrid, Calendar, Droplets, ShoppingBasket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CadastroInsumosProps {
  insumos: Insumo[];
  onAddInsumo: (insumo: Insumo) => void;
  onEditInsumo: (insumo: Insumo) => void;
  onDeleteInsumo: (id: string) => void;
}

const UNIDADES_PRESSET = [
  { id: 'g', nome: 'Gramas (g)' },
  { id: 'kg', nome: 'Quilogramas (kg)' },
  { id: 'ml', nome: 'Mililitros (ml)' },
  { id: 'L', nome: 'Litros (L)' },
  { id: 'un', nome: 'Unidades (un)' },
  { id: 'pct', nome: 'Pacotes (pct)' },
];

export default function CadastroInsumos({
  insumos,
  onAddInsumo,
  onEditInsumo,
  onDeleteInsumo,
}: CadastroInsumosProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null);
  const [confirmingDeleteInsumo, setConfirmingDeleteInsumo] = useState(false);

  // States do formulário
  const [nome, setNome] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [quantidadeCompra, setQuantidadeCompra] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState<'g' | 'kg' | 'ml' | 'L' | 'un' | 'pct'>('g');

  // Abrir form de criação
  const abrirNovoForm = () => {
    setNome('');
    setPrecoCompra('25.00');
    setQuantidadeCompra('500');
    setUnidadeMedida('g');
    setEditingInsumoId(null);
    setConfirmingDeleteInsumo(false);
    setIsFormOpen(true);
  };

  // Abrir para edição
  const abrirEdicao = (ins: Insumo) => {
    setNome(ins.nome);
    setPrecoCompra(ins.precoCompra.toString());
    setQuantidadeCompra(ins.quantidadeCompra.toString());
    setUnidadeMedida(ins.unidadeMedida);
    setEditingInsumoId(ins.id);
    setConfirmingDeleteInsumo(false);
    setIsFormOpen(true);
  };

  // Submissão do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !precoCompra || !quantidadeCompra) return;

    const precoValue = Math.max(0.01, Number(precoCompra));
    const qtdValue = Math.max(0.01, Number(quantidadeCompra));
    const custoMin = precoValue / qtdValue;

    const dadosInsumo: Insumo = {
      id: editingInsumoId || `ins-${Date.now()}`,
      nome: nome.trim(),
      precoCompra: precoValue,
      quantidadeCompra: qtdValue,
      unidadeMedida,
      custoUnitario: custoMin,
      dataCompra: new Date().toISOString(),
    };

    if (editingInsumoId) {
      onEditInsumo(dadosInsumo);
    } else {
      onAddInsumo(dadosInsumo);
    }
    setIsFormOpen(false);
  };

  // Cálculo de sumário de investimentos globais nos insumos
  const investimentoTotalInsumos = insumos.reduce((acc, ins) => acc + ins.precoCompra, 0);

  return (
    <div className="px-5 pt-4 text-white pb-12 bg-black">
      {/* Título de seção e adição */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Insumos</h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">Gerenciador de custos de compras</p>
        </div>
        <button
          id="btn-add-novo-insumo"
          onClick={abrirNovoForm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A84FF] hover:opacity-95 font-semibold text-xs text-white shadow-lg transition-all duration-300 animate-none cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          Novo Insumo
        </button>
      </div>

      {/* Cartão de Resumo Financeiro Geral dos Insumos */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 mb-6 flex justify-between items-center select-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0A84FF]/10 text-[#0A84FF]">
            <ShoppingBasket className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">Investimento Total</span>
            <p className="text-xl font-bold text-[#30D158] tracking-tight mt-0.5">
              R$ {investimentoTotalInsumos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block">Estoque Insumos</span>
          <span className="text-xs font-bold text-[#0A84FF] block mt-0.5">
            {insumos.length} itens ativos
          </span>
        </div>
      </div>

      {/* Lista de Insumos cadastrados */}
      <h3 className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase mb-3.5">Matérias-Primas Ativas</h3>
      
      <div className="space-y-3">
        {insumos.length === 0 ? (
          <div className="py-12 text-center text-[#8E8E93] text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl bg-black">
            <Droplets className="w-8 h-8 text-zinc-800" />
            Nenhuma matéria-prima cadastrada.
          </div>
        ) : (
          insumos.map((ins) => {
            const dataFormatada = new Date(ins.dataCompra).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            });

            // Quantidade de compra por formato bonito
            return (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:opacity-95 transition-all"
              >
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight leading-none">
                    {ins.nome}
                  </h3>
                  
                  {/* Taxa unitária calculada */}
                  <p className="text-[11px] font-bold text-[#30D158] mt-1.5 flex items-center gap-1">
                    Custo Unitário: R$ {ins.custoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} por {ins.unidadeMedida}
                  </p>

                  <div className="flex gap-2.5 text-[10px] text-[#8E8E93] font-semibold tracking-wide uppercase mt-2.5">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-zinc-600" /> Compra: R$ {ins.precoCompra.toFixed(2)}
                    </span>
                    <span className="text-white/10">•</span>
                    <span className="flex items-center gap-1">
                      <LayoutGrid className="w-3 h-3 text-zinc-600" /> Pacote: {ins.quantidadeCompra} {ins.unidadeMedida}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-4.5 shrink-0 self-stretch">
                  {/* badge de data */}
                  <span className="text-[9px] font-bold text-[#8E8E93] bg-black p-1 px-2 rounded-lg flex items-center gap-1 uppercase select-none border border-white/5">
                    <Calendar className="w-2.5 h-2.5 text-[#0A84FF]" /> {dataFormatada}
                  </span>

                  <button
                    id={`btn-edit-ins-${ins.id}`}
                    onClick={() => abrirEdicao(ins)}
                    className="p-2 bg-black hover:bg-white/5 border border-white/10 text-[#8E8E93] hover:text-white rounded-xl transition-all cursor-pointer animate-none"
                    title="Editar compras/valores"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Slide Sheet Modal para Insumo no form bottom sheet iOS */}
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
              className="absolute bottom-0 left-0 right-0 h-[78%] bg-[#1C1C1E] border-t border-white/5 rounded-t-[32px] z-50 flex flex-col shadow-2xl overflow-hidden text-white"
            >
              {/* Barra central de toque */}
              <div className="h-6 flex justify-center items-center shrink-0 cursor-pointer" onClick={() => setIsFormOpen(false)}>
                <div className="w-12 h-1 bg-white/10 rounded-full" />
              </div>

              {/* Cabeçalho */}
              <div className="px-6 pb-4 border-b border-white/5 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingInsumoId ? 'Ajustar Insumo' : 'Adicionar Insumo'}
                </h2>
                <button
                  id="close-ins-sheet"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 px-2.5 rounded-full bg-black/40 text-[#8E8E93] hover:text-white border border-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-none pb-12 select-none">
                {/* Nome */}
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Nome do Insumo</label>
                  <input
                    id="form-ins-name"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Chocolate Belga 54%"
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>

                {/* Unidade de Medida */}
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Unidade de Medida base</label>
                  <select
                    id="form-ins-unit"
                    value={unidadeMedida}
                    onChange={(e) => setUnidadeMedida(e.target.value as any)}
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF] text-white"
                  >
                    {UNIDADES_PRESSET.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preco e Quantidade */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Valor da Compra (R$)</label>
                    <input
                      id="form-ins-price"
                      type="number"
                      step="0.01"
                      required
                      value={precoCompra}
                      onChange={(e) => setPrecoCompra(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Qtd. Adquirida</label>
                    <input
                      id="form-ins-qty"
                      type="number"
                      step="any"
                      required
                      value={quantidadeCompra}
                      onChange={(e) => setQuantidadeCompra(e.target.value)}
                      placeholder="Ex: 500 ou 1"
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>
                </div>

                {/* Amortização e cálculo de custo em tempo real */}
                {Number(precoCompra) > 0 && Number(quantidadeCompra) > 0 && (
                  <div className="bg-black border border-white/10 rounded-xl p-3.5">
                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block">Relação de Custo Unitário</span>
                    <p className="text-sm font-bold text-[#30D158] mt-1">
                      Você pagará R$ {(Number(precoCompra) / Number(quantidadeCompra)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} por cada 1 {unidadeMedida}.
                    </p>
                    <p className="text-[10px] text-[#8E8E93] mt-1">
                      Este valor unitário será empregado automaticamente para estipular custos de receitas.
                    </p>
                  </div>
                )}

                {/* Botões */}
                <div className="pt-4 flex gap-3 text-sm font-semibold">
                  {editingInsumoId && (
                    <>
                      {confirmingDeleteInsumo ? (
                        <div className="flex gap-1.5 bg-[#FF453A]/10 border border-[#FF453A]/25 p-2 rounded-xl items-center shrink-0">
                          <span className="text-[10px] text-red-400 font-bold px-1 uppercase">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteInsumo(editingInsumoId);
                              setConfirmingDeleteInsumo(false);
                              setIsFormOpen(false);
                            }}
                            className="bg-red-650 hover:bg-red-600 text-white text-[10.5px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteInsumo(false)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10.5px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="form-delete-ins-btn"
                          onClick={() => setConfirmingDeleteInsumo(true)}
                          className="bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20 font-bold flex px-4.5 py-3 rounded-xl hover:bg-[#FF453A]/20 items-center justify-center transition-colors shrink-0 cursor-pointer animate-none"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="submit"
                    id="form-submit-ins-btn"
                    className="flex-1 bg-[#0A84FF] hover:opacity-90 py-3 rounded-xl font-bold text-white transition-colors text-center shadow-lg cursor-pointer"
                  >
                    {editingInsumoId ? 'Salvar Matéria' : 'Registrar Compra'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
