import { http, HttpResponse, type DefaultBodyType, type StrictRequest } from 'msw'
import { setupServer } from 'msw/node'
import type {
  AlertaClinico,
  AnamneseResponse,
  DadosDaAnamnese,
  DadosDoPaciente,
  DadosDoProcedimento,
  Evolucao,
  ProcedimentoClinico,
  ProcedimentoDoCatalogo,
  RegistroDeAtendimento,
  VersaoDaEvolucao,
  PacienteResponse,
  PacienteResumo,
  Papel,
  ProblemDetail,
  UsuarioLogado,
} from '@/api/tipos'

/**
 * Backend em memória para os testes, com as regras que importam para a UI: sessão, CSRF, papéis,
 * ETag/If-Match (428/412), CPF duplicado (409) e respostas em ProblemDetail.
 */

export const SENHA = 'clinica123'
export const CSRF = 'token-csrf-de-teste'

export const USUARIOS: Record<Papel, UsuarioLogado> = {
  DENTISTA: { id: 'u-dentista', nome: 'Dra. Helena Duarte', email: 'helena@clinica.test', papel: 'DENTISTA' },
  RECEPCAO: { id: 'u-recepcao', nome: 'Camila Recepção', email: 'recepcao@clinica.test', papel: 'RECEPCAO' },
}

interface Registro<T> {
  dados: T
  versao: number
}

const estado = {
  sessao: null as UsuarioLogado | null,
  pacientes: new Map<string, Registro<PacienteResponse>>(),
  anamneses: new Map<string, Registro<AnamneseResponse>>(),
  procedimentos: new Map<string, ProcedimentoClinico>(),
  evolucoes: new Map<string, Registro<Evolucao>>(),
  historicos: new Map<string, VersaoDaEvolucao[]>(),
  /** procedimento/evolução → paciente (as respostas da API não carregam o pacienteId). */
  pacienteDoRegistro: new Map<string, string>(),
  /** Últimos corpos recebidos, para os testes inspecionarem o que a UI enviou. */
  recebidos: [] as { metodo: string; caminho: string; corpo: unknown; ifMatch: string | null }[],
}

export const apiFalsa = {
  entrarComo(papel: Papel) {
    estado.sessao = USUARIOS[papel]
  },
  adicionarPaciente(dados: Partial<PacienteResponse> & Pick<PacienteResponse, 'nome'>): PacienteResponse {
    const paciente: PacienteResponse = {
      id: `p-${estado.pacientes.size + 1}`,
      nomeSocial: null,
      dataNascimento: '1985-03-20',
      cpf: null,
      celular: '11900000001',
      email: null,
      endereco: null,
      responsavel: null,
      observacoes: null,
      ativo: true,
      criadoEm: '2026-01-10T12:00:00Z',
      atualizadoEm: '2026-01-10T12:00:00Z',
      ...dados,
    }
    estado.pacientes.set(paciente.id, { dados: paciente, versao: 0 })
    return paciente
  },
  /** Simula outra pessoa alterando o paciente (incrementa a versão). */
  alterarPorOutraPessoa(id: string, mudancas: Partial<PacienteResponse>) {
    const registro = estado.pacientes.get(id)!
    registro.dados = { ...registro.dados, ...mudancas }
    registro.versao++
  },
  paciente: (id: string) => estado.pacientes.get(id)?.dados,
  definirAnamnese(pacienteId: string, alertas: AlertaClinico[]) {
    estado.anamneses.set(pacienteId, {
      versao: 0,
      dados: { pacienteId, respostas: {}, alertas, atualizadaEm: '2026-10-01T14:30:00Z' },
    })
  },
  planejar(pacienteId: string, procedimentoId: string, local: Partial<DadosDoProcedimento> = {}) {
    return criarProcedimento(pacienteId, { procedimentoId, ...local })
  },
  registrarEvolucao(
    pacienteId: string,
    texto: string,
    autor: Papel | UsuarioLogado = 'DENTISTA',
    data = '2026-09-01',
  ) {
    const usuario = typeof autor === 'string' ? USUARIOS[autor] : autor
    return criarEvolucao(pacienteId, usuario, { dataAtendimento: data, texto })
  },
  procedimento: (id: string) => estado.procedimentos.get(id),
  recebidos: () => estado.recebidos,
  resetar() {
    estado.sessao = null
    estado.pacientes.clear()
    estado.anamneses.clear()
    estado.procedimentos.clear()
    estado.evolucoes.clear()
    estado.historicos.clear()
    estado.pacienteDoRegistro.clear()
    estado.recebidos = []
  },
}

const problema = (status: number, title: string, detail: string, extra: Partial<ProblemDetail> = {}) =>
  HttpResponse.json({ status, title, detail, ...extra } satisfies ProblemDetail, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })

const naoAutenticado = () => problema(401, 'Não autenticado', 'Faça login para continuar.')

function emitirCookieCsrf() {
  document.cookie = `XSRF-TOKEN=${CSRF}; path=/`
}

async function registrar(request: StrictRequest<DefaultBodyType>) {
  const corpo = request.method === 'GET' ? undefined : await request.clone().text()
  estado.recebidos.push({
    metodo: request.method,
    caminho: new URL(request.url).pathname,
    corpo: corpo ? JSON.parse(corpo) : undefined,
    ifMatch: request.headers.get('If-Match'),
  })
}

/** Envolve handlers que alteram estado: exige sessão (opcional) e token CSRF, como o Spring Security. */
function protegido<P>(
  handler: (args: {
    request: StrictRequest<DefaultBodyType>
    params: P
    usuario: UsuarioLogado
  }) => Response | Promise<Response>,
  exigeSessao = true,
) {
  return async ({ request, params }: { request: StrictRequest<DefaultBodyType>; params: P }) => {
    emitirCookieCsrf()
    if (request.method !== 'GET' && request.headers.get('X-XSRF-TOKEN') !== CSRF) {
      return problema(403, 'Acesso negado', 'Token CSRF ausente ou inválido.')
    }
    if (exigeSessao && !estado.sessao) return naoAutenticado()
    await registrar(request)
    return handler({ request, params, usuario: estado.sessao! })
  }
}

const etag = (versao: number) => ({ ETag: `"${versao}"` })

const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const mascarado = (cpf: string | null) => (cpf ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : null)

function conferirVersao(ifMatch: string | null, versaoAtual: number): Response | null {
  if (!ifMatch) return problema(428, 'Versão obrigatória', 'Informe o header If-Match.')
  if (ifMatch.replaceAll('"', '') !== String(versaoAtual)) {
    return problema(412, 'Versão desatualizada', 'O registro foi alterado desde a última leitura.')
  }
  return null
}

function cpfDuplicado(cpf: string | null | undefined, ignorarId?: string) {
  return !!cpf && [...estado.pacientes.values()].some((p) => p.dados.cpf === cpf && p.dados.id !== ignorarId)
}

const ALERTAS: [keyof DadosDaAnamnese, AlertaClinico][] = [
  ['alergico', 'ALERGIA'],
  ['usaAnticoagulante', 'ANTICOAGULANTE'],
  ['diabetes', 'DIABETES'],
  ['hipertensao', 'HIPERTENSAO'],
  ['cardiopatia', 'CARDIOPATIA'],
  ['coagulopatia', 'COAGULOPATIA'],
  ['gestante', 'GESTANTE'],
  ['usaBisfosfonatos', 'BISFOSFONATOS'],
  ['reacaoAnestesia', 'REACAO_ANESTESIA'],
]

export const handlers = [
  http.get('*/api/auth/me', () => {
    emitirCookieCsrf()
    return estado.sessao ? HttpResponse.json(estado.sessao) : naoAutenticado()
  }),

  http.post(
    '*/api/auth/login',
    protegido(async ({ request }) => {
      const { email, senha } = (await request.json()) as { email: string; senha: string }
      const usuario = Object.values(USUARIOS).find((u) => u.email === email)
      if (!usuario || senha !== SENHA) {
        return problema(401, 'Credenciais inválidas', 'E-mail ou senha inválidos.')
      }
      estado.sessao = usuario
      return HttpResponse.json(usuario)
    }, false),
  ),

  http.post(
    '*/api/auth/logout',
    protegido(() => {
      estado.sessao = null
      return new HttpResponse(null, { status: 204 })
    }, false),
  ),

  http.get(
    '*/api/pacientes',
    protegido(({ request }) => {
      const url = new URL(request.url)
      const busca = url.searchParams.get('busca')
      const pagina = Number(url.searchParams.get('pagina') ?? 0)
      const tamanho = Number(url.searchParams.get('tamanho') ?? 20)
      const incluirInativos = url.searchParams.get('incluirInativos') === 'true'

      const filtrados = [...estado.pacientes.values()]
        .map((r) => r.dados)
        .filter((p) => incluirInativos || p.ativo)
        .filter(
          (p) =>
            !busca ||
            p.cpf === busca ||
            semAcento(`${p.nome} ${p.nomeSocial ?? ''}`).includes(semAcento(busca)),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome))

      const content: PacienteResumo[] = filtrados
        .slice(pagina * tamanho, (pagina + 1) * tamanho)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          nomeSocial: p.nomeSocial,
          dataNascimento: p.dataNascimento,
          cpfMascarado: mascarado(p.cpf),
          ativo: p.ativo,
        }))
      return HttpResponse.json({
        content,
        page: {
          size: tamanho,
          number: pagina,
          totalElements: filtrados.length,
          totalPages: Math.ceil(filtrados.length / tamanho),
        },
      })
    }),
  ),

  http.post(
    '*/api/pacientes',
    protegido(async ({ request }) => {
      const dados = (await request.json()) as DadosDoPaciente
      if (cpfDuplicado(dados.cpf)) {
        return problema(409, 'Conflito', 'Já existe um paciente cadastrado com este CPF.')
      }
      const paciente = apiFalsa.adicionarPaciente({ ...normalizar(dados) })
      return HttpResponse.json(paciente, {
        status: 201,
        headers: { ...etag(0), Location: `/api/pacientes/${paciente.id}` },
      })
    }),
  ),

  http.get<{ id: string }>(
    '*/api/pacientes/:id',
    protegido<{ id: string }>(({ params }) => {
      const registro = estado.pacientes.get(params.id)
      if (!registro) return problema(404, 'Recurso não encontrado', 'Paciente não encontrado.')
      return HttpResponse.json(registro.dados, { headers: etag(registro.versao) })
    }),
  ),

  http.put<{ id: string }>(
    '*/api/pacientes/:id',
    protegido<{ id: string }>(async ({ request, params }) => {
      const registro = estado.pacientes.get(params.id)
      if (!registro) return problema(404, 'Recurso não encontrado', 'Paciente não encontrado.')
      const conflito = conferirVersao(request.headers.get('If-Match'), registro.versao)
      if (conflito) return conflito
      const dados = (await request.json()) as DadosDoPaciente
      if (cpfDuplicado(dados.cpf, params.id)) {
        return problema(409, 'Conflito', 'Já existe um paciente cadastrado com este CPF.')
      }
      registro.dados = { ...registro.dados, ...normalizar(dados) }
      registro.versao++
      return HttpResponse.json(registro.dados, { headers: etag(registro.versao) })
    }),
  ),

  ...(['inativar', 'reativar'] as const).map((acao) =>
    http.post<{ id: string }>(
      `*/api/pacientes/:id/${acao}`,
      protegido<{ id: string }>(({ params }) => {
        const registro = estado.pacientes.get(params.id)!
        registro.dados = { ...registro.dados, ativo: acao === 'reativar' }
        registro.versao++
        return new HttpResponse(null, { status: 204 })
      }),
    ),
  ),

  http.get<{ id: string }>(
    '*/api/pacientes/:id/anamnese',
    protegido<{ id: string }>(({ params, usuario }) => {
      if (usuario.papel !== 'DENTISTA') return problema(403, 'Acesso negado', 'Sem permissão.')
      const registro = estado.anamneses.get(params.id)
      if (!registro) return problema(404, 'Recurso não encontrado', 'Anamnese ainda não registrada.')
      return HttpResponse.json(registro.dados, { headers: etag(registro.versao) })
    }),
  ),

  http.put<{ id: string }>(
    '*/api/pacientes/:id/anamnese',
    protegido<{ id: string }>(async ({ request, params, usuario }) => {
      if (usuario.papel !== 'DENTISTA') return problema(403, 'Acesso negado', 'Sem permissão.')
      const existente = estado.anamneses.get(params.id)
      const ifMatch = request.headers.get('If-Match')
      if (existente) {
        const conflito = conferirVersao(ifMatch, existente.versao)
        if (conflito) return conflito
      } else if (ifMatch) {
        return problema(412, 'Versão desatualizada', 'A anamnese não existe.')
      }
      const respostas = (await request.json()) as DadosDaAnamnese
      const registro: Registro<AnamneseResponse> = {
        versao: existente ? existente.versao + 1 : 0,
        dados: {
          pacienteId: params.id,
          respostas,
          alertas: ALERTAS.filter(([campo]) => respostas[campo] === true).map(([, alerta]) => alerta),
          atualizadaEm: '2026-10-01T14:30:00Z',
        },
      }
      estado.anamneses.set(params.id, registro)
      return HttpResponse.json(registro.dados, {
        status: existente ? 200 : 201,
        headers: etag(registro.versao),
      })
    }),
  ),
]

function normalizar(
  dados: DadosDoPaciente,
): Omit<PacienteResponse, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'> {
  return {
    nome: dados.nome,
    nomeSocial: dados.nomeSocial ?? null,
    dataNascimento: dados.dataNascimento,
    cpf: dados.cpf ?? null,
    celular: dados.celular,
    email: dados.email ?? null,
    endereco: dados.endereco ?? null,
    responsavel: dados.responsavel ?? null,
    observacoes: dados.observacoes ?? null,
  }
}

export const CATALOGO: ProcedimentoDoCatalogo[] = [
  { id: 'c-profilaxia', nome: 'Profilaxia (limpeza)', abrangencia: 'BOCA' },
  { id: 'c-raspagem', nome: 'Raspagem supragengival', abrangencia: 'ARCADA' },
  { id: 'c-exodontia', nome: 'Exodontia simples', abrangencia: 'DENTE' },
  { id: 'c-restauracao', nome: 'Restauração em resina composta', abrangencia: 'FACE' },
]

const NOMES_FACE = { M: 'Mesial', D: 'Distal', V: 'Vestibular' } as const

function local(p: Pick<ProcedimentoClinico, 'dente' | 'faces' | 'arcada'>, abrangencia: string) {
  const d = p.dente ?? 0
  const nome = (f: ProcedimentoClinico['faces'][number]) =>
    f === 'O_I'
      ? d % 10 <= 3
        ? 'Incisal'
        : 'Oclusal'
      : f === 'L_P'
        ? [1, 2, 5, 6].includes(Math.floor(d / 10))
          ? 'Palatina'
          : 'Lingual'
        : NOMES_FACE[f]
  if (abrangencia === 'FACE') return `${d} · ${p.faces.map(nome).join(', ')}`
  if (abrangencia === 'DENTE') return `Dente ${d}`
  if (abrangencia === 'ARCADA') return p.arcada === 'SUPERIOR' ? 'Arcada superior' : 'Arcada inferior'
  return 'Boca toda'
}

function criarProcedimento(pacienteId: string, dados: DadosDoProcedimento): ProcedimentoClinico | Response {
  const catalogo = CATALOGO.find((c) => c.id === dados.procedimentoId)!
  const faces = dados.faces ?? []
  if (catalogo.abrangencia === 'FACE' && (!dados.dente || faces.length === 0)) {
    return problema(422, 'Regra de negócio violada', 'Este procedimento exige o dente e ao menos uma face.')
  }
  const base = { dente: dados.dente ?? null, faces, arcada: dados.arcada ?? null }
  const procedimento: ProcedimentoClinico = {
    id: `proc-${estado.procedimentos.size + 1}`,
    procedimento: catalogo,
    ...base,
    local: local(base, catalogo.abrangencia),
    status: 'PLANEJADO',
    observacao: dados.observacao ?? null,
    evolucaoId: null,
    realizadoEm: null,
    motivo: null,
    criadoEm: '2026-09-01T12:00:00Z',
  }
  estado.procedimentos.set(procedimento.id, procedimento)
  estado.pacienteDoRegistro.set(procedimento.id, pacienteId)
  return procedimento
}

function criarEvolucao(
  pacienteId: string,
  autor: UsuarioLogado,
  dados: Pick<RegistroDeAtendimento, 'dataAtendimento' | 'texto'>,
) {
  const id = `ev-${estado.evolucoes.size + 1}`
  const evolucao: Evolucao = {
    id,
    dataAtendimento: dados.dataAtendimento,
    texto: dados.texto,
    autor: { id: autor.id, nome: autor.nome },
    editadaEm: null,
    anulacao: null,
    procedimentosRealizados: [],
    criadoEm: `2026-09-01T12:00:${String(estado.evolucoes.size).padStart(2, '0')}Z`,
  }
  estado.evolucoes.set(id, { dados: evolucao, versao: 0 })
  estado.historicos.set(id, [versao(evolucao, autor, 'CRIACAO')])
  estado.pacienteDoRegistro.set(id, pacienteId)
  return evolucao
}

function versao(e: Evolucao, por: UsuarioLogado, tipo: VersaoDaEvolucao['tipo']): VersaoDaEvolucao {
  return {
    revisao: (estado.historicos.get(e.id)?.length ?? 0) + 1,
    momento: '2026-09-01T12:00:00Z',
    alteradaPor: { id: por.id, nome: por.nome },
    tipo,
    dataAtendimento: e.dataAtendimento,
    texto: e.texto,
  }
}

const doPaciente = (pacienteId: string) =>
  [...estado.procedimentos.values()].filter((p) => estado.pacienteDoRegistro.get(p.id) === pacienteId)

function apenasDentista(usuario: UsuarioLogado) {
  return usuario.papel === 'DENTISTA' ? null : problema(403, 'Acesso negado', 'Sem permissão.')
}

const handlersDoProntuario = [
  http.get(
    '*/api/procedimentos',
    protegido(({ usuario }) => apenasDentista(usuario) ?? HttpResponse.json(CATALOGO)),
  ),

  http.get<{ id: string }>(
    '*/api/pacientes/:id/procedimentos',
    protegido<{ id: string }>(({ request, params, usuario }) => {
      const negado = apenasDentista(usuario)
      if (negado) return negado
      const status = new URL(request.url).searchParams.getAll('status')
      return HttpResponse.json(
        doPaciente(params.id).filter((p) => status.length === 0 || status.includes(p.status)),
      )
    }),
  ),

  http.post<{ id: string }>(
    '*/api/pacientes/:id/procedimentos',
    protegido<{ id: string }>(async ({ request, params, usuario }) => {
      const negado = apenasDentista(usuario)
      if (negado) return negado
      const criado = criarProcedimento(params.id, (await request.json()) as DadosDoProcedimento)
      if (criado instanceof Response) return criado
      return HttpResponse.json(criado, { status: 201 })
    }),
  ),

  http.post<{ id: string; pid: string; acao: string }>(
    '*/api/pacientes/:id/procedimentos/:pid/:acao',
    protegido<{ id: string; pid: string; acao: string }>(async ({ request, params }) => {
      const p = estado.procedimentos.get(params.pid)!
      const { motivo } = (await request.json()) as { motivo: string }
      const atualizado = {
        ...p,
        status: params.acao === 'cancelar' ? 'CANCELADO' : 'ANULADO',
        motivo,
      } as ProcedimentoClinico
      estado.procedimentos.set(p.id, atualizado)
      return HttpResponse.json(atualizado)
    }),
  ),

  http.get<{ id: string }>(
    '*/api/pacientes/:id/evolucoes',
    protegido<{ id: string }>(({ request, params, usuario }) => {
      const negado = apenasDentista(usuario)
      if (negado) return negado
      const url = new URL(request.url)
      const pagina = Number(url.searchParams.get('pagina') ?? 0)
      const tamanho = Number(url.searchParams.get('tamanho') ?? 10)
      const todas = [...estado.evolucoes.values()]
        .map((r) => r.dados)
        .filter((e) => estado.pacienteDoRegistro.get(e.id) === params.id)
        .sort(
          (a, b) =>
            b.dataAtendimento.localeCompare(a.dataAtendimento) || b.criadoEm.localeCompare(a.criadoEm),
        )
      return HttpResponse.json({
        content: todas.slice(pagina * tamanho, (pagina + 1) * tamanho),
        page: {
          size: tamanho,
          number: pagina,
          totalElements: todas.length,
          totalPages: Math.ceil(todas.length / tamanho),
        },
      })
    }),
  ),

  http.post<{ id: string }>(
    '*/api/pacientes/:id/evolucoes',
    protegido<{ id: string }>(async ({ request, params, usuario }) => {
      const negado = apenasDentista(usuario)
      if (negado) return negado
      const registro = (await request.json()) as RegistroDeAtendimento
      const planejados = (registro.procedimentosRealizados ?? []).map((pid) => estado.procedimentos.get(pid))
      if (planejados.some((p) => !p || p.status !== 'PLANEJADO')) {
        return problema(
          422,
          'Regra de negócio violada',
          'Somente procedimentos planejados podem ser realizados.',
        )
      }
      const novos = (registro.novosProcedimentos ?? []).map((dados) => criarProcedimento(params.id, dados))
      const invalido = novos.find((n) => n instanceof Response)
      if (invalido) return invalido as Response
      const evolucao = criarEvolucao(params.id, usuario, registro)
      evolucao.procedimentosRealizados = [...planejados, ...novos].map((p) => {
        const realizado = {
          ...(p as ProcedimentoClinico),
          status: 'REALIZADO' as const,
          evolucaoId: evolucao.id,
          realizadoEm: registro.dataAtendimento,
        }
        estado.procedimentos.set(realizado.id, realizado)
        return realizado
      })
      return HttpResponse.json(evolucao, { status: 201, headers: etag(0) })
    }),
  ),

  http.get<{ id: string; eid: string }>(
    '*/api/pacientes/:id/evolucoes/:eid',
    protegido<{ id: string; eid: string }>(({ params }) => {
      const registro = estado.evolucoes.get(params.eid)!
      return HttpResponse.json(registro.dados, { headers: etag(registro.versao) })
    }),
  ),

  http.put<{ id: string; eid: string }>(
    '*/api/pacientes/:id/evolucoes/:eid',
    protegido<{ id: string; eid: string }>(async ({ request, params, usuario }) => {
      const registro = estado.evolucoes.get(params.eid)!
      if (registro.dados.autor.id !== usuario.id) {
        return problema(403, 'Acesso negado', 'Somente o autor pode editar esta evolução.')
      }
      const conflito = conferirVersao(request.headers.get('If-Match'), registro.versao)
      if (conflito) return conflito
      const edicao = (await request.json()) as Pick<Evolucao, 'dataAtendimento' | 'texto'>
      registro.dados = { ...registro.dados, ...edicao, editadaEm: '2026-09-02T10:00:00Z' }
      registro.versao++
      estado.historicos.get(params.eid)!.push(versao(registro.dados, usuario, 'EDICAO'))
      return HttpResponse.json(registro.dados, { headers: etag(registro.versao) })
    }),
  ),

  http.post<{ id: string; eid: string }>(
    '*/api/pacientes/:id/evolucoes/:eid/anular',
    protegido<{ id: string; eid: string }>(async ({ request, params, usuario }) => {
      const registro = estado.evolucoes.get(params.eid)!
      const { motivo } = (await request.json()) as { motivo: string }
      const anulados = registro.dados.procedimentosRealizados.map((p) => ({
        ...p,
        status: 'ANULADO' as const,
        motivo,
      }))
      anulados.forEach((p) => estado.procedimentos.set(p.id, p))
      registro.dados = {
        ...registro.dados,
        procedimentosRealizados: anulados,
        anulacao: { em: '2026-09-02T10:00:00Z', por: { id: usuario.id, nome: usuario.nome }, motivo },
      }
      registro.versao++
      estado.historicos.get(params.eid)!.push(versao(registro.dados, usuario, 'ANULACAO'))
      return HttpResponse.json(registro.dados)
    }),
  ),

  http.get<{ id: string; eid: string }>(
    '*/api/pacientes/:id/evolucoes/:eid/historico',
    protegido<{ id: string; eid: string }>(({ params }) =>
      HttpResponse.json(estado.historicos.get(params.eid)),
    ),
  ),
]

export const servidor = setupServer(...handlersDoProntuario, ...handlers)
