/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { subscribeToQueue, syncOfflineQueue } from '../db/syncManager';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface LayoutCelularProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: { id: string; label: string; icon: React.ComponentType<any> }[];
  overlay?: React.ReactNode;
}

export default function LayoutCelular({
  children,
  activeTab,
  setActiveTab,
  tabs,
  overlay,
}: LayoutCelularProps) {
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [time, setTime] = useState('12:00');

  useEffect(() => {
    const unsubscribe = subscribeToQueue((queue, online, syncing) => {
      setOfflineCount(queue.length);
      setIsOnline(online);
      setIsSyncing(syncing);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-black text-white flex items-center justify-center p-0 sm:p-6 font-sans overflow-hidden">
      {/* Container Adaptativo: No desktop vira Celular iOS, no mobile expande 100% */}
      <div className="w-full h-full sm:max-w-[430px] sm:h-[880px] sm:rounded-[48px] sm:border-[12px] sm:border-[#1C1C1E] sm:ring-4 sm:ring-zinc-900/40 bg-black flex flex-col relative sm:shadow-2xl overflow-hidden self-center">
        
        {/* iOS Native Style Status Bar (Adaptada para Safe Area / Notch em aparelhos reais) */}
        <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50 text-xs text-white select-none">
          <div className="font-semibold tracking-tight text-white/90">{time}</div>
          
          {/* Dynamic Island Center Indicator */}
          <div className="w-[120px] h-[30px] bg-black rounded-full border border-white/5 flex items-center justify-center gap-1.5 px-3">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#30D158] animate-pulse' : 'bg-[#FF453A]'}`} />
            <span className="text-[8px] font-extrabold text-zinc-400 tracking-wider uppercase">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-[#30D158]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-[#FF453A]" />
            )}
            {offlineCount > 0 && (
              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5 animate-pulse">
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {offlineCount}
              </span>
            )}
          </div>
        </div>

        {/* Banner de Operações em Fila Offline */}
        {offlineCount > 0 && (
          <div className="absolute top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-0 right-0 py-2 px-5 bg-[#FF9F0A]/10 border-b border-[#FF9F0A]/10 text-[10px] text-[#FF9F0A] font-medium flex items-center justify-between z-40 backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{offlineCount} operação{offlineCount > 1 ? 'ões salvas' : 'ão salva'} localmente e pendente{offlineCount > 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={() => syncOfflineQueue()}
              disabled={isSyncing}
              className="px-2.5 py-1 bg-[#FF9F0A]/20 hover:bg-[#FF9F0A]/30 active:scale-95 disabled:opacity-50 text-[#FFD60A] hover:text-white rounded-lg text-[9px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1"
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        )}

        {/* Área de Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 bg-black scrollbar-none pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
          {children}
        </div>

        {/* Overlay do Celular (FAB e Modal Rápido) */}
        {overlay}

        {/* iOS Tab Bar de Vidro (Glassmorphism) no Bottom com proteção de Safe Area */}
        <div className="absolute bottom-0 left-0 right-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] h-[calc(5rem+env(safe-area-inset-bottom,0px))] bg-[#161617]/90 backdrop-blur-xl border-t border-white/5 pt-2 px-6 flex justify-around items-center z-40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 relative ${
                  isActive ? 'text-[#0A84FF] scale-105' : 'text-[#8E8E93] hover:text-zinc-400'
                }`}
              >
                <div className="p-1.5 rounded-full transition-colors relative">
                  <Icon className="w-6 h-6 stroke-[2]" />
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0A84FF] rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-40 pointer-events-none hidden sm:block"></div>
      </div>
    </div>
  );
}
