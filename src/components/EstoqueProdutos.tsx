/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Insumo, Produto, IngredienteReceita } from '../types';
import { Plus, Minus, Package, ChevronRight, Edit3, Trash2, Check, RefreshCw, X, CircleDecimal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EstoqueProdutosProps {
  produtos: Produto[];
  insumos: Insumo[];
  onAddProduto: (produto: Produto) => void;
  onEditProduto: (produto: Produto) => void;
  onDeleteProduto: (id: string) => void;
  onUpdateEstoque: (id: string, novoEstoque: number) => void;
}

const CORES_PRESETS = [
  { hex: '#FF9500', nome: 'Laranja' },
  { hex: '#FF3B30', nome: 'Vermelho' },
  { hex: '#34C759', nome: 'Verde' },
  { hex: '#007AFF', nome: 'Azul' },
  { hex: '#5856D6', nome: 'Roxo' },
  { hex: '#AF52DE', nome: 'Lilás' },
  { hex: '#FF2D55', nome: 'Rosa' },
  { hex: '#A2845E', nome: 'Caramelo' },
];

const CATEGORIAS_PADRAO = ['Doces', 'Salgados', 'Cafés', 'Bebidas', 'Almoço', 'Artesanal', 'Outros'];

export default function EstoqueProdutos({
  produtos,
  insumos,
  onAddProduto,
  onEditProduto,
  onDeleteProduto,
  onUpdateEstoque,
}: EstoqueProdutosProps) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProdutoId, setEditingProdutoId] = useState<string | null>(null);
  const [confirmingDeleteProd, setConfirmingDeleteProd] = useState(false);

  // States do formulário de produto
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [categoria, setCategoria] = useState('Doces');
  const [corHex, setCorHex] = useState('#FF9500');
  const [ingredientes, setIngredientes] = useState<IngredienteReceita[]>([]);

  // Filtros de busca
  const [busca, setBusca] = useState('');

  // Abrir modal de criação
  const abrirNovoForm = () => {
    setNome('');
    setDescricao('');
    setPrecoVenda('10.00');
    setEstoqueAtual('20');
    setEstoqueMinimo('5');
    setCategoria('Doces');
    setCorHex('#FF9500');
    setIngredientes([]);
    setEditingProdutoId(null);
    setConfirmingDeleteProd(false);
    setIsFormOpen(true);
  };

  // Abrir para edição
  const abrirEdicao = (p: Produto) => {
    setNome(p.nome);
    setDescricao(p.descricao || '');
    setPrecoVenda(p.precoVenda.toString());
    setEstoqueAtual(p.estoqueAtual.toString());
    setEstoqueMinimo(p.estoqueMinimo.toString());
    setCategoria(p.categoria);
    setCorHex(p.corHex || '#FF9500');
    setIngredientes([...p.ingredientes]);
    setEditingProdutoId(p.id);
    setConfirmingDeleteProd(false);
    setIsFormOpen(true);
  };

  // Funções para manipular a receita em tempo de criação
  const adicionarIngrediente = () => {
    if (insumos.length === 0) return;
    setIngredientes([
      ...ingredientes,
      { insumoId: insumos[0].id, quantidadeNecessaria: 0 },
    ]);
  };

  const removerIngrediente = (index: number) => {
    const novos = ingredientes.filter((_, i) => i !== index);
    setIngredientes(novos);
  };

  const atualizarIngrediente = (index: number, campo: keyof IngredienteReceita, valor: any) => {
    const novos = [...ingredientes];
    novos[index] = {
      ...novos[index],
      [campo]: valor,
    };
    setIngredientes(novos);
  };

  // Calcular o custo de fabricação estimado baseado nas fatias inseridas na receita
  const calcularCustoEstimado = (ing: IngredienteReceita[]) => {
    return ing.reduce((total, item) => {
      const insumo = insumos.find((ins) => ins.id === item.insumoId);
      if (!insumo) return total;
      return total + (insumo.custoUnitario * (Number(item.quantidadeNecessaria) || 0));
    }, 0);
  };

  const custoEstimadoForm = calcularCustoEstimado(ingredientes);
  const pVendaNum = Number(precoVenda) || 0;
  const margemLucroForm = pVendaNum - custoEstimadoForm;
  const roiEstimadoForm = custoEstimadoForm > 0 ? (margemLucroForm / custoEstimadoForm) * 100 : 0;

  // Submeter formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !precoVenda || !estoqueAtual || !estoqueMinimo) return;

    const dadosProduto: Produto = {
      id: editingProdutoId || `prod-${Date.now()}`,
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      precoVenda: Math.max(0, Number(precoVenda)),
      estoqueAtual: Math.max(0, parseInt(estoqueAtual, 10)),
      estoqueMinimo: Math.max(0, parseInt(estoqueMinimo, 10)),
      categoria,
      corHex,
      ingredientes: ingredientes.filter(i => i.quantidadeNecessaria > 0),
    };

    if (editingProdutoId) {
      onEditProduto(dadosProduto);
    } else {
      onAddProduto(dadosProduto);
    }
    setIsFormOpen(false);
  };

  // Filtragem dos produtos
  const produtosFiltrados = produtos.filter((p) => {
    const correspondeCategoria = categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva;
    const correspondeBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.descricao || '').toLowerCase().includes(busca.toLowerCase());
    return correspondeCategoria && correspondeBusca;
  });

  return (
    <div className="px-5 pt-4 text-white pb-12 bg-black">
      {/* Título de seção e adição */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Estoque</h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">Gerenciador de produtos e receitas</p>
        </div>
        <button
          id="btn-add-novo-produto"
          onClick={abrirNovoForm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A84FF] hover:opacity-95 font-semibold text-xs text-white shadow-lg transition-all duration-300 animate-none cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          Novo Produto
        </button>
      </div>

      {/* Caixa de Entrada de Busca iOS */}
      <div className="mb-4">
        <input
          id="product-search-input"
          type="text"
          placeholder="Buscar produto ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF]/20 transition-all"
        />
      </div>

      {/* Categorias - Carrossel Horizontal Deslizante */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-2 mask-horizontal select-none">
        <button
          id="cat-tab-todos"
          onClick={() => setCategoriaAtiva('Todos')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${
            categoriaAtiva === 'Todos'
              ? 'bg-white text-black shadow'
              : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white border border-white/5'
          }`}
        >
          Todos
        </button>
        {CATEGORIAS_PADRAO.map((cat) => (
          <button
            key={cat}
            id={`cat-tab-${cat}`}
            onClick={() => setCategoriaAtiva(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${
              categoriaAtiva === cat
                ? 'bg-white text-black shadow'
                : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Produtos */}
      <div className="space-y-3">
        {produtosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-[#8E8E93] text-xs flex flex-col items-center justify-center gap-2">
            <Package className="w-8 h-8 text-zinc-800" />
            Nenhum produto cadastrado nesta categoria.
          </div>
        ) : (
          produtosFiltrados.map((p) => {
            const custoReceita = calcularCustoEstimado(p.ingredientes);
            const lucroEstimado = p.precoVenda - custoReceita;
            const roiPercent = custoReceita > 0 ? (lucroEstimado / custoReceita) * 100 : 0;
            const isEstoqueBaixo = p.estoqueAtual <= p.estoqueMinimo;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden"
              >
                {/* Linha de Info Principal */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex gap-3">
                    {/* Indicador de cor à esquerda estilo etiqueta do iOS Calendar */}
                    <div
                      className="w-1.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: p.corHex || '#FF9500' }}
                    />
                    <div className="max-w-[190px]">
                      <h3 className="font-bold text-sm text-white tracking-tight truncate">
                        {p.nome}
                      </h3>
                      <p className="text-[10px] text-[#8E8E93] font-medium tracking-wide flex items-center gap-1.5 mt-0.5 uppercase">
                        {p.categoria}
                        <span className="text-white/20">•</span>
                        Venda: R$ {p.precoVenda.toFixed(2)}
                      </p>
                      {p.descricao && (
                        <p className="text-[11px] text-[#8E8E93] line-clamp-1 mt-1 leading-normal">
                          {p.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preco & ROI Indicador */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#30D158] block">
                      ROI: {roiPercent > 0 ? `+${roiPercent.toFixed(0)}%` : 'Sem custo'}
                    </span>
                    <span className="text-[10px] text-[#8E8E93] block mt-0.5 font-medium">
                      Custo: R$ {custoReceita.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Bloco de Gestão Estilo Interface de Ajuste Rápido iOS */}
                <div className="mt-4 pt-3.5 border-t border-white/5 flex justify-between items-center bg-black/50 -mx-4 -mb-4 px-4 pb-3">
                  {/* Seção Estoque Atual */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#8E8E93] font-semibold uppercase">Estoque</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                        isEstoqueBaixo
                          ? 'bg-[#FF453A]/10 text-[#FF453A] ring-1 ring-[#FF453A]/10'
                          : 'bg-black text-zinc-300'
                      }`}>
                        {p.estoqueAtual} unid.
                      </span>

                      {/* Notificação Visual Rígida de Alerta */}
                      {isEstoqueBaixo && (
                        <span className="w-1.5 h-1.5 bg-[#FF453A] rounded-full animate-ping" />
                      )}
                    </div>
                  </div>

                  {/* Botões de Alteração Rápida Estilo Controles do iOS Player */}
                  <div className="flex items-center gap-1 bg-black p-0.5 rounded-full border border-white/5">
                    <button
                      id={`btn-dec-stock-${p.id}`}
                      onClick={() => onUpdateEstoque(p.id, Math.max(0, p.estoqueAtual - 1))}
                      className="p-1 px-2.5 hover:bg-white/5 text-[#8E8E93] hover:text-white rounded-full transition-colors"
                      title="Diminuir estoque"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span className="text-[10px] text-white/5 font-bold px-1 select-none">|</span>
                    <button
                      id={`btn-inc-stock-${p.id}`}
                      onClick={() => onUpdateEstoque(p.id, p.estoqueAtual + 1)}
                      className="p-1 px-2.5 hover:bg-white/5 text-[#8E8E93] hover:text-white rounded-full transition-colors"
                      title="Aumentar estoque"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Edição Detalhada */}
                  <button
                    id={`btn-edit-prod-${p.id}`}
                    onClick={() => abrirEdicao(p)}
                    className="p-1.5 bg-black border border-white/5 text-[#8E8E93] hover:text-[#0A84FF] hover:border-[#0A84FF]/20 rounded-xl transition-all"
                    title="Editar produto e receita"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Slide Sheet Modal de Cadastro / Edição estilo iOS Bottom Sheet */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />

            {/* Bottom Sheet Animada */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 170 }}
              className="absolute bottom-0 left-0 right-0 h-[88%] bg-[#1C1C1E] border-t border-white/5 rounded-t-[32px] z-50 flex flex-col shadow-2xl overflow-hidden text-white"
            >
              {/* Barra de Toque superior do Bottom Sheet */}
              <div className="h-6 flex justify-center items-center shrink-0 cursor-pointer" onClick={() => setIsFormOpen(false)}>
                <div className="w-12 h-1 bg-white/10 rounded-full" />
              </div>

              {/* Cabeçalho do Bottom Sheet */}
              <div className="px-6 pb-4 border-b border-white/5 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingProdutoId ? 'Ajustar Produto' : 'Adicionar Produto'}
                </h2>
                <button
                  id="close-sheet-btn"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 px-2.5 rounded-full bg-black/40 text-[#8E8E93] hover:text-white border border-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário com Scroll Interno */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-none pb-12">
                {/* Nome */}
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Nome do Produto</label>
                  <input
                    id="form-prod-name"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Torta de Limão Gourmet"
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>

                {/* Descrição e Categoria */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Categoria</label>
                    <select
                      id="form-prod-cat"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF] text-white"
                    >
                      {CATEGORIAS_PADRAO.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Preço Venda (R$)</label>
                    <input
                      id="form-prod-price"
                      type="number"
                      step="0.01"
                      required
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>
                </div>

                {/* Descrição Longa */}
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Descrição Curta (Opcional)</label>
                  <input
                    id="form-prod-desc"
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Base crocante com ganache de cacau."
                    className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>

                {/* Estoques */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Estoque Atual</label>
                    <input
                      id="form-prod-stock"
                      type="number"
                      required
                      value={estoqueAtual}
                      onChange={(e) => setEstoqueAtual(e.target.value)}
                      placeholder="20"
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Estoque Mínimo</label>
                    <input
                      id="form-prod-min"
                      type="number"
                      required
                      value={estoqueMinimo}
                      onChange={(e) => setEstoqueMinimo(e.target.value)}
                      placeholder="5"
                      className="w-full bg-black border border-white/5 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>
                </div>

                {/* Cores iOS Presets */}
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide block mb-2">Cor de Destaque (Aparência)</label>
                  <div className="flex flex-wrap gap-2">
                    {CORES_PRESETS.map((cor) => (
                      <button
                        type="button"
                        key={cor.hex}
                        id={`btn-preset-color-${cor.hex}`}
                        onClick={() => setCorHex(cor.hex)}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          corHex === cor.hex
                            ? 'scale-110 ring-2 ring-white border-zinc-950'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: cor.hex }}
                        title={cor.nome}
                      />
                    ))}
                  </div>
                </div>

                {/* Seção Receita e Composição */}
                <div className="pt-3 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2.5">
                    <div>
                      <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Montar Receita / Custos</h3>
                      <p className="text-[10px] text-[#8E8E93]">Vincule insumos para cálculo automático de margem e ROI.</p>
                    </div>
                    <button
                      type="button"
                      id="form-add-ingredient"
                      onClick={adicionarIngrediente}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#0A84FF] hover:opacity-90 bg-[#0A84FF]/10 py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Insumo
                    </button>
                  </div>

                  {insumos.length === 0 ? (
                    <div className="bg-black text-center p-4 rounded-xl text-xs text-[#8E8E93] border border-dashed border-white/10">
                      Nenhum insumo cadastrado na base. Cadastre os insumos primeiro para agregá-los à receita!
                    </div>
                  ) : ingredientes.length === 0 ? (
                    <div className="bg-black text-center p-4 rounded-xl text-xs text-[#8E8E93] border border-white/5">
                      Esta receita está sem insumos associados. Custo de produção considerado zero.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ingredientes.map((ing, idx) => {
                        const insumoAtual = insumos.find((i) => i.id === ing.insumoId);
                        const custoCalculadoItem = insumoAtual
                          ? insumoAtual.custoUnitario * (Number(ing.quantidadeNecessaria) || 0)
                          : 0;

                        return (
                          <div key={idx} className="flex gap-2 items-center bg-black border border-white/5 p-2.5 rounded-xl">
                            {/* Insumo selector */}
                            <select
                              id={`ing-select-${idx}`}
                              value={ing.insumoId}
                              onChange={(e) => atualizarIngrediente(idx, 'insumoId', e.target.value)}
                              className="bg-black text-base sm:text-xs rounded-lg px-2 py-1.5 border border-white/5 focus:outline-none flex-1 font-semibold text-white"
                            >
                              {insumos.map((ins) => (
                                <option key={ins.id} value={ins.id}>
                                  {ins.nome} ({ins.unidadeMedida})
                                </option>
                              ))}
                            </select>

                            {/* Quantidade Requerida de Uso */}
                            <div className="w-24 relative flex items-center">
                              <input
                                id={`ing-qty-${idx}`}
                                type="number"
                                step="any"
                                required
                                value={ing.quantidadeNecessaria || ''}
                                onChange={(e) => atualizarIngrediente(idx, 'quantidadeNecessaria', Number(e.target.value))}
                                placeholder="Fatia"
                                className="bg-black border border-white/5 text-base sm:text-xs rounded-lg pl-2 pr-7 py-1.5 focus:outline-none w-full font-bold text-center text-white"
                              />
                              <span className="absolute right-2 text-[10px] text-[#8E8E93] font-bold uppercase select-none">
                                {insumoAtual?.unidadeMedida || ''}
                              </span>
                            </div>

                            {/* Preço de Cálculo */}
                            <div className="w-16 text-center text-xs text-white font-bold block shrink-0">
                              R$ {custoCalculadoItem.toFixed(2)}
                            </div>

                            {/* Excluir Insumo da Receita */}
                            <button
                              type="button"
                              id={`ing-delete-${idx}`}
                              onClick={() => removerIngrediente(idx)}
                              className="text-[#8E8E93] hover:text-[#FF453A] p-1.5 transition-colors shrink-0 cursor-pointer animate-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sumário Financeiro Estimado en tempo real */}
                <div className="bg-black border border-white/10 rounded-2xl p-4 space-y-2 mt-4 select-none">
                  <h4 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2.5">Projeção de Margens do Produto</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8E8E93] font-medium">Preço Final de Venda</span>
                    <span className="font-bold text-white">R$ {pVendaNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8E8E93] font-medium">Custo Estimado da Receita</span>
                    <span className="font-bold text-[#FF453A]">R$ {custoEstimadoForm.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2 border-dashed">
                    <span className="text-zinc-300 font-semibold">Lucro Estimado por Venda</span>
                    <span className="font-extrabold text-[#30D158]">R$ {margemLucroForm.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-semibold">Projeção sobre o Custo (ROI)</span>
                    <span className="font-extrabold text-[#0A84FF]">
                      {roiEstimadoForm > 0 ? `+${roiEstimadoForm.toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>

                {/* Botões do Formulário */}
                <div className="pt-4 flex gap-3 text-sm font-semibold">
                  {editingProdutoId && (
                    <>
                      {confirmingDeleteProd ? (
                        <div className="flex gap-1.5 bg-[#FF453A]/10 border border-[#FF453A]/25 p-2 rounded-xl items-center shrink-0">
                          <span className="text-[10px] text-red-400 font-bold px-1 uppercase">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteProduto(editingProdutoId);
                              setConfirmingDeleteProd(false);
                              setIsFormOpen(false);
                            }}
                            className="bg-red-650 hover:bg-red-600 text-white text-[10.5px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteProd(false)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10.5px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="form-delete-prod-btn"
                          onClick={() => setConfirmingDeleteProd(true)}
                          className="bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20 font-bold flex px-4.5 py-3 rounded-xl hover:bg-[#FF453A]/20 items-center justify-center transition-colors shrink-0 cursor-pointer animate-none"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="submit"
                    id="form-submit-prod-btn"
                    className="flex-1 bg-[#0A84FF] hover:opacity-90 py-3 rounded-xl font-bold text-white transition-colors text-center shadow-lg cursor-pointer"
                  >
                    {editingProdutoId ? 'Salvar Edições' : 'Confirmar Produto'}
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
