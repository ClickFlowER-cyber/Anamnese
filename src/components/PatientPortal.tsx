import React, { useState, useEffect } from 'react';
import { FichaAnamnese, Paciente, AuditoriaConsentimento } from '../types';
import { ShieldCheck, Send, CheckCircle2, AlertTriangle, Key, HeartPulse, Sparkles, Footprints, AlertCircle } from 'lucide-react';

interface PatientPortalProps {
  tokenString: string;
  onSuccess?: () => void;
  standalone?: boolean;
}

export default function PatientPortal({ tokenString, onSuccess, standalone = false }: PatientPortalProps) {
  const [token, setToken] = useState<string>(tokenString);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [form, setForm] = useState({
    nome_completo: '',
    data_nascimento: '',
    endereco: '',
    contato: '',
    cpf: '',
    num_filhos: 0,
    estado_civil: '',
    profissao: '',
    religiao: '',
    pressao_arterial: '',
    uso_medicamentos: false,
    medicamentos: '',
    lesao_cranial: '',
    lesao_coluna: '',
    cirurgias: '',
    diabetes: '',
    queixa_principal: ''
  });
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditoriaConsentimento | null>(null);

  // Validate Token on load
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tokens/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao validar token de segurança.');
      }
      const data = await res.json();
      setPaciente(data.paciente);
      if (data.paciente) {
        setForm({
          nome_completo: data.paciente.nome_completo || '',
          data_nascimento: data.paciente.data_nascimento || '',
          endereco: data.paciente.endereco || '',
          contato: data.paciente.contato || '',
          cpf: data.paciente.cpf || '',
          num_filhos: data.paciente.num_filhos || 0,
          estado_civil: data.paciente.estado_civil || '',
          profissao: data.paciente.profissao || '',
          religiao: data.paciente.religiao || '',
          pressao_arterial: data.ficha?.pressao_arterial || '',
          uso_medicamentos: data.ficha?.uso_medicamentos || false,
          medicamentos: data.ficha?.medicamentos || '',
          lesao_cranial: data.ficha?.lesao_cranial || '',
          lesao_coluna: data.ficha?.lesao_coluna || '',
          cirurgias: data.ficha?.cirurgias || '',
          diabetes: data.ficha?.diabetes || '',
          queixa_principal: data.ficha?.queixa_principal || ''
        });
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization stream of field typing
  const syncFieldTyping = async (fieldName: string, value: string) => {
    if (!paciente) return;
    try {
      await fetch('/api/sync-typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: paciente.id_paciente,
          field: fieldName,
          value: value
        })
      });
    } catch (e) {
      console.warn("Falha silenciosa ao sincronizar digitação.", e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let computedValue: any = value;

    if (type === 'checkbox') {
      computedValue = (e.target as HTMLInputElement).checked;
    }

    setForm(prev => ({
      ...prev,
      [name]: computedValue
    }));

    // Trigger immediate typing synchronization to therapist monitoring dashboard
    if (name === 'queixa_principal' || name === 'medicamentos' || name === 'nome_completo') {
      syncFieldTyping(name, String(computedValue));
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lgpdAccepted) return;
    
    // Quick core validations
    if (!form.nome_completo.trim()) {
      alert("O nome completo é obrigatório!");
      return;
    }
    if (!form.data_nascimento.trim()) {
      alert("A data de nascimento é obrigatória!");
      return;
    }
    if (!form.endereco.trim()) {
      alert("O endereço de residência é obrigatório!");
      return;
    }
    if (!form.contato.trim()) {
      alert("O contato (WhatsApp/E-mail) é obrigatório!");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // Capture standard browser client metadata for the audit report
    const clientIp = "187.41." + Math.floor(10 + Math.random() * 89) + "." + Math.floor(100 + Math.random() * 150); // Simulated user internet IP
    const clientUserAgent = navigator.userAgent;

    try {
      const res = await fetch(`/api/tokens/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ip_origem: clientIp,
          user_agent: clientUserAgent
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao submeter a ficha.');
      }

      const data = await res.json();
      setSuccessMsg("Ficha cadastrada com total segurança legal sob as premissas da LGPD!");
      setAuditLog(data.audit);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="relative w-16 h-16 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600"></div>
        <p className="mt-4 text-sm text-slate-500 font-medium font-sans">Carregando portal seguro do paciente...</p>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-lg mx-auto text-center" id="success-portal-card">
        <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-teal-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Ficha Enviada com Sucesso!</h2>
        <p className="mt-3 text-slate-600 text-sm leading-relaxed">
          Obrigado, <span className="font-semibold text-stone-800">{form.nome_completo}</span>. Suas respostas foram transmitidas de forma segura para o prontuário clínico blindado do seu terapeuta.
        </p>

        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-705 uppercase tracking-wider font-mono">Comprovante de Auditoria LGPD</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500 font-mono">
            <p><strong>Paciente ID:</strong> {paciente?.id_paciente}</p>
            <p><strong>Termo Aceito:</strong> {auditLog?.termo_versao || 'LGPD-REFLEXO-V1'}</p>
            <p><strong>Data/Hora Aceite:</strong> {auditLog?.timestamp_aceite ? new Date(auditLog.timestamp_aceite).toLocaleString('pt-BR') : new Date().toLocaleString()}</p>
            <p><strong>IP de Registro:</strong> {auditLog?.ip_origem}</p>
            <p className="truncate"><strong>Dispositivo:</strong> {auditLog?.user_agent}</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-teal-50/60 rounded-xl border border-teal-100 flex items-start gap-2.5 text-left">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-850 leading-normal font-sans">
            <strong>Ficha Aberta para Alterações:</strong> Este link permanece livre para você revisar ou fazer novos ajustes sobre o seu bem-estar quando julgar de interesse. Sinta-se à vontade para retornar!
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3.5 justify-center">
          <button 
            type="button" 
            onClick={() => setSuccessMsg(null)}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-medium text-xs rounded-xl shadow-sm hover:shadow transition duration-150 font-sans cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Ver ou Alterar Respostas Desta Ficha
          </button>
          
          {standalone && (
            <button 
              type="button" 
              onClick={() => {
                setSuccessMsg(null);
                setLgpdAccepted(false);
                setToken('');
                setForm({
                  nome_completo: '',
                  data_nascimento: '',
                  endereco: '',
                  contato: '',
                  cpf: '',
                  num_filhos: 0,
                  estado_civil: '',
                  profissao: '',
                  religiao: '',
                  pressao_arterial: '',
                  uso_medicamentos: false,
                  medicamentos: '',
                  lesao_cranial: '',
                  lesao_coluna: '',
                  cirurgias: '',
                  diabetes: '',
                  queixa_principal: ''
                });
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition font-sans cursor-pointer flex items-center justify-center"
            >
              Testar com outro token
            </button>
          )}
        </div>
      </div>
    );
  }

  // Error (Invalid/Expired Token)
  if (errorMsg || !paciente) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-md p-8 max-w-md mx-auto text-center" id="error-portal-card">
        <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-850 font-sans">Acesso Negado</h3>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {errorMsg || "Código de acesso inexistente, expirado ou já utilizado pelo paciente."}
        </p>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2 font-mono">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            Simulação de Token de Uso Único
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Seja bem-vindo ao Simulador! Para preencher a ficha como paciente, use o painel lateral do terapeuta para cadastrar um paciente mínimo, copie o token seguro gerado e valide no campo abaixo.
          </p>
        </div>

        <div className="mt-6">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Digite o Token (Ex: REF-9922...)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full font-mono text-center text-slate-850"
            />
            <button 
              type="button"
              onClick={fetchData}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
            >
              Validar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50/10 rounded-3xl border border-teal-100/50 shadow-lg overflow-hidden max-w-2xl mx-auto backdrop-blur-sm" id="portal-form-container">
      {/* Clinica Branding Section */}
      <div className="p-8 bg-gradient-to-br from-teal-700 via-teal-800 to-stone-800 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-12 pointer-events-none">
          <Footprints className="w-40 h-40 rotate-12 text-teal-100" />
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
            <HeartPulse className="w-6 h-6 text-teal-100" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest font-sans">Momentos de Harmonia & Equilíbrio</span>
            <h1 className="text-2xl font-serif italic font-normal tracking-wide text-white mt-0.5">Reflexologia Podal Terapêutica</h1>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap justify-between items-center text-xs text-teal-50 font-sans gap-2">
          <span><strong>Paciente:</strong> {paciente.nome_completo}</span>
          <span className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider">Código Prontuário: {paciente.id_paciente}</span>
        </div>
      </div>
 
      <form onSubmit={handleSubmit} className="p-6 space-y-7 md:p-8 bg-white/95">
        {/* Soft, relaxing self-care welcome banner */}
        <div className="bg-gradient-to-br from-teal-50/60 to-emerald-50/30 p-5 rounded-2xl border border-teal-100/40 text-slate-705 space-y-2 shadow-sm">
          <h3 className="text-sm font-semibold text-teal-850 flex items-center gap-2 font-serif italic">
            <Sparkles className="w-4.5 h-4.5 text-teal-600 animate-pulse" />
            Um convite ao equilíbrio e autocuidado
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans font-light">
            Seja muito bem-vindo ao seu momento de cuidado terapêutico. Para que a sua sessão de <strong>Reflexologia Podal</strong> seja plenamente personalizada, preencha este prontuário em um ambiente tranquilo. Cada pequeno detalhe ajuda a guiar o tratamento em direção à harmonia total, relaxamento profundo e reestabelecimento de suas energias naturais.
          </p>
        </div>

        {/* Helper Badge for test flow */}
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100/80 flex items-center justify-between text-[11px] text-amber-800 font-sans font-light">
          <span className="flex items-center gap-2 leading-tight">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span><strong>Modo de Sincronismo Sutil:</strong> Alterações de nome e queixa principal surgem em tempo real para o Dr. Terapeuta, auxiliando o acolhimento seguro.</span>
          </span>
        </div>
 
        {/* SECTION 1: Personal Data */}
        <div className="space-y-4">
          <h2 className="text-base font-serif italic text-teal-800 tracking-wide pb-1.5 border-b border-teal-50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            1. Dados Cadastrais e Pessoais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="nome_completo"
                value={form.nome_completo}
                onChange={handleInputChange}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="Insira seu nome completo"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="data_nascimento"
                value={form.data_nascimento}
                onChange={handleInputChange}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="Ex: 12/04/1988"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Endereço de Residência <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="endereco"
                value={form.endereco}
                onChange={handleInputChange}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans animate-none"
                placeholder="Rua, Número, Bairro, Cidade, Estado"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contato (WhatsApp ou E-mail) <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="contato"
                value={form.contato}
                onChange={handleInputChange}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="(00) 90000-0000 ou email@ex.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">CPF (Opcional)</label>
              <input 
                type="text" 
                name="cpf"
                value={form.cpf}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Qtd Filhos</label>
                <input 
                  type="number" 
                  name="num_filhos"
                  min="0"
                  value={form.num_filhos}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Estado Civil</label>
                <select 
                  name="estado_civil"
                  value={form.estado_civil}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  <option value="Casado">Casado</option>
                  <option value="Solteiro">Solteiro</option>
                  <option value="Divorciado">Divorciado</option>
                  <option value="Viúvo">Viúvo</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Profissão</label>
              <input 
                type="text" 
                name="profissao"
                value={form.profissao}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="Ex: Arquiteto, Professor, etc"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Religião / Crença</label>
              <input 
                type="text" 
                name="religiao"
                value={form.religiao}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="Texto livre"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Anamnese / Clinica */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h2 className="text-base font-serif italic text-teal-800 tracking-wide pb-1.5 border-b border-teal-50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            2. Histórico Clínico e Reações Corporais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Pressão Arterial Corrente</label>
              <select 
                name="pressao_arterial"
                value={form.pressao_arterial}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans cursor-pointer"
              >
                <option value="">Não sei / Não aferida</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Diabetes tipo I / II ?</label>
              <input 
                type="text" 
                name="diabetes"
                value={form.diabetes}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="Há quanto tempo diagnosticada? (Ou deixe em branco)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="uso_medicamentos"
                  checked={form.uso_medicamentos}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-700">Faz uso contínuo de Medicamentos?</span>
                  <span className="text-[10px] text-slate-505">Marque se sim para descrever quais substâncias</span>
                </div>
              </label>
            </div>

            {form.uso_medicamentos && (
              <div className="md:col-span-2 transition-all duration-300">
                <label className="block text-xs font-bold text-slate-600 mb-1">Quais medicamentos e dosagens?</label>
                <textarea 
                  name="medicamentos"
                  value={form.medicamentos}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                  placeholder="Nome do remédio, dosagem e frequência..."
                />
              </div>
            )}

             <div className="md:col-span-2 space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 font-sans">
                  <span>Tem alguma lesão corporal? <span className="text-slate-400 font-normal">(Cranial, coluna, articulações, etc.)</span></span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-5">
                  <label className="inline-flex items-center text-sm text-slate-700 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="lesao_cranial" 
                      value="Sim" 
                      checked={form.lesao_cranial === 'Sim'} 
                      onChange={() => {
                        setForm(prev => ({ ...prev, lesao_cranial: 'Sim' }));
                        syncFieldTyping('lesao_cranial', 'Sim');
                      }}
                      className="text-teal-600 focus:ring-teal-500 mr-2 h-4 w-4" 
                    />
                    Sim
                  </label>
                  <label className="inline-flex items-center text-sm text-slate-700 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="lesao_cranial" 
                      value="Não" 
                      checked={form.lesao_cranial === 'Não' || !form.lesao_cranial} 
                      onChange={() => {
                        setForm(prev => ({ ...prev, lesao_cranial: 'Não', lesao_coluna: '' }));
                        syncFieldTyping('lesao_cranial', 'Não');
                        syncFieldTyping('lesao_coluna', '');
                      }}
                      className="text-teal-600 focus:ring-teal-500 mr-2 h-4 w-4" 
                    />
                    Não
                  </label>
                </div>
              </div>

              {form.lesao_cranial === 'Sim' && (
                <div className="transition-all duration-300 animate-fade-in">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Por favor, descreva a(s) lesão(ões): <span className="text-rose-500">*</span></label>
                  <textarea 
                    name="lesao_coluna"
                    required
                    value={form.lesao_coluna}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                    placeholder="Descreva detalhes das lesões. Caso haja mais de uma, pode listá-las todas aqui..."
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Passou por cirurgias importantes?</label>
              <input 
                type="text" 
                name="cirurgias"
                value={form.cirurgias}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans"
                placeholder="Se sim, descreva o motivo e o ano aproximado..."
              />
            </div>

            <div className="md:col-span-2 bg-teal-50/30 p-4 rounded-xl border border-teal-100">
              <label className="block text-xs font-bold text-teal-800 mb-1 flex items-center gap-1.5">
                <span>Queixa Principal (O que sente / Onde dói?)</span>
                <span className="py-0.5 px-2 bg-teal-100 text-teal-850 text-[10px] font-mono rounded font-bold uppercase tracking-wide">Live Transmit</span>
              </label>
              <textarea 
                name="queixa_principal"
                value={form.queixa_principal}
                onChange={handleInputChange}
                rows={3}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 text-slate-800 font-sans shadow-inner placeholder:text-slate-400"
                placeholder="Descreva detalhadamente seu incomodo, suas dores nas pernas, cansaço, estresse ou qualquer ponto corporal sensível que justifique o tratamento..."
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: LGPD Terms & Signature Consent */}
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <h2 className="text-base font-serif italic text-teal-800 tracking-wide pb-1.5 border-b border-teal-50 flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-teal-600" />
            3. Controle Legal de Consentimento (LGPD)
          </h2>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed max-h-56 overflow-y-auto shadow-inner space-y-3 font-sans">
            <p className="font-bold text-slate-800">Declaro que li e concordo com o Termo de Responsabilidade abaixo:</p>
            <p className="italic">
              “Responsabilizo-me pelas informações aqui transmitidas como sendo a verdade e estou ciente do tratamento a ser realizado com Reflexologia, o qual usará apenas as mãos e instrumentos não invasivos em sua terapêutica, bem como os possíveis efeitos secundários ocasionados pelo tratamento ao qual concordo expressamente neste termo.”
            </p>
            <p className="italic">
              “Também estou ciente que a Reflexoterapia não é uma especialidade Médica, Psicológica ou da área da Fisioterapia, não tendo o profissional que fará o trabalho técnico, a necessidade de uma formação em qualquer destas áreas.”
            </p>
            <p className="font-semibold text-slate-750">
              “Autorizo o tratamento recomendado.”
            </p>
          </div>

          {/* Accept Switch Checkbox */}
          <label className="flex items-start gap-3 p-4 bg-teal-50/50 rounded-xl border border-teal-100 cursor-pointer select-none">
            <input 
              type="checkbox"
              id="confirmacao-lgpd-checkbox"
              checked={lgpdAccepted}
              onChange={(e) => setLgpdAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 rounded text-teal-600 border-slate-300 focus:ring-teal-500 shrink-0"
            />
            <div className="text-xs text-slate-800 font-sans">
              <span className="block font-bold">Aceite de Consentimento Explicito e Eletrônico</span>
              <p className="text-slate-600 mt-0.5 leading-normal">
                Li o termo juríco, responsabilizo-me pela legitimidade dos sintomas fornecidos e autorizo a clínica a registrar meu prontuário sob as regras do sigilo terapêutico.
              </p>
            </div>
          </label>
        </div>

        {/* Action Button layout */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button 
            type="submit"
            id="submeter-ficha-paciente-btn"
            disabled={!lgpdAccepted || submitting}
            className={`w-full font-sans flex items-center justify-center gap-2 py-3.5 px-6 font-bold rounded-xl text-sm transition-all shadow-sm ${
              lgpdAccepted && !submitting
                ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer hover:shadow-lg' 
                : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
            }`}
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processando Envio Seguro...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Ficha de Anamnese Digital</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
