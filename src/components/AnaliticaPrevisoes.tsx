/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Insumo, Produto, Venda } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight, 
  Calendar, 
  ShoppingCart, 
  Sparkles, 
  ArrowUpRight, 
  Settings, 
  PieChart, 
  HelpCircle, 
  Download, 
  Play, 
  BellRing,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnaliticaPrevisoesProps {
  insumos: Insumo[];
  produtos: Produto[];
  vendas: Venda[];
  onEditProduto: (produto: Produto) => void;
  onAddVenda: (venda: Venda, baixarEstoque: boolean) => void;
}

export default function AnaliticaPrevisoes({
  insumos,
  produtos,
  vendas,
  onEditProduto,
  onAddVenda,
}: AnaliticaPrevisoesProps) {
  // Sub-abas do painel
  const [activeSubTab, setActiveSubTab] = useState<'graficos' | 'previsoes' | 'alertas'>('graficos');
  
  // Períodos de previsão (7, 15 ou 30 dias)
  const [previsaoPeriodo, setPrevisaoPeriodo] = useState<7 | 15 | 30>(7);

  // Estados locais para simulação de alertas e PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [alertasConfigProd, setAlertasConfigProd] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{titulo: string, mensagem: string} | null>(null);

  // PWA capturing of standard prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Enviar alerta simulado (iOS Push style)
  const dispararToast = (titulo: string, mensagem: string) => {
    setToastNotification({ titulo, mensagem });
    
    // Tocar um som de notificação (opcional, sintetizado dinamicamente via Web Audio para zero dependências!)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (err) {
      // Falha silenciosa se houver bloqueio de áudio do browser
    }

    // Solicitar permissão real para notificações se oportuno
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: mensagem });
    }

    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  // Monitoramento automático de estoque baixo quando o componente carrega ou vendas mudam
  useEffect(() => {
    const produtosEmAlerta = produtos.filter(p => p.estoqueAtual <= p.estoqueMinimo);
    if (produtosEmAlerta.length > 0) {
      const p = produtosEmAlerta[0];
      // Mostrar notificação push sutil se carregando
      const timer = setTimeout(() => {
        dispararToast(
          "⚠️ Estoque Crítico!", 
          `O produto "${p.nome}" está com apenas ${p.estoqueAtual} unidades em estoque.`
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [vendas.length, produtos]);

  // --- ALGORITMO DE DEMANDA E PLANEJAMENTO DE MATERIAIS (MRP) ---

  // Obtém o número de dias no histórico de vendas (mínimo 7 dias para suavizar médias)
  const obterDiasHistorico = () => {
    if (vendas.length === 0) return 30;
    const datas = vendas.map(v => new Date(v.dataVenda).getTime());
    const minTimestamp = Math.min(...datas);
    const maxTimestamp = new Date().getTime(); // hoje
    const diffMs = maxTimestamp - minTimestamp;
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(7, diffDias);
  };

  const totalDiasHistorico = obterDiasHistorico();

  // Calcular a velocidade de vendas diárias e projeções por produto
  const projecoesProdutos = produtos.map((prod) => {
    const totalVendido = vendas
      .filter((v) => v.produtoId === prod.id)
      .reduce((sum, v) => sum + v.quantidade, 0);

    const velocidadeDiaria = totalVendido / totalDiasHistorico;
    const demandaEstimada = Math.ceil(velocidadeDiaria * previsaoPeriodo);
    
    // Quantidade recomendada para produzir: Demanda estimada + Margem/Minimo - Estoque atual
    const producaoSugerida = Math.max(0, demandaEstimada + prod.estoqueMinimo - prod.estoqueAtual);
    
    // Custo de insumos por unidade de produto
    const custoUnitarioInsumos = prod.ingredientes.reduce((total, ing) => {
      const ins = insumos.find((i) => i.id === ing.insumoId);
      if (!ins) return total;
      return total + (ins.custoUnitario * ing.quantidadeNecessaria);
    }, 0);

    const faturamentoEst = demandaEstimada * prod.precoVenda;
    const lucroEst = demandaEstimada * (prod.precoVenda - custoUnitarioInsumos);

    return {
      ...prod,
      velocidadeDiaria,
      demandaEstimada,
      producaoSugerida,
      custoUnitarioInsumos,
      faturamentoEst,
      lucroEst
    };
  });

  // Agregar necessidade de compra de insumos baseado na produção sugerida dos produtos
  const requisitosInsumos: { [insId: string]: { insumo: Insumo; quantidadeNecessaria: number; custoTotal: number } } = {};

  projecoesProdutos.forEach((pProj) => {
    if (pProj.producaoSugerida > 0) {
      pProj.ingredientes.forEach((ing) => {
        const insObj = insumos.find((i) => i.id === ing.insumoId);
        if (!insObj) return;

        const totalNecessario = ing.quantidadeNecessaria * pProj.producaoSugerida;
        if (!requisitosInsumos[ing.insumoId]) {
          requisitosInsumos[ing.insumoId] = {
            insumo: insObj,
            quantidadeNecessaria: 0,
            custoTotal: 0
          };
        }
        requisitosInsumos[ing.insumoId].quantidadeNecessaria += totalNecessario;
        requisitosInsumos[ing.insumoId].custoTotal += totalNecessario * insObj.custoUnitario;
      });
    }
  });

  const listaInsumosComprar = Object.values(requisitosInsumos);
  const custoTotalInsumosReposicao = listaInsumosComprar.reduce((acc, current) => acc + current.custoTotal, 0);

  // --- CÁLCULO DE DADOS PARA OS RELATÓRIOS VISUAIS ---

  // 1. ROI de cada produto (Preço de venda / Custo Unitário de Insumos)
  const dadosROIProdutos = produtos.map((prod) => {
    const custoInsumos = prod.ingredientes.reduce((total, ing) => {
      const ins = insumos.find((i) => i.id === ing.insumoId);
      if (!ins) return total;
      return total + (ins.custoUnitario * ing.quantidadeNecessaria);
    }, 0);

    const lucroUnitario = prod.precoVenda - custoInsumos;
    const roiPraticado = custoInsumos > 0 ? (lucroUnitario / custoInsumos) * 100 : 0;

    return {
      nome: prod.nome,
      cor: prod.corHex || '#FF9500',
      roi: roiPraticado,
      custo: custoInsumos,
      preco: prod.precoVenda,
      lucro: lucroUnitario
    };
  }).sort((a, b) => b.roi - a.roi); // Ordenados por maior ROI

  // 2. Volume de vendas ao longo do tempo (Últimos 7 dias)
  const obterUltimos7Dias = () => {
    const lista = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const diaFormatado = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      // Filtrar vendas desse dia
      const vendasDoDia = vendas.filter((v) => {
        const dataVRaw = new Date(v.dataVenda);
        return dataVRaw.toDateString() === d.toDateString();
      });

      const totalFaturado = vendasDoDia.reduce((acc, v) => acc + (v.precoPraticado * v.quantidade), 0);
      const volumeUnidades = vendasDoDia.reduce((acc, v) => acc + v.quantidade, 0);

      lista.push({
        diaLabel: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        diaCompleto: diaFormatado,
        faturamento: totalFaturado,
        unidades: volumeUnidades
      });
    }
    return lista;
  };

  const dadosVendasHistorico = obterUltimos7Dias();
  const faturamentoMaximo = Math.max(...dadosVendasHistorico.map((d) => d.faturamento), 100);

  // Simulação de venda crítica para testar limites configurados em tempo real
  const handleSimularEstoqueCritico = () => {
    if (produtos.length === 0) {
      dispararToast("Erro", "Adicione produtos primeiro!");
      return;
    }
    const prodSelecionado = produtos[Math.floor(Math.random() * produtos.length)];
    
    // Forçar o estoque atual deste produto para ficar ligeiramente menor ou igual ao estoque mínimo
    const novoEstoque = Math.max(0, prodSelecionado.estoqueMinimo - 15);
    
    onEditProduto({
      ...prodSelecionado,
      estoqueAtual: novoEstoque // Força estoque baixo
    });

    dispararToast(
      `🔔 Simulação Ativa`, 
      `O estoque de "${prodSelecionado.nome}" reduziu para ${novoEstoque} un. (Limite configurado: ${prodSelecionado.estoqueMinimo} un).`
    );
  };

  return (
    <div className="px-5 pt-4 text-white pb-20 bg-black min-h-screen">
      
      {/* Toast flutuante iOS (Dynamic Notification) */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="fixed top-12 left-4 right-4 bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 z-[100] shadow-2xl flex items-start gap-3 select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5.5 h-5.5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center justify-between">
                <span>{toastNotification.titulo}</span>
                <span className="text-[9px] text-[#8E8E93] font-medium tracking-normal uppercase bg-black px-1.5 py-0.5 rounded-md">Agora</span>
              </h3>
              <p className="text-[11.5px] text-zinc-300 leading-snug mt-0.5">
                {toastNotification.mensagem}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Título Principal */}
      <div className="flex justify-between items-center mb-5 select-none">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inteligência</h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">Módulo de Previsão & Notificação</p>
        </div>
        <div className="p-2 bg-gradient-to-tr from-[#0A84FF] to-[#30D158] rounded-xl shrink-0">
          <Sparkles className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
      </div>

      {/* PWA Promo Card */}
      {isInstallable && (
        <div className="bg-gradient-to-r from-[#0A84FF]/20 to-[#30D158]/5 border border-white/5 rounded-2xl p-4 mb-6 relative overflow-hidden select-none">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0A84FF]/10 text-[#0A84FF]">
              <Download className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="flex-1 pr-12">
              <h4 className="text-sm font-bold text-white">Instalar como Aplicativo</h4>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Acesse offline, tela cheia, sem barras de navegação e notificações nativas.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallPWA}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 px-3.5 bg-[#0A84FF] hover:bg-opacity-90 font-bold text-[11px] text-white rounded-lg transition-all"
          >
            Instalar
          </button>
        </div>
      )}

      {/* iOS Segmented Control (Tabs) */}
      <div className="bg-[#1C1C1E] p-1 rounded-xl flex items-center justify-between mb-6 select-none font-semibold text-xs border border-white/5">
        <button
          onClick={() => setActiveSubTab('graficos')}
          className={`flex-1 text-center py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'graficos' ? 'bg-black text-white shadow-md font-bold' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          Gráficos & ROI
        </button>
        <button
          onClick={() => setActiveSubTab('previsoes')}
          className={`flex-1 text-center py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'previsoes' ? 'bg-black text-white shadow-md font-bold' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Previsão
        </button>
        <button
          onClick={() => setActiveSubTab('alertas')}
          className={`flex-1 text-center py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'alertas' ? 'bg-black text-white shadow-md font-bold' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Alertas
        </button>
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}

      {/* 1. ABA DE GRÁFICOS E ROI */}
      {activeSubTab === 'graficos' && (
        <div className="space-y-6">
          
          {/* Gráfico 1: Volume de Vendas nos últimos 7 dias (Area Chart) */}
          <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl select-none">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">Desempenho Diário</span>
                <h3 className="text-sm font-bold text-white mt-0.5">Faturamento (Praticado)</h3>
              </div>
              <TrendingUp className="w-4 h-4 text-[#30D158]" />
            </div>

            {/* Renderização de gráfico autêntico responsivo SVG */}
            <div className="h-44 w-full relative pt-2">
              <svg className="w-full h-full" viewBox="0 0 380 140" preserveAspectRatio="none">
                <defs>
                  {/* Gradiente para sombreamento da área abaixo da linha */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Linhas horizontais de grade sutil */}
                <line x1="0" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="65" x2="380" y2="65" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="110" x2="380" y2="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Cálculo dos pontos da linha baseado nos dados de vendas */}
                {(() => {
                  const xStep = 380 / 6;
                  const pts = dadosVendasHistorico.map((d, i) => {
                    const x = i * xStep;
                    // Mapeia faturamento do max ao min h=110 para h=20
                    const y = 110 - ((d.faturamento / faturamentoMaximo) * 90);
                    return { x, y };
                  });

                  if (pts.length === 0) return null;

                  // Monta String de Caminho (Path) para Linha
                  let linePath = `M ${pts[0].x} ${pts[0].y}`;
                  let areaPath = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 1; i < pts.length; i++) {
                    linePath += ` L ${pts[i].x} ${pts[i].y}`;
                    areaPath += ` L ${pts[i].x} ${pts[i].y}`;
                  }
                  areaPath += ` L ${pts[pts.length - 1].x} 110 L ${pts[0].x} 110 Z`;

                  return (
                    <>
                      {/* Área sombreada */}
                      <path d={areaPath} fill="url(#areaGrad)" />
                      
                      {/* Linha principal brilhante */}
                      <path d={linePath} fill="none" stroke="#0A84FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Círculos interativos de destaque de dados */}
                      {pts.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#000000" stroke="#0A84FF" strokeWidth="2.5" />
                          {dadosVendasHistorico[idx].faturamento > 0 && (
                            <text 
                              x={p.x} 
                              y={p.y - 12} 
                              fill="#ffffff" 
                              fontSize="8" 
                              fontWeight="bold" 
                              textAnchor="middle"
                              className="bg-black/80 px-1 rounded"
                            >
                              R${Math.round(dadosVendasHistorico[idx].faturamento)}
                            </text>
                          )}
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* Rótulo dos dias do gráfico */}
              <div className="flex justify-between items-center mt-2.5 px-1 select-none">
                {dadosVendasHistorico.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[9px] uppercase font-bold text-[#8E8E93]">{d.diaLabel}</span>
                    <span className="text-[8px] font-semibold text-zinc-650 opacity-80">{d.unidades} un</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfico 2: ROI Unitário por Produto (Barra de Progresso) */}
          <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl select-none">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">Rentabilidade</span>
                <h3 className="text-sm font-bold text-white mt-0.5">ROI Estrutural do Mix</h3>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#30D158]" />
            </div>

            <div className="space-y-4">
              {dadosROIProdutos.map((dObj, idx) => {
                // Limitar representação gráfica até 400% max na barra
                const porcetagemBarra = Math.min(100, (dObj.roi / 500) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[11.5px] font-bold text-white tracking-tight">{dObj.nome}</span>
                      <span className="text-[11px] font-extrabold text-[#30D158]">
                        {dObj.roi.toFixed(0)}% ROI
                      </span>
                    </div>

                    {/* Barra estilizada */}
                    <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${porcetagemBarra}%`,
                          backgroundColor: dObj.cor
                        }}
                      />
                    </div>
                    
                    {/* Legenda detalhada de fatias financeiras */}
                    <div className="flex justify-between items-center text-[9px] text-[#8E8E93] font-semibold uppercase">
                      <span>Custo: R$ {dObj.custo.toFixed(2)}</span>
                      <span>•</span>
                      <span>Lucro Unitário: R$ {dObj.lucro.toFixed(2)}</span>
                      <span>•</span>
                      <span>Preço: R$ {dObj.preco.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cartão de Ajuda de ROI */}
          <div className="bg-black border border-white/10 rounded-2xl p-3.5 flex gap-3 text-xs leading-relaxed select-none">
            <HelpCircle className="w-5 h-5 text-[#0A84FF] shrink-0" />
            <div>
              <h5 className="font-bold text-white">Como é calculado o ROI estrutural?</h5>
              <p className="text-[#8E8E93] text-[10.5px] mt-0.5">
                Representa o percentual de retorno que o produto gera sobre o custo total de seus ingredientes. Quanto maior a barra, menor o peso financeiro das matérias-primas e maior sua margem bruta líquida de produção.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 2. ABA DE PREVISÃO DE DEMANDA (MRP) */}
      {activeSubTab === 'previsoes' && (
        <div className="space-y-6">
          
          {/* Seletor de Períodos de Projeção */}
          <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl select-none">
            <h4 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2.5">Horizonte de Planejamento</h4>
            <div className="grid grid-cols-3 gap-2 p-1 bg-black rounded-xl border border-white/5">
              <button
                onClick={() => setPrevisaoPeriodo(7)}
                className={`py-1.5 text-center text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  previsaoPeriodo === 7 ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                Próximos 7d
              </button>
              <button
                onClick={() => setPrevisaoPeriodo(15)}
                className={`py-1.5 text-center text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  previsaoPeriodo === 15 ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                Próximos 15d
              </button>
              <button
                onClick={() => setPrevisaoPeriodo(30)}
                className={`py-1.5 text-center text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  previsaoPeriodo === 30 ? 'bg-[#0A84FF] text-white' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                Próximos 30d
              </button>
            </div>
            <p className="text-[10px] text-[#8E8E93] mt-2.5 italic">
              * Calculado a partir de {totalDiasHistorico} dias de histórico ativo de vendas da empresa.
            </p>
          </div>

          {/* Projeção de Demanda de Produtos */}
          <div>
            <h3 className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase mb-3 px-1 select-none">Reposição e Demanda de Produtos</h3>
            
            <div className="space-y-3">
              {projecoesProdutos.map((pProj) => (
                <div key={pProj.id} className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-white tracking-tight leading-none">{pProj.nome}</h4>
                    <p className="text-[10px] text-[#8E8E93] mt-1 font-semibold flex items-center gap-1">
                      Média diária: {pProj.velocidadeDiaria.toFixed(1)} un / dia • Estoque: {pProj.estoqueAtual} un
                    </p>
                    <div className="flex gap-2.5 text-[10px] text-[#8E8E93] font-semibold tracking-wide uppercase mt-2.5">
                      <span className="text-zinc-300">Demanda Estimada: {pProj.demandaEstimada} un</span>
                    </div>
                  </div>

                  {/* Sugestão de Produção */}
                  <div className="text-right shrink-0">
                    {pProj.producaoSugerida > 0 ? (
                      <div className="bg-[#0A84FF]/10 border border-[#0A84FF]/20 px-3 py-1.5 rounded-xl text-center select-none">
                        <span className="text-[9px] font-bold text-[#0A84FF] uppercase tracking-wide block">Produzir</span>
                        <span className="text-base font-extrabold text-[#0A84FF] block mt-0.5">+{pProj.producaoSugerida} un</span>
                      </div>
                    ) : (
                      <div className="bg-[#30D158]/10 border border-[#30D158]/20 px-3 py-1.5 rounded-xl text-center select-none">
                        <span className="text-[9px] font-bold text-[#30D158] uppercase tracking-wide block">Estoque OK</span>
                        <span className="text-xs font-bold text-[#30D158] block mt-0.5">Sem pendência</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendações agregadas de Compra de Insumos baseadas em Demanda */}
          <div>
            <div className="flex justify-between items-center mb-3 px-1 select-none">
              <h3 className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase">Lista de Compras de Insumos</h3>
              <span className="text-[10px] font-bold text-[#FF453A]">Aporte: R$ {custoTotalInsumosReposicao.toFixed(2)}</span>
            </div>

            <div className="space-y-3">
              {listaInsumosComprar.length === 0 ? (
                <div className="py-8 text-center text-[#8E8E93] text-xs border border-dashed border-white/10 rounded-2xl bg-black">
                  Nenhum lote de reposição de insumos necessário para este período!
                </div>
              ) : (
                listaInsumosComprar.map(({ insumo, quantidadeNecessaria, custoTotal }) => {
                  // Medir pacotes padrão necessários
                  const embalagensNecessarias = quantidadeNecessaria / insumo.quantidadeCompra;

                  return (
                    <div key={insumo.id} className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-white tracking-tight leading-none">{insumo.nome}</h4>
                        <p className="text-[10px] text-[#8E8E93] mt-1.5 font-semibold">
                          Qtd. Exata Necessária: {quantidadeNecessaria.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {insumo.unidadeMedida}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase mt-1 flex items-center gap-1 text-[#0A84FF]">
                          Sugerido comprar: {embalagensNecessarias.toFixed(1)} pacotes de ({insumo.quantidadeCompra} {insumo.unidadeMedida})
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#30D158] block font-extrabold">R$ {custoTotal.toFixed(2)}</span>
                        <span className="text-[8.5px] text-[#8E8E93] block font-semibold uppercase tracking-wider mt-0.5">Custo Base</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quadro informativo de MRP */}
          <div className="bg-black border border-white/10 rounded-2xl p-4 flex gap-3.5 text-xs text-[#8E8E93] select-none leading-relaxed">
            <Info className="w-5.5 h-5.5 text-[#0A84FF] shrink-0" />
            <div>
              <p>
                As necessidades de compras de insumos foram deduzidas de acordo com as receitas cadastradas para os produtos que requererão reabastecimento imediato de estoque para cobrir a venda projetada no período de <strong>{previsaoPeriodo} dias</strong>.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 3. ABA DE ALERTAS & CONTROLES CONFIGURÁVEIS */}
      {activeSubTab === 'alertas' && (
        <div className="space-y-6">

          {/* Testes e Simuladores */}
          <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl select-none">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">Testador de Push Notification</span>
              <BellRing className="w-4 h-4 text-[#0A84FF]" />
            </div>
            <p className="text-xs text-zinc-300 mb-4 leading-normal">
              Simule cenários em tempo real para verificar a agilidade e a ativação dos avisos flutuantes de limites de estocagem.
            </p>
            
            <button
              onClick={handleSimularEstoqueCritico}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-black hover:bg-zinc-900 border border-white/10 hover:border-white/20 active:scale-98 rounded-xl font-bold text-xs text-white transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#30D158] fill-[#30D158]" />
              Simular Lançamento / Venda Crítica
            </button>
          </div>

          {/* Lista de Alertas Ativos */}
          <div>
            <h3 className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase mb-3 px-1 select-none">Produtos em Limite Crítico (Estoque Baixo)</h3>

            <div className="space-y-3">
              {produtos.filter(p => p.estoqueAtual <= p.estoqueMinimo).length === 0 ? (
                <div className="py-8 text-center text-[#30D158] bg-[#30D158]/5 border border-dashed border-[#30D158]/20 rounded-2xl text-xs select-none">
                  🎉 Nenhum produto abaixo do limite de estocagem!
                </div>
              ) : (
                produtos
                  .filter((p) => p.estoqueAtual <= p.estoqueMinimo)
                  .map((p) => (
                    <div key={p.id} className="bg-[#1C1C1E] border border-[#FF3B30]/20 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-white tracking-tight leading-none">{p.nome}</h4>
                        <p className="text-[11px] text-[#FF3B30] mt-1.5 font-semibold flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> Reabastecer estoque imediatamente
                        </p>
                        <p className="text-[10px] text-[#8E8E93] font-semibold uppercase mt-2.5">
                          Estoque Atual: <span className="text-white font-bold">{p.estoqueAtual} un</span> • Limite Mínimo: <span className="text-[#FF3B30] font-bold">{p.estoqueMinimo} un</span>
                        </p>
                      </div>

                      <button
                        onClick={() => setAlertasConfigProd(alertasConfigProd === p.id ? null : p.id)}
                        className="py-1 px-2.5 rounded-lg bg-black/40 text-xs text-[#8E8E93] hover:text-white border border-white/5 font-semibold active:scale-95 transition-all cursor-pointer select-none"
                      >
                        Ajustar
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Ajuste Rápido de Limites Configoráveis por Produto */}
          <div>
            <h3 className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase mb-3 px-1 select-none">Configurador Rápido de Limites de Estoque</h3>
            
            <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
              {produtos.map((p) => {
                const isSelected = alertasConfigProd === p.id;
                return (
                  <div key={p.id} className="p-4 transition-colors">
                    <div className="flex justify-between items-center select-none mb-1">
                      <div>
                        <h4 className="font-bold text-sm text-white tracking-tight leading-none">{p.nome}</h4>
                        <p className="text-[10px] text-[#8E8E93] mt-1 font-semibold leading-none">
                          Categoria: {p.categoria} • Estoque Atual: {p.estoqueAtual} un
                        </p>
                      </div>
                      <div className="text-right shrink-0 select-none">
                        <button
                          onClick={() => setAlertasConfigProd(isSelected ? null : p.id)}
                          className={`p-1 px-2.5 text-[11px] rounded-lg font-bold border ${
                            isSelected 
                              ? 'bg-[#0A84FF]/10 text-[#0A84FF] border-[#0A84FF]/20' 
                              : 'bg-black/30 text-[#8E8E93] border-white/5 hover:text-white'
                          } cursor-pointer`}
                        >
                          {isSelected ? 'Sair' : 'Configurar'}
                        </button>
                      </div>
                    </div>

                    {/* Formulário/Slider inline de configuração */}
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 pb-2 space-y-4"
                      >
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2">
                          <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide block">Definir Limite de Segurança Mínimo (unidade de alerta)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={p.estoqueMinimo}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                onEditProduto({
                                  ...p,
                                  estoqueMinimo: val
                                });
                              }}
                              className="flex-1 accent-[#0A84FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                            />
                            <span className="text-sm font-extrabold text-[#0A84FF] w-8 text-right shrink-0">{p.estoqueMinimo}un</span>
                          </div>
                          <p className="text-[9.5px] text-[#8E8E93] leading-snug">
                            O sistema enviará alertas flutuantes push no cabeçalho se o estoque atual cair a um valor menor ou igual a {p.estoqueMinimo} un.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
