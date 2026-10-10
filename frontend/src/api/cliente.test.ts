import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CSRF, servidor } from '@/test/api-falsa'
import { ApiError, requisitar } from './cliente'

describe('requisitar', () => {
  it('obtém o cookie CSRF quando ausente e o envia no header em requisições que alteram estado', async () => {
    let headerRecebido: string | null = null
    servidor.use(
      http.post('*/api/teste', ({ request }) => {
        headerRecebido = request.headers.get('X-XSRF-TOKEN')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const resposta = await requisitar<void>('/api/teste', { method: 'POST' })

    expect(headerRecebido).toBe(CSRF)
    expect(resposta.dados).toBeUndefined()
  })

  it('usa sempre o token CSRF atual do cookie (o backend o renova no login)', async () => {
    const recebidos: (string | null)[] = []
    servidor.use(
      http.post('*/api/teste', ({ request }) => {
        recebidos.push(request.headers.get('X-XSRF-TOKEN'))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    document.cookie = 'XSRF-TOKEN=antes-do-login; path=/'
    await requisitar<void>('/api/teste', { method: 'POST' })
    document.cookie = 'XSRF-TOKEN=depois-do-login; path=/'
    await requisitar<void>('/api/teste', { method: 'POST' })

    expect(recebidos).toEqual(['antes-do-login', 'depois-do-login'])
  })

  it('devolve o ETag junto com os dados', async () => {
    servidor.use(http.get('*/api/teste', () => HttpResponse.json({ ok: true }, { headers: { ETag: '"3"' } })))

    await expect(requisitar('/api/teste')).resolves.toEqual({ dados: { ok: true }, etag: '"3"' })
  })

  it('envia If-Match quando informado', async () => {
    let ifMatch: string | null = null
    servidor.use(
      http.put('*/api/teste', ({ request }) => {
        ifMatch = request.headers.get('If-Match')
        return HttpResponse.json({})
      }),
    )

    await requisitar('/api/teste', { method: 'PUT', corpo: {}, ifMatch: '"7"' })

    expect(ifMatch).toBe('"7"')
  })

  it('converte ProblemDetail em ApiError com status e erros de campo', async () => {
    servidor.use(
      http.get('*/api/teste', () =>
        HttpResponse.json(
          {
            status: 400,
            title: 'Dados inválidos',
            detail: 'Um ou mais campos são inválidos.',
            erros: [{ campo: 'cpf', mensagem: 'inválido' }],
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    const erro = await requisitar('/api/teste').catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({
      status: 400,
      message: 'Um ou mais campos são inválidos.',
      problema: { erros: [{ campo: 'cpf', mensagem: 'inválido' }] },
    })
  })

  it('gera um erro genérico quando a resposta não é JSON', async () => {
    servidor.use(http.get('*/api/teste', () => new HttpResponse('Bad Gateway', { status: 502 })))

    await expect(requisitar('/api/teste')).rejects.toMatchObject({ status: 502 })
  })
})
