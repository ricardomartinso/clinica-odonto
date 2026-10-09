import type { components } from './schema'

type Schemas = components['schemas']

export type PacienteResponse = Schemas['PacienteResponse']
export type PacienteResumo = Schemas['PacienteResumo']
export type PaginaDePacientes = Schemas['PagedModelPacienteResumo']
export type DadosDoPaciente = Schemas['DadosDoPaciente']
export type DadosEndereco = Schemas['DadosEndereco']
export type DadosResponsavel = Schemas['DadosResponsavel']
export type AnamneseResponse = Schemas['AnamneseResponse']
export type DadosDaAnamnese = Schemas['DadosDaAnamnese']
export type AlertaClinico = AnamneseResponse['alertas'][number]
export type UsuarioLogado = Schemas['UsuarioLogadoResponse']
export type Papel = UsuarioLogado['papel']

/** RFC 9457, como o backend responde em todos os erros. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  erros?: { campo: string; mensagem: string }[]
}
