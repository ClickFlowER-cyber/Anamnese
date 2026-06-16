export interface Clinica {
  id_clinica: string;
  nome: string;
  cnpj: string;
}

export interface Terapeuta {
  id_terapeuta: string;
  nome: string;
  registro: string;
  email?: string;
  senha?: string;
}

export interface Paciente {
  id_paciente: string;
  nome_completo: string;
  data_nascimento: string; // DD/MM/AAAA
  endereco: string;
  contato: string; // WhatsApp or Email
  cpf: string;
  num_filhos: number;
  estado_civil: 'Casado' | 'Solteiro' | 'Divorciado' | 'Viúvo' | 'União Estável' | '';
  profissao: string;
  religiao: string;
  status_tratamento: 'Ativo' | 'Finalizado por Inatividade';
  id_clinica: string;
  id_terapeuta_responsavel: string;
  created_at: string;
  updated_at: string;
}

export interface FichaAnamnese {
  id_ficha: string;
  id_paciente: string;
  pressao_arterial: 'Alta' | 'Baixa' | 'Normal' | '';
  uso_medicamentos: boolean;
  medicamentos: string;
  lesao_cranial: string;
  lesao_coluna: string;
  cirurgias: string;
  diabetes: string; // tempo diagnóstico
  queixa_principal: string;
  created_at: string;
  updated_at: string;
}

export interface SessaoEvolucao {
  id_sessao: string;
  id_paciente: string;
  id_terapeuta: string;
  data_sessao: string; // ISO
  evolucao: string;
  observacoes: string;
  reacoes_paciente: string;
  status: 'Rascunho' | 'Finalizado';
  data_finalizacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditoriaConsentimento {
  id_auditoria: string;
  id_paciente: string;
  timestamp_aceite: string; // UTC ISO format
  ip_origem: string;
  user_agent: string;
  termo_versao: string;
}

export interface HistoricoAlteracoes {
  id_historico: string;
  id_paciente: string;
  terapeuta_nome: string;
  timestamp_alteracao: string; // UTC ISO format
  campo_alterado: string;
  valor_anterior: string;
  valor_novo: string;
}

export interface TokenAcesso {
  id_token: string;
  token_string: string;
  id_paciente: string;
  foi_usado: boolean;
  expira_em: string; // ISO format
  criado_em: string; // ISO format
}

export interface DbSchema {
  clinicas: Clinica[];
  terapeutas: Terapeuta[];
  pacientes: Paciente[];
  fichas: FichaAnamnese[];
  sessoes: SessaoEvolucao[];
  auditorias: AuditoriaConsentimento[];
  historico: HistoricoAlteracoes[];
  tokens: TokenAcesso[];
}
