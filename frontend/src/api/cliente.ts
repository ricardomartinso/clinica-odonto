import type { ProblemDetail } from './tipos'

export class ApiError extends Error {
  readonly status: number
  readonly problema: ProblemDetail

  constructor(status: number, problema: ProblemDetail) {
    super(problema.detail ?? problema.title ?? `Erro ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problema = problema
  }
}

export interface Resposta<T> {
  dados: T
  /** Versão do recurso; deve voltar no If-Match ao alterá-lo. */
  etag: string | null
}

interface Opcoes {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  corpo?: unknown
  ifMatch?: string | null
}

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'

function lerCookie(nome: string): string | null {
  const par = document.cookie.split('; ').find((c) => c.startsWith(`${nome}=`))
  return par ? decodeURIComponent(par.slice(nome.length + 1)) : null
}

/**
 * O backend emite o cookie CSRF em qualquer resposta. Se ainda não houver um (primeiro acesso ou logo
 * após o logout), uma leitura qualquer basta para obtê-lo.
 */
async function tokenCsrf(): Promise<string | null> {
  const token = lerCookie(CSRF_COOKIE)
  if (token) return token
  await fetch(urlAbsoluta('/api/auth/me'), { credentials: 'same-origin' })
  return lerCookie(CSRF_COOKIE)
}

/** Sempre na mesma origem da página (o nginx/Vite repassa /api ao backend). */
function urlAbsoluta(caminho: string): string {
  return new URL(caminho, window.location.origin).toString()
}

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<Resposta<T>> {
  const method = opcoes.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })
  if (opcoes.corpo !== undefined) headers.set('Content-Type', 'application/json')
  if (opcoes.ifMatch) headers.set('If-Match', opcoes.ifMatch)
  if (method !== 'GET') {
    const token = await tokenCsrf()
    if (token) headers.set(CSRF_HEADER, token)
  }

  const resposta = await fetch(urlAbsoluta(caminho), {
    method,
    headers,
    credentials: 'same-origin',
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  })

  if (!resposta.ok) {
    throw new ApiError(resposta.status, await lerProblema(resposta))
  }

  const dados = resposta.status === 204 ? undefined : await resposta.json()
  return { dados: dados as T, etag: resposta.headers.get('ETag') }
}

async function lerProblema(resposta: Response): Promise<ProblemDetail> {
  const tipo = resposta.headers.get('Content-Type') ?? ''
  if (tipo.includes('json')) {
    try {
      return (await resposta.json()) as ProblemDetail
    } catch {
      // corpo inválido: cai no problema genérico abaixo
    }
  }
  return { status: resposta.status, title: resposta.statusText || 'Erro inesperado' }
}

export function ehErroDaApi(erro: unknown, ...status: number[]): erro is ApiError {
  return erro instanceof ApiError && (status.length === 0 || status.includes(erro.status))
}
