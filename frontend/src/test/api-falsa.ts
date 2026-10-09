import { http, HttpResponse, type DefaultBodyType, type StrictRequest } from 'msw'
import { setupServer } from 'msw/node'
import type {
  AlertaClinico,
  AnamneseResponse,
  DadosDaAnamnese,
  DadosDoPaciente,
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
  recebidos: () => estado.recebidos,
  resetar() {
    estado.sessao = null
    estado.pacientes.clear()
    estado.anamneses.clear()
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

  http.post<{ id: string; acao: string }>(
    '*/api/pacientes/:id/:acao',
    protegido<{ id: string; acao: string }>(({ params }) => {
      const registro = estado.pacientes.get(params.id)!
      registro.dados = { ...registro.dados, ativo: params.acao === 'reativar' }
      registro.versao++
      return new HttpResponse(null, { status: 204 })
    }),
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

export const servidor = setupServer(...handlers)
