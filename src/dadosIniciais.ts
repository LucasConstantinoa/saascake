/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Insumo, Produto, Venda } from './types';

// Função auxiliar para gerar datas relativas ao dia de hoje
const subtrairDias = (dias: number): string => {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data.toISOString();
};

export const INSUMOS_INICIAIS: Insumo[] = [
  {
    id: 'ins-1',
    nome: 'Farina de Trigo Especial',
    precoCompra: 48.00,
    quantidadeCompra: 10, // 10 kg
    unidadeMedida: 'kg',
    custoUnitario: 4.80, // R$ 4,80 por kg
    dataCompra: subtrairDias(12),
  },
  {
    id: 'ins-2',
    nome: 'Chocolate Belga Callebaut',
    precoCompra: 95.00,
    quantidadeCompra: 1000, // 1000g
    unidadeMedida: 'g',
    custoUnitario: 0.095, // R$ 0,095 por g
    dataCompra: subtrairDias(8),
  },
  {
    id: 'ins-3',
    nome: 'Manteiga Sem Sal Extra',
    precoCompra: 28.00,
    quantidadeCompra: 500, // 500g
    unidadeMedida: 'g',
    custoUnitario: 0.056, // R$ 0,056 por g
    dataCompra: subtrairDias(5),
  },
  {
    id: 'ins-4',
    nome: 'Ovos Caipira Orgânicos',
    precoCompra: 18.00,
    quantidadeCompra: 30, // 30 unidades
    unidadeMedida: 'un',
    custoUnitario: 0.60, // R$ 0,60 por unidade
    dataCompra: subtrairDias(4),
  },
  {
    id: 'ins-5',
    nome: 'Café Espresso Gourmet',
    precoCompra: 65.00,
    quantidadeCompra: 1000, // 1000g
    unidadeMedida: 'g',
    custoUnitario: 0.065, // R$ 0,065 por g
    dataCompra: subtrairDias(15),
  },
  {
    id: 'ins-6',
    nome: 'Leite Integral Tipo A',
    precoCompra: 6.50,
    quantidadeCompra: 1000, // 1000 ml
    unidadeMedida: 'ml',
    custoUnitario: 0.0065, // R$ 0,0065 por ml
    dataCompra: subtrairDias(2),
  },
];

export const PRODUTOS_INICIAIS: Produto[] = [
  {
    id: 'prod-1',
    nome: 'Cookie Triplo Chocolate',
    descricao: 'Cookie artesanal de baunilha recheado com gotas generosas de chocolate belga.',
    precoVenda: 12.00,
    estoqueAtual: 42,
    estoqueMinimo: 15,
    categoria: 'Doces',
    corHex: '#FF9500', // Laranja iOS
    ingredientes: [
      { insumoId: 'ins-1', quantidadeNecessaria: 0.05 }, // 50g (0.05 kg) de Farinha -> R$ 0.24
      { insumoId: 'ins-2', quantidadeNecessaria: 35 },   // 35g de Chocolate Belga -> R$ 3.325
      { insumoId: 'ins-3', quantidadeNecessaria: 20 },   // 20g de Manteiga -> R$ 1.12
      { insumoId: 'ins-4', quantidadeNecessaria: 0.5 },  // Meio ovo -> R$ 0.30
    ], // Custo Total Estimado da Receita: R$ 4,985 (~ R$ 4,99) -> Lucro: R$ 7,01
  },
  {
    id: 'prod-2',
    nome: 'Cappuccino Supreme L',
    descricao: 'Duo clássico de expresso encorpado, leite cremoso vaporizado e cacau fino.',
    precoVenda: 15.00,
    estoqueAtual: 28,
    estoqueMinimo: 10,
    categoria: 'Cafés',
    corHex: '#A2845E', // Marrom iOS
    ingredientes: [
      { insumoId: 'ins-5', quantidadeNecessaria: 18 },   // 18g de café -> R$ 1.17
      { insumoId: 'ins-6', quantidadeNecessaria: 150 },  // 150ml de leite -> R$ 0.975
      { insumoId: 'ins-2', quantidadeNecessaria: 10 },   // 10g de chocolate ralado -> R$ 0.95
    ], // Custo Total Estimado: R$ 3.095 (~ R$ 3,10) -> Lucro: R$ 11,90
  },
  {
    id: 'prod-3',
    nome: 'Brownie Espresso Belga',
    descricao: 'Brownie denso e úmido aromatizado com café expresso e muito chocolate belga puro.',
    precoVenda: 18.00,
    estoqueAtual: 11, // Alerta: Abaixo do estoque mínimo!
    estoqueMinimo: 15,
    categoria: 'Doces',
    corHex: '#5856D6', // Roxo iOS
    ingredientes: [
      { insumoId: 'ins-1', quantidadeNecessaria: 0.04 }, // 40g (0.04 kg) farinha -> R$ 0.192
      { insumoId: 'ins-2', quantidadeNecessaria: 45 },   // 45g de Chocolate -> R$ 4.275
      { insumoId: 'ins-3', quantidadeNecessaria: 25 },   // 25g de Manteiga -> R$ 1.40
      { insumoId: 'ins-4', quantidadeNecessaria: 1.0 },  // 1 ovo inteiro -> R$ 0.60
      { insumoId: 'ins-5', quantidadeNecessaria: 5 },    // 5g pó café -> R$ 0.325
    ], // Custo Total Estimado: R$ 6.792 (~ R$ 6,79) -> Lucro: R$ 11,21
  },
  {
    id: 'prod-4',
    nome: 'Pão de Queijo Caipira un',
    descricao: 'Assado diariamente com queijo curado artesanal e ovos caipiras selecionados.',
    precoVenda: 6.00,
    estoqueAtual: 65,
    estoqueMinimo: 20,
    categoria: 'Salgados',
    corHex: '#FFCC00', // Amarelo iOS
    ingredientes: [
      { insumoId: 'ins-4', quantidadeNecessaria: 0.33 }, // 1/3 ovo -> R$ 0.20
      { insumoId: 'ins-3', quantidadeNecessaria: 10 },   // 10g manteiga -> R$ 0.56
    ], // Custo Parcial Estimado (queijo simplificado): R$ 0.76 -> Lucro: R$ 5,24
  },
];

// Gerar vendas realistas para os últimos dias para gráficos e ROI
export const VENDAS_INICIAIS: Venda[] = [
  // Hoje
  {
    id: 'venda-1',
    produtoId: 'prod-1',
    quantidade: 5,
    precoPraticado: 12.00,
    custoTotalPraticado: 4.99 * 5,
    dataVenda: subtrairDias(0),
  },
  {
    id: 'venda-2',
    produtoId: 'prod-2',
    quantidade: 8,
    precoPraticado: 15.00,
    custoTotalPraticado: 3.10 * 8,
    dataVenda: subtrairDias(0),
  },
  {
    id: 'venda-3',
    produtoId: 'prod-4',
    quantidade: 12,
    precoPraticado: 6.00,
    custoTotalPraticado: 0.76 * 12,
    dataVenda: subtrairDias(0),
  },

  // Ontem
  {
    id: 'venda-4',
    produtoId: 'prod-1',
    quantidade: 10,
    precoPraticado: 12.00,
    custoTotalPraticado: 4.99 * 10,
    dataVenda: subtrairDias(1),
  },
  {
    id: 'venda-5',
    produtoId: 'prod-3',
    quantidade: 6,
    precoPraticado: 18.00,
    custoTotalPraticado: 6.79 * 6,
    dataVenda: subtrairDias(1),
  },
  {
    id: 'venda-6',
    produtoId: 'prod-2',
    quantidade: 11,
    precoPraticado: 15.00,
    custoTotalPraticado: 3.10 * 11,
    dataVenda: subtrairDias(1),
  },

  // Últimos 7 dias (Semana)
  {
    id: 'venda-7',
    produtoId: 'prod-1',
    quantidade: 15,
    precoPraticado: 12.00,
    custoTotalPraticado: 4.99 * 15,
    dataVenda: subtrairDias(3),
  },
  {
    id: 'venda-8',
    produtoId: 'prod-4',
    quantidade: 35,
    precoPraticado: 6.00,
    custoTotalPraticado: 0.76 * 35,
    dataVenda: subtrairDias(4),
  },
  {
    id: 'venda-9',
    produtoId: 'prod-3',
    quantidade: 12,
    precoPraticado: 18.00,
    custoTotalPraticado: 6.79 * 12,
    dataVenda: subtrairDias(5),
  },
  {
    id: 'venda-10',
    produtoId: 'prod-2',
    quantidade: 14,
    precoPraticado: 15.00,
    custoTotalPraticado: 3.10 * 14,
    dataVenda: subtrairDias(6),
  },

  // Mês
  {
    id: 'venda-11',
    produtoId: 'prod-1',
    quantidade: 22,
    precoPraticado: 12.00,
    custoTotalPraticado: 4.99 * 22,
    dataVenda: subtrairDias(14),
  },
  {
    id: 'venda-12',
    produtoId: 'prod-2',
    quantidade: 20,
    precoPraticado: 15.00,
    custoTotalPraticado: 3.10 * 20,
    dataVenda: subtrairDias(18),
  },
  {
    id: 'venda-13',
    produtoId: 'prod-4',
    quantidade: 50,
    precoPraticado: 6.00,
    custoTotalPraticado: 0.76 * 50,
    dataVenda: subtrairDias(22),
  },
  {
    id: 'venda-14',
    produtoId: 'prod-3',
    quantidade: 15,
    precoPraticado: 18.00,
    custoTotalPraticado: 6.79 * 15,
    dataVenda: subtrairDias(25),
  },
];
