import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Sparkles, Footprints, AlertCircle } from 'lucide-react';

interface TherapistLoginProps {
  onLoginSuccess: (therapistName: string, email: string) => void;
}

export default function TherapistLogin({ onLoginSuccess }: TherapistLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSimulatedGoogle, setShowSimulatedGoogle] = useState(false);

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simulate database lookup delay
    setTimeout(() => {
      if (!email.trim() || !password.trim()) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        setIsSubmitting(false);
        return;
      }

      // Allow any login for evaluation, but recommend the main account in the help card
      const lowerEmail = email.toLowerCase().trim();
      let therapistName = 'Dra. Renata Vasconcelos';

      if (lowerEmail === 'thiago.melo@reflexologia.com' || lowerEmail === 'thiago@gmail.com') {
        therapistName = 'Dr. Thiago Melo';
      }

      onLoginSuccess(therapistName, lowerEmail);
      setIsSubmitting(false);
    }, 800);
  };

  const handleGoogleSelect = (name: string, selectEmail: string) => {
    setIsSubmitting(true);
    setShowSimulatedGoogle(false);
    setTimeout(() => {
      onLoginSuccess(name, selectEmail);
      setIsSubmitting(false);
    }, 600);
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
          <h2 className="text-xl font-serif italic text-white mt-1">Acesso Restrito ao Terapeuta</h2>
          <p className="text-[11px] text-teal-100/80 mt-1 font-light">Efetue o seu login seguro para gerenciar prontuários e sessões</p>
        </div>

        {/* Form area */}
        <div className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLocalSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white text-xs font-bold rounded-xl transition duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          {/* Social login partition */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-450 uppercase font-bold tracking-wider">ou entre com</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={() => setShowSimulatedGoogle(true)}
            type="button"
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-705 text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
          >
            {/* SVG of Google Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.95 21.57,11.5 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.73c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.3,0.98c-2.36,0 -4.36,-1.59 -5.07,-3.72H2.87v2.66c1.48,2.94 4.54,4.86 8.04,4.86z" fill="#34A853" />
                <path d="M6.93,13.2c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V7.14H2.87c-0.62,1.24 -0.97,2.64 -0.97,4.12s0.35,2.88 0.97,4.12L6.93,13.2z" fill="#FBBC05" />
                <path d="M12,6.07c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.47,3.35 14.43,2.45 12,2.45C8.5,2.45 5.44,4.37 3.96,7.3L6.93,10c0.71,-2.13 2.71,-3.72 5.07,-3.72z" fill="#EA4335" />
              </g>
            </svg>
            Entrar com o Google
          </button>

          {/* Assistant Info Cards */}
          <div className="bg-gradient-to-br from-teal-50/20 to-stone-50/20 p-4 rounded-xl border border-teal-100/50 space-y-2">
            <h4 className="text-[10px] font-bold text-teal-850 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-650" />
              Ambiente de Simulação de Acesso
            </h4>
            <p className="text-[10px] text-slate-550 leading-relaxed font-sans font-light">
              Para avaliação imediata, utilize o seu e-mail do dia a dia ou use as credenciais recomendadas: <br />
              <strong className="text-teal-900">E-mail:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">renata@reflexologia.com</code> <br />
              <strong className="text-teal-900 font-semibold">Senha:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">qualquer uma</code>
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
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right flex justify-between items-center px-4">
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
    </div>
  );
}
