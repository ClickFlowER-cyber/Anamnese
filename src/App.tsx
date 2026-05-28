import React, { useState, useEffect } from 'react';
import PatientPortal from './components/PatientPortal';
import TherapistDashboard from './components/TherapistDashboard';
import { Footprints, Smartphone, Laptop, Sparkles, Monitor, RefreshCw, Layers, ShieldCheck, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'dual' | 'therapist' | 'patient'>('dual');
  const [tokenFromUrl, setTokenFromUrl] = useState<string>('');
  const [phoneToken, setPhoneToken] = useState<string>('REF-9922'); // default sample token to validate easily in phone mock
  const [simulatorRefreshKey, setSimulatorRefreshKey] = useState(0);

  // Check URL query strings on initialization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setTokenFromUrl(token);
      setCurrentView('patient');
    }
  }, []);

  const reloadSimulator = () => {
    setSimulatorRefreshKey(prev => prev + 1);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans text-slate-800" key={simulatorRefreshKey}>
      
      {/* Simulation Playroom Header Bar */}
      <header className="bg-white text-slate-800 px-4 py-4 md:px-8 shadow-sm border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-teal-600 text-white font-mono font-semibold text-[10px] rounded-full uppercase tracking-wider shadow-sm">
                SaaS Real-Time
              </span>
              <h1 className="text-md sm:text-lg font-semibold tracking-tight flex items-center gap-1.5 font-sans text-slate-900">
                <Footprints className="w-5 h-5 text-teal-600 rotate-12" />
                Reflexologia Podal — Prontuários e Anamnese Integrada
              </h1>
            </div>
            <p className="text-xs text-slate-500 leading-normal max-w-2xl font-light">
              Módulo SaaS completo em conformidade com a <strong className="text-slate-705">LGPD</strong> e <strong className="text-slate-705">Auditoria Legal</strong>.
              Navegue pelas perspectivas de simulação para examinar a sincronização instantânea.
            </p>
          </div>

          {/* Quick Perspective Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-full overflow-x-auto shrink-0 self-stretch sm:self-auto">
            <button
              onClick={() => {
                setCurrentView('dual');
                // clear url token to permit normal sandbox tests
                if (window.location.search) {
                  window.history.pushState({}, '', window.location.pathname);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentView === 'dual'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Dual Simulator (Lado a Lado)</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('therapist');
                if (window.location.search) {
                  window.history.pushState({}, '', window.location.pathname);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentView === 'therapist'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Apenas Terapeuta</span>
            </button>
            <button
              onClick={() => setCurrentView('patient')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentView === 'patient'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Apenas Paciente</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE FRAME ROUTING LAYOUTS */}
      <main className="flex-1 overflow-y-auto">
        
        {/* VIEW A: Side-by-Side Dual Interactive Simulator Sandbox */}
        {currentView === 'dual' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-4 sm:p-6 lg:p-8 max-w-full" id="dual-simulator-canvas">
            
            {/* Left side (8 cols): Therapist Control Dashboard */}
            <div className="xl:col-span-8 space-y-4">
              <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-650 font-medium">
                <span className="flex items-center gap-1">
                  <Monitor className="w-4 h-4 text-teal-600" />
                  <span>Tela do Dr. Terapeuta (Prontuários e Evolução)</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">MODO LADO-A-LADO ATIVO</span>
              </div>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <TherapistDashboard />
              </div>
            </div>

            {/* Right side (4 cols): Smartphone simulator frame for Patient Portal */}
            <div className="xl:col-span-4 space-y-4">
              <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-650 font-medium">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-teal-600 animate-bounce" />
                  <span>Dispositivo Móvel do Paciente</span>
                </span>
                <button 
                  onClick={reloadSimulator}
                  title="Reiniciar simulador de celular"
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* iPhone Mock Frame Container */}
              <div className="relative mx-auto max-w-[420px] rounded-[48px] border-[12px] border-slate-900 bg-slate-900 p-2 shadow-xl h-[780px] flex flex-col overflow-hidden">
                {/* iPhone Camera Notch accent */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-40 h-5 bg-slate-900 rounded-full z-20 flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                  <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
                </div>

                <div className="flex-1 bg-slate-50 rounded-[38px] overflow-y-auto px-4 py-8 relative shadow-inner space-y-4">
                  
                  {/* Smartphone home sandbox validator if token is not resolved */}
                  {!tokenFromUrl && !phoneToken && (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center space-y-4 mt-8">
                      <div className="p-3 bg-teal-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-teal-600">
                        <Footprints className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 font-sans">Simule o Primeiro Acesso</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          Cadastre um novo paciente fictício na tela de administração ao lado para gerar um código ou insira <strong>REF-9922</strong> para simular os termos imediatamente:
                        </p>
                      </div>
                      <div className="flex gap-2.5">
                        <input 
                          type="text" 
                          placeholder="Token único..."
                          value={phoneToken}
                          onChange={(e) => setPhoneToken(e.target.value)}
                          className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-center font-mono w-full"
                        />
                        <button 
                          onClick={() => setPhoneToken(phoneToken)}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded hover:bg-teal-700 cursor-pointer"
                        >
                          Ir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rendering patient form in mock phone */}
                  <PatientPortal 
                    tokenString={tokenFromUrl || phoneToken} 
                    onSuccess={() => {
                      // Trigger a soft notification reload on the left dashboard to instantly display newly completed forms
                      setTimeout(() => {
                        reloadSimulator();
                      }, 2500);
                    }}
                  />
                </div>

                {/* iPhone tactile home bar accent */}
                <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-800 rounded-full pointer-events-none z-20"></div>
              </div>

              {/* Developer Testing Guide */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3.5 shadow-sm text-xs text-slate-600">
                <span className="font-bold flex items-center gap-1.5 text-slate-800">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  Roteiro Rápido de Teste Lado a Lado:
                </span>
                <ol className="list-decimal list-inside pl-1 space-y-1.5 text-slate-500 leading-relaxed font-sans">
                  <li>Clique no envelope <strong>"Novo"</strong> no painel de pacientes à esquerda.</li>
                  <li>Cadastre um paciente (digite os dados de contato fictícios) e selecione criar.</li>
                  <li>Copie o token gerado (Exemplo: <code className="font-mono text-slate-900 bg-slate-100 p-0.5 rounded px-1 font-sans">REF-...</code> ou numérico).</li>
                  <li>Limpe a tela do celular fictício acima digitando o novo token gerado para abrir a ficha móvel deste novo paciente.</li>
                  <li>Comece a digitar no campo <strong>"Queixa Principal"</strong> e observe as atualizações em tempo real surgindo no dashboard do terapeuta sem apertar enviar!</li>
                  <li>Aceite os termos de consentimento legal sob as premissas da <strong>LGPD</strong> e submeta.</li>
                  <li>O token será imediatamente invalidado no banco e as informações integradas ao arquivo oficial!</li>
                </ol>
              </div>
            </div>

          </div>
        )}

        {/* VIEW B: Full Screen Therapist Command Console */}
        {currentView === 'therapist' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in" id="therapist-console-full">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-250 mb-4 shadow-sm flex items-center justify-between text-xs text-slate-650 font-medium font-sans">
              <span className="flex items-center gap-1">
                <Laptop className="w-4 h-4 text-teal-600" />
                <span>Modo de Foco: Prontuário Eletrônico do Terapeuta (Uso em Desktop/Laptop)</span>
              </span>
              <span className="text-teal-700 font-mono font-bold">Foco Dashboard</span>
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <TherapistDashboard />
            </div>
          </div>
        )}

        {/* VIEW C: Full Screen Mobile Patient Portal */}
        {currentView === 'patient' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in" id="patient-console-full">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-250 mb-4 shadow-sm flex items-center justify-between text-xs text-slate-650 font-medium font-sans">
              <span className="flex items-center gap-1">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>Modo de Foco: Visualização Mobile-First do Paciente (Otimizado para Celulares)</span>
              </span>
              <span className="text-teal-800 font-mono font-bold">Foco Paciente</span>
            </div>
            
            <div className="space-y-4">
              <div className="bg-teal-50 text-slate-900 p-4 rounded-xl border border-teal-100 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Portal Seguro de Consentimento LGPD - Reflexologia Podal</span>
                  <p className="mt-0.5 text-slate-600 leading-normal">
                    Este formulário recolhe dados sensíveis de anamnese sob os termos expressos da LGPD, amparando legalmente o consultório e oferecendo plena integridade histórica ao seu prontuário.
                  </p>
                </div>
              </div>

              <PatientPortal 
                tokenString={tokenFromUrl || phoneToken} 
                standalone={true}
              />
            </div>
          </div>
        )}

      </main>

      {/* General Compliance Legal Slate Footer */}
      <footer className="bg-white text-slate-500 text-[10px] py-4 text-center border-t border-slate-200 shrink-0 shadow-sm">
        <p>© 2026 Módulo Reflexologia Podal. Conectado ao Serviço Relacional de Prontuários SaaS.</p>
        <p className="mt-1 font-mono text-slate-400 uppercase tracking-widest">Tecnologia Certificada LGPD • UTC Timezone Sync • Audit Protocol Active</p>
      </footer>

    </div>
  );
}
