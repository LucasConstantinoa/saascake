/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Insumo {
  id: string;
  nome: string;
  precoCompra: number; // Ex: R$ 60,00
  quantidadeCompra: number; // Ex: 1000 (g) ou 5 (garrafas)
  unidadeMedida: 'g' | 'kg' | 'ml' | 'L' | 'un' | 'pct';
  custoUnitario: number; // precoCompra / quantidadeCompra
  dataCompra: string; // ISO date string
}

export interface IngredienteReceita {
  insumoId: string;
  quantidadeNecessaria: number; // Na mesma unidade do insumo
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  precoVenda: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  ingredientes: IngredienteReceita[]; // Lista de insumos e proporções que compõem o produto
  categoria: string;
  corHex?: string; // Cor de destaque no estilo iOS da célula
}

export interface Venda {
  id: string;
  produtoId: string;
  quantidade: number;
  precoPraticado: number; // Preço de venda praticado no dia
  custoTotalPraticado: number; // custo unitario da receita * quantidade de produtos vendidos
  dataVenda: string; // ISO string ou dia formatado
}

export interface FiltroPeriodo {
  id: 'hoje' | 'semana' | 'mes' | 'total';
  label: string;
  dataInicio: Date;
}

export interface Usuario {
  id: string;
  username: string;
  hash: string;
  expiraEm: string; // ISO date-time string
  businessName?: string;
  seeded?: boolean;
}

