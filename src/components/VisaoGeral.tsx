/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Insumo, Produto, Venda } from '../types';
import { TrendingUp, ArrowUpRight, DollarSign, PieChart, AlertTriangle, Edit2, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VisaoGeralProps {
  insumos: Insumo[];
  produtos: Produto[];
  vendas: Venda[];
  setActiveTab: (tab: string) => void;
  businessName: string;
  setBusinessName: (name: string) => void;
  onResetData: () => void;
}

export default function VisaoGeral({
  insumos,
  produtos,
  vendas,
  setActiveTab,
  businessName,
  setBusinessName,
  onResetData,
}: VisaoGeralProps) {
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'total'>('semana');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(businessName);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Filtrar as vendas de acordo com o período selecionado
  const obterVendasFiltradas = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return vendas.filter((venda) => {
      const dataV = new Date(venda.dataVenda);
      const diffTime = hoje.getTime() - dataV.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (periodo === 'hoje') {
        const dataVendaDia = new Date(venda.dataVenda);
        return (
          dataVendaDia.getDate() === new Date().getDate() &&
          dataVendaDia.getMonth() === new Date().getMonth() &&
          dataVendaDia.getFullYear() === new Date().getFullYear()
        );
      } else if (periodo === 'semana') {
        return diffDays <= 7;
      } else if (periodo === 'mes') {
        return diffDays <= 30;
      }
      return true; // total
    });
  };

  const vendasFiltradas = obterVendasFiltradas();

  // Calcular métricas financeiras básicas
  const faturamento = vendasFiltradas.reduce((acc, v) => acc + v.precoPraticado * v.quantidade, 0);
  const custoTotal = vendasFiltradas.reduce((acc, v) => acc + (v.custoTotalPraticado || 0), 0);
  const lucroLiquido = faturamento - custoTotal;
  const margemPreco = faturamento > 0 ? (lucroLiquido / faturamento) * 100 : 0;
  const roiMedio = custoTotal > 0 ? (lucroLiquido / custoTotal) * 100 : 0;

  // Produtos com estoque baixo
  const produtosAlertaEstoque = produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo);

  // Obter o ROI por produto
  const rankingProdutos = produtos.map((p) => {
    const vendasProd = vendasFiltradas.filter((v) => v.produtoId === p.id);
    const qtdVendida = vendasProd.reduce((acc, v) => acc + v.quantidade, 0);
    const faturamentoProd = vendasProd.reduce((acc, v) => acc + v.precoPraticado * v.quantidade, 0);
    const custoProd = vendasProd.reduce((acc, v) => acc + (v.custoTotalPraticado || 0), 0);
    const lucroProd = faturamentoProd - custoProd;
    const roiProd = custoProd > 0 ? (lucroProd / custoProd) * 100 : 0;

    return {
      produto: p,
      quantidade: qtdVendida,
      faturamento: faturamentoProd,
      custo: custoProd,
      lucro: lucroProd,
      roi: roiProd,
    };
  }).filter((item) => item.quantidade > 0)
    .sort((a, b) => b.lucro - a.lucro);

  const salvarBusinessName = () => {
    if (tempName.trim()) {
      setBusinessName(tempName);
      setIsEditingName(false);
    }
  };

  // Montar dados para o mini gráfico de faturamento
  const gerarDadosGrafico = () => {
    const dias = periodo === 'hoje' ? 12 : periodo === 'semana' ? 7 : periodo === 'mes' ? 10 : 6;
    const labels: string[] = [];
    const valores: number[] = [];
    const custos: number[] = [];

    const hoje = new Date();

    if (periodo === 'hoje') {
      // Agrupar faturamento por blocos de 2 horas
      for (let i = 5; i >= 0; i--) {
        const hora = (hoje.getHours() - i * 2 + 24) % 24;
        labels.push(`${hora}h`);
        
        // Simular vendas ocorridas nas últimas horas distribuidamente
        const f = faturamento * (0.1 + (i % 3) * 0.15);
        valores.push(f);
        custos.push(custoTotal * (0.1 + (i % 3) * 0.15));
      }
    } else {
      // Agrupar por data das vendas
      for (let i = dias - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(hoje.getDate() - i * (periodo === 'mes' ? 3 : 1));
        const dataStr = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
        labels.push(dataStr);

        // Somar vendas desse trecho de dias
        const fAtDate = vendasFiltradas.filter((v) => {
          const vDate = new Date(v.dataVenda);
          if (periodo === 'mes') {
            const limiteAtras = new Date(d);
            limiteAtras.setDate(limiteAtras.getDate() - 3);
            return vDate <= d && vDate > limiteAtras;
          }
          return vDate.getDate() === d.getDate() && vDate.getMonth() === d.getMonth();
        });

        const fatDia = fAtDate.reduce((acc, v) => acc + v.precoPraticado * v.quantidade, 0);
        const custoDia = fAtDate.reduce((acc, v) => acc + (v.custoTotalPraticado || 0), 0);
        
        valores.push(fatDia);
        custos.push(custoDia);
      }
    }

    return { labels, valores, custos };
  };

  const { labels: chartLabels, valores: chartValores, custos: chartCustos } = gerarDadosGrafico();
  const maxVal = Math.max(...chartValores, 100);

  return (
    <div className="px-5 pt-4 text-white pb-12 select-none bg-black">
      {/* Cabeçalho Premium iOS */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full mr-2">
                <input
                  id="business-name-input"
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-[#1C1C1E] border border-white/5 rounded-lg px-2 py-0.5 text-[15px] font-semibold text-white focus:outline-none focus:border-[#0A84FF] w-full"
                  maxLength={25}
                  autoFocus
                />
                <button
                  id="save-name-btn"
                  onClick={salvarBusinessName}
                  className="bg-[#0A84FF] hover:opacity-90 p-1 rounded-lg text-white transition-colors animate-none"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <h2 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">
                  {businessName}
                </h2>
                <button
                  id="edit-name-btn"
                  onClick={() => {
                    setTempName(businessName);
                    setIsEditingName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#8E8E93] hover:text-[#0A84FF] transition-opacity p-1"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Visão Geral</h1>
        </div>

        {/* Reset / Demo Recarregar */}
        <div className="relative">
          {resetConfirm ? (
            <div className="absolute right-0 top-0 bg-[#1C1C1E] border border-white/10 rounded-xl p-3 shadow-xl z-50 flex flex-col gap-2 w-48 text-[12px]">
              <p className="text-zinc-300 text-center">Confirmar redefinição da base?</p>
              <div className="flex gap-1.5">
                <button
                  id="confirm-reset-btn"
                  onClick={() => {
                    onResetData();
                    setResetConfirm(false);
                  }}
                  className="flex-1 bg-[#FF453A] hover:opacity-90 py-1 rounded font-medium text-white transition-colors"
                >
                  Sim
                </button>
                <button
                  id="cancel-reset-btn"
                  onClick={() => setResetConfirm(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-1 rounded text-zinc-300"
                >
                  Não
                </button>
              </div>
            </div>
          ) : (
            <button
              id="reset-state-btn"
              onClick={() => setResetConfirm(true)}
              className="p-2.5 rounded-full bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white transition-colors flex items-center justify-center animate-none"
              title="Redefinir Dados para Demonstração"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Seletor Segmentado Estilo iOS */}
      <div className="bg-[#1C1C1E] p-1 rounded-xl flex mb-6 border border-white/5">
        {(['hoje', 'semana', 'mes', 'total'] as const).map((p) => (
          <button
            key={p}
            id={`period-btn-${p}`}
            onClick={() => setPeriodo(p)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
              periodo === p
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-[#8E8E93] hover:text-zinc-200'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 Dias' : p === 'mes' ? '30 Dias' : 'Total'}
          </button>
        ))}
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Faturamento */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-[#8E8E93] mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Faturamento</span>
            <div className="bg-[#30D158]/10 p-1.5 rounded-lg text-[#30D158]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-[#30D158]">
              R$ {faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-white/40 mt-1 flex items-center gap-0.5">
              Bruto no período
            </p>
          </div>
        </div>

        {/* Lucro Líquido */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-32 ring-1 ring-[#0A84FF]/10">
          <div className="flex justify-between items-center text-[#8E8E93] mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Lucro Líquido</span>
            <div className="bg-[#0A84FF]/10 p-1.5 rounded-lg text-[#0A84FF]">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-[#0A84FF]">
              R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              Líquido final
            </p>
          </div>
        </div>

        {/* Custos Totais */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-[#8E8E93] mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase">Custos</span>
            <span className="text-[10px] text-zinc-500 font-normal">Insumos</span>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white/90">
              R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-[#FF453A] mt-1 flex items-center gap-0.5">
              Custo de produção
            </p>
          </div>
        </div>

        {/* ROI Especial */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-[#8E8E93] mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase">Retorno (ROI)</span>
            <div className="bg-indigo-500/10 p-1 rounded text-indigo-400 text-[10px] font-bold">
              %{roiMedio.toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-[#30D158]">
              {roiMedio > 0 ? `+${roiMedio.toFixed(1)}%` : '0.0%'}
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              Retorno s/ custo
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Estoque Baixo (Bento-styled warning notification) */}
      {produtosAlertaEstoque.length > 0 && (
        <motion.div
          id="stock-alert-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-2xl p-4 mb-6 flex gap-3.5 items-start cursor-pointer"
          onClick={() => setActiveTab('estoque')}
        >
          <div className="p-2 rounded-xl bg-[#FF453A]/15 text-[#FF453A] mt-0.5">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-[#FF453A] uppercase tracking-wide">
              Estoque Alerta ({produtosAlertaEstoque.length})
            </h4>
            <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-relaxed">
              {produtosAlertaEstoque.map((p) => p.nome).slice(0, 3).join(', ')}
              {produtosAlertaEstoque.length > 3 ? '...' : ''} {produtosAlertaEstoque.length === 1 ? 'está com o' : 'estão com o'} estoque abaixo do mínimo de segurança.
            </p>
            <span className="text-[10.5px] text-[#FF453A] hover:underline font-semibold block mt-1">
              Reabastecer estoque agora →
            </span>
          </div>
        </motion.div>
      )}

      {/* Gráfico de Tendência de Vendas Customizado (Vetor/Pure SVG) */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">Tendência de Venda</h3>
            <p className="text-lg font-bold text-white tracking-tight">Faturamento e Gasto</p>
          </div>
          <div className="flex gap-2.5 text-[10px] font-medium text-[#8E8E93]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full col bg-[#0A84FF] block"></span>Faturamento</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full col bg-white/25 block"></span>Custo</span>
          </div>
        </div>

        {/* Render do Gráfico SVG dinâmico e responsivo */}
        <div className="h-28 w-full mt-2 relative">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 380 110`}>
            {/* Linha Faturamento de Gradiente */}
            <defs>
              <linearGradient id="chart-[#0A84FF]-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas Horizontais de Referência */}
            <line x1="0" y1="10" x2="380" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="380" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="90" x2="380" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 3" />

            {/* Formular os pontos de faturamento e gerar path */}
            {chartValores.length > 0 && (() => {
              const dx = 380 / (chartValores.length - 1 || 1);
              const points = chartValores.map((val, idx) => {
                const x = idx * dx;
                // Escalar o valor para caber na altura (10 a 90 px, ou seja, 80px uteis)
                const y = 95 - (val / (maxVal || 1)) * 80;
                return { x, y };
              });

              const pointsCusto = chartCustos.map((val, idx) => {
                const x = idx * dx;
                const y = 95 - (val / (maxVal || 1)) * 80;
                return { x, y };
              });

              // Criação do caminho (Cubic Bezier curve para curva suave)
              const pathD = points.length > 1
                ? points.reduce((acc, p, idx) => {
                    if (idx === 0) return `M ${p.x} ${p.y}`;
                    const prev = points[idx - 1];
                    const cpX1 = prev.x + dx / 2;
                    const cpY1 = prev.y;
                    const cpX2 = p.x - dx / 2;
                    const cpY2 = p.y;
                    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
                  }, '')
                : '';

              const pathCustoD = pointsCusto.length > 1
                ? pointsCusto.reduce((acc, p, idx) => {
                    if (idx === 0) return `M ${p.x} ${p.y}`;
                    const prev = pointsCusto[idx - 1];
                    const cpX1 = prev.x + dx / 2;
                    const cpY1 = prev.y;
                    const cpX2 = p.x - dx / 2;
                    const cpY2 = p.y;
                    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
                  }, '')
                : '';

              const fillD = `${pathD} L ${points[points.length - 1].x} 110 L 0 110 Z`;

              return (
                <>
                  {/* Preenchimento degradê do faturamento */}
                  <path d={fillD} fill="url(#chart-[#0A84FF]-gradient)" />
                  
                  {/* Linha principal de faturamento */}
                  <path d={pathD} fill="none" stroke="#0A84FF" strokeWidth="2.5" strokeLinecap="round" />
                  
                  {/* Linha secundária de custos */}
                  <path d={pathCustoD} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />

                  {/* Círculos destacando os nós de faturamento */}
                  {points.map((p, idx) => (
                    <circle
                      key={`pt-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r="3.5"
                      fill="#000"
                      stroke="#0A84FF"
                      strokeWidth="2.5"
                    />
                  ))}
                </>
              );
            })()}
          </svg>
        </div>

        {/* Labels do eixo X */}
        <div className="flex justify-between text-[10px] text-[#8E8E93] px-1 mt-1 font-medium">
          {chartLabels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>
      </div>

      {/* Relação ROI por Produto (Ranking de Performance) */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4">
        <h3 className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase mb-3.5">
          Produtos com Maior Retorno (ROI)
        </h3>

        {rankingProdutos.length === 0 ? (
          <div className="py-6 text-center text-[#8E8E93] text-xs">
            Nenhuma venda registrada no período selecionado.
          </div>
        ) : (
          <div className="space-y-4">
            {rankingProdutos.map((item, idx) => {
              return (
                <div key={item.produto.id} className="flex flex-col gap-1.5 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#8E8E93] w-4">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.produto.corHex || '#0A84FF' }}
                      />
                      <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                        {item.produto.nome}
                      </span>
                      <span className="text-[10px] text-[#8E8E93]">
                        x{item.quantidade} vend.
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#30D158] block">
                        +{item.roi.toFixed(0)}% ROI
                      </span>
                      <span className="text-[10px] text-[#8E8E93] font-medium block mt-0.5">
                        Lucro Líq: R$ {item.lucro.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso Visual de ROI */}
                  <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-[#0A84FF] h-full rounded-full"
                      style={{ width: `${Math.min(item.roi / 3, 100)}%` }} // Escala max de 300% de ROI no preenchimento
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
