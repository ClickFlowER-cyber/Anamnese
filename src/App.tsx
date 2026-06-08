import React, { useState, useEffect } from 'react';
import PatientPortal from './components/PatientPortal';
import TherapistDashboard from './components/TherapistDashboard';
import { Footprints, Smartphone, Laptop, Sparkles, Monitor, RefreshCw, Layers, ShieldCheck, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'therapist' | 'patient'>('therapist');
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
              Navegue pelas perspectivas para preenchimento de prontuários e acompanhamento clínico.
            </p>
          </div>

          {/* Quick Perspective Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-250 max-w-full overflow-x-auto shrink-0 self-stretch sm:self-auto shadow-inner">
            <button
              onClick={() => {
                setCurrentView('therapist');
                if (window.location.search) {
                  window.history.pushState({}, '', window.location.pathname);
                }
              }}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'therapist'
                  ? 'bg-teal-700 text-white shadow-md ring-1 ring-teal-600/20'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span className="whitespace-nowrap uppercase tracking-wider">Terapeuta</span>
            </button>
            <button
              onClick={() => setCurrentView('patient')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'patient'
                  ? 'bg-teal-700 text-white shadow-md ring-1 ring-teal-600/20'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="whitespace-nowrap uppercase tracking-wider">Paciente</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE FRAME ROUTING LAYOUTS */}
      <main className="flex-1 overflow-y-auto">

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
