/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LayoutCelular from './components/LayoutCelular';
import VisaoGeral from './components/VisaoGeral';
import EstoqueProdutos from './components/EstoqueProdutos';
import CadastroInsumos from './components/CadastroInsumos';
import HistoricoVendas from './components/HistoricoVendas';
import AnaliticaPrevisoes from './components/AnaliticaPrevisoes';
import AcaoRapida from './components/AcaoRapida';
import AuthSystem from './components/AuthSystem';

import { Insumo, Produto, Venda, Usuario } from './types';
import { INSUMOS_INICIAIS, PRODUTOS_INICIAIS, VENDAS_INICIAIS } from './dadosIniciais';
import { TrendingUp, Package, Layers, Receipt, BarChart3 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from './db/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState('destaques');
  const [isUserActive, setIsUserActive] = useState(false);
  const [loggedUser, setLoggedUser] = useState<Usuario | null>(null);

  // Estados locais sincronizados com Firestore
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [businessName, setBusinessName] = useState('Boulangerie Gourmet');

  // Subscrever e sincronizar insumos em tempo real
  useEffect(() => {
    if (!loggedUser) {
      setInsumos([]);
      return;
    }

    const path = `usuarios/${loggedUser.id}/insumos`;
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Insumo[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Insumo);
      });

      if (snapshot.empty) {
        if (!loggedUser.seeded) {
          INSUMOS_INICIAIS.forEach(async (item) => {
            try {
              await setDoc(doc(db, path, item.id), item);
            } catch (e) {
              console.error("Erro ao semear insumo inicial:", e);
            }
          });
          setInsumos(INSUMOS_INICIAIS);
          setDoc(doc(db, 'usuarios', loggedUser.id), {
            ...loggedUser,
            seeded: true
          }, { merge: true }).catch((err) => console.error("Erro ao atualizar seeded:", err));
        } else {
          setInsumos([]);
        }
      } else {
        setInsumos(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [loggedUser]);

  // Subscrever e sincronizar produtos em tempo real
  useEffect(() => {
    if (!loggedUser) {
      setProdutos([]);
      return;
    }

    const path = `usuarios/${loggedUser.id}/produtos`;
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Produto[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Produto);
      });

      if (snapshot.empty) {
        if (!loggedUser.seeded) {
          PRODUTOS_INICIAIS.forEach(async (item) => {
            try {
              await setDoc(doc(db, path, item.id), item);
            } catch (e) {
              console.error("Erro ao semear produto inicial:", e);
            }
          });
          setProdutos(PRODUTOS_INICIAIS);
          setDoc(doc(db, 'usuarios', loggedUser.id), {
            ...loggedUser,
            seeded: true
          }, { merge: true }).catch((err) => console.error("Erro ao atualizar seeded:", err));
        } else {
          setProdutos([]);
        }
      } else {
        setProdutos(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [loggedUser]);

  // Subscrever e sincronizar vendas em tempo real
  useEffect(() => {
    if (!loggedUser) {
      setVendas([]);
      return;
    }

    const path = `usuarios/${loggedUser.id}/vendas`;
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Venda[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Venda);
      });

      if (snapshot.empty) {
        if (!loggedUser.seeded) {
          VENDAS_INICIAIS.forEach(async (item) => {
            try {
              await setDoc(doc(db, path, item.id), item);
            } catch (e) {
              console.error("Erro ao semear venda inicial:", e);
            }
          });
          setVendas(VENDAS_INICIAIS);
          setDoc(doc(db, 'usuarios', loggedUser.id), {
            ...loggedUser,
            seeded: true
          }, { merge: true }).catch((err) => console.error("Erro ao atualizar seeded:", err));
        } else {
          setVendas([]);
        }
      } else {
        setVendas(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [loggedUser]);

  // Nome do Business vindo do Firestore
  useEffect(() => {
    if (!loggedUser) {
      setBusinessName('Boutique d\'Épices');
      return;
    }
    setBusinessName(loggedUser.businessName || 'Boutique d\'Épices');
  }, [loggedUser]);

  const persistirBusinessName = async (novoNome: string) => {
    setBusinessName(novoNome);
    if (!loggedUser) return;
    try {
      await setDoc(doc(db, 'usuarios', loggedUser.id), {
        ...loggedUser,
        businessName: novoNome
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${loggedUser.id}`);
    }
  };

  // Redefinir base inteira para demonstração do usuário
  const handleResetData = async () => {
    if (!loggedUser) return;
    const pathInsumos = `usuarios/${loggedUser.id}/insumos`;
    const pathProdutos = `usuarios/${loggedUser.id}/produtos`;
    const pathVendas = `usuarios/${loggedUser.id}/vendas`;

    try {
      for (const item of insumos) {
        await deleteDoc(doc(db, pathInsumos, item.id));
      }
      for (const item of produtos) {
        await deleteDoc(doc(db, pathProdutos, item.id));
      }
      for (const item of vendas) {
        await deleteDoc(doc(db, pathVendas, item.id));
      }

      for (const item of INSUMOS_INICIAIS) {
        await setDoc(doc(db, pathInsumos, item.id), item);
      }
      for (const item of PRODUTOS_INICIAIS) {
        await setDoc(doc(db, pathProdutos, item.id), item);
      }
      for (const item of VENDAS_INICIAIS) {
        await setDoc(doc(db, pathVendas, item.id), item);
      }

      await persistirBusinessName('Boutique d\'Épices');
    } catch (error) {
      console.error("Erro ao resetar dados:", error);
    }
  };

  // handlers de PRODUTOS
  const handleAddProduto = async (novo: Produto) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/produtos`;
    try {
      await setDoc(doc(db, path, novo.id), novo);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${novo.id}`);
    }
  };

  const handleEditProduto = async (editado: Produto) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/produtos`;
    try {
      await setDoc(doc(db, path, editado.id), editado);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${editado.id}`);
    }
  };

  const handleDeleteProduto = async (id: string) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/produtos`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const handleUpdateEstoque = async (id: string, novoEstoque: number) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/produtos`;
    try {
      const prodFind = produtos.find(p => p.id === id);
      if (prodFind) {
        await setDoc(doc(db, path, id), {
          ...prodFind,
          estoqueAtual: novoEstoque
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  };

  // handlers de INSUMOS
  const handleAddInsumo = async (novo: Insumo) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/insumos`;
    try {
      await setDoc(doc(db, path, novo.id), novo);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${novo.id}`);
    }
  };

  const handleEditInsumo = async (editado: Insumo) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/insumos`;
    try {
      await setDoc(doc(db, path, editado.id), editado);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${editado.id}`);
    }
  };

  const handleDeleteInsumo = async (id: string) => {
    if (!loggedUser) return;
    const pathInsumos = `usuarios/${loggedUser.id}/insumos`;
    const pathProdutos = `usuarios/${loggedUser.id}/produtos`;
    try {
      await deleteDoc(doc(db, pathInsumos, id));

      for (const prod of produtos) {
        const hasIngredient = prod.ingredientes.some((ing) => ing.insumoId === id);
        if (hasIngredient) {
          const cleanIngredientes = prod.ingredientes.filter((ing) => ing.insumoId !== id);
          await setDoc(doc(db, pathProdutos, prod.id), {
            ...prod,
            ingredientes: cleanIngredientes
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${pathInsumos}/${id}`);
    }
  };

  // handlers de VENDAS
  const handleAddVenda = async (novaVenda: Venda, baixarEstoque: boolean) => {
    if (!loggedUser) return;
    const pathVendas = `usuarios/${loggedUser.id}/vendas`;
    const pathProdutos = `usuarios/${loggedUser.id}/produtos`;
    try {
      await setDoc(doc(db, pathVendas, novaVenda.id), novaVenda);

      if (baixarEstoque) {
        const prodId = novaVenda.produtoId;
        const qtdVenda = novaVenda.quantidade;
        const prod = produtos.find((p) => p.id === prodId);
        if (prod) {
          const novoEstoque = Math.max(0, prod.estoqueAtual - qtdVenda);
          await setDoc(doc(db, pathProdutos, prodId), {
            ...prod,
            estoqueAtual: novoEstoque
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${pathVendas}/${novaVenda.id}`);
    }
  };

  const handleDeleteVenda = async (id: string) => {
    if (!loggedUser) return;
    const path = `usuarios/${loggedUser.id}/vendas`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  // Abas do Menu do rodapé iOS
  const tabs = [
    { id: 'destaques', label: 'Destaques', icon: TrendingUp },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'insumos', label: 'Insumos', icon: Layers },
    { id: 'vendas', label: 'Vendas', icon: Receipt },
    { id: 'analises', label: 'Análises', icon: BarChart3 },
  ];

  // Renderizador de abas ativo
  const renderTabContent = () => {
    switch (activeTab) {
      case 'destaques':
        return (
          <VisaoGeral
            insumos={insumos}
            produtos={produtos}
            vendas={vendas}
            setActiveTab={setActiveTab}
            businessName={businessName}
            setBusinessName={persistirBusinessName}
            onResetData={handleResetData}
          />
        );
      case 'estoque':
        return (
          <EstoqueProdutos
            produtos={produtos}
            insumos={insumos}
            onAddProduto={handleAddProduto}
            onEditProduto={handleEditProduto}
            onDeleteProduto={handleDeleteProduto}
            onUpdateEstoque={handleUpdateEstoque}
          />
        );
      case 'insumos':
        return (
          <CadastroInsumos
            insumos={insumos}
            onAddInsumo={handleAddInsumo}
            onEditInsumo={handleEditInsumo}
            onDeleteInsumo={handleDeleteInsumo}
          />
        );
      case 'vendas':
        return (
          <HistoricoVendas
            vendas={vendas}
            produtos={produtos}
            insumos={insumos}
            onAddVenda={handleAddVenda}
            onDeleteVenda={handleDeleteVenda}
          />
        );
      case 'analises':
        return (
          <AnaliticaPrevisoes
            insumos={insumos}
            produtos={produtos}
            vendas={vendas}
            onEditProduto={handleEditProduto}
            onAddVenda={handleAddVenda}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthSystem onUpdateUserStatus={setIsUserActive} onUserLogged={setLoggedUser}>
      <LayoutCelular 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs}
        overlay={
          <AcaoRapida
            insumos={insumos}
            produtos={produtos}
            onAddVenda={handleAddVenda}
            onAddInsumo={handleAddInsumo}
            onUpdateEstoque={handleUpdateEstoque}
          />
        }
      >
        {renderTabContent()}
      </LayoutCelular>
    </AuthSystem>
  );
}
