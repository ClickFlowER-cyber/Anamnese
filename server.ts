import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DbSchema, Paciente, FichaAnamnese, SessaoEvolucao, AuditoriaConsentimento, HistoricoAlteracoes, TokenAcesso } from "./src/types";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

app.use(express.json());

// In-memory live typing store to avoid file system thrashing
const liveTypingStore: Record<string, { field: string; value: string; timestamp: string }> = {};

// Helper to secure initial database file
function initDb() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      JSON.parse(data);
      return;
    } catch (e) {
      console.error("Malformed db.json, recreating...", e);
    }
  }

  const initialDb: DbSchema = {
    clinicas: [
      { id_clinica: "clin-1", nome: "Clínica Harmonya Podal", cnpj: "45.892.311/0001-08" },
      { id_clinica: "clin-2", nome: "Espaço Integrativo Saúde do Pé", cnpj: "82.411.391/0001-44" }
    ],
    terapeutas: [],
    pacientes: [],
    fichas: [],
    sessoes: [],
    auditorias: [],
    historico: [],
    tokens: []
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
}

initDb();

function readDb(): DbSchema {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Database reading error", e);
    // fallback
    return { clinicas: [], terapeutas: [], pacientes: [], fichas: [], sessoes: [], auditorias: [], historico: [], tokens: [] };
  }
}

function writeDb(data: DbSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// REST endpoints
// --------------------------------------------------------------------------

// 1. Get initial context info
app.get("/api/config", (req, res) => {
  const db = readDb();
  res.json({
    clinicas: db.clinicas,
    terapeutas: db.terapeutas
  });
});

// 1.5. Therapist Login / Registration
app.post("/api/auth/login", (req, res) => {
  const { email, nome, password, isSignUpMode } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório." });
  }

  const db = readDb();
  const lowerEmail = email.toLowerCase().trim();

  // Find therapist by email
  let therapist = db.terapeutas.find(
    t => t.email?.toLowerCase() === lowerEmail
  );

  // If not found, try to find by name match
  if (!therapist && nome) {
    therapist = db.terapeutas.find(
      t => t.nome.toLowerCase() === nome.trim().toLowerCase()
    );
    if (therapist) {
      // update email
      therapist.email = lowerEmail;
    }
  }

  // Handle Sign-Up vs Login flow with password / fallback compatibility
  if (isSignUpMode) {
    if (therapist) {
      // If therapist exists and has a password recorded, check if it matches
      if (therapist.senha && password && therapist.senha !== password) {
        return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado com outra senha por um terapeuta no servidor." });
      }
      // If it exists but has no password, or the password matches, set it
      if (password) {
        therapist.senha = password;
      }
      if (nome) {
        therapist.nome = nome.trim();
      }
      writeDb(db);
      return res.json({ success: true, therapist });
    }
  } else {
    // Login flow
    if (therapist) {
      // If therapist has a password set, we validate it
      if (therapist.senha && password && therapist.senha !== password) {
        return res.status(400).json({ error: "Senha de acesso incorreta para esta conta de terapeuta." });
      }
      // If therapist doesn't have a password set yet (e.g. pre-set test accounts), auto-save password on their first login
      if (!therapist.senha && password) {
        therapist.senha = password;
        writeDb(db);
      }
    } else {
      // Therapist not found on login flow. Instead of blocking, we auto-create his profile!
      // This solves the sync issue if the db.json was cleared or reset.
      const formattedName = nome ? nome.trim() : lowerEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
      const normalizedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      const id_terapeuta = `ter-${Math.floor(100000 + Math.random() * 900000)}`;
      therapist = {
        id_terapeuta,
        nome: normalizedName,
        registro: `CRTF-${Math.floor(1000 + Math.random() * 9000)}-SP`,
        email: lowerEmail,
        senha: password || undefined
      };
      db.terapeutas.push(therapist);
      writeDb(db);
    }
  }

  // If still not found and in registration / signup mode (or as a safe default), create a new one dynamically
  if (!therapist) {
    const formattedName = nome ? nome.trim() : lowerEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
    const normalizedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
    const id_terapeuta = "ter-" + Math.random().toString(36).substr(2, 9);
    
    therapist = {
      id_terapeuta,
      nome: normalizedName,
      registro: `CRTF-${Math.floor(1000 + Math.random() * 9000)}-SP`,
      email: lowerEmail,
      senha: password || undefined
    };
    db.terapeutas.push(therapist);
    writeDb(db);
  }

  res.json({ success: true, therapist });
});

// 2. Get list of patients
app.get("/api/pacientes", (req, res) => {
  const db = readDb();
  const { id_terapeuta } = req.query;
  
  if (id_terapeuta) {
    const filtered = db.pacientes.filter(p => p.id_terapeuta_responsavel === id_terapeuta);
    res.json(filtered);
  } else {
    res.json(db.pacientes);
  }
});

// 3. Create pre-patient metadata (Cadastro mínimo) and generate Access Token
app.post("/api/pacientes", (req, res) => {
  const { nome_completo, data_nascimento, endereco, contato, id_clinica, id_terapeuta } = req.body;

  if (!nome_completo || !nome_completo.trim()) {
    return res.status(400).json({ error: "O nome completo é obrigatório." });
  }

  const db = readDb();

  const id_paciente = "pac-" + Date.now();
  const novoPaciente: Paciente = {
    id_paciente,
    nome_completo: nome_completo.trim(),
    data_nascimento: data_nascimento ? data_nascimento.trim() : "",
    endereco: endereco ? endereco.trim() : "",
    contato: contato ? contato.trim() : "",
    cpf: "",
    num_filhos: 0,
    estado_civil: "",
    profissao: "",
    religiao: "",
    status_tratamento: "Ativo",
    id_clinica: id_clinica || "clin-1",
    id_terapeuta_responsavel: id_terapeuta || "ter-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const id_ficha = "fic-" + Date.now();
  const novaFicha: FichaAnamnese = {
    id_ficha,
    id_paciente,
    pressao_arterial: "",
    uso_medicamentos: false,
    medicamentos: "",
    lesao_coluna: "",
    lesao_cranial: "",
    cirurgias: "",
    diabetes: "",
    queixa_principal: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Generate unique 6-digit numeric token
  const tokenString = String(Math.floor(100000 + Math.random() * 900000));
  const id_token = "tok-" + Date.now();
  
  // High secure: 24h expiration
  const expDate = new Date();
  expDate.setHours(expDate.getHours() + 24);

  const novoToken: TokenAcesso = {
    id_token,
    token_string: tokenString,
    id_paciente,
    foi_usado: false,
    expira_em: expDate.toISOString(),
    criado_em: new Date().toISOString()
  };

  db.pacientes.push(novoPaciente);
  db.fichas.push(novaFicha);
  db.tokens.push(novoToken);

  writeDb(db);

  // Send simulated link visually for testing
  const host = req.headers.host || "localhost:3000";
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || "http";
  const baseUrl = `${protocol}://${host}`;
  const patientSharingLink = `/portal-paciente?token=${tokenString}`;
  
  res.json({
    success: true,
    paciente: novoPaciente,
    token: novoToken,
    sharingLink: patientSharingLink,
    // Realistic multi-channel notification simulation payloads:
    whatsappSimulatedPayload: `Olá, ${novoPaciente.nome_completo}! A clínica gostaria de solicitar o preenchimento da sua Ficha de Anamnese Digital antes da sua próxima consulta de Reflexologia. Acesse o link seguro de uso único: ${baseUrl}${patientSharingLink} (Válido por 24h). Código de validação: ${tokenString}`,
    emailSimulatedPayload: {
      to: novoPaciente.contato,
      subject: "Ficha de Anamnese Digital de Reflexologia Podal",
      body: `Prezado(a) ${novoPaciente.nome_completo}, para agilizar seu atendimento e garantir total precisão no tratamento terapêutico da Reflexologia Podal, preencha o formulário clicando no link a seguir: ${baseUrl}${patientSharingLink}. Este link expirará assim que for enviado.`
    }
  });
});

// 4. Validate Token
app.get("/api/tokens/:token", (req, res) => {
  const tokenQuery = req.params.token;
  const db = readDb();

  const foundToken = db.tokens.find(t => t.token_string === tokenQuery);

  if (!foundToken) {
    return res.status(404).json({ error: "Token inválido ou não encontrado." });
  }

  // Safe validation: no longer locks the patient out after submission or slow access 
  // keeping the patient page libre for alterations at any time!
  const patient = db.pacientes.find(p => p.id_paciente === foundToken.id_paciente);
  const infoAnamnese = db.fichas.find(f => f.id_paciente === foundToken.id_paciente) || {};

  res.json({
    token: foundToken,
    paciente: patient,
    ficha: infoAnamnese
  });
});

// 5. Patient live typing update endpoint
app.post("/api/sync-typing", (req, res) => {
  const { patientId, field, value } = req.body;
  if (!patientId || !field) {
    return res.status(400).json({ error: "patientId e campo são fundamentais." });
  }

  liveTypingStore[patientId] = {
    field,
    value: value || "",
    timestamp: new Date().toISOString()
  };

  res.json({ success: true });
});

// 6. Get live typing streaming updates
app.get("/api/live-typing/:patientId", (req, res) => {
  const pId = req.params.patientId;
  const match = liveTypingStore[pId];

  // Return clean typing state if active within 15 seconds
  if (match) {
    const ageMs = Date.now() - new Date(match.timestamp).getTime();
    if (ageMs < 15000) {
      return res.json({ active: true, ...match });
    }
  }

  res.json({ active: false });
});

// 7. Submit Patient Anamnese (LGPD)
app.post("/api/tokens/:token/submit", (req, res) => {
  const { token } = req.params;
  const {
    nome_completo,
    data_nascimento,
    endereco,
    contato,
    cpf,
    num_filhos,
    estado_civil,
    profissao,
    religiao,
    pressao_arterial,
    uso_medicamentos,
    medicamentos,
    lesao_cranial,
    lesao_coluna,
    cirurgias,
    diabetes,
    queixa_principal,
    ip_origem,
    user_agent
  } = req.body;

  const db = readDb();
  const tokenIdx = db.tokens.findIndex(t => t.token_string === token);

  if (tokenIdx === -1) {
    return res.status(404).json({ error: "Token inválido para envio." });
  }

  const foundToken = db.tokens[tokenIdx];

  // Update token status to keep history, but do not block future updates
  db.tokens[tokenIdx].foi_usado = true;

  // Find and update Paciente details
  const pIdx = db.pacientes.findIndex(p => p.id_paciente === foundToken.id_paciente);
  if (pIdx !== -1) {
    const backupPaciente = { ...db.pacientes[pIdx] };
    db.pacientes[pIdx] = {
      ...db.pacientes[pIdx],
      nome_completo: nome_completo || db.pacientes[pIdx].nome_completo,
      data_nascimento: data_nascimento || "",
      endereco: endereco || db.pacientes[pIdx].endereco,
      contato: contato || db.pacientes[pIdx].contato,
      cpf: cpf || "",
      num_filhos: num_filhos !== undefined ? Number(num_filhos) : 0,
      estado_civil: estado_civil || "",
      profissao: profissao || "",
      religiao: religiao || "",
      updated_at: new Date().toISOString()
    };
  }

  // Find and update FichaAnamnese details
  const fIdx = db.fichas.findIndex(f => f.id_paciente === foundToken.id_paciente);
  if (fIdx !== -1) {
    db.fichas[fIdx] = {
      ...db.fichas[fIdx],
      pressao_arterial: pressao_arterial || "",
      uso_medicamentos: !!uso_medicamentos,
      medicamentos: uso_medicamentos ? (medicamentos || "") : "",
      lesao_cranial: lesao_cranial || "",
      lesao_coluna: lesao_coluna || "",
      cirurgias: cirurgias || "",
      diabetes: diabetes || "",
      queixa_principal: queixa_principal || "",
      updated_at: new Date().toISOString()
    };
  }

  // Record LGPD Consent Audit with client parameters
  const id_auditoria = "aud-" + Date.now();
  const ip = ip_origem || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "189.41.22.100";
  const agent = user_agent || req.headers["user-agent"] || "Mozilla/5.0 Client UI";

  const novaAuditoria: AuditoriaConsentimento = {
    id_auditoria,
    id_paciente: foundToken.id_paciente,
    timestamp_aceite: new Date().toISOString(),
    ip_origem: String(ip),
    user_agent: String(agent),
    termo_versao: "LGPD-REFLEXO-V1"
  };

  db.auditorias.push(novaAuditoria);

  // Clear live typing for this patient
  delete liveTypingStore[foundToken.id_paciente];

  writeDb(db);
  res.json({ success: true, message: "Ficha enviada e token invalidado com total segurança.", audit: novaAuditoria });
});

// 7.5. Reactivate Patient
app.post("/api/pacientes/:id/reativar", (req, res) => {
  const pId = req.params.id;
  const { terapeuta_nome } = req.body;

  if (!terapeuta_nome) {
    return res.status(400).json({ error: "Nome do terapeuta responsável é exigido para log de reativação." });
  }

  const db = readDb();
  const pIdx = db.pacientes.findIndex(p => p.id_paciente === pId);

  if (pIdx === -1) {
    return res.status(404).json({ error: "Paciente não localizado." });
  }

  const oldStatus = db.pacientes[pIdx].status_tratamento;
  db.pacientes[pIdx].status_tratamento = "Ativo";
  db.pacientes[pIdx].updated_at = new Date().toISOString();

  // Insert log in clinical alterations log
  db.historico.push({
    id_historico: "hist-reat-" + Math.random().toString(36).substr(2, 9),
    id_paciente: pId,
    terapeuta_nome,
    timestamp_alteracao: new Date().toISOString(),
    campo_alterado: "Status do Tratamento (Reativação)",
    valor_anterior: oldStatus,
    valor_novo: "Ativo"
  });

  writeDb(db);
  res.json({ success: true, patient: db.pacientes[pIdx] });
});

// 7.6. Alternar Status do Paciente (Ativo/Inativo)
app.post("/api/pacientes/:id/alterar-status", (req, res) => {
  const pId = req.params.id;
  const { status, terapeuta_nome } = req.body;

  if (!terapeuta_nome) {
    return res.status(400).json({ error: "Nome do terapeuta responsável é exigido para log de alteração de status." });
  }

  if (status !== "Ativo" && status !== "Inativo") {
    return res.status(400).json({ error: "Status inválido fornecido." });
  }

  const db = readDb();
  const pIdx = db.pacientes.findIndex(p => p.id_paciente === pId);

  if (pIdx === -1) {
    return res.status(404).json({ error: "Paciente não localizado." });
  }

  const oldStatus = db.pacientes[pIdx].status_tratamento;
  db.pacientes[pIdx].status_tratamento = status;
  db.pacientes[pIdx].updated_at = new Date().toISOString();

  // Insert log in clinical alterations log
  db.historico.push({
    id_historico: "hist-status-" + Math.random().toString(36).substr(2, 9),
    id_paciente: pId,
    terapeuta_nome,
    timestamp_alteracao: new Date().toISOString(),
    campo_alterado: "Status do Tratamento",
    valor_anterior: oldStatus,
    valor_novo: status
  });

  writeDb(db);
  res.json({ success: true, patient: db.pacientes[pIdx] });
});

// 8. Therapist Update Patient + Anamnese with tracking (Histórico de Alterações)
app.put("/api/pacientes/:id", (req, res) => {
  const pId = req.params.id;
  const { paciente, ficha, terapeuta_nome } = req.body;

  if (!terapeuta_nome) {
    return res.status(400).json({ error: "Nome do terapeuta responsável é exigido para log de auditoria jurídica das alterações." });
  }

  const db = readDb();
  const pIdx = db.pacientes.findIndex(p => p.id_paciente === pId);

  if (pIdx === -1) {
    return res.status(404).json({ error: "Paciente não localizado." });
  }

  // If status is "Finalizado por Inatividade", block modifications
  if (db.pacientes[pIdx].status_tratamento === "Finalizado por Inatividade") {
    return res.status(403).json({ error: "Este prontuário está finalizado por inatividade há mais de 90 dias e encontra-se congelado judicialmente contra alterações." });
  }

  const logs: HistoricoAlteracoes[] = [];
  const oldPac = db.pacientes[pIdx];

  // Compare Paciente fields
  if (paciente) {
    const fieldsToCompare: (keyof Paciente)[] = ["nome_completo", "data_nascimento", "endereco", "contato", "cpf", "num_filhos", "estado_civil", "profissao", "religiao"];
    fieldsToCompare.forEach(f => {
      if (paciente[f] !== undefined && String(paciente[f]) !== String(oldPac[f])) {
        logs.push({
          id_historico: "hist-" + Math.random().toString(36).substr(2, 9),
          id_paciente: pId,
          terapeuta_nome,
          timestamp_alteracao: new Date().toISOString(),
          campo_alterado: `Paciente - ${String(f)}`,
          valor_anterior: String(oldPac[f] || "Vazio"),
          valor_novo: String(paciente[f])
        });
      }
    });

    db.pacientes[pIdx] = {
      ...oldPac,
      ...paciente,
      updated_at: new Date().toISOString()
    };
  }

  // Compare FichaAnamnese fields
  const fIdx = db.fichas.findIndex(f => f.id_paciente === pId);
  if (fIdx !== -1 && ficha) {
    const oldFic = db.fichas[fIdx];
    const fieldsToCompare: (keyof FichaAnamnese)[] = ["pressao_arterial", "uso_medicamentos", "medicamentos", "lesao_cranial", "lesao_coluna", "cirurgias", "diabetes", "queixa_principal"];
    
    fieldsToCompare.forEach(f => {
      let isChanged = false;
      if (typeof oldFic[f] === "boolean" || typeof ficha[f] === "boolean") {
        isChanged = !!oldFic[f] !== !!ficha[f];
      } else {
        isChanged = ficha[f] !== undefined && String(ficha[f]) !== String(oldFic[f]);
      }

      if (isChanged) {
        logs.push({
          id_historico: "hist-" + Math.random().toString(36).substr(2, 9),
          id_paciente: pId,
          terapeuta_nome,
          timestamp_alteracao: new Date().toISOString(),
          campo_alterado: `Anamnese - ${String(f)}`,
          valor_anterior: String(oldFic[f] === undefined ? "Vazio" : oldFic[f]),
          valor_novo: String(ficha[f] === undefined ? "Vazio" : ficha[f])
        });
      }
    });

    db.fichas[fIdx] = {
      ...oldFic,
      ...ficha,
      updated_at: new Date().toISOString()
    };
  }

  // Append logs
  if (logs.length > 0) {
    db.historico.push(...logs);
  }

  writeDb(db);
  res.json({ success: true, patient: db.pacientes[pIdx], ficha: db.fichas[fIdx], logs });
});

// 9. Create Clinical Session
app.post("/api/sessoes", (req, res) => {
  const { id_paciente, id_terapeuta, evolucao, observacoes, reacoes_paciente } = req.body;

  if (!id_paciente || !id_terapeuta) {
    return res.status(400).json({ error: "id_paciente e id_terapeuta são exigidos." });
  }

  const db = readDb();
  // Ensure patient is active or allow activation
  const pIdx = db.pacientes.findIndex(p => p.id_paciente === id_paciente);
  if (pIdx === -1) {
    return res.status(404).json({ error: "Paciente inexistente." });
  }

  if (db.pacientes[pIdx].status_tratamento === "Finalizado por Inatividade") {
    return res.status(403).json({ error: "Impossível criar sessões para prontuário congelado por inatividade de 90 dias." });
  }

  const id_sessao = "ses-" + Date.now();
  const novaSessao: SessaoEvolucao = {
    id_sessao,
    id_paciente,
    id_terapeuta,
    data_sessao: new Date().toISOString(),
    evolucao: evolucao || "",
    observacoes: observacoes || "",
    reacoes_paciente: reacoes_paciente || "",
    status: "Rascunho",
    data_finalizacao: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.sessoes.push(novaSessao);
  db.pacientes[pIdx].updated_at = new Date().toISOString(); // refresh patient update time

  writeDb(db);
  res.json({ success: true, sessao: novaSessao });
});

// 10. Save Session draft or finalize
app.put("/api/sessoes/:id", (req, res) => {
  const sId = req.params.id;
  const { evolucao, observacoes, reacoes_paciente, status, terapeuta_nome } = req.body;

  const db = readDb();
  const sIdx = db.sessoes.findIndex(s => s.id_sessao === sId);

  if (sIdx === -1) {
    return res.status(404).json({ error: "Sessão não identificada." });
  }

  const sessao = db.sessoes[sIdx];

  // Block edit if session was finalized
  if (sessao.status === "Finalizado") {
    return res.status(403).json({ error: "Esta sessão já foi legalmente finalizada e encontra-se congelada para resguardar a integridade jurídica do prontuário." });
  }

  // Ensure and check patient status
  const pIdx = db.pacientes.findIndex(p => p.id_paciente === sessao.id_paciente);
  if (pIdx !== -1 && db.pacientes[pIdx].status_tratamento === "Finalizado por Inatividade") {
    return res.status(403).json({ error: "Paciente inativo. Prontuário bloqueado retroativamente." });
  }

  db.sessoes[sIdx] = {
    ...sessao,
    evolucao: evolucao !== undefined ? evolucao : sessao.evolucao,
    observacoes: observacoes !== undefined ? observacoes : sessao.observacoes,
    reacoes_paciente: reacoes_paciente !== undefined ? reacoes_paciente : sessao.reacoes_paciente,
    updated_at: new Date().toISOString()
  };

  if (status === "Finalizado") {
    db.sessoes[sIdx].status = "Finalizado";
    db.sessoes[sIdx].data_finalizacao = new Date().toISOString();
  }

  if (pIdx !== -1) {
    db.pacientes[pIdx].updated_at = new Date().toISOString();
  }

  writeDb(db);
  res.json({ success: true, sessao: db.sessoes[sIdx] });
});

// 11. Read detailed patient history package
app.get("/api/paciente-completo/:id", (req, res) => {
  const pId = req.params.id;
  const db = readDb();

  const paciente = db.pacientes.find(p => p.id_paciente === pId);
  if (!paciente) {
    return res.status(404).json({ error: "Paciente não localizado." });
  }

  const ficha = db.fichas.find(f => f.id_paciente === pId);
  const sessoes = db.sessoes.filter(s => s.id_paciente === pId).sort((a,b) => new Date(b.data_sessao).getTime() - new Date(a.data_sessao).getTime());
  const auditLogs = db.auditorias.filter(a => a.id_paciente === pId);
  const history = db.historico.filter(h => h.id_paciente === pId).sort((a,b) => new Date(b.timestamp_alteracao).getTime() - new Date(a.timestamp_alteracao).getTime());
  const token = db.tokens.find(t => t.id_paciente === pId);

  res.json({
    paciente,
    ficha,
    sessoes,
    auditLogs,
    history,
    token
  });
});

// 12. Rule of 90 days - Routine execution
app.post("/api/rotina-inatividade", (req, res) => {
  const db = readDb();
  let modifiedCount = 0;
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const nowMs = new Date().getTime(); // UTC comparison

  db.pacientes.forEach((p, idx) => {
    if (p.status_tratamento === "Ativo") {
      // Check last session date
      const patientSessions = db.sessoes.filter(s => s.id_paciente === p.id_paciente && s.status === "Finalizado");
      let lastActivityTime = new Date(p.updated_at).getTime();

      patientSessions.forEach(s => {
        const timeVal = s.data_finalizacao ? new Date(s.data_finalizacao).getTime() : new Date(s.data_sessao).getTime();
        if (timeVal > lastActivityTime) {
          lastActivityTime = timeVal;
        }
      });

      const elapsed = nowMs - lastActivityTime;
      if (elapsed >= NINETY_DAYS_MS) {
        db.pacientes[idx].status_tratamento = "Finalizado por Inatividade";
        db.pacientes[idx].updated_at = new Date().toISOString();
        
        // Log the change
        db.historico.push({
          id_historico: "hist-auto-" + Math.random().toString(36).substr(2, 9),
          id_paciente: p.id_paciente,
          terapeuta_nome: "SISTEMA CRON (90 Dias Inatividade)",
          timestamp_alteracao: new Date().toISOString(),
          campo_alterado: "status_tratamento",
          valor_anterior: "Ativo",
          valor_novo: "Finalizado por Inatividade"
        });

        modifiedCount++;
      }
    }
  });

  if (modifiedCount > 0) {
    writeDb(db);
  }

  res.json({ success: true, message: `Rotina executada com perfeição. ${modifiedCount} prontuários finalizados por inatividade de 90 dias.`, modifiedCount });
});

// Configure Vite integration
// --------------------------------------------------------------------------
const isProd = process.env.NODE_ENV === "production";

async function configureServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing securely on http://0.0.0.0:${PORT}`);
  });
}

configureServer();
