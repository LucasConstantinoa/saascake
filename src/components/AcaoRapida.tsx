/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Insumo, Produto, Venda, IngredienteReceita } from '../types';
import { 
  Zap, 
  X, 
  ShoppingCart, 
  Layers, 
  Package, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AcaoRapidaProps {
  insumos: Insumo[];
  produtos: Produto[];
  onAddVenda: (venda: Venda, baixarEstoque: boolean) => void;
  onAddInsumo: (insumo: Insumo) => void;
  onUpdateEstoque: (id: string, novoEstoque: number) => void;
}

type QuickTab = 'venda' | 'insumo' | 'estoque';

export default function AcaoRapida({
  insumos,
  produtos,
  onAddVenda,
  onAddInsumo,
  onUpdateEstoque,
}: AcaoRapidaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickTab>('venda');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- ESTADOS DO FORMULÁRIO DE Quick-Venda ---
  const [vendaProdutoId, setVendaProdutoId] = useState('');
  const [vendaQtd, setVendaQtd] = useState('1');
  const [vendaPreco, setVendaPreco] = useState('');
  const [vendaBaixarEstoque, setVendaBaixarEstoque] = useState(true);

  // --- ESTADOS DO FORMULÁRIO DE Quick-Insumo ---
  const [insumoNome, setInsumoNome] = useState('');
  const [insumoPreco, setInsumoPreco] = useState('');
  const [insumoQtd, setInsumoQtd] = useState('');
  const [insumoUnidade, setInsumoUnidade] = useState<'g' | 'kg' | 'ml' | 'L' | 'un' | 'pct'>('g');

  // --- ESTADOS DO FORMULÁRIO DE Quick-Estoque ---
  const [estProdutoId, setEstProdutoId] = useState('');
  const [estValor, setEstValor] = useState(0);

  // Prefiliar campos de venda ao selecionar produto
  useEffect(() => {
    if (vendaProdutoId) {
      const prodSelected = produtos.find(p => p.id === vendaProdutoId);
      if (prodSelected) {
        setVendaPreco(prodSelected.precoVenda.toString());
      }
    } else if (produtos.length > 0) {
      setVendaProdutoId(produtos[0].id);
      setVendaPreco(produtos[0].precoVenda.toString());
    }
  }, [vendaProdutoId, produtos]);

  // Prefiliar campos de alteração de estoque ao selecionar produto
  useEffect(() => {
    if (estProdutoId) {
      const prodSelected = produtos.find(p => p.id === estProdutoId);
      if (prodSelected) {
        setEstValor(prodSelected.estoqueAtual);
      }
    } else if (produtos.length > 0) {
      setEstProdutoId(produtos[0].id);
      setEstValor(produtos[0].estoqueAtual);
    }
  }, [estProdutoId, produtos]);

  // Mensagens autolimpantes de status
  const acionarStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  // --- SUBMISSÃO DA QUICK-VENDA ---
  const handleVendaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendaProdutoId || !vendaQtd || !vendaPreco) {
      acionarStatus('error', 'Preencha todos os campos!');
      return;
    }

    const prod = produtos.find(p => p.id === vendaProdutoId);
    if (!prod) {
      acionarStatus('error', 'Produto inválido!');
      return;
    }

    const qtd = parseInt(vendaQtd, 10);
    if (isNaN(qtd) || qtd <= 0) {
      acionarStatus('error', 'Quantidade deve ser maior que zero!');
      return;
    }

    // Verificar se há estoque para baixar caso esteja ativado
    if (vendaBaixarEstoque && prod.estoqueAtual < qtd) {
      acionarStatus('error', `Estoque insuficiente! Estoque atual: ${prod.estoqueAtual} un.`);
      return;
    }

    // Calcular custo total da receita para registrar histórico de lucro real
    const custoDoc = prod.ingredientes.reduce((total, ing) => {
      const ins = insumos.find((i) => i.id === ing.insumoId);
      if (!ins) return total;
      return total + (ins.custoUnitario * ing.quantidadeNecessaria);
    }, 0);

    const custoTotalPraticado = custoDoc * qtd;

    const novaVendaObj: Venda = {
      id: `venda-quick-${Date.now()}`,
      produtoId: vendaProdutoId,
      quantidade: qtd,
      precoPraticado: Math.max(0, Number(vendaPreco)),
      custoTotalPraticado,
      dataVenda: new Date().toISOString(),
    };

    onAddVenda(novaVendaObj, vendaBaixarEstoque);
    acionarStatus('success', 'Venda adicionada com sucesso!');
    
    // Limpar formulário de venda
    setVendaQtd('1');
  };

  // --- SUBMISSÃO DO QUICK-INSUMO ---
  const handleInsumoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoNome.trim() || !insumoPreco || !insumoQtd) {
      acionarStatus('error', 'Preencha todos os campos do insumo!');
      return;
    }

    const precoComp = Math.max(0, Number(insumoPreco));
    const qtdComp = Math.max(0.1, Number(insumoQtd));
    const custoUnit = precoComp / qtdComp;

    const novoInsumoObj: Insumo = {
      id: `insumo-quick-${Date.now()}`,
      nome: insumoNome.trim(),
      precoCompra: precoComp,
      quantidadeCompra: qtdComp,
      unidadeMedida: insumoUnidade,
      custoUnitario: custoUnit,
      dataCompra: new Date().toISOString()
    };

    onAddInsumo(novoInsumoObj);
    acionarStatus('success', 'Insumo cadastrado com sucesso!');

    // Limpar formulário de insumo
    setInsumoNome('');
    setInsumoPreco('');
    setInsumoQtd('');
  };

  // --- SUBMISSÃO DA QUICK-ESTOQUE ---
  const handleEstoqueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estProdutoId) {
      acionarStatus('error', 'Selecione um produto!');
      return;
    }

    onUpdateEstoque(estProdutoId, estValor);
    acionarStatus('success', 'Estoque atualizado com sucesso!');
  };

  return (
    <>
      {/* Barra de Atalhos Rápidos Persistente e Sempre Visível */}
      <div 
        id="quick-shortcuts-bar"
        className="absolute bottom-[92px] left-4 right-4 bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/5 py-2 px-3 rounded-2xl flex items-center justify-between gap-2 shadow-2xl z-45 select-none"
      >
        <button
          id="quick-sale-shortcut"
          onClick={() => {
            setActiveTab('venda');
            setIsOpen(true);
            setStatusMessage(null);
          }}
          className="flex-1 py-2 rounded-xl bg-black/40 hover:bg-black/65 text-white/95 active:scale-95 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/5 group"
        >
          <ShoppingCart className="w-4 h-4 text-[#0A84FF] group-hover:scale-110 transition-transform" />
          <span>+ Venda</span>
        </button>
        <button
          id="quick-insumo-shortcut"
          onClick={() => {
            setActiveTab('insumo');
            setIsOpen(true);
            setStatusMessage(null);
          }}
          className="flex-1 py-2 rounded-xl bg-black/40 hover:bg-black/65 text-white/95 active:scale-95 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/5 group"
        >
          <Layers className="w-4 h-4 text-[#30D158] group-hover:scale-110 transition-transform" />
          <span>+ Insumo</span>
        </button>
        <button
          id="quick-estoque-shortcut"
          onClick={() => {
            setActiveTab('estoque');
            setIsOpen(true);
            setStatusMessage(null);
          }}
          className="flex-1 py-2 rounded-xl bg-black/40 hover:bg-black/65 text-white/95 active:scale-95 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/5 group"
        >
          <Package className="w-4 h-4 text-[#FF9F0A] group-hover:scale-110 transition-transform" />
          <span>Estoques</span>
        </button>
      </div>

      {/* Sheet e Backdrop Animados */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop de Fundo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md z-50"
            />

            {/* Bottom Sheet Modal Ranhurado do iOS */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 max-h-[82%] bg-[#1C1C1E] border-t border-white/10 rounded-t-[32px] z-55 flex flex-col overflow-hidden text-white shadow-2xl pb-10"
            >
              {/* Alça de toque de fechamento estética */}
              <div 
                className="h-6 flex justify-center items-center shrink-0 cursor-pointer" 
                onClick={() => setIsOpen(false)}
              >
                <div className="w-12 h-1 bg-white/10 rounded-full" />
              </div>

              {/* Cabeçalho */}
              <div className="px-6 pb-4 border-b border-white/5 flex justify-between items-center shrink-0 select-none">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span className="p-1 rounded-lg bg-gradient-to-tr from-[#0a84ff] to-[#30d158] text-white">
                      <Zap className="w-4 h-4 fill-white text-white" />
                    </span>
                    Ações Rápidas
                  </h2>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">Lançamentos expressos</p>
                </div>

                <button
                  id="close-quick-action-sheet"
                  onClick={() => setIsOpen(false)}
                  className="p-1 px-2.5 rounded-full bg-black/40 text-[#8E8E93] hover:text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mensagem flutuante de Toast de Sucesso/Erro */}
              <AnimatePresence>
                {statusMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 select-none ${
                      statusMessage.type === 'success' 
                        ? 'bg-[#30D158]/15 border border-[#30D158]/20 text-[#30D158]' 
                        : 'bg-[#FF453A]/15 border border-[#FF453A]/20 text-[#FF453A]'
                    }`}
                  >
                    {statusMessage.type === 'success' ? (
                      <Check className="w-4 h-4 text-[#30D158] stroke-[3]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#FF453A]" />
                    )}
                    <span>{statusMessage.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* iOS Segmented Control Selector Tabs */}
              <div className="px-6 mt-4 shrink-0 select-none">
                <div className="bg-black p-1 rounded-xl flex items-center justify-between border border-white/5">
                  <button
                    onClick={() => {
                      setActiveTab('venda');
                      setStatusMessage(null);
                    }}
                    className={`flex-1 text-center py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-[10.5px] font-bold ${
                      activeTab === 'venda' ? 'bg-[#1C1C1E] text-[#0A84FF] shadow' : 'text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    + Venda
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('insumo');
                      setStatusMessage(null);
                    }}
                    className={`flex-1 text-center py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-[10.5px] font-bold ${
                      activeTab === 'insumo' ? 'bg-[#1C1C1E] text-[#30D158] shadow' : 'text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    + Insumo
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('estoque');
                      setStatusMessage(null);
                    }}
                    className={`flex-1 text-center py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-[10.5px] font-bold ${
                      activeTab === 'estoque' ? 'bg-[#1C1C1E] text-orange-400 shadow' : 'text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Estoques
                  </button>
                </div>
              </div>

              {/* Corpo de Formulário Com Scroll Interno */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none pb-12 select-none">
                <AnimatePresence mode="wait">
                  
                  {/* TAB 1: REGISTRAR NOVA VENDA RAPIDAMENTE */}
                  {activeTab === 'venda' && (
                    <motion.form
                      key="venda-form"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleVendaSubmit}
                      className="space-y-4"
                    >
                      {produtos.length === 0 ? (
                        <div className="text-center py-10 text-xs text-[#8E8E93]">
                          Adicione produtos na aba Estoque antes de registrar vendas.
                        </div>
                      ) : (
                        <>
                          {/* Selecionar Produto */}
                          <div>
                            <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Produto vendido</label>
                            <select
                              value={vendaProdutoId}
                              onChange={(e) => setVendaProdutoId(e.target.value)}
                              className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-[#0A84FF] font-semibold"
                            >
                              {produtos.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nome} (Estoque: {p.estoqueAtual} un)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            {/* Quantidade vendida */}
                            <div>
                              <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">unidades</label>
                              <input
                                type="number"
                                required
                                value={vendaQtd}
                                onChange={(e) => setVendaQtd(e.target.value)}
                                min="1"
                                placeholder="1"
                                className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF] text-white font-bold"
                              />
                            </div>

                            {/* Preço Unitário Praticado */}
                            <div>
                              <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Preço Unitário (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={vendaPreco}
                                onChange={(e) => setVendaPreco(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF] text-white font-semibold"
                              />
                            </div>
                          </div>

                          {/* Checkbox estoque automático */}
                          <div className="flex items-center gap-2.5 bg-black/45 p-3 rounded-xl border border-white/5">
                            <input
                              type="checkbox"
                              id="quick-sale-deductor"
                              checked={vendaBaixarEstoque}
                              onChange={(e) => setVendaBaixarEstoque(e.target.checked)}
                              className="w-4.5 h-4.5 rounded-md border-white/5 bg-black text-[#0A84FF] focus:ring-0"
                            />
                            <label htmlFor="quick-sale-deductor" className="text-xs text-zinc-300 font-semibold cursor-pointer select-none">
                              Atualizar estoque (deduzir do produto automaticamente)
                            </label>
                          </div>

                          {/* Resumo financeiro rápido */}
                          {(() => {
                            const pObj = produtos.find(p => p.id === vendaProdutoId);
                            if (!pObj) return null;
                            const totalRev = (Number(vendaQtd) || 0) * (Number(vendaPreco) || pObj.precoVenda);

                            return (
                              <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                                <span className="text-[#8E8E93]">Receita Total:</span>
                                <strong className="text-white text-sm">R$ {totalRev.toFixed(2)}</strong>
                              </div>
                            );
                          })()}

                          {/* Botão de Gravar */}
                          <button
                            type="submit"
                            className="w-full py-3 bg-[#0A84FF] hover:bg-opacity-95 font-bold text-xs text-white rounded-xl shadow-lg transition-colors cursor-pointer"
                          >
                            Registrar Transação expressa
                          </button>
                        </>
                      )}
                    </motion.form>
                  )}

                  {/* TAB 2: CADASTRAR NOVO INSUMO RAPIDAMENTE */}
                  {activeTab === 'insumo' && (
                    <motion.form
                      key="insumo-form"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleInsumoSubmit}
                      className="space-y-4"
                    >
                      {/* Nome do Insumo */}
                      <div>
                        <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Nome da matéria-prima</label>
                        <input
                          type="text"
                          required
                          value={insumoNome}
                          onChange={(e) => setInsumoNome(e.target.value)}
                          placeholder="Ex: Leite Integral"
                          className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#30D158] text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Preço de Compra por Embalagem */}
                        <div>
                          <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Preço Compra (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={insumoPreco}
                            onChange={(e) => setInsumoPreco(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#30D158] text-white font-bold"
                          />
                        </div>

                        {/* Quantidade na Embalagem */}
                        <div>
                          <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Quantidade Embalagem</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={insumoQtd}
                            onChange={(e) => setInsumoQtd(e.target.value)}
                            placeholder="Ex: 1000"
                            className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#30D158] text-white font-bold"
                          />
                        </div>
                      </div>

                      {/* Unidade de Medida */}
                      <div>
                        <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Unidade de Medida</label>
                        <select
                          value={insumoUnidade}
                          onChange={(e) => setInsumoUnidade(e.target.value as any)}
                          className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-[#30D158] font-semibold"
                        >
                          <option value="g">Gramas (g)</option>
                          <option value="kg">Quilos (kg)</option>
                          <option value="ml">Mililitros (ml)</option>
                          <option value="L">Litros (L)</option>
                          <option value="un">Unidade (un)</option>
                          <option value="pct">Pacote (pct)</option>
                        </select>
                      </div>

                      {/* Cálculo Automático de Custo Unitário */}
                      {Number(insumoPreco) > 0 && Number(insumoQtd) > 0 && (
                        <div className="bg-black/35 p-3 rounded-xl border border-white/5 text-[11px] text-[#8E8E93] text-center">
                          Custo calculado: <strong className="text-[#30D158]">R$ {(Number(insumoPreco) / Number(insumoQtd)).toFixed(4)}</strong> / {insumoUnidade}
                        </div>
                      )}

                      {/* Botão de Gravar */}
                      <button
                        type="submit"
                        className="w-full py-3 bg-[#30D158] hover:bg-opacity-95 font-bold text-xs text-white rounded-xl shadow-lg transition-colors cursor-pointer"
                      >
                        Salvar Lote de Insumo
                  </button>
                    </motion.form>
                  )}

                  {/* TAB 3: ALTERAR ESTOQUE RAPIDAMENTE COM CONTROLE/SLIDER */}
                  {activeTab === 'estoque' && (
                    <motion.form
                      key="estoque-form"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleEstoqueSubmit}
                      className="space-y-4"
                    >
                      {produtos.length === 0 ? (
                        <div className="text-center py-10 text-xs text-[#8E8E93]">
                          Cadastre produtos antes de ajustar estoques.
                        </div>
                      ) : (
                        <>
                          {/* Selecionar Produto */}
                          <div>
                            <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1">Selecionar Produto</label>
                            <select
                              value={estProdutoId}
                              onChange={(e) => setEstProdutoId(e.target.value)}
                              className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-orange-400 font-semibold"
                            >
                              {produtos.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nome} (Estoque: {p.estoqueAtual} un)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Seletor Ajustador Háptico Rápido (Stepper layout) */}
                          <div className="bg-black border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4">
                            <span className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">Ajuste de Unidades</span>
                            
                            <div className="flex items-center gap-6">
                              {/* Botão Menor */}
                              <button
                                type="button"
                                onClick={() => setEstValor(prev => Math.max(0, prev - 1))}
                                className="w-12 h-12 rounded-full bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                              >
                                <Minus className="w-5 h-5 stroke-[2.5]" />
                              </button>

                              {/* Valor */}
                              <div className="text-center w-24">
                                <span className="text-3xl font-extrabold text-white block">
                                  {estValor}
                                </span>
                                <span className="text-[9px] text-[#8E8E93] font-semibold uppercase tracking-wider block mt-1">unidades</span>
                              </div>

                              {/* Botão Maior */}
                              <button
                                type="button"
                                onClick={() => setEstValor(prev => prev + 1)}
                                className="w-12 h-12 rounded-full bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                              >
                                <Plus className="w-5 h-5 stroke-[2.5]" />
                              </button>
                            </div>

                            {/* Atalhos rápidos de volume */}
                            <div className="flex gap-2 w-full pt-2">
                              <button
                                type="button"
                                onClick={() => setEstValor(prev => Math.max(0, prev - 10))}
                                className="flex-1 py-1 px-2.5 rounded-lg bg-[#1C1C1E] border border-white/5 text-[10px] font-bold text-[#8E8E93] active:scale-95 transition-all text-center cursor-pointer"
                              >
                                - 10
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const baseProd = produtos.find(p => p.id === estProdutoId);
                                  if (baseProd) setEstValor(baseProd.estoqueAtual);
                                }}
                                className="flex-1 py-1 px-2.5 rounded-lg bg-[#1C1C1E] border border-white/5 text-[10px] font-bold text-white/40 active:scale-95 transition-all text-center cursor-pointer"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={() => setEstValor(prev => prev + 10)}
                                className="flex-1 py-1 px-2.5 rounded-lg bg-[#1C1C1E] border border-white/5 text-[10px] font-bold text-[#8E8E93] active:scale-95 transition-all text-center cursor-pointer"
                              >
                                + 10
                              </button>
                            </div>
                          </div>

                          {/* Botão de Gravar */}
                          <button
                            type="submit"
                            className="w-full py-3 bg-orange-500 hover:bg-opacity-95 font-bold text-xs text-white rounded-xl shadow-lg transition-colors cursor-pointer"
                          >
                            Salvar Alteração de Estoque
                          </button>
                        </>
                      )}
                    </motion.form>
                  )}

                </AnimatePresence>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
