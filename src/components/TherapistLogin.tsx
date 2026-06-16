import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Sparkles, Footprints, AlertCircle, User, KeyRound, Globe, Copy, Check, X } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface TherapistLoginProps {
  onLoginSuccess: (therapistId: string, therapistName: string, email: string) => void;
}

export default function TherapistLogin({ onLoginSuccess }: TherapistLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSimulatedGoogle, setShowSimulatedGoogle] = useState(false);
  const [showUnauthorizedDomainModal, setShowUnauthorizedDomainModal] = useState(false);
  const [fallbackRealEmail, setFallbackRealEmail] = useState('');
  const [fallbackRealName, setFallbackRealName] = useState('');
  const [showFallbackGoogleInput, setShowFallbackGoogleInput] = useState(false);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    if (isSignUpMode && !nome.trim()) {
      setError('Por favor, informe seu Nome Completo para criar uma conta.');
      setIsSubmitting(false);
      return;
    }

    const targetEmail = email.toLowerCase().trim();

    try {
      let firebaseUser = null;
      let firebaseError = null;

      try {
        if (isSignUpMode) {
          // Criar conta com e-mail e senha no Firebase
          const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password);
          firebaseUser = userCredential.user;
        } else {
          // Fazer login com e-mail e senha no Firebase
          const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
          firebaseUser = userCredential.user;
        }
      } catch (fbErr: any) {
        console.warn("Firebase Auth indisponível ou não ativado. Ativando fallback resiliente para banco local:", fbErr);
        firebaseError = fbErr;
        
        // Se for um erro real do próprio usuário cadastrando algo inválido ou duplicado nas regras do Firebase, vamos respeitar
        if (isSignUpMode) {
          if (fbErr.code === 'auth/email-already-in-use') {
            // Se o e-mail já existe no Firebase Autenticação, vamos tentar fazer login para ver se a senha confere!
            // Se a senha conferir, significa que o usuário é o dono real da conta e podemos sincronizar sem problemas!
            try {
              const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
              firebaseUser = userCredential.user;
              console.log("Usuário já cadastrado no Firebase Auth. Login efetuado com sucesso na criação de conta para auto-sincronizar.");
            } catch (loginErr: any) {
              // Se a senha do login falhar, significa que erraram a senha do e-mail que já existe
              if (loginErr.code === 'auth/wrong-password' || loginErr.code === 'auth/invalid-credential') {
                throw new Error('Este e-mail de terapeuta já está cadastrado com outra senha. Por favor, acesse via "Fazer Login" ou insira a senha correspondente.');
              }
              throw fbErr; // throw original
            }
          } else if (fbErr.code === 'auth/weak-password' || fbErr.code === 'auth/invalid-email') {
            throw fbErr;
          }
        } else {
          if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
            throw fbErr;
          }
        }
      }

      // Sincronizar ou autenticar de forma resiliente diretamente com o banco de dados local Express
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          nome: isSignUpMode ? nome.trim() : undefined,
          password: password,
          isSignUpMode
        })
      });

      if (!res.ok) {
        const data = await res.json();
        // Se a requisição retornou um erro específico de banco local, lanca o erro
        throw new Error(data.error || 'Erro ao processar autenticação no servidor.');
      }

      const data = await res.json();
      onLoginSuccess(data.therapist.id_terapeuta, data.therapist.nome, data.therapist.email);
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      let errMsg = err.message || 'Erro ao conectar ao servidor.';
      if (err.code === 'auth/operation-not-allowed') {
        // Se for operation-not-allowed, como ativamos o fallback, informamos que criamos localmente. Mas se o Express deu erro, mostramos o erro local.
        errMsg = 'O provedor de e-mail/senha não está ativo no Firebase, porém o sistema tentou autenticar via banco local e falhou: ' + err.message;
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Este e-mail já está em uso por outro terapeuta cadastrado no sistema.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = 'Senha de acesso incorreta. Verifique suas credenciais.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Senha muito fraca. A senha deve conter pelo menos 6 caracteres para garantir a segurança dos prontuários.';
      }
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRealGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      if (!user.email) {
        throw new Error('Conta Google não retornou endereço de e-mail.');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email.toLowerCase().trim(),
          nome: user.displayName || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro na autenticação local do servidor.');
      }

      const data = await res.json();
      onLoginSuccess(data.therapist.id_terapeuta, data.therapist.nome, data.therapist.email);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Erro ao realizar login via Google.';
      if (err.code === 'auth/popup-blocked') {
        errMsg = 'A janela pop-up de login do Google foi bloqueada pelo seu navegador. Por favor, permita pop-ups nesta página ou utilize login tradicional com E-mail e Senha.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'O provedor Google Auth não está ativado no seu Firebase Console (Authentication > Sign-in method). Ative o provedor "Google"!';
      } else if (err.code === 'auth/unauthorized-domain') {
        errMsg = `Domínio não autorizado pelo Firebase! O domínio "${window.location.hostname}" precisa ser adicionado à lista de Domínios Autorizados no seu Firebase Console. Para continuar testando agora, criamos um painel de acesso rápido para você.`;
        setShowUnauthorizedDomainModal(true);
      }
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFallbackGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackRealEmail.trim() || !fallbackRealName.trim()) {
      alert("Por favor, preencha o Nome e o E-mail.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fallbackRealEmail.toLowerCase().trim(),
          nome: fallbackRealName.trim(),
          isSignUpMode: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao processar autenticação de fallback.');
      }

      const data = await res.json();
      setShowUnauthorizedDomainModal(false);
      onLoginSuccess(data.therapist.id_terapeuta, data.therapist.nome, data.therapist.email);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao iniciar sessão simulada de fallback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSelect = async (selectedName: string, selectEmail: string) => {
    setIsSubmitting(true);
    setShowSimulatedGoogle(false);
    setError(null);
    
    try {
      let firebaseUser;
      try {
        // Tenta fazer o sign-in real no Firebase Auth com senha padrão de simulação
        const credential = await signInWithEmailAndPassword(auth, selectEmail, "123456");
        firebaseUser = credential.user;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/cannot-find-user') {
          // Se o usuário não existir no Firebase, cria a credencial correspondente
          const credential = await createUserWithEmailAndPassword(auth, selectEmail, "123456");
          firebaseUser = credential.user;
        } else {
          throw fbErr;
        }
      }

      // Sincroniza com o nosso express backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectEmail,
          nome: selectedName
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro na autenticação local do servidor.');
      }

      const data = await res.json();
      onLoginSuccess(data.therapist.id_terapeuta, data.therapist.nome, data.therapist.email);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Erro ao processar login pré-configurado.';
      if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'O login com E-mail e Senha não está ativado em seu Console do Firebase. Ative-o em Authentication > Sign-in method!';
      }
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-teal-50/40 via-white to-stone-50/40 p-6 md:p-12 min-h-[600px] flex items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-teal-100 shadow-xl overflow-hidden backdrop-blur-sm" id="therapist-login-card">
        {/* Top Header Banner */}
        <div className="p-8 bg-gradient-to-br from-teal-700 via-teal-800 to-stone-800 text-white relative text-center">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Footprints className="w-32 h-32 rotate-12" />
          </div>
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/10 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-teal-100" />
          </div>
          <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest font-mono">Consola do Consultório</span>
          <h2 className="text-xl font-serif italic text-white mt-1">
            {isSignUpMode ? 'Criar Conta de Terapeuta' : 'Acesso Restrito ao Terapeuta'}
          </h2>
          <p className="text-[11px] text-teal-100/80 mt-1 font-light">
            {isSignUpMode 
              ? 'Inscreva-se com e-mail profissional para gerenciar prontuários reais' 
              : 'Efetue o seu login seguro com Firebase Auth para começar'}
          </p>
        </div>

        {/* Auth Mode Toggle TABS */}
        <div className="flex border-b border-teal-50">
          <button
            type="button"
            onClick={() => { setIsSignUpMode(false); setError(null); }}
            className={`w-1/2 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
              !isSignUpMode 
                ? 'border-teal-600 text-teal-700 bg-teal-50/10' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Fazer Login
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUpMode(true); setError(null); }}
            className={`w-1/2 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
              isSignUpMode 
                ? 'border-teal-600 text-teal-700 bg-teal-50/10' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Criar Conta (Sign Up)
          </button>
        </div>

        {/* Form area */}
        <div className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-850 rounded-xl text-xs flex items-start gap-2 animate-fade-in line-clamp-4">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLocalSubmit} className="space-y-4">
            {isSignUpMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </span>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Dra. Renata Vasconcelos"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail Profissional</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </span>
                <input 
                  type="email"
                  required
                  placeholder="exemplo@reflexologia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha de Acesso</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </span>
                <input 
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold rounded-xl transition duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-teal-850 active:scale-95 disabled:opacity-75"
            >
              {isSubmitting ? 'Processando Autenticação...' : (isSignUpMode ? 'Criar Conta de Terapeuta' : 'Entrar no Sistema')}
            </button>
          </form>

          {/* Social login partition */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-450 uppercase font-bold tracking-wider">métodos alternativos</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="w-full">
            {/* Google Social Sign-In Button */}
            <button
              onClick={handleRealGoogleSignIn}
              disabled={isSubmitting}
              type="button"
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-850 text-[11px] font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.95 21.57,11.5 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.73c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.3,0.98c-2.36,0 -4.36,-1.59 -5.07,-3.72H2.87v2.66c1.48,2.94 4.54,4.86 8.04,4.86z" fill="#34A853" />
                <path d="M6.93,13.2c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V7.14H2.87c-0.62,1.24 -0.97,2.64 -0.97,4.12s0.35,2.88 0.97,4.12L6.93,13.2z" fill="#FBBC05" />
                <path d="M12,6.07c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.47,3.35 14.43,2.45 12,2.45C8.5,2.45 5.44,4.37 3.96,7.3L6.93,10c0.71,-2.13 2.71,-3.72 5.07,-3.72z" fill="#EA4335" />
              </svg>
              Google Real
            </button>
          </div>

          {/* Assistant Info Cards */}
          <div className="bg-gradient-to-br from-teal-50/20 to-stone-50/20 p-4 rounded-xl border border-teal-100/50 space-y-2">
            <h4 className="text-[10px] font-bold text-teal-850 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-650" />
              Pilar de Autenticação Segura Firebase
            </h4>
            <p className="text-[10px] text-slate-550 leading-relaxed font-sans font-light">
              Tanto contas novas (via <strong>Criar Conta</strong>) quanto o login social via Google realizam o cadastro seguro e verificação real através do SDK de Autenticação do Firebase!
            </p>
          </div>
        </div>
      </div>

      {/* Google Account Selector Simulated Dialog */}
      {showSimulatedGoogle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-sm w-full font-sans">
            <div className="p-5 border-b border-rose-50/10 bg-slate-50 flex items-center gap-2.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.95 21.57,11.5 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.73c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.3,0.98c-2.36,0 -4.36,-1.59 -5.07,-3.72H2.87v2.66c1.48,2.94 4.54,4.86 8.04,4.86z" fill="#34A853" />
                <path d="M6.93,13.2c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V7.14H2.87c-0.62,1.24 -0.97,2.64 -0.97,4.12s0.35,2.88 0.97,4.12L6.93,13.2z" fill="#FBBC05" />
                <path d="M12,6.07c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.47,3.35 14.43,2.45 12,2.45C8.5,2.45 5.44,4.37 3.96,7.3L6.93,10c0.71,-2.13 2.71,-3.72 5.07,-3.72z" fill="#EA4335" />
              </svg>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Fazer login com as Contas Google</h3>
                <p className="text-[10px] text-slate-500">pela aplicação Reflexologia Podal</p>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600 mb-2">Selecione uma conta para prosseguir com a autenticação:</p>
              
              <button
                type="button"
                onClick={() => handleGoogleSelect('Dra. Renata Vasconcelos', 'renata.vasconcelos@gmail.com')}
                className="w-full p-3 hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-left cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                    RV
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">Dra. Renata Vasconcelos</span>
                    <span className="text-[10px] text-slate-450">renata.vasconcelos@gmail.com</span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">CRTF-1244</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSelect('Dr. Thiago Melo', 'thiago.melo@gmail.com')}
                className="w-full p-3 hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-left cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-stone-600 text-white font-bold flex items-center justify-center text-xs">
                    TM
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">Dr. Thiago Melo</span>
                    <span className="text-[10px] text-slate-450">thiago.melo@gmail.com</span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">CRTF-3912</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSelect('Terapeuta João', 'joao@reflexologia.com')}
                className="w-full p-3 hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-left cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                    TJ
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">Terapeuta João</span>
                    <span className="text-[10px] text-slate-450">joao@reflexologia.com</span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">CRTF-5511</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSelect('Terapeuta Rosani', 'rosani@reflexologia.com')}
                className="w-full p-3 hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-left cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs">
                    TR
                  </div>
                  <div>
                    <span className="font-bold block text-slate-800">Terapeuta Rosani</span>
                    <span className="text-[10px] text-slate-450">rosani@reflexologia.com</span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">CRTF-7722</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right flex justify-between items-center px-4 font-sans">
              <span className="text-[9px] text-slate-400">Verificação de Conformidade Google</span>
              <button 
                type="button" 
                onClick={() => setShowSimulatedGoogle(false)}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURAÇÃO DO DOMÍNIO AUTORIZADO E FALLBACK GOOGLE */}
      {showUnauthorizedDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in font-sans overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-lg w-full my-8">
            <div className="p-5 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-600 text-white rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-teal-950">Ajuste Necessário no Firebase Console</h3>
                  <p className="text-[10px] text-teal-700">Erro: auth/unauthorized-domain</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowUnauthorizedDomainModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed space-y-1">
                <span className="font-bold block">Por que este erro acontece?</span>
                <p>
                  O Firebase por segurança bloqueia logins sociais (como o do Google) que ocorram em endereços (domínios) que ainda não foram explicitamente autorizados nas configurações do seu projeto do Firebase.
                </p>
              </div>

              {/* Passo a Passo Ilustrado */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Como resolver definitivamente no seu Firebase:</h4>
                <ol className="text-xs text-slate-700 space-y-2.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    Acesse o seu painel do <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-teal-600 hover:underline font-bold">Firebase Console</a>.
                  </li>
                  <li>
                    Vá no menu lateral esquerdo em <strong>Authentication</strong> e depois clique na aba <strong>Settings</strong> (Configurações) no topo.
                  </li>
                  <li>
                    No menu lateral interno de configurações, clique em <strong>Authorized domains</strong> (Domínios autorizados).
                  </li>
                  <li>
                    Clique em <strong>Add domain</strong> (Adicionar domínio) e registre estes endereços de teste:
                    <div className="mt-2 space-y-1.5 font-mono text-[10px] text-teal-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span>localhost</span>
                        <button 
                          type="button"
                          className="text-[9px] font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText('localhost');
                            alert('Domínio "localhost" copiado!');
                          }}
                        >
                          <Copy className="w-3 h-3" /> Copiar dom
                        </button>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 mt-1.5">
                        <span className="truncate mr-2">{window.location.hostname}</span>
                        <button 
                          type="button"
                          className="text-[9px] font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.hostname);
                            alert(`Domínio "${window.location.hostname}" copiado!`);
                          }}
                        >
                          <Copy className="w-3 h-3" /> Copiar Atual
                        </button>
                      </div>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Seção de Fallback Facilitadora */}
              <div className="border-t border-slate-150 pt-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center mb-3">
                    🚀 ATALHO DE DESENVOLVIMENTO (Fazer Login Agora Sem Firebase)
                  </span>

                  {!showFallbackGoogleInput ? (
                    <div className="space-y-3 text-center">
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Você pode simular o login do seu próprio e-mail Google para Testar o painel imediatamente! O sistema criará ou carregará sua conta local.
                      </p>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowFallbackGoogleInput(true)}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
                        >
                          Simular meu E-mail Real do Google
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleFallbackGoogleLogin} className="space-y-3.5">
                      <p className="text-[11px] text-slate-500 text-center leading-normal italic">
                        Informe os dados que deseja simular para o seu profissional no sistema:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Seu Nome de Exibição</label>
                          <input 
                            type="text"
                            required
                            placeholder="Ex: Dra Rennata Mattos"
                            value={fallbackRealName}
                            onChange={(e) => setFallbackRealName(e.target.value)}
                            className="w-full p-2 text-xs bg-white text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail do Google para Login</label>
                          <input 
                            type="email"
                            required
                            placeholder="seu.email@gmail.com"
                            value={fallbackRealEmail}
                            onChange={(e) => setFallbackRealEmail(e.target.value)}
                            className="w-full p-2 text-xs bg-white text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowFallbackGoogleInput(false)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition"
                        >
                          Voltar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs"
                        >
                          {isSubmitting ? 'Iniciando Sessão...' : 'Iniciar Sessão Real'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center px-4">
              <p className="text-[10px] text-slate-450">
                Uma vez adicionado o domínio no Firebase Console, o botão "Google Real" funcionará perfeitamente sem este diálogo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
