import { describe, expect, it } from 'vitest'
import { apiFalsa } from '@/test/api-falsa'
import { renderizarApp } from '@/test/renderizar'

describe('anamnese', () => {
  it('dentista registra respostas; "não informado" segue como null', async () => {
    apiFalsa.entrarComo('DENTISTA')
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Paciente Anamnese' })
    const { screen, usuario } = renderizarApp(`/pacientes/${paciente.id}`)

    await usuario.click(await screen.findByRole('link', { name: 'Registrar anamnese' }))
    const alergia = await screen.findByRole('radiogroup', { name: 'Possui alguma alergia?' })
    await usuario.click(opcao(alergia, 'Sim'))
    await usuario.click(opcao(screen.getByRole('radiogroup', { name: 'Tem diabetes?' }), 'Não'))
    await usuario.type(screen.getByLabelText('Alérgico a'), 'Penicilina')
    await usuario.click(screen.getByRole('button', { name: 'Salvar anamnese' }))

    expect(await screen.findByRole('list', { name: 'Alertas clínicos' })).toHaveTextContent('Alergia')
    const envio = apiFalsa.recebidos().find((r) => r.metodo === 'PUT')
    expect(envio?.ifMatch).toBeNull()
    expect(envio?.corpo).toMatchObject({
      alergico: true,
      alergiasDescricao: 'Penicilina',
      diabetes: false,
      hipertensao: null,
      semanasGestacao: null,
    })
  })

  it('exige descrição quando há alergia', async () => {
    apiFalsa.entrarComo('DENTISTA')
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Paciente Anamnese' })
    const { screen, usuario } = renderizarApp(`/pacientes/${paciente.id}/anamnese`)

    await usuario.click(
      opcao(await screen.findByRole('radiogroup', { name: 'Possui alguma alergia?' }), 'Sim'),
    )
    await usuario.click(screen.getByRole('button', { name: 'Salvar anamnese' }))

    expect(await screen.findByText('Informe a quais substâncias')).toBeInTheDocument()
    expect(apiFalsa.recebidos().filter((r) => r.metodo === 'PUT')).toHaveLength(0)
  })

  it('recepção que acessa a URL da anamnese volta para o detalhe', async () => {
    apiFalsa.entrarComo('RECEPCAO')
    const paciente = apiFalsa.adicionarPaciente({ nome: 'Paciente Anamnese' })
    const { screen, urlAtual } = renderizarApp(`/pacientes/${paciente.id}/anamnese`)

    await screen.findByRole('heading', { name: 'Paciente Anamnese' })
    expect(urlAtual()).toBe(`/pacientes/${paciente.id}`)
  })
})

/** O botão de rádio da opção ("Sim", "Não", "Não informado") dentro do grupo da pergunta. */
function opcao(grupo: HTMLElement, texto: string): HTMLElement {
  const rotulo = [...grupo.querySelectorAll('label')].find((l) => l.textContent?.trim() === texto)
  return rotulo!.querySelector('button')!
}
