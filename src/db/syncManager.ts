/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  setDoc as firestoreSetDoc, 
  deleteDoc as firestoreDeleteDoc,
  updateDoc as firestoreUpdateDoc,
  doc,
  DocumentReference
} from 'firebase/firestore';
import { db } from './firebase';

const DB_NAME = 'gourmet_stock_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'write_queue';

export interface PendingWrite {
  id?: number;
  path: string;
  collectionPath: string;
  docId: string;
  type: 'set' | 'delete' | 'update';
  data?: any;
  options?: any;
  timestamp: number;
}

// Inicializar IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };
    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

// Buscar fila offline completa
export function getQueue(): Promise<PendingWrite[]> {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }).catch((err) => {
    console.error("Failed to read from IndexedDB:", err);
    return [];
  });
}

// Adicionar à fila offline
export function addToQueue(item: Omit<PendingWrite, 'id' | 'timestamp'>): Promise<number> {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const timestamp = Date.now();
      const request = store.add({ ...item, timestamp });
      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = () => reject(request.error);
    });
  });
}

// Remover item específico da fila offline
export function deleteFromQueue(id: number): Promise<void> {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// Detecção de erros de rede de forma confiável
function isNetworkError(error: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const errMsg = error?.message || String(error);
  const errCode = error?.code;
  return (
    errCode === 'unavailable' ||
    errCode === 'deadline-exceeded' ||
    errMsg.includes('offline') ||
    errMsg.includes('network') ||
    errMsg.includes('Could not reach Cloud Firestore')
  );
}

// Estado reativo da sincronização / fila
type QueueSubscriber = (queue: PendingWrite[], isOnline: boolean, isSyncing: boolean) => void;
const subscribers = new Set<QueueSubscriber>();

let currentQueueCache: PendingWrite[] = [];
let localIsOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let localIsSyncing = false;

export function subscribeToQueue(callback: QueueSubscriber) {
  subscribers.add(callback);
  callback([...currentQueueCache], localIsOnline, localIsSyncing);
  return () => {
    subscribers.delete(callback);
  };
}

function notifySubscribers() {
  subscribers.forEach((cb) => cb([...currentQueueCache], localIsOnline, localIsSyncing));
}

// Monitoramento ativo e carregamento inicial
if (typeof window !== 'undefined') {
  getQueue().then((q) => {
    currentQueueCache = q;
    notifySubscribers();
    if (q.length > 0 && navigator.onLine) {
      syncOfflineQueue();
    }
  });

  window.addEventListener('online', () => {
    localIsOnline = true;
    notifySubscribers();
    syncOfflineQueue();
  });

  window.addEventListener('offline', () => {
    localIsOnline = false;
    notifySubscribers();
  });

  // Polling e verificação ativa a cada 15 segundos
  setInterval(() => {
    if (currentQueueCache.length > 0 && navigator.onLine) {
      syncOfflineQueue().catch(err => console.error("Periodic sync error:", err));
    }
  }, 15000);
}

// Wrapper resiliente de setDoc
export async function setDoc(docRef: DocumentReference<any>, data: any, options?: any): Promise<void> {
  const path = docRef.path;

  if (!localIsOnline) {
    await addToQueue({
      path,
      collectionPath: docRef.parent.path,
      docId: docRef.id,
      type: 'set',
      data,
      options
    });
    currentQueueCache = await getQueue();
    notifySubscribers();
    return;
  }

  try {
    // Se já existem itens na fila, enfileiramos para manter a ordem causal
    if (currentQueueCache.length > 0) {
      await addToQueue({
        path,
        collectionPath: docRef.parent.path,
        docId: docRef.id,
        type: 'set',
        data,
        options
      });
      currentQueueCache = await getQueue();
      notifySubscribers();
      syncOfflineQueue().catch(err => console.error("Sync triggered by setDoc error:", err));
      return;
    }

    await firestoreSetDoc(docRef, data, options);
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("FALHA DE REDE: Gravando setDoc na fila offline (IndexedDB):", error);
      await addToQueue({
        path,
        collectionPath: docRef.parent.path,
        docId: docRef.id,
        type: 'set',
        data,
        options
      });
      currentQueueCache = await getQueue();
      notifySubscribers();
    } else {
      throw error;
    }
  }
}

// Wrapper resiliente de deleteDoc
export async function deleteDoc(docRef: DocumentReference<any>): Promise<void> {
  const path = docRef.path;

  if (!localIsOnline) {
    await addToQueue({
      path,
      collectionPath: docRef.parent.path,
      docId: docRef.id,
      type: 'delete'
    });
    currentQueueCache = await getQueue();
    notifySubscribers();
    return;
  }

  try {
    if (currentQueueCache.length > 0) {
      await addToQueue({
        path,
        collectionPath: docRef.parent.path,
        docId: docRef.id,
        type: 'delete'
      });
      currentQueueCache = await getQueue();
      notifySubscribers();
      syncOfflineQueue().catch(err => console.error("Sync triggered by deleteDoc error:", err));
      return;
    }

    await firestoreDeleteDoc(docRef);
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("FALHA DE REDE: Gravando deleteDoc na fila offline (IndexedDB):", error);
      await addToQueue({
        path,
        collectionPath: docRef.parent.path,
        docId: docRef.id,
        type: 'delete'
      });
      currentQueueCache = await getQueue();
      notifySubscribers();
    } else {
      throw error;
    }
  }
}

// Wrapper resiliente de updateDoc
export async function updateDoc(docRef: DocumentReference<any>, data: any): Promise<void> {
  const path = docRef.path;

  if (!localIsOnline) {
    await addToQueue({
      path,
      collectionPath: docRef.parent.path,
      docId: docRef.id,
      type: 'update',
      data
    });
    currentQueueCache = await getQueue();
    notifySubscribers();
    return;
  }

  try {
    if (currentQueueCache.length > 0) {
      await addToQueue({
        path,
        collectionPath: docRef.parent.path,
        docId: docRef.id,
        type: 'update',
        data
      });
      currentQueueCache = await getQueue();
      notifySubscribers();
      syncOfflineQueue().catch(err => console.error("Sync triggered by updateDoc error:", err));
      return;
    }

    await firestoreUpdateDoc(docRef, data);
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("FALHA DE REDE: Gravando updateDoc na fila offline (IndexedDB):", error);
      await addToQueue({
        path,
        collectionPath: docRef.parent.path,
        docId: docRef.id,
        type: 'update',
        data
      });
      currentQueueCache = await getQueue();
      notifySubscribers();
    } else {
      throw error;
    }
  }
}

// Sincronização automática contínua
export async function syncOfflineQueue(): Promise<void> {
  if (localIsSyncing) return;
  const queue = await getQueue();
  if (queue.length === 0) return;

  localIsSyncing = true;
  notifySubscribers();

  try {
    const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const item of sorted) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }

      const docRef = doc(db, item.path);

      try {
        if (item.type === 'set') {
          await firestoreSetDoc(docRef, item.data, item.options);
        } else if (item.type === 'update') {
          await firestoreUpdateDoc(docRef, item.data);
        } else if (item.type === 'delete') {
          await firestoreDeleteDoc(docRef);
        }

        if (item.id !== undefined) {
          await deleteFromQueue(item.id);
        }
      } catch (err: any) {
        if (isNetworkError(err)) {
          console.warn("Erro temporário de rede ao sincronizar. Pausando fila:", err);
          break; // Pausa para tentar mais tarde
        } else {
          console.error("Erro crítico ao sincronizar item (descartando inválido):", err);
          if (item.id !== undefined) {
            await deleteFromQueue(item.id);
          }
        }
      }
    }
  } catch (error) {
    console.error("Erro na rotina de sincronização:", error);
  } finally {
    localIsSyncing = false;
    currentQueueCache = await getQueue();
    notifySubscribers();
  }
}

// Função utilitária para intercalar modificações locais aos dados carregados em tempo real do Firestore
export function mergePendingQueue(
  userId: string,
  currentInsumos: any[],
  currentProdutos: any[],
  currentVendas: any[],
  queue: PendingWrite[]
) {
  let insumos = [...currentInsumos];
  let produtos = [...currentProdutos];
  let vendas = [...currentVendas];

  const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);

  for (const item of sortedQueue) {
    const parts = item.path.split('/');
    // Formato: usuarios/{userId}/insumos/{id}
    if (parts[0] === 'usuarios' && parts[1] === userId && parts[2]) {
      const type = parts[2]; // 'insumos' | 'produtos' | 'vendas'
      const docId = parts[3];

      if (!docId) continue;

      if (type === 'insumos') {
        if (item.type === 'delete') {
          insumos = insumos.filter((i) => i.id !== docId);
        } else {
          const index = insumos.findIndex((i) => i.id === docId);
          const payload = item.data;
          if (index > -1) {
            insumos[index] = { ...insumos[index], ...payload };
          } else if (payload) {
            insumos.push(payload);
          }
        }
      } else if (type === 'produtos') {
        if (item.type === 'delete') {
          produtos = produtos.filter((p) => p.id !== docId);
        } else {
          const index = produtos.findIndex((p) => p.id === docId);
          const payload = item.data;
          if (index > -1) {
            produtos[index] = { ...produtos[index], ...payload };
          } else if (payload) {
            produtos.push(payload);
          }
        }
      } else if (type === 'vendas') {
        if (item.type === 'delete') {
          vendas = vendas.filter((v) => v.id !== docId);
        } else {
          const index = vendas.findIndex((v) => v.id === docId);
          const payload = item.data;
          if (index > -1) {
            vendas[index] = { ...vendas[index], ...payload };
          } else if (payload) {
            vendas.push(payload);
          }
        }
      }
    }
  }

  return { insumos, produtos, vendas };
}

// Intercalar businessName editado localmente
export function mergePendingProfile(
  userId: string,
  currentProfileName: string,
  queue: PendingWrite[]
): string {
  let name = currentProfileName;
  const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
  for (const item of sortedQueue) {
    if (item.path === `usuarios/${userId}` && item.data && item.data.businessName !== undefined) {
      name = item.data.businessName;
    }
  }
  return name;
}
