/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { db, handleFirestoreError, OperationType, auth, googleProvider } from '../db/firebase';
import { signInWithPopup } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { setDoc, deleteDoc, updateDoc } from '../db/syncManager';
import { 
  Lock, 
  User, 
  KeyRound, 
  Clock, 
  Plus, 
  LogOut, 
  Trash2, 
  AlertCircle, 
  Check, 
  ShieldAlert, 
  Calendar,
  LockKeyhole,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  ChefHat,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Chaves do LocalStorage para sessão
const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'microSaaS_auth_current',
};

// Admin default (Admin Supremo)
const MASTER_ADMIN = {
  username: 'brtreino@gmail.com',
  hash: 'Escroto12.',
};

// Auxiliar para identificar Master Admin (suporta brtreino@gmail.com e brtreino2@gmail.com)
const isMasterAdmin = (username: string | undefined): boolean => {
  if (!username) return false;
  const lower = username.trim().toLowerCase();
  return lower === 'brtreino@gmail.com' || lower === 'brtreino2@gmail.com';
};

interface AuthSystemProps {
  children: React.ReactNode;
  onUpdateUserStatus: (isActive: boolean) => void;
  onUserLogged?: (user: Usuario | null) => void;
}

export default function AuthSystem({ children, onUpdateUserStatus, onUserLogged }: AuthSystemProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [currentUser, setCurrentUser] = useState<Usuario | typeof MASTER_ADMIN | null>(null);
  
  // Telas: 'login' | 'app' | 'admin' | 'expired'
  const [systemState, setSystemState] = useState<'login' | 'app' | 'admin' | 'expired'>('login');

  // Formulário Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Formulário para criar usuário no painel Admin
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<string | null>(null);

  // Alterar Senha (Usuário Logado)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // Sincronizar usuários com Firestore em tempo real
  useEffect(() => {
    const colRef = collection(db, 'usuarios');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Usuario[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as Usuario;
        list.push({
          ...u,
          id: u.id || docSnap.id,
          username: u.username || docSnap.id,
        });
      });
      
      // Se estiver vazio no primeiro boot, semear os usuários de demonstração
      if (snapshot.empty) {
        const initialUsers: Usuario[] = [
          {
            id: 'padaria_panis',
            username: 'padaria_panis',
            hash: '123456',
            expiraEm: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            seededInsumos: false,
            seededProdutos: false,
            seededVendas: false,
          },
          {
            id: 'doce_mel',
            username: 'doce_mel',
            hash: 'doce123',
            expiraEm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            seededInsumos: false,
            seededProdutos: false,
            seededVendas: false,
          }
        ];
        initialUsers.forEach(async (u) => {
          try {
            await setDoc(doc(db, 'usuarios', u.id), u);
          } catch (e) {
            console.error("Erro ao popular usuário inicial:", e);
          }
        });
        setUsers(initialUsers);
      } else {
        setUsers(list);
      }

      // Sincronizar dados do usuário atualmente logado
      const cached = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && !isMasterAdmin(parsed.username)) {
          const freshData = list.find(u => u.id === parsed.id);
          if (freshData) {
            setCurrentUser(freshData);
            localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshData));
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'usuarios');
    });

    // Restaurar sessão local existente
    const cachedCurrent = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    if (cachedCurrent) {
      try {
        setCurrentUser(JSON.parse(cachedCurrent));
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      }
    }

    return () => unsubscribe();
  }, []);

  // Monitorar alterações do usuário ativo para ajustar a visualização do app/sistema
  useEffect(() => {
    if (!currentUser) {
      setSystemState('login');
      onUpdateUserStatus(false);
      onUserLogged?.(null);
      return;
    }

    if (isMasterAdmin(currentUser.username)) {
      setSystemState('admin');
      onUpdateUserStatus(false);
      onUserLogged?.(null);
      return;
    }

    // Informar usuário ao app pai
    onUserLogged?.(currentUser as Usuario);

    // Caso seja usuário comum, atualizar estado em relação ao vencimento do plano
    const interval = setInterval(() => {
      checkUserExpiration();
    }, 5000); // validar a cada 5s

    checkUserExpiration();
    return () => clearInterval(interval);
  }, [currentUser, users]);

  // Checa expiração da assinatura do usuário comum
  const checkUserExpiration = () => {
    if (!currentUser || isMasterAdmin(currentUser.username)) return;

    // Achar o registro mais recente do usuário no banco local
    const freshUser = users.find(u => u.id === (currentUser as Usuario).id);
    const expirationStr = freshUser ? freshUser.expiraEm : (currentUser as Usuario).expiraEm;
    const isExpired = new Date(expirationStr).getTime() < Date.now();

    if (isExpired) {
      setSystemState('expired');
      onUpdateUserStatus(false);
    } else {
      setSystemState('app');
      onUpdateUserStatus(true);
    }
  };

  // Calcular dias restantes legíveis
  const getDaysRemainingText = (expiraEmStr: string) => {
    const diff = new Date(expiraEmStr).getTime() - Date.now();
    if (diff <= 0) {
      // Expirou
      const hrs = Math.abs(Math.round(diff / (1000 * 60 * 60)));
      if (hrs < 24) {
        return `Expirado há ${hrs}h`;
      }
      return `Expirado há ${Math.round(hrs / 24)} dias`;
    } else {
      const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.round((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (dias === 1) {
        return `Expira em algumas horas (~${hrs}h)`;
      }
      return `${dias} dias restantes`;
    }
  };

  // Autenticar com Google
  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user || !user.email) {
        setLoginError('Não foi possível obter o e-mail da sua conta Google.');
        return;
      }

      const emailLower = user.email.trim().toLowerCase();

      // 1. Verificar Admin Supremo
      if (isMasterAdmin(emailLower)) {
        const adminSession = { username: emailLower, hash: 'google_oauth_auth' };
        setCurrentUser(adminSession);
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(adminSession));
        return;
      }

      // 2. Verificar Usuários Comuns no banco sincronizado Firestore
      const userMatched = users.find(u => u.username.toLowerCase() === emailLower || u.id.toLowerCase() === emailLower);
      
      if (userMatched) {
        // Encontrou, faz login com a conta existente
        setCurrentUser(userMatched);
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(userMatched));
      } else {
        // Se não existir, cria um novo usuário comum no banco automaticamente com 7 dias de teste grátis
        const novoUsuario: Usuario = {
          id: emailLower,
          username: emailLower,
          hash: 'google_oauth_auth',
          expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias iniciais do Trial
          seededInsumos: false,
          seededProdutos: false,
          seededVendas: false
        };

        await setDoc(doc(db, 'usuarios', emailLower), novoUsuario);
        setCurrentUser(novoUsuario);
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(novoUsuario));
      }
    } catch (error: any) {
      console.error('Erro de Login por Google:', error);
      if (error && error.code === 'auth/popup-blocked') {
        setLoginError('O popup de login foi bloqueado pelo seu navegador. Por favor, ative a permissão de popups para fazer login.');
      } else {
        setLoginError(`Falha na autenticação do Google: ${error.message || error}`);
      }
    }
  };

  // Autenticar (Login)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const targetUsername = loginUsername.trim().toLowerCase();

    // 1. Verificar Admin Supremo
    if (isMasterAdmin(targetUsername) && loginPassword === MASTER_ADMIN.hash) {
      const adminSession = { username: targetUsername, hash: MASTER_ADMIN.hash };
      setCurrentUser(adminSession);
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(adminSession));
      setLoginUsername('');
      setLoginPassword('');
      return;
    }

    // 2. Verificar Usuários Comuns no banco sincronizado Firestore
    const userMatched = users.find(u => u.username.toLowerCase() === targetUsername);
    if (!userMatched) {
      setLoginError('Usuário não cadastrado.');
      return;
    }

    if (userMatched.hash !== loginPassword) {
      setLoginError('Senha incorreta.');
      return;
    }

    // Sucesso
    setCurrentUser(userMatched);
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(userMatched));
    setLoginUsername('');
    setLoginPassword('');
  };

  // Cadastrar Novo Usuário (Ação do Admin Supremo)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);

    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername || !newPassword) {
      setAdminMessage({ type: 'error', text: 'Preencha o usuário e a senha.' });
      return;
    }

    if (isMasterAdmin(cleanUsername)) {
      setAdminMessage({ type: 'error', text: 'Não é possível duplicar o admin supremo.' });
      return;
    }

    const exists = users.some(u => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      setAdminMessage({ type: 'error', text: 'Este nome de usuário já está cadastrado.' });
      return;
    }

    // Criar com 7 dias de cortesia inicial por padrão e flags de semeadura inicial como false
    const novoUsuario: Usuario = {
      id: cleanUsername, // ID legível e único (o próprio username limpo)
      username: cleanUsername,
      hash: newPassword,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias iniciais
      seededInsumos: false,
      seededProdutos: false,
      seededVendas: false
    };

    try {
      await setDoc(doc(db, 'usuarios', cleanUsername), novoUsuario);
      setNewUsername('');
      setNewPassword('');
      setAdminMessage({ type: 'success', text: `Usuário '${cleanUsername}' criado com 7 dias com sucesso em Firestore!` });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `usuarios/${cleanUsername}`);
    }
  };

  // Excluir usuário (Ação do Admin)
  const handleDeleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      setAdminMessage({ type: 'success', text: 'Usuário removido da base de dados do Firestore.' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `usuarios/${id}`);
    }
  };

  // Adicionar Tempo (Ação do Admin Supremo)
  const handleAddDays = async (userId: string, diasAdicionais: number) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;

    const curExp = new Date(userToUpdate.expiraEm).getTime();
    const now = Date.now();
    // Se já está expirado, a contagem começa do agora. Se ativo, adiciona ao restante.
    const base = curExp > now ? curExp : now;
    const novoVencimento = new Date(base + diasAdicionais * 24 * 60 * 60 * 1000).toISOString();
    
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        expiraEm: novoVencimento
      });
      setAdminMessage({ 
        type: 'success', 
        text: `Tempo de uso estendido em +${diasAdicionais} dias para o usuário ${userToUpdate.username}.` 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  };

  // Usuário comum altera sua própria senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!currentUser || isMasterAdmin(currentUser.username)) return;

    const freshUser = users.find(u => u.id === (currentUser as Usuario).id);
    if (!freshUser) return;

    if (freshUser.hash !== oldPassword) {
      setChangePassError('Senha atual incorreta.');
      return;
    }

    if (newPasswordVal.length < 4) {
      setChangePassError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    try {
      await updateDoc(doc(db, 'usuarios', freshUser.id), {
        hash: newPasswordVal
      });
      setChangePassSuccess('Senha de acesso alterada no Firestore!');
      setOldPassword('');
      setNewPasswordVal('');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setChangePassSuccess('');
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${freshUser.id}`);
    }
  };

  // Sair de qualquer conta
  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    setSystemState('login');
    setIsChangePasswordOpen(false);
    onUserLogged?.(null);
  };

  // Retornar dias legíveis para usuário atual logado
  const getCurrentUserRemainingText = () => {
    if (!currentUser || isMasterAdmin(currentUser.username)) return '';
    const freshUser = users.find(u => u.id === (currentUser as Usuario).id);
    return getDaysRemainingText(freshUser ? freshUser.expiraEm : (currentUser as Usuario).expiraEm);
  };

  // Retorna se o usuario logado está com licença ativa
  const isCurrentUserActive = () => {
    if (!currentUser) return false;
    if (isMasterAdmin(currentUser.username)) return true;
    const freshUser = users.find(u => u.id === (currentUser as Usuario).id);
    const expTime = new Date(freshUser ? freshUser.expiraEm : (currentUser as Usuario).expiraEm).getTime();
    return expTime > Date.now();
  };

  return (
    <div className="w-full min-h-screen relative bg-zinc-950 text-white">
      
      {/* 1. USUÁRIO ATIVO & PERÍODO VÁLIDO: EXIBIR CONTEÚDO ORIGINAL */}
      {systemState === 'app' && (
        <>
          {/* Header Superior Flutuante Minimalista para Detalhes do Usuário logado */}
          <div className="absolute top-2 left-6 right-6 h-10 flex justify-between items-center z-40 select-none">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wide">
                {(currentUser as Usuario).username}
              </span>
            </div>

            {/* Menu de Conta e Sair */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setChangePassError('');
                  setChangePassSuccess('');
                  setIsChangePasswordOpen(true);
                }}
                className="px-3 py-1.5 bg-[#1C1C1E]/80 backdrop-blur-md border border-white/5 rounded-full text-[10px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <Clock className="w-3 h-3 text-[#FF9F0A]" />
                <span>{getCurrentUserRemainingText()}</span>
              </button>

              <button
                onClick={handleLogOut}
                className="p-1.5 bg-[#1C1C1E]/85 backdrop-blur-md border border-white/5 hover:border-red-500/25 rounded-full text-zinc-400 hover:text-red-400 cursor-pointer active:scale-95 transition-all"
                title="Sair do Sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* O App Core */}
          {children}

          {/* Modal de Configuração de Conta - Alterar Senha */}
          <AnimatePresence>
            {isChangePasswordOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-md z-55 flex items-center justify-center p-5"
                />

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="absolute left-6 right-6 max-h-[70%] bg-[#1a1a1c] border border-white/15 rounded-3xl z-60 p-5 p-y-6 flex flex-col text-white shadow-2xl overflow-hidden"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">Gerenciar Conta</h3>
                      <p className="text-[9px] text-[#8E8E93] mt-0.5">Usuário: {(currentUser as Usuario).username}</p>
                    </div>
                    <button
                      onClick={() => setIsChangePasswordOpen(false)}
                      className="px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 hover:text-white text-[10px] font-bold cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>

                  {/* Informações da Licença */}
                  <div className="mt-4 bg-black/45 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#FF9F0A]" />
                      <div className="text-left">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Tempo Contratado</p>
                        <p className="text-xs font-semibold text-zinc-100">{getCurrentUserRemainingText()}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-extrabold bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20 px-2 py-0.5 rounded-full select-none">
                      Licença Ativa
                    </span>
                  </div>

                  {/* Formulário de Redefinição de Senha */}
                  <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-left">Alterar Senha de Acesso</h4>
                    
                    <div>
                      <input
                        type="password"
                        required
                        placeholder="Senha atual"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a84ff] font-semibold"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        required
                        placeholder="Nova senha (mínimo 4 caracteres)"
                        value={newPasswordVal}
                        onChange={(e) => setNewPasswordVal(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a84ff] font-semibold"
                      />
                    </div>

                    {changePassError && (
                      <p className="text-[10px] font-bold text-[#FF453A] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {changePassError}
                      </p>
                    )}

                    {changePassSuccess && (
                      <p className="text-[10px] font-bold text-[#30D158] flex items-center gap-1 bg-[#30D158]/10 p-2 rounded-lg border border-[#30D158]/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        {changePassSuccess}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#0A84FF] hover:bg-opacity-90 font-bold text-[10.5px] rounded-xl cursor-pointer"
                      >
                        Salvar Nova Senha
                      </button>
                      <button
                        type="button"
                        onClick={handleLogOut}
                        className="py-2 px-3 bg-[#FF453A]/25 border border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/45 font-bold text-[10.5px] rounded-xl cursor-pointer flex items-center justify-center gap-1"
                        title="Desconectar da conta"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sair
                      </button>
                    </div>
                  </form>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 2. ADMINISTRAÇÃO SUPREMA: PAINEL DE CONTROLE */}
      {systemState === 'admin' && (
        <div className="fixed inset-0 bg-black flex flex-col p-6 overflow-hidden z-50">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/5 pb-4 shrink-0 mt-2 select-none">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-[#FF9F0A] uppercase">
                <LockKeyhole className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Admin Supremo</span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">Painel MicroSaaS</h2>
            </div>

            <button
              onClick={handleLogOut}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 rounded-xl cursor-pointer active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FF453A]" />
              Sair
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="flex-1 overflow-y-auto space-y-5 py-4 scrollbar-none pb-10">
            {/* Mensagem Global de Ações */}
            <AnimatePresence>
              {adminMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-2xl text-[11px] font-semibold flex items-center gap-2 ${
                    adminMessage.type === 'success'
                      ? 'bg-[#30D158]/10 border border-[#30D158]/20 text-[#30D158]'
                      : 'bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A]'
                  }`}
                >
                  {adminMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#30D158] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#FF453A] flex-shrink-0" />
                  )}
                  <span>{adminMessage.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SEÇÃO 1: CRIAR NOVO USUÁRIO */}
            <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4.5">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3.5 text-left">Cadastrar Nova Licença</h3>
              
              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-extrabold text-[#8E8E93] uppercase block mb-1">usuário</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: confeitaria"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl pl-8.5 pr-2 py-2 text-xs text-white focus:outline-none focus:border-[#FF9F0A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold text-[#8E8E93] uppercase block mb-1">senha senha</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1234"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl pl-8.5 pr-2 py-2 text-xs text-white focus:outline-none focus:border-[#FF9F0A] font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-[#FF9F0A] to-[#FF3B30] hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-lg transition-transform cursor-pointer"
                >
                  Inserir Credencial + Cortesia (7 dias)
                </button>
              </form>
            </div>

            {/* SEÇÃO 2: LISTAR USUÁRIOS & ATRIBUIR DIAS (7, 15, 30) */}
            <div className="space-y-3 select-none">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1 text-left">Licenças Registradas ({users.length})</h3>

              {users.length === 0 ? (
                <div className="bg-[#1C1C1E]/50 border border-white/5 rounded-2xl py-8 text-center text-xs text-zinc-500">
                  Nenhum usuário comum cadastrado ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map(user => {
                    const isExpired = new Date(user.expiraEm).getTime() < Date.now();
                    return (
                      <div 
                        key={user.id} 
                        className={`bg-[#1C1C1E] border rounded-2xl p-4 flex flex-col space-y-3.5 transition-all ${
                          isExpired ? 'border-[#FF453A]/20 bg-gradient-to-b from-[#1C1C1E] to-[#FF453A]/5' : 'border-white/5'
                        }`}
                      >
                        {/* Infos Primárias */}
                        <div className="flex justify-between items-start">
                          <div className="text-left">
                            <span className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-zinc-400" />
                              {user.username}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                              Senha ativa: <strong className="text-zinc-300 font-semibold">{user.hash}</strong>
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isExpired 
                                ? 'bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20' 
                                : 'bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20'
                            }`}>
                              {isExpired ? 'Suspenso / Expirado' : 'Ativo'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold mt-1">
                              {getDaysRemainingText(user.expiraEm)}
                            </span>
                          </div>
                        </div>

                        {/* Controles de Tempo (+7, +15, +30) */}
                        <div className="bg-black/35 p-2 rounded-xl flex items-center justify-between gap-1">
                          <span className="text-[9px] font-extrabold text-[#8E8E93] uppercase tracking-wider pl-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#FF9F0A]" />
                            Adicionar Tempo:
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAddDays(user.id, 7)}
                              className="px-2.5 py-1.5 bg-[#FF9F0A]/15 border border-[#FF9F0A]/30 text-[#FF9F0A] rounded-lg text-[9.5px] font-black hover:bg-[#FF9F0A] hover:text-black transition-colors cursor-pointer"
                            >
                              + 7d
                            </button>
                            <button
                              onClick={() => handleAddDays(user.id, 15)}
                              className="px-2.5 py-1.5 bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-[#0A84FF] rounded-lg text-[9.5px] font-black hover:bg-[#0A84FF] hover:text-white transition-colors cursor-pointer"
                            >
                              + 15d
                            </button>
                            <button
                              onClick={() => handleAddDays(user.id, 30)}
                              className="px-2.5 py-1.5 bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] rounded-lg text-[9.5px] font-black hover:bg-[#30D158] hover:text-black transition-colors cursor-pointer"
                            >
                              + 30d
                            </button>
                          </div>
                        </div>

                        {/* Botão de Excluir */}
                        <div className="flex justify-end pt-1">
                          {confirmingDeleteUserId === user.id ? (
                            <div className="flex items-center gap-1.5 select-none animate-fade-in bg-red-950/20 border border-red-500/15 p-1 rounded-lg">
                              <span className="text-[9.5px] font-bold text-red-400 uppercase px-1">Excluir?</span>
                              <button
                                onClick={() => {
                                  handleDeleteUser(user.id);
                                  setConfirmingDeleteUserId(null);
                                }}
                                className="px-2.5 py-1 bg-red-650 hover:bg-red-650 font-black text-[9.5px] text-white rounded-md cursor-pointer transition-colors active:scale-95"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmingDeleteUserId(null)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 font-bold text-[9.5px] text-zinc-300 rounded-md cursor-pointer transition-colors active:scale-95"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setConfirmingDeleteUserId(user.id);
                              }}
                              className="text-zinc-500 hover:text-red-400 text-[10px] flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-red-400/5 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir Licença
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. USUÁRIO COM TEMPO DE USO EXPIRADO: BLOQUEADO */}
      {systemState === 'expired' && (
        <div className="fixed inset-0 bg-black flex flex-col p-6 text-white justify-between z-50">
          <div className="my-auto max-w-sm text-center space-y-6 select-none px-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#FF453A]/15 border border-[#FF453A]/20 flex items-center justify-center animate-bounce">
              <ShieldAlert className="w-8 h-8 text-[#FF453A]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">Tempo de Uso Esgotado</h1>
              <p className="text-[#8E8E93] text-sm text-center leading-relaxed">
                Olá, <strong className="text-white font-bold">{(currentUser as Usuario).username}</strong>. 
                Infelizmente o seu plano de acesso ao estoque e insumos expirou. 
              </p>
              <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl mt-4">
                <p className="text-xs text-amber-500/90 font-bold flex items-center gap-1 justify-center mb-1">
                  <Hourglass className="w-3.5 h-3.5 animate-spin" />
                  Assinatura Suspensa
                </p>
                <p className="text-[11px] text-zinc-400">
                  Seu usuário continua salvo no MicroSaaS, mas você precisa que o <strong>Admin Supremo</strong> adicione mais dias.
                </p>
              </div>
            </div>

            {/* Controles de Autoatendimento do usuário bloqueado */}
            <div className="space-y-3 pt-4">
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full py-2.5 bg-[#1C1C1E] border border-white/10 hover:border-white/20 hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-[#0A84FF]" />
                Alterar Senha do Usuário
              </button>

              <button
                onClick={handleLogOut}
                className="w-full py-2.5 bg-[#FF453A]/15 hover:bg-[#FF453A]/25 border border-[#FF453A]/30 rounded-xl text-xs font-bold text-[#FF453A] cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Desconectar da Conta
              </button>
            </div>
          </div>

          <p className="text-[10px] text-zinc-600 text-center select-none pb-4">
            Contate o administrador para obter +7, +15 ou +30 dias de uso.
          </p>

          {/* Modal de Alterar Senha (mesmo que esteja expirado, o usuário pode auto-gerenciar a senha!) */}
          <AnimatePresence>
            {isChangePasswordOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-md z-55 flex items-center justify-center p-5"
                />

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="absolute left-6 right-6 max-h-[70%] bg-[#1a1a1c] border border-white/15 rounded-3xl z-60 p-5 p-y-6 flex flex-col text-white shadow-2xl overflow-hidden"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">Alterar Minha Senha</h3>
                      <p className="text-[9px] text-[#8E8E93] mt-0.5">Usuário: {(currentUser as Usuario).username}</p>
                    </div>
                    <button
                      onClick={() => setIsChangePasswordOpen(false)}
                      className="px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 hover:text-white text-[10px] font-bold cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>

                  <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
                    <div>
                      <input
                        type="password"
                        required
                        placeholder="Senha atual"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a84ff] font-semibold"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        required
                        placeholder="Nova senha (mínimo 4 caracteres)"
                        value={newPasswordVal}
                        onChange={(e) => setNewPasswordVal(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a84ff] font-semibold"
                      />
                    </div>

                    {changePassError && (
                      <p className="text-[10px] font-bold text-[#FF453A] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {changePassError}
                      </p>
                    )}

                    {changePassSuccess && (
                      <p className="text-[10px] font-bold text-[#30D158] flex items-center gap-1 bg-[#30D158]/10 p-2 rounded-lg border border-[#30D158]/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        {changePassSuccess}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#0A84FF] hover:bg-opacity-90 font-bold text-[10.5px] rounded-xl cursor-pointer"
                    >
                      Salvar Nova Senha
                    </button>
                  </form>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 4. TELA GERAL DE LOGIN */}
      {systemState === 'login' && (
        <div className="fixed inset-0 bg-[#0B0A0E] flex flex-col p-6 text-white justify-between overflow-y-auto select-none font-sans scrollbar-none z-50">
          
          {/* Subtle elegant glass glowing lights */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none -mr-40 -mt-20 z-0" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -ml-40 -mb-20 z-0" />

          {/* Spacer */}
          <div className="h-4 pointer-events-none shrink-0" />

          <div className="w-full max-w-sm mx-auto my-auto space-y-5 z-10">
            
            {/* Header / Logo branding */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#141219] border border-white/10 flex items-center justify-center shadow-xl relative group transition-all duration-300 hover:border-amber-500/30">
                  <div className="absolute inset-0 bg-amber-500/5 rounded-2xl blur-md opacity-60" />
                  <ChefHat className="w-6 h-6 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#9A98A5] bg-white/5 py-0.5 px-2 rounded-full border border-white/5 select-none font-sans">
                    SaaS Portal
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
                  <span>Bake</span>
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent font-extrabold">SaaS</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase tracking-widest leading-none self-center">Pro</span>
                </h1>
                <p className="text-[#8E8D99] text-xs font-semibold">Sistema Integrado de Receitas e Estoque</p>
              </div>
            </div>

            {/* Main Form Box */}
            <div className="bg-[#121115]/90 border border-white/5 backdrop-blur-xl rounded-3xl p-5.5 relative shadow-inner overflow-hidden">
              {/* Premium accent colored bar at the top card contour */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Field 1: User */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-[10px] font-bold text-[#A8A7BC] uppercase tracking-wider">Inquilino / Usuário</label>
                    <span className="text-[9px] text-[#FF9F0A]/90 font-semibold bg-[#FF9F0A]/5 px-1.5 py-0.5 rounded border border-[#FF9F0A]/10">SaaS Tenant</span>
                  </div>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: padaria_panis ou e-mail"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full bg-[#1A191F] border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-base sm:text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/10 font-semibold transition-all"
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-[10px] font-bold text-[#A8A7BC] uppercase tracking-wider">Chave de Segurança</label>
                    <button
                      type="button"
                      onClick={() => alert("Esqueceu sua senha? Solicite redefinição e novos dias diretamente ao Admin Supremo no painel corporativo.")}
                      className="text-[9.5px] text-amber-500 hover:text-amber-400 font-bold hover:underline transition-all"
                    >
                      Esqueceu as credenciais?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                    <input
                      type="password"
                      required
                      placeholder="Sua senha de assinatura"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-[#1A191F] border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-base sm:text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/10 font-semibold transition-all"
                    />
                  </div>
                </div>

                {/* Optional parameters row */}
                <div className="flex items-center justify-between py-1 text-left px-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      defaultChecked 
                      className="accent-amber-500 rounded border-white/10 bg-zinc-900 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] text-[#A8A7BC] font-semibold">Manter conectado</span>
                  </label>
                  <span className="text-[10px] text-[#30D158] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                    Firebase DB Sync
                  </span>
                </div>

                {/* Database errors if login reports wrong info */}
                {loginError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl text-[11px] text-red-400 font-bold flex items-center gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FF453A]" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submission button with gradient orange */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 font-extrabold text-xs text-white rounded-2xl shadow-[0_4px_24px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Autenticar no Sistema</span>
                  <ArrowRight className="w-4 h-4 text-white stroke-[2.5]" />
                </button>

                {/* Separador */}
                <div className="flex items-center py-1">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="px-2.5 text-[9px] text-[#8E8D99] font-bold uppercase tracking-widest">Ou entrar com</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Botão de Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3.5 bg-[#1A191F] hover:bg-[#25242C] border border-white/5 text-xs font-bold text-white rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.281 1.094 15.566 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"
                    />
                  </svg>
                  <span>Entrar com o Google</span>
                </button>
              </form>
            </div>

            {/* Quick access removed for SaaS compliance - users must now log in with their assigned licenses or the master admin credentials */}
          </div>

          {/* Footer bar */}
          <div className="text-center pt-2 select-none shrink-0 z-10">
            <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">
              BakeSaaS Platform &copy; {new Date().getFullYear()}
            </p>
            <p className="text-[8.5px] text-zinc-700 font-medium mt-0.5">
              Secure Cloud Engine &middot; Realtime Sync Node
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
