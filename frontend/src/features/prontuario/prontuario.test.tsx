import { waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PacienteResponse, UsuarioLogado } from '@/api/tipos'
import { apiFalsa } from '@/test/api-falsa'
import { renderizarApp } from '@/test/renderizar'

const OUTRO_DENTISTA: UsuarioLogado = {
  id: 'u-outro',
  nome: 'Dr. Rafael Moreira',
  email: 'rafael@clinica.test',
  papel: 'DENTISTA',
}

let paciente: PacienteResponse

beforeEach(() => {
  paciente = apiFalsa.adicionarPaciente({ nome: 'Paciente Prontuário' })
})

const prontuario = () => `/pacientes/${paciente.id}?aba=prontuario`

describe('acesso ao prontuário', () => {
  it('recepção não vê a aba de prontuário', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const { screen } = renderizarApp(`/pacientes/${paciente.id}`)

    await screen.findByRole('heading', { name: 'Paciente Prontuário' })
    expect(screen.queryByRole('tab', { name: 'Prontuário' })).not.toBeInTheDocument()
  })

  it('dentista vê alertas clínicos, plano de tratamento e evoluções', async () => {
    apiFalsa.entrarComo('DENTISTA')
    apiFalsa.definirAnamnese(paciente.id, ['ALERGIA', 'ANTICOAGULANTE'])
    apiFalsa.planejar(paciente.id, 'c-exodontia', { dente: 38 })
    apiFalsa.registrarEvolucao(paciente.id, 'Avaliação inicial do paciente.')
    const { screen } = renderizarApp(prontuario())

    const alertas = await screen.findByRole('list', { name: 'Alertas clínicos' })
    expect(alertas).toHaveTextContent('Alergia')
    expect(alertas).toHaveTextContent('Anticoagulante')
    expect(await screen.findByText('Dente 38')).toBeInTheDocument()
    expect(await screen.findByText('Avaliação inicial do paciente.')).toBeInTheDocument()
  })
})

describe('plano de tratamento', () => {
  beforeEach(() => apiFalsa.entrarComo('DENTISTA'))

  it('nomeia as faces conforme o dente escolhido e planeja a restauração', async () => {
    const { screen, usuario } = renderizarApp(prontuario())

    await usuario.click(await screen.findByRole('button', { name: 'Planejar procedimento' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.selectOptions(
      await within(dialogo).findByLabelText('Procedimento'),
      'Restauração em resina composta',
    )

    await usuario.selectOptions(within(dialogo).getByLabelText('Dente (FDI)'), '11')
    expect(within(dialogo).getByRole('checkbox', { name: 'Incisal' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('checkbox', { name: 'Palatina' })).toBeInTheDocument()

    await usuario.selectOptions(within(dialogo).getByLabelText('Dente (FDI)'), '36')
    expect(within(dialogo).getByRole('checkbox', { name: 'Oclusal' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('checkbox', { name: 'Lingual' })).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Adicionar ao plano' }))
    expect(await within(dialogo).findByText('Marque ao menos uma face')).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('checkbox', { name: 'Mesial' }))
    await usuario.click(within(dialogo).getByRole('checkbox', { name: 'Oclusal' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Adicionar ao plano' }))

    const plano = await screen.findByRole('list', { name: 'Procedimentos planejados' })
    expect(plano).toHaveTextContent('36 · Mesial, Oclusal')
    const envio = apiFalsa
      .recebidos()
      .find((r) => r.metodo === 'POST' && r.caminho.endsWith('/procedimentos'))
    expect(envio?.corpo).toEqual({
      procedimentoId: 'c-restauracao',
      dente: 36,
      faces: ['M', 'O_I'],
      arcada: null,
      observacao: null,
    })
  })

  it('cancelar um planejado exige motivo', async () => {
    const planejado = apiFalsa.planejar(paciente.id, 'c-exodontia', { dente: 38 })
    const { screen, usuario } = renderizarApp(prontuario())

    const plano = await screen.findByRole('list', { name: 'Procedimentos planejados' })
    await usuario.click(within(plano).getByRole('button', { name: 'Cancelar' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar procedimento' }))
    expect(await within(dialogo).findByText('Informe o motivo')).toBeInTheDocument()

    await usuario.type(within(dialogo).getByLabelText('Motivo'), 'Paciente optou por não extrair')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar procedimento' }))

    expect(await screen.findByText('Nenhum procedimento planejado.')).toBeInTheDocument()
    expect('id' in planejado && apiFalsa.procedimento(planejado.id)?.status).toBe('CANCELADO')
  })
})

describe('registro de atendimento', () => {
  it('realiza planejados e inclui não planejados num único envio', async () => {
    apiFalsa.entrarComo('DENTISTA')
    const planejado = apiFalsa.planejar(paciente.id, 'c-exodontia', { dente: 38 })
    const { screen, usuario, urlAtual } = renderizarApp(prontuario())

    await usuario.click(await screen.findByRole('link', { name: 'Registrar atendimento' }))
    await usuario.type(await screen.findByLabelText('Evolução'), 'Exodontia do 38 sem intercorrências.')
    await usuario.click(screen.getByRole('checkbox', { name: 'Exodontia simples · Dente 38' }))

    await usuario.click(screen.getByRole('button', { name: 'Incluir procedimento não planejado' }))
    await usuario.selectOptions(await screen.findByLabelText('Procedimento'), 'Profilaxia (limpeza)')
    await usuario.click(screen.getByRole('button', { name: 'Incluir' }))
    expect(screen.getByRole('list', { name: 'Procedimentos não planejados' })).toHaveTextContent(
      'Profilaxia (limpeza) · Boca toda',
    )

    await usuario.click(screen.getByRole('button', { name: 'Registrar atendimento' }))

    expect(await screen.findByText('Exodontia do 38 sem intercorrências.')).toBeInTheDocument()
    expect(urlAtual()).toBe(`/pacientes/${paciente.id}?aba=prontuario`)
    const envio = apiFalsa.recebidos().find((r) => r.metodo === 'POST' && r.caminho.endsWith('/evolucoes'))
    expect(envio?.corpo).toMatchObject({
      texto: 'Exodontia do 38 sem intercorrências.',
      procedimentosRealizados: ['id' in planejado ? planejado.id : ''],
      novosProcedimentos: [{ procedimentoId: 'c-profilaxia', dente: null, faces: [], arcada: null }],
    })
    const realizados = screen.getByRole('list', { name: 'Procedimentos realizados' })
    expect(realizados).toHaveTextContent('Exodontia simples · Dente 38')
    expect(realizados).toHaveTextContent('Profilaxia (limpeza) · Boca toda')
  })
})

describe('evoluções', () => {
  beforeEach(() => apiFalsa.entrarComo('DENTISTA'))

  it('o autor edita e a alteração aparece no histórico', async () => {
    apiFalsa.registrarEvolucao(paciente.id, 'Texto original.')
    const { screen, usuario } = renderizarApp(prontuario())

    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialogo = await screen.findByRole('dialog')
    const texto = await within(dialogo).findByLabelText('Evolução')
    await usuario.clear(texto)
    await usuario.type(texto, 'Texto corrigido.')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Texto corrigido.')).toBeInTheDocument()
    expect(screen.getByText('Editada')).toBeInTheDocument()
    expect(apiFalsa.recebidos().find((r) => r.metodo === 'PUT')?.ifMatch).toBe('"0"')

    await usuario.click(screen.getByRole('button', { name: 'Histórico' }))
    const versoes = await screen.findByRole('list', { name: 'Versões' })
    await waitFor(() => expect(within(versoes).getAllByRole('listitem')).toHaveLength(2))
    expect(versoes).toHaveTextContent('Criação')
    expect(versoes).toHaveTextContent('Texto original.')
    expect(versoes).toHaveTextContent('Edição')
  })

  it('anular exige motivo e mantém a evolução visível, marcada como anulada', async () => {
    apiFalsa.registrarEvolucao(paciente.id, 'Registro no paciente errado.')
    const { screen, usuario } = renderizarApp(prontuario())

    await usuario.click(await screen.findByRole('button', { name: 'Anular' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.type(within(dialogo).getByLabelText('Motivo'), 'Registrado no paciente errado')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Anular evolução' }))

    expect(await screen.findByText('Anulada')).toBeInTheDocument()
    expect(screen.getByText(/Registrado no paciente errado$/)).toBeInTheDocument()
    expect(screen.getByText('Registro no paciente errado.')).toHaveClass('line-through')
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('só o autor pode editar ou anular', async () => {
    apiFalsa.registrarEvolucao(paciente.id, 'Registro de outro dentista.', OUTRO_DENTISTA)
    const { screen } = renderizarApp(prontuario())

    expect(await screen.findByText('Registro de outro dentista.')).toBeInTheDocument()
    expect(screen.getByText('Dr. Rafael Moreira')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument()
  })
})
