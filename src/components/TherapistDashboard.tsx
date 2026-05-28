import React, { useState, useEffect } from 'react';
import TherapistLogin from './TherapistLogin';
import { Paciente, FichaAnamnese, SessaoEvolucao, AuditoriaConsentimento, HistoricoAlteracoes } from '../types';
import { 
  Users, User, FileText, ClipboardList, Clock, ShieldCheck, History, PlusCircle, Save, CheckCircle2, 
  Lock, Unlock, RefreshCw, Smartphone, Copy, Check, Send, AlertTriangle, Play, Calendar, Zap, LayoutDashboard, Footprints, Settings
} from 'lucide-react';

export default function TherapistDashboard() {
  // Therapist logged in status
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('therapist_logged_in') === 'true';
  });
  const [loggedTherapistName, setLoggedTherapistName] = useState(() => {
    return localStorage.getItem('therapist_name') || 'Dra. Renata Vasconcelos';
  });
  const [loggedTherapistEmail, setLoggedTherapistEmail] = useState(() => {
    return localStorage.getItem('therapist_email') || 'renata.vasconcelos@gmail.com';
  });

  const [patients, setPatients] = useState<Paciente[]>([]);
  const [activeTab, setActiveTab] = useState<'pacientes' | 'auditoria' | 'config'>('pacientes');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<{
    paciente: Paciente;
    ficha: FichaAnamnese;
    sessoes: SessaoEvolucao[];
    auditLogs: AuditoriaConsentimento[];
    history: HistoricoAlteracoes[];
    token?: any;
  } | null>(null);

  // Form states for creating a patient
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nome_completo: '',
    data_nascimento: '',
    endereco: '',
    contato: '',
    id_clinica: 'clin-1',
    id_terapeuta: 'ter-1'
  });
  const [createdFeedback, setCreatedFeedback] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit states for patient/anamnese
  const [isEditingSection, setIsEditingSection] = useState<'cadastro' | 'anamnese' | null>(null);
  const [editPatientForm, setEditPatientForm] = useState<Partial<Paciente>>({});
  const [editFichaForm, setEditFichaForm] = useState<Partial<FichaAnamnese>>({});
  const [updatingServer, setUpdatingServer] = useState(false);

  // New Session states
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    evolucao: '',
    observacoes: '',
    reacoes_paciente: ''
  });

  // Selected session for draft edits
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({
    evolucao: '',
    observacoes: '',
    reacoes_paciente: ''
  });

  // Live Typing Status State (Real-time sync)
  const [liveTypingState, setLiveTypingState] = useState<{
    active: boolean;
    field?: string;
    value?: string;
  }>({ active: false });

  // Cron Job execution status logs
  const [cronLogs, setCronLogs] = useState<string[]>([]);
  const [runningCron, setRunningCron] = useState(false);

  // Clinics and therapists metadata helper references
  const [metaClinics, setMetaClinics] = useState<any[]>([]);
  const [metaTherapists, setMetaTherapists] = useState<any[]>([]);

  // Load patient list and meta on mount
  useEffect(() => {
    fetchMetaAndPatients();
  }, []);

  // Poll for live typing if a patient detail pane is loaded
  useEffect(() => {
    if (!selectedPatientId || isEditingSection) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-typing/${selectedPatientId}`);
        const data = await res.json();
        if (data.active) {
          setLiveTypingState({
            active: true,
            field: data.field,
            value: data.value
          });
        } else {
          setLiveTypingState({ active: false });
        }
      } catch (err) {
        // quiet error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedPatientId, isEditingSection]);

  const fetchMetaAndPatients = async () => {
    try {
      const resMeta = await fetch('/api/config');
      const meta = await resMeta.json();
      setMetaClinics(meta.clinicas);
      setMetaTherapists(meta.terapeutas);

      const resPacs = await fetch('/api/pacientes');
      const pacs = await resPacs.json();
      setPatients(pacs);
    } catch (e) {
      console.error("Erro ao listar metadados.", e);
    }
  };

  const loadPatientComplete = async (pId: string) => {
    try {
      const res = await fetch(`/api/paciente-completo/${pId}`);
      if (!res.ok) throw new Error("Falha ao puxar dados integrados.");
      const data = await res.json();
      setPatientDetails(data);
      // pre-fill edit structures
      setEditPatientForm(data.paciente);
      setEditFichaForm(data.ficha);
    } catch (e) {
      alert("Nao foi possivel recuperar prontuario completo.");
    }
  };

  const selectPatient = (pId: string) => {
    setSelectedPatientId(pId);
    setLiveTypingState({ active: false });
    loadPatientComplete(pId);
  };

  const handleReactivatePatient = async (pId: string) => {
    try {
      const defaultTherapist = metaTherapists.find(t => t.id_terapeuta === patientDetails?.paciente.id_terapeuta_responsavel)?.nome || "Dra. Renata Vasconcelos";
      const res = await fetch(`/api/pacientes/${pId}/reativar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          terapeuta_nome: defaultTherapist
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ocorreu um erro ao reativar.");
      }

      await fetchMetaAndPatients();
      await loadPatientComplete(pId);
    } catch (e: any) {
      alert(e.message || "Não foi possível reativar o prontuário.");
    }
  };

  // Create Patient "Cadastro Mínimo" -> returns single-use token and launch configs
  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.nome_completo.trim()) {
      alert("O nome completo é obrigatório.");
      return;
    }

    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });
      const data = await res.json();
      setCreatedFeedback(data);
      setNewPatient({
        nome_completo: '',
        data_nascimento: '',
        endereco: '',
        contato: '',
        id_clinica: 'clin-1',
        id_terapeuta: 'ter-1'
      });
      fetchMetaAndPatients();
    } catch (e) {
      alert("Erro ao criar cadastro.");
    }
  };

  // Therapist Edit Update (Pushes edit into change log)
  const handleTherapistAmendment = async (section: 'cadastro' | 'anamnese') => {
    if (!selectedPatientId) return;
    setUpdatingServer(true);
    
    // Audit payload requires name of therapist
    const defaultTherapist = metaTherapists.find(t => t.id_terapeuta === patientDetails?.paciente.id_terapeuta_responsavel)?.nome || "Dra. Renata Vasconcelos";
    
    try {
      const res = await fetch(`/api/pacientes/${selectedPatientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terapeuta_nome: defaultTherapist,
          paciente: section === 'cadastro' ? editPatientForm : undefined,
          ficha: section === 'anamnese' ? editFichaForm : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar alterações.');
      }

      await loadPatientComplete(selectedPatientId);
      setIsEditingSection(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingServer(false);
    }
  };

  // Create Session
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      const defaultTherapistId = patientDetails?.paciente.id_terapeuta_responsavel || 'ter-1';
      const res = await fetch('/api/sessoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_paciente: selectedPatientId,
          id_terapeuta: defaultTherapistId,
          ...newSessionForm
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar sessão clínica.');
      }

      setNewSessionForm({ evolucao: '', observacoes: '', reacoes_paciente: '' });
      setShowNewSessionForm(false);
      await loadPatientComplete(selectedPatientId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Select a session to edit its drafts
  const handleStartEditSession = (sess: SessaoEvolucao) => {
    setEditingSessionId(sess.id_sessao);
    setEditSessionForm({
      evolucao: sess.evolucao || '',
      observacoes: sess.observacoes || '',
      reacoes_paciente: sess.reacoes_paciente || ''
    });
  };

  // Save Session Draft
  const handleSaveSessionUpdate = async (sessionId: string, asFinalized: boolean) => {
    try {
      const defaultTherapist = metaTherapists.find(t => t.id_terapeuta === patientDetails?.paciente.id_terapeuta_responsavel)?.nome || "Dra. Renata Vasconcelos";
      const res = await fetch(`/api/sessoes/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terapeuta_nome: defaultTherapist,
          ...editSessionForm,
          status: asFinalized ? 'Finalizado' : 'Rascunho'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setEditingSessionId(null);
      await loadPatientComplete(selectedPatientId!);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Manual execution of the 90-day inactivity routine cron job
  const triggerInactivityPruning = async () => {
    setRunningCron(true);
    setCronLogs(prev => [...prev, `${new Date().toLocaleTimeString()} -> Iniciando auditoria do cron diário de inatividade...`]);
    
    try {
      const res = await fetch('/api/rotina-inatividade', { method: 'POST' });
      const data = await res.json();
      
      setCronLogs(prev => [
        ...prev,
        `${new Date().toLocaleTimeString()} -> Resultado: ${data.message}`,
        `${new Date().toLocaleTimeString()} -> Varredura finalizada. Fichas inativas congeladas jurídica e estruturalmente.`
      ]);
      await fetchMetaAndPatients();
      if (selectedPatientId) {
        await loadPatientComplete(selectedPatientId);
      }
    } catch (e) {
      setCronLogs(prev => [...prev, `${new Date().toLocaleTimeString()} -> Erro grave ao executar cron no contêiner.`]);
    } finally {
      setRunningCron(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isLoggedIn) {
    return (
      <TherapistLogin 
        onLoginSuccess={(name, email) => {
          localStorage.setItem('therapist_logged_in', 'true');
          localStorage.setItem('therapist_name', name);
          localStorage.setItem('therapist_email', email);
          setLoggedTherapistName(name);
          setLoggedTherapistEmail(email);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans" id="dashboard-wrapper">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Core Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-100 shadow-inner shrink-0">
              <Footprints className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-sans tracking-tight text-slate-800">Painel do Terapeuta Reflexologista</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500 font-medium">Sessão: <strong className="text-teal-700">{loggedTherapistName}</strong> ({loggedTherapistEmail})</span>
                <span className="hidden sm:inline text-slate-350">•</span>
                <button 
                  onClick={() => {
                    localStorage.removeItem('therapist_logged_in');
                    localStorage.removeItem('therapist_name');
                    localStorage.removeItem('therapist_email');
                    setIsLoggedIn(false);
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer text-left"
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveTab('pacientes')} 
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                activeTab === 'pacientes' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Paciente & Prontuários</span>
            </button>
            <button 
              onClick={() => setActiveTab('auditoria')} 
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                activeTab === 'auditoria' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Rastreabilidade Legal</span>
            </button>
            <button 
              onClick={() => setActiveTab('config')} 
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                activeTab === 'config' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cron / Sistema</span>
            </button>
          </div>
        </div>

        {/* MAIN PANEL CONTENT VIEWS */}
        
        {/* VIEW 1: Patients & Prontuários Workspace */}
        {activeTab === 'pacientes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="patients-view-wrapper">
            
            {/* Left Box: Patient List */}
            <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  Pacientes Ativos ({patients.length})
                </h2>
                <button
                  onClick={() => {
                    setCreatedFeedback(null);
                    setShowCreateModal(true);
                  }}
                  id="cadastrar-paciente-btn"
                  className="bg-teal-55/60 hover:bg-teal-50 text-teal-700 p-1.5 px-2.5 rounded-lg border border-teal-100 hover:border-teal-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Novo</span>
                </button>
              </div>

              {/* Patient Scrolling Block */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {patients.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Nenhum paciente cadastrado.</p>
                ) : (
                  patients.map(p => {
                    const isSelected = selectedPatientId === p.id_paciente;
                    const defaultClin = metaClinics.find(cl => cl.id_clinica === p.id_clinica)?.nome || "Clínica Geral";
                    return (
                      <button
                        key={p.id_paciente}
                        onClick={() => selectPatient(p.id_paciente)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                          isSelected 
                            ? 'bg-teal-50/70 border-teal-400 shadow-sm' 
                            : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-teal-950 font-semibold' : 'text-slate-800'}`}>{p.nome_completo}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <span>{defaultClin}</span>
                            <span>•</span>
                            <span className="font-mono">{p.contato}</span>
                          </p>
                        </div>
                        <div className="shrink-0">
                          {p.status_tratamento === 'Ativo' ? (
                            <span className="text-[9px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">
                              Ativo
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">
                              Inativo
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Box: Patient Comprehensive Clinical File Details */}
            <div className="lg:col-span-8 space-y-6">
              {!selectedPatientId ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-md flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                    <User className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 font-sans">Selecione um Prontuário</h3>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
                    Clique em qualquer paciente na lista do painel esquerdo para visualizar o exame de anamnese completo, logs jurídicos da LGPD e registrar consultas clínicas.
                  </p>
                </div>
              ) : !patientDetails ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center min-h-[450px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-100 border-t-teal-600"></div>
                </div>
              ) : (
                <div className="space-y-6" id="patient-details-loaded">
                  
                  {/* Real-time sync typing overlay alert */}
                  {liveTypingState.active && (
                    <div className="bg-teal-600 text-white p-3.5 rounded-xl border border-teal-700 shadow-sm flex items-center justify-between gap-4 animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-teal-200 animate-bounce" />
                        <span className="text-xs font-semibold">
                          <strong>O Paciente está escrevendo no formulário móvel agora mesmo:</strong> {liveTypingState.field === 'queixa_principal' ? 'Queixa Principal' : 'Alergias/Medicamentos'}
                        </span>
                      </div>
                      <div className="text-xs bg-teal-700/80 py-1 px-2.5 rounded font-mono truncate max-w-[200px]">
                        "{liveTypingState.value}"
                      </div>
                    </div>
                  )}

                  {/* Header Patient Status Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{patientDetails.paciente.nome_completo}</h2>
                        {patientDetails.paciente.status_tratamento === 'Finalizado por Inatividade' ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                              Bloqueado (Inativo)
                            </span>
                            <button
                              onClick={() => handleReactivatePatient(patientDetails.paciente.id_paciente)}
                              className="text-[9px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 border border-teal-200 hover:border-teal-300 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer shadow-sm transition-all saturate-100"
                              title="Reativar tratamento para retorno de consultas sem perder o histórico"
                            >
                              <Unlock className="w-3 h-3 text-teal-600" />
                              Reativar Prontuário
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold bg-teal-50 text-teal-750 border border-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                            Ativo para Consulta
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Identificador Digital: <span className="font-mono text-slate-700 font-semibold">{patientDetails.paciente.id_paciente}</span>
                      </div>
                    </div>

                    {/* Quick Access Portal Link for testing */}
                    {patientDetails.token && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-left shrink-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">Formulário de Uso Único</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                            {patientDetails.token.foi_usado ? "Já Enviado" : "Pendente"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={`http://localhost:3000/portal-paciente?token=${patientDetails.token.token_string}`}
                            className="bg-white border border-slate-200 text-[10px] font-mono p-1 rounded w-48 text-slate-500"
                          />
                          <button 
                            onClick={() => copyToClipboard(`http://localhost:3000/portal-paciente?token=${patientDetails.token.token_string}`)}
                            className="p-1 px-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[10px] font-semibold rounded flex items-center gap-1 cursor-pointer"
                          >
                            {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLink ? 'OK' : 'Link'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning and Reactivation Action Banner if inactive */}
                  {patientDetails.paciente.status_tratamento === 'Finalizado por Inatividade' && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5 font-mono">
                          <Lock className="w-4 h-4 text-amber-600" />
                          Prontuário de Retorno Pendente de Reativação
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed font-sans font-light">
                          Este paciente ficou mais de 90 dias inativo. Para registrar novas consultas de devolução ou retornos sem criar um prontuário novo duplicado, clique no botão ao lado para restaurar o fluxo completo de atendimento instantaneamente.
                        </p>
                      </div>
                      <button
                        onClick={() => handleReactivatePatient(patientDetails.paciente.id_paciente)}
                        className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md hover:bg-teal-700 cursor-pointer flex items-center gap-1.5 transition duration-150 shrink-0 select-none font-sans"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Reativar Tratamento
                      </button>
                    </div>
                  )}

                  {/* SUBSECTION 1: Cadastro Básico de Prontuário */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-600" />
                        Dados Cadastrais Relacionais
                      </h3>
                      {patientDetails.paciente.status_tratamento !== 'Finalizado por Inatividade' && (
                        isEditingSection === 'cadastro' ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setIsEditingSection(null);
                                setEditPatientForm(patientDetails.paciente);
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700 font-sans cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleTherapistAmendment('cadastro')}
                              disabled={updatingServer}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 font-sans cursor-pointer"
                            >
                              {updatingServer ? 'Salvando...' : 'Salvar e Registrar Log'}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsEditingSection('cadastro')}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 font-sans cursor-pointer"
                          >
                            Alterar Campos
                          </button>
                        )
                      )}
                    </div>

                    {isEditingSection === 'cadastro' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome Completo</label>
                          <input 
                            type="text" 
                            value={editPatientForm.nome_completo || ''}
                            onChange={(e) => setEditPatientForm({...editPatientForm, nome_completo: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Nascimento</label>
                          <input 
                            type="text" 
                            value={editPatientForm.data_nascimento || ''}
                            onChange={(e) => setEditPatientForm({...editPatientForm, data_nascimento: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Contato</label>
                          <input 
                            type="text" 
                            value={editPatientForm.contato || ''}
                            onChange={(e) => setEditPatientForm({...editPatientForm, contato: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Endereço Completo</label>
                          <input 
                            type="text" 
                            value={editPatientForm.endereco || ''}
                            onChange={(e) => setEditPatientForm({...editPatientForm, endereco: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Cpf</label>
                          <input 
                            type="text" 
                            value={editPatientForm.cpf || ''}
                            onChange={(e) => setEditPatientForm({...editPatientForm, cpf: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-805 text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Qtd Filhos</label>
                            <input 
                              type="number" 
                              value={editPatientForm.num_filhos || 0}
                              onChange={(e) => setEditPatientForm({...editPatientForm, num_filhos: parseFloat(e.target.value) || 0})}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Estado Civil</label>
                            <input 
                              type="text" 
                              value={editPatientForm.estado_civil || ''}
                              onChange={(e) => setEditPatientForm({...editPatientForm, estado_civil: e.target.value as any})}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2.5 text-xs">
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Nome Completo</span>
                          <span className="font-semibold text-stone-850">{patientDetails.paciente.nome_completo}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Nascimento</span>
                          <span className="font-semibold text-stone-850">{patientDetails.paciente.data_nascimento || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Contato (WhatsApp)</span>
                          <span className="font-semibold text-stone-850 font-mono">{patientDetails.paciente.contato}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Endereço Residencial</span>
                          <span className="font-semibold text-stone-850">{patientDetails.paciente.endereco}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">CPF</span>
                          <span className="font-semibold text-stone-850 font-mono">{patientDetails.paciente.cpf || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Filhos / Estado Civil</span>
                          <span className="font-semibold text-stone-850">
                            {patientDetails.paciente.num_filhos} filho(s) • {patientDetails.paciente.estado_civil || 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Profissão</span>
                          <span className="font-semibold text-stone-850">{patientDetails.paciente.profissao || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Religião</span>
                          <span className="font-semibold text-stone-850">{patientDetails.paciente.religiao || 'Não informado'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUBSECTION 2: Digital Anamnesis Form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        Diagnósticos & Anamnese Realidade
                      </h3>
                      {patientDetails.paciente.status_tratamento !== 'Finalizado por Inatividade' && pDetailsCheck(patientDetails.paciente) && (
                        isEditingSection === 'anamnese' ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setIsEditingSection(null);
                                setEditFichaForm(patientDetails.ficha);
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700 font-sans cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleTherapistAmendment('anamnese')}
                              disabled={updatingServer}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 font-sans cursor-pointer"
                            >
                              {updatingServer ? 'Projetando...' : 'Gravar Alterações'}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsEditingSection('anamnese')}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 font-sans cursor-pointer"
                          >
                            Editar Anamnese
                          </button>
                        )
                      )}
                    </div>

                    {isEditingSection === 'anamnese' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Pressão Arterial</label>
                          <select 
                            value={String(editFichaForm.pressao_arterial)}
                            onChange={(e) => setEditFichaForm({...editFichaForm, pressao_arterial: e.target.value as any})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          >
                            <option value="">Selecione...</option>
                            <option value="Normal">Normal</option>
                            <option value="Alta">Alta</option>
                            <option value="Baixa">Baixa</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Diabetes</label>
                          <input 
                            type="text" 
                            value={editFichaForm.diabetes || ''}
                            onChange={(e) => setEditFichaForm({...editFichaForm, diabetes: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-805 text-slate-800"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!!editFichaForm.uso_medicamentos}
                              onChange={(e) => setEditFichaForm({...editFichaForm, uso_medicamentos: e.target.checked})}
                              className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Usa Medicamentos?</span>
                          </label>
                          {editFichaForm.uso_medicamentos && (
                            <textarea 
                              value={editFichaForm.medicamentos || ''}
                              onChange={(e) => setEditFichaForm({...editFichaForm, medicamentos: e.target.value})}
                              rows={2}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                              placeholder="Descreva medicamentos..."
                            />
                          )}
                        </div>

                         <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Possui Alguma Lesão?</label>
                          <select 
                            value={editFichaForm.lesao_cranial || 'Não'}
                            onChange={(e) => setEditFichaForm({...editFichaForm, lesao_cranial: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-850"
                          >
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Detalhamento das Lesões</label>
                          <input 
                            type="text" 
                            value={editFichaForm.lesao_coluna || ''}
                            disabled={editFichaForm.lesao_cranial !== 'Sim'}
                            onChange={(e) => setEditFichaForm({...editFichaForm, lesao_coluna: e.target.value})}
                            placeholder="Descreva se houver lesões..."
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-850 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Cirurgias</label>
                          <input 
                            type="text" 
                            value={editFichaForm.cirurgias || ''}
                            onChange={(e) => setEditFichaForm({...editFichaForm, cirurgias: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Queixa Principal / Motivo Atendimento</label>
                          <textarea 
                            value={editFichaForm.queixa_principal || ''}
                            onChange={(e) => setEditFichaForm({...editFichaForm, queixa_principal: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pressão Arterial</span>
                            <span className="font-semibold text-slate-700">{patientDetails.ficha?.pressao_arterial || 'Não informada'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Diabetes</span>
                            <span className="font-semibold text-slate-700">{patientDetails.ficha?.diabetes || 'Sem histórico'}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uso Medicamentos</span>
                            <span className="font-semibold text-slate-700">
                              {patientDetails.ficha?.uso_medicamentos 
                                ? (patientDetails.ficha.medicamentos || 'Sim, porém não listados') 
                                : 'Não faz uso contínuo de químicos'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tem Alguma Lesão Corporal?</span>
                            <div className="flex items-center gap-2 mt-1">
                              {patientDetails.ficha?.lesao_cranial === 'Sim' ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Sim (Detalhamento abaixo)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Não Consta ou Nega
                                </span>
                              )}
                            </div>
                            {patientDetails.ficha?.lesao_cranial === 'Sim' && (
                              <p className="font-medium text-slate-650 text-xs mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-normal">
                                <strong>Detalhamento relatado:</strong> {patientDetails.ficha?.lesao_coluna || 'Nenhum detalhe informado.'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Histórico de Cirurgias Realizadas</span>
                          <p className="font-medium text-slate-600 leading-normal mt-0.5">{patientDetails.ficha?.cirurgias || 'Paciente nega procedimentos cirúrgicos.'}</p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-205 border-slate-200">
                          <span className="block text-[10px] text-teal-800 font-bold uppercase tracking-wider font-sans">Queixa Primária do Paciente</span>
                          <p className="font-medium text-slate-850 text-sm leading-relaxed mt-1">{patientDetails.ficha?.queixa_principal || 'Aguardando preenchimento digital pelo interessado.'}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer of patient audit information */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Prontuário Autenticado LGPD</span>
                      <span>🕒 Última atualização da ficha: {new Date(patientDetails.paciente.updated_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* SUBSECTION 3: Sessões de Evolução Clínica */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-teal-600" />
                        Histórico de Consultas & Evoluções Grelhas
                      </h3>
                      {patientDetails.paciente.status_tratamento !== 'Finalizado por Inatividade' && !showNewSessionForm && (
                        <button 
                          onClick={() => {
                            setNewSessionForm({ evolucao: '', observacoes: '', reacoes_paciente: '' });
                            setShowNewSessionForm(true);
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-sans text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm transition cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Nova Consulta</span>
                        </button>
                      )}
                    </div>

                    {/* New Session Clinical Form inside the panel */}
                    {showNewSessionForm && (
                      <form onSubmit={handleCreateSessionSubmit} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Registrar Nova Evolução Clínica</h4>
                          <button 
                            type="button" 
                            onClick={() => setShowNewSessionForm(false)}
                            className="text-[11px] text-slate-500 hover:text-slate-700 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-650 text-slate-500 uppercase mb-0.5">Evolução de Reflexologia (Diagnósticos dos pontos nos pés)</label>
                            <textarea 
                              required
                              value={newSessionForm.evolucao}
                              onChange={(e) => setNewSessionForm({...newSessionForm, evolucao: e.target.value})}
                              rows={3}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder:text-slate-450 placeholder:text-slate-400 text-slate-805 text-slate-800"
                              placeholder="Quais pontos estavam doloridos? (Rins, tireoide, coluna, estômago, cabeça). Quais estímulos foram aplicados (pressão rotativa, deslizamento)?"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Observações Clínicas / Pressão / etc</label>
                              <input 
                                type="text" 
                                value={newSessionForm.observacoes}
                                onChange={(e) => setNewSessionForm({...newSessionForm, observacoes: e.target.value})}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                                placeholder="Pressão aferida: 120/80 mmHg"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Reações imediatas do Paciente</label>
                              <input 
                                type="text" 
                                value={newSessionForm.reacoes_paciente}
                                onChange={(e) => setNewSessionForm({...newSessionForm, reacoes_paciente: e.target.value})}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                                placeholder="Relaxamento profundo, choro terapêutico, leveza..."
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button 
                            type="submit"
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition shadow-sm cursor-pointer"
                          >
                            Inicializar e Salvar Rascunho
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-4">
                      {patientDetails.sessoes.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-sans">
                          Nenhuma consulta de acompanhamento registrada ainda. Clique em "Nova Consulta" para abrir uma evolução.
                        </p>
                      ) : (
                        patientDetails.sessoes.map((sess, idx) => {
                          const isFinalized = sess.status === 'Finalizado';
                          const isCurrentEdit = editingSessionId === sess.id_sessao;

                          return (
                            <div 
                              key={sess.id_sessao}
                              className={`rounded-xl border p-4 font-sans relative transition-all ${
                                isFinalized 
                                  ? 'bg-slate-50/50 border-slate-200/85' 
                                  : 'bg-white border-teal-300 shadow-sm'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3 pb-2 border-b border-slate-100 mb-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap font-sans">
                                    <span className="text-xs font-bold text-slate-800">Sessão de Reflexologia #{patientDetails.sessoes.length - idx}</span>
                                    {isFinalized ? (
                                      <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded uppercase font-mono tracking-wider flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Locked Read-Only
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-semibold bg-teal-50 text-teal-850 border border-teal-200 px-2 py-0.5 rounded uppercase font-mono tracking-wider flex items-center gap-1">
                                        <Unlock className="w-3 h-3" /> Draft Aberto
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    Data de Entrada: {new Date(sess.data_sessao).toLocaleString('pt-BR')}
                                  </span>
                                </div>

                                <div className="shrink-0">
                                  {!isFinalized && !isCurrentEdit && (
                                    <button 
                                      onClick={() => handleStartEditSession(sess)}
                                      className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline font-sans cursor-pointer"
                                    >
                                      Editar Dados
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Draft edit inner wrapper */}
                              {isCurrentEdit ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Evolução Reflexologia</label>
                                    <textarea 
                                      value={editSessionForm.evolucao}
                                      onChange={(e) => setEditSessionForm({...editSessionForm, evolucao: e.target.value})}
                                      rows={2}
                                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Observações</label>
                                      <input 
                                        type="text" 
                                        value={editSessionForm.observacoes}
                                        onChange={(e) => setEditSessionForm({...editSessionForm, observacoes: e.target.value})}
                                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Reações</label>
                                      <input 
                                        type="text" 
                                        value={editSessionForm.reacoes_paciente}
                                        onChange={(e) => setEditSessionForm({...editSessionForm, reacoes_paciente: e.target.value})}
                                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex gap-2 justify-end pt-2">
                                    <button 
                                      onClick={() => setEditingSessionId(null)}
                                      className="text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg cursor-pointer"
                                    >
                                      Descartar
                                    </button>
                                    <button 
                                      onClick={() => handleSaveSessionUpdate(sess.id_sessao, false)}
                                      className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 py-1.5 px-3 rounded-lg border border-teal-200 cursor-pointer"
                                    >
                                      Salvar Rascunho
                                    </button>
                                    <button 
                                      onClick={() => handleSaveSessionUpdate(sess.id_sessao, true)}
                                      className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 py-1.5 px-4 rounded-lg flex items-center gap-1 cursor-pointer"
                                    >
                                      <Lock className="w-3 h-3" /> Finalizar Prontuário Jurídico
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5 text-xs">
                                  <div>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tratamento Realizado e Pontos Mapped:</span>
                                    <p className="text-slate-700 leading-relaxed font-sans">{sess.evolucao || 'Nenhuma evolução preenchida no rascunho.'}</p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aferições e Obs:</span>
                                      <p className="text-slate-700">{sess.observacoes || 'Sem anotações adicionais.'}</p>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reações Clínicas do Paciente:</span>
                                      <p className="text-slate-700">{sess.reacoes_paciente || 'Nenhuma anormalidade observada.'}</p>
                                    </div>
                                  </div>

                                  {sess.data_finalizacao && (
                                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 text-[9px] font-mono text-teal-700">
                                      <ShieldCheck className="w-3.5 h-3.5 text-teal-605 text-teal-600" />
                                      <span>Assinatura Digital de Prontuário Gravada em: {new Date(sess.data_finalizacao).toLocaleString('pt-BR')} (Imutável)</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: Complete Compliance Audit Trail Logs */}
        {activeTab === 'auditoria' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-205 border-slate-200 shadow-sm space-y-6" id="auditoriate-view">
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Trilha de Rastreabilidade e Auditoria Clínica Jurídica
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Conectado com os preceitos da LGPD. Todos os registros abaixo são gerados sequencial e imutavelmente no servidor de hospedagem clínica para amparar defesas contra má-fé e comprovar o restrito consentimento terapêutico.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
              
              {/* LGPD Consent Acceptance Registry Logs */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-850 text-slate-700 uppercase tracking-widest pb-1 border-b border-slate-100 font-mono">
                  ❑ Histórico de Consentimentos Digitais (IP/Agent)
                </h3>
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {patientDetails?.auditLogs && patientDetails.auditLogs.length > 0 ? (
                    patientDetails.auditLogs.map((aud) => (
                      <div key={aud.id_auditoria} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                        <div className="flex justify-between font-bold text-slate-750">
                          <span>REGISTRO #{aud.id_auditoria}</span>
                          <span className="text-teal-700">VALIDADO LGPD</span>
                        </div>
                        <p className="text-slate-600"><strong>Data Aceite:</strong> {new Date(aud.timestamp_aceite).toLocaleString('pt-BR')}</p>
                        <p className="text-slate-600"><strong>IP Origem:</strong> {aud.ip_origem}</p>
                        <p className="text-slate-500 leading-normal line-clamp-2 font-mono"><strong>User-Agent:</strong> {aud.user_agent}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase"><strong>Termo Jurídico Versão:</strong> {aud.termo_versao}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">Nenhum termo assinado visualizado para este paciente. Selecione um prontuário na listagem anterior.</p>
                  )}
                </div>
              </div>

              {/* Patient Profile Amendments and clinical corrections (History) */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest pb-1 border-b border-slate-100 font-mono">
                  ❑ Logs de Alterações Clínicas e Aditamentos
                </h3>
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {patientDetails?.history && patientDetails.history.length > 0 ? (
                    patientDetails.history.map((hist) => (
                      <div key={hist.id_historico} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                        <div className="flex justify-between font-bold text-teal-800">
                          <span>ALTERAÇÃO #{hist.id_historico}</span>
                          <span>ADITAMENTO</span>
                        </div>
                        <p className="text-slate-600"><strong>Data Aditamento:</strong> {new Date(hist.timestamp_alteracao).toLocaleString('pt-BR')}</p>
                        <p className="text-slate-600"><strong>Terapeuta Responsável:</strong> {hist.terapeuta_nome}</p>
                        <p className="text-slate-600"><strong>Parâmetro Modificado:</strong> <span className="text-slate-800 font-bold">{hist.campo_alterado}</span></p>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-slate-200 text-[10px]">
                          <div>
                            <span className="text-slate-400 block font-sans uppercase font-bold text-[8px]">Valor Anterior:</span>
                            <span className="text-red-700 line-through truncate block">{hist.valor_anterior || 'Vazio'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-sans uppercase font-bold text-[8px]">Valor Inserido:</span>
                            <span className="text-teal-700 font-semibold block truncate">{hist.valor_novo || 'Vazio'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">Nenhuma alteração de aditamento registrada até o momento para este paciente. Prontuário original preservado estruturalmente.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: Cron Inactivity config Panel */}
        {activeTab === 'config' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fade-in font-sans" id="config-panel">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-600" />
                  Rotinas Automáticas (Regra de Inatividade dos 90 Dias)
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
                  Sob as resoluções clínicas vigentes, todo prontuário que não contiver movimentações (exame de anamnese editado ou novas evoluções inseridas) por período igual ou superior a 90 (noventa) dias deve ser carimbado com o status de inatividade e congelado indefinidamente contra qualquer tipo de modificação retroativa.
                </p>
              </div>

              <button
                type="button"
                id="executar-cron-inatividade-btn"
                disabled={runningCron}
                onClick={triggerInactivityPruning}
                className={`text-xs font-semibold py-3 px-5 rounded-xl flex items-center gap-2 transition shadow-sm font-sans shrink-0 cursor-pointer ${
                  runningCron 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {runningCron ? (
                  <>
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-amber-300 border-t-amber-800"></div>
                    <span>Executando Varredura...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Disparar Cron de Inatividade Diário</span>
                  </>
                )}
              </button>
            </div>

            {/* Inactivity Simulation guide */}
            <div className="p-4 bg-amber-55/60 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed font-sans flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-none" />
              <div className="space-y-1">
                <span className="font-bold">Como funciona no Simulador?</span>
                <p>
                  O paciente <strong>"José Roberto de Oliveira"</strong> de teste está cadastrado no sistema com data de atualização superior a 100 dias atrás. Ao clicar no botão de disparo da rotina acima, o sistema irá recalcular os prazos no backend, alterará o seu status de tratamento para <strong>"Finalizado por Inatividade"</strong> e bloqueará instantaneamente todas as ações dele na tela do terapeuta e possíveis acessos!
                </p>
              </div>
            </div>

            {/* Cron Logs Screen */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-705 text-slate-600 uppercase tracking-wider font-mono">Consola de depuração do Cron do Servidor</span>
              <div className="bg-slate-900 p-4 rounded-xl font-mono text-xs text-teal-400 leading-relaxed space-y-1.5 h-64 overflow-y-auto text-teal-300 border border-slate-800">
                <p className="text-slate-500">// Início dos logs do contêiner</p>
                {cronLogs.length === 0 ? (
                  <p className="text-slate-500">Aguardando disparo pelo terapeuta no botão superior para verificar integridade...</p>
                ) : (
                  cronLogs.map((log, i) => (
                    <p key={i} className="whitespace-pre-wrap">{log}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL WINDOW: Create Patient "Cadastro Mínimo" */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" id="cadastro-modal-root">
            <div className="bg-white rounded-2xl p-6 max-w-xl w-full border border-slate-205 border-slate-200 shadow-2xl relative font-sans space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-805 text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-teal-600" />
                  Cadastro Mínimo e Geração de Token Seguro
                </h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition text-sm font-bold font-sans cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              {!createdFeedback ? (
                <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
                  <p className="text-slate-500 text-xs leading-normal">
                    Preencha as informações preliminares necessárias para carregar a ficha de atendimento. O sistema gerará um token blindado exclusivo que será encaminhado ao paciente de forma segura.
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-0.5">Nome Completo do Paciente <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={newPatient.nome_completo}
                        onChange={(e) => setNewPatient({...newPatient, nome_completo: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                        placeholder="Ex: Mariana Silva de Albuquerque"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-0.5">Data de Nascimento <span className="text-slate-400 font-normal">(Opcional)</span></label>
                      <input 
                        type="text" 
                        value={newPatient.data_nascimento}
                        onChange={(e) => setNewPatient({...newPatient, data_nascimento: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                        placeholder="Ex: 12/04/1988"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-0.5">Endereço de Correspondência <span className="text-slate-400 font-normal">(Opcional)</span></label>
                      <input 
                        type="text" 
                        value={newPatient.endereco}
                        onChange={(e) => setNewPatient({...newPatient, endereco: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                        placeholder="Ex: Av. Paulista, 1000 - Cerqueira César, São Paulo/SP"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-0.5">Contato de Acesso (WhatsApp ou E-mail) <span className="text-slate-400 font-normal">(Opcional)</span></label>
                      <input 
                        type="text" 
                        value={newPatient.contato}
                        onChange={(e) => setNewPatient({...newPatient, contato: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                        placeholder="Ex: (11) 98765-4321"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-0.5">Terapeuta Responsável</label>
                      <select 
                        value={newPatient.id_terapeuta}
                        onChange={(e) => setNewPatient({...newPatient, id_terapeuta: e.target.value})}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {metaTherapists.map(t => <option key={t.id_terapeuta} value={t.id_terapeuta}>{t.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      type="submit"
                      id="submit-minimize-btn"
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 px-5 rounded-lg transition shadow-sm cursor-pointer"
                    >
                      Cadastrar e Gerar Token Único
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-150 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                    <span className="text-[11px] font-bold text-teal-950 font-sans">Paciente cadastrado e Token de Acesso Blindado Gerado!</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-sans space-y-1.5 text-slate-700">
                    <p><strong>Paciente Criado:</strong> {createdFeedback.paciente.nome_completo}</p>
                    <p><strong>Token Provisório:</strong> <strong className="font-mono text-teal-700 font-bold bg-white px-2 py-0.5 border border-slate-200">{createdFeedback.token.token_string}</strong></p>
                    <p><strong>Validade:</strong> 24 Horas (Expira em: {new Date(createdFeedback.token.expira_em).toLocaleTimeString()})</p>
                  </div>

                  {/* Transactional dispatch simulations logs */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">❑ Simuladores de Disparo do Canal de Notificação</h4>
                    
                    {/* Simulated Whatsapp message block */}
                    <div className="p-3 bg-green-50 rounded-xl border border-green-200/60 font-sans space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold bg-green-200 text-green-950 px-1.5 py-0.5 rounded font-mono">WhatsApp API (Fidelity Log)</span>
                        <button 
                          onClick={() => copyToClipboard(createdFeedback.whatsappSimulatedPayload)}
                          className="text-[9px] font-semibold text-green-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copiar Conteúdo SMS
                        </button>
                      </div>
                      <p className="text-[11px] text-green-900 leading-normal italic select-all">"{createdFeedback.whatsappSimulatedPayload}"</p>
                    </div>

                    {/* Simulated SMTP email block */}
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60 font-sans space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold bg-blue-200 text-blue-950 px-1.5 py-0.5 rounded font-mono">E-mail SMTP Servidor (Transactional)</span>
                        <span className="text-[9px] text-blue-800">Assunto: {createdFeedback.emailSimulatedPayload.subject}</span>
                      </div>
                      <p className="text-[11px] text-blue-900 leading-normal italic">
                        <strong>Para:</strong> {createdFeedback.emailSimulatedPayload.to} <br/>
                        <strong>Mensagem:</strong> {createdFeedback.emailSimulatedPayload.body}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-opacity-75 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900">Aviso para Simulação Completa Real:</span>
                      <p className="mt-0.5 text-amber-805 text-amber-800">
                        Copie o link seguro gerado ou use o botão do simulador dual na lateral para visualizar o paciente preenchendo o diagnóstico em tempo real no dispositivo móvel simulado!
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <a 
                      href={`/portal-paciente?token=${createdFeedback.token.token_string}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 font-sans cursor-pointer"
                    >
                      Acessar Portal do Paciente em Nova Guia 
                      <ClipboardList className="w-3.5 h-3.5" />
                    </a>
                    <button 
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreatedFeedback(null);
                        fetchMetaAndPatients();
                      }}
                      className="bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer hover:bg-slate-800 transition"
                    >
                      Concluído
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Inline helper to prevent type errors on anamnese edit buttons
function pDetailsCheck(pac: Paciente): boolean {
  return pac.status_tratamento !== 'Finalizado por Inatividade';
}
