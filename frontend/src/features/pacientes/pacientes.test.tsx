import { waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiFalsa } from '@/test/api-falsa'
import { renderizarApp } from '@/test/renderizar'

const CPF = '10433218100'

describe('lista de pacientes', () => {
  beforeEach(() => {
    apiFalsa.entrarComo('RECEPCAO')
    apiFalsa.adicionarPaciente({ nome: 'José Antônio Araújo', cpf: CPF })
    apiFalsa.adicionarPaciente({ nome: 'Carlos Eduardo Lima', nomeSocial: 'Duda' })
    apiFalsa.adicionarPaciente({ nome: 'Paciente Inativo', ativo: false })
  })

  it('mostra nome social em destaque e CPF mascarado, sem inativos', async () => {
    const { screen } = renderizarApp('/pacientes')

    expect(await screen.findByText('Duda')).toBeInTheDocument()
    expect(screen.getByText('Nome civil: Carlos Eduardo Lima')).toBeInTheDocument()
    expect(screen.getByText('***.332.181-**')).toBeInTheDocument()
    expect(screen.queryByText(CPF)).not.toBeInTheDocument()
    expect(screen.queryByText('Paciente Inativo')).not.toBeInTheDocument()
  })

  it('busca sem acento e guarda o termo na URL', async () => {
    const { screen, usuario, urlAtual } = renderizarApp('/pacientes')
    await screen.findByText('Duda')

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar por nome ou CPF' }), 'jose antonio')

    await waitFor(() => expect(screen.queryByText('Duda')).not.toBeInTheDocument())
    expect(screen.getByText('José Antônio Araújo')).toBeInTheDocument()
    expect(urlAtual()).toContain('busca=')
  })

  it('pode incluir inativos', async () => {
    const { screen, usuario } = renderizarApp('/pacientes')
    await screen.findByText('Duda')

    await usuario.click(screen.getByRole('checkbox', { name: 'Incluir inativos' }))

    expect(await screen.findByText('Paciente Inativo')).toBeInTheDocument()
  })
})

describe('cadastro de paciente', () => {
  beforeEach(() => apiFalsa.entrarComo('RECEPCAO'))

  async function preencherAdulto(renderizado: ReturnType<typeof renderizarApp>, cpf: string) {
    const { screen, usuario } = renderizado
    await usuario.type(await screen.findByLabelText('Nome completo'), 'Maria da Silva')
    await usuario.type(screen.getByLabelText('Data de nascimento'), '1990-05-12')
    await usuario.type(screen.getByLabelText('CPF'), cpf)
    await usuario.type(screen.getByLabelText('Celular'), '11987654321')
  }

  it('aplica máscaras e envia só dígitos para a API', async () => {
    const renderizado = renderizarApp('/pacientes/novo')
    const { screen, usuario, urlAtual } = renderizado
    await preencherAdulto(renderizado, CPF)

    expect(screen.getByLabelText('CPF')).toHaveValue('104.332.181-00')
    expect(screen.getByLabelText('Celular')).toHaveValue('(11) 98765-4321')

    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByRole('heading', { name: 'Maria da Silva' })).toBeInTheDocument()
    expect(urlAtual()).toMatch(/^\/pacientes\/p-\d+$/)
    const envio = apiFalsa.recebidos().find((r) => r.metodo === 'POST' && r.caminho === '/api/pacientes')
    expect(envio?.corpo).toMatchObject({
      cpf: CPF,
      celular: '11987654321',
      nomeSocial: null,
      endereco: null,
      responsavel: null,
    })
  })

  it('valida CPF e exige responsável para menores antes de enviar', async () => {
    const { screen, usuario } = renderizarApp('/pacientes/novo')

    await usuario.type(await screen.findByLabelText('Nome completo'), 'Criança Teste')
    await usuario.type(screen.getByLabelText('Data de nascimento'), '2018-01-01')
    await usuario.type(screen.getByLabelText('CPF'), '12345678900')
    await usuario.type(screen.getByLabelText('Celular'), '11987654321')
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('CPF inválido')).toBeInTheDocument()
    expect(screen.getByText('Obrigatório para menores de 18 anos')).toBeInTheDocument()
    expect(apiFalsa.recebidos().filter((r) => r.metodo === 'POST')).toHaveLength(0)
  })

  it('mostra no campo CPF o conflito devolvido pelo servidor', async () => {
    apiFalsa.adicionarPaciente({ nome: 'Já Cadastrada', cpf: CPF })
    const renderizado = renderizarApp('/pacientes/novo')
    await preencherAdulto(renderizado, CPF)

    await renderizado.usuario.click(renderizado.screen.getByRole('button', { name: 'Cadastrar' }))

    expect(
      await renderizado.screen.findByText('Já existe um paciente cadastrado com este CPF.'),
    ).toBeInTheDocument()
  })
})

describe('edição de paciente', () => {
  it('envia a versão lida no If-Match e, em conflito (412), recarrega os dados atuais', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Roberto Dias' })
    const { screen, usuario } = renderizarApp(`/pacientes/${paciente.id}/editar`)
    const nome = await screen.findByLabelText('Nome completo')

    apiFalsa.alterarPorOutraPessoa(paciente.id, { nome: 'Roberto Dias (alterado por outra pessoa)' })
    await usuario.clear(nome)
    await usuario.type(nome, 'Roberto Dias Filho')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText(/alterado por outra pessoa enquanto você editava/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Roberto Dias (alterado por outra pessoa)'),
    )
    expect(apiFalsa.recebidos().find((r) => r.metodo === 'PUT')?.ifMatch).toBe('"0"')

    // segunda tentativa, já com a versão atual
    await usuario.clear(screen.getByLabelText('Nome completo'))
    await usuario.type(screen.getByLabelText('Nome completo'), 'Roberto Dias Filho')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('heading', { name: 'Roberto Dias Filho' })).toBeInTheDocument()
  })
})

describe('detalhe do paciente', () => {
  it('recepção não vê anamnese', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Paula Souza' })
    const { screen } = renderizarApp(`/pacientes/${paciente.id}`)

    await screen.findByRole('heading', { name: 'Paula Souza' })
    expect(screen.queryByText('Anamnese')).not.toBeInTheDocument()
    expect(apiFalsa.recebidos().some((r) => r.caminho.endsWith('/anamnese'))).toBe(false)
  })

  it('inativar pede confirmação', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Paula Souza' })
    const { screen, usuario } = renderizarApp(`/pacientes/${paciente.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Inativar' }))
    const dialogo = await screen.findByRole('alertdialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Inativar' }))

    expect(await screen.findByRole('button', { name: 'Reativar' })).toBeInTheDocument()
    expect(apiFalsa.paciente(paciente.id)?.ativo).toBe(false)
  })

  it('paciente inexistente mostra mensagem de não encontrado', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const { screen } = renderizarApp('/pacientes/nao-existe')

    expect(await screen.findByText('Paciente não encontrado.')).toBeInTheDocument()
  })
})
