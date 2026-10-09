import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { apiFalsa, SENHA } from '@/test/api-falsa'
import { renderizarApp } from '@/test/renderizar'

describe('autenticação', () => {
  it('sem sessão, leva ao login e depois volta para a página pedida', async () => {
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Joana Prado' })
    const { screen, usuario, urlAtual } = renderizarApp(`/pacientes/${paciente.id}`)

    await screen.findByRole('button', { name: 'Entrar' })
    expect(urlAtual()).toContain('/login?redirect=')

    await usuario.type(screen.getByLabelText('E-mail'), 'recepcao@clinica.test')
    await usuario.type(screen.getByLabelText('Senha'), SENHA)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Joana Prado' })).toBeInTheDocument()
    expect(urlAtual()).toBe(`/pacientes/${paciente.id}`)
  })

  it('mostra erro com credenciais inválidas', async () => {
    const { screen, usuario } = renderizarApp('/login')

    await usuario.type(await screen.findByLabelText('E-mail'), 'recepcao@clinica.test')
    await usuario.type(screen.getByLabelText('Senha'), 'errada')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
  })

  it('valida os campos antes de enviar', async () => {
    const { screen, usuario } = renderizarApp('/login')

    await usuario.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha')).toBeInTheDocument()
    expect(apiFalsa.recebidos()).toHaveLength(0)
  })

  it('ignora redirecionamento para fora da aplicação', async () => {
    const { screen, usuario, urlAtual } = renderizarApp('/login?redirect=https://site-malicioso.test')

    await usuario.type(await screen.findByLabelText('E-mail'), 'recepcao@clinica.test')
    await usuario.type(screen.getByLabelText('Senha'), SENHA)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(urlAtual()).toBe('/pacientes'))
  })

  it('sair encerra a sessão e volta ao login', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const { screen, usuario, urlAtual } = renderizarApp('/pacientes')

    await usuario.click(await screen.findByRole('button', { name: 'Sair' }))

    await screen.findByRole('button', { name: 'Entrar' })
    expect(urlAtual()).toBe('/login')
  })
})
