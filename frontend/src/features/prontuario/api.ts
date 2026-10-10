import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { requisitar } from '@/api/cliente'
import type {
  DadosDoProcedimento,
  EdicaoDeEvolucao,
  Evolucao,
  PaginaDeEvolucoes,
  ProcedimentoClinico,
  ProcedimentoDoCatalogo,
  RegistroDeAtendimento,
  StatusProcedimento,
  VersaoDaEvolucao,
} from '@/api/tipos'

export const chavesProntuario = {
  catalogo: ['catalogo-procedimentos'] as const,
  doPaciente: (pacienteId: string) => ['prontuario', pacienteId] as const,
  procedimentos: (pacienteId: string, status: StatusProcedimento[]) =>
    [...chavesProntuario.doPaciente(pacienteId), 'procedimentos', status] as const,
  evolucoes: (pacienteId: string) => [...chavesProntuario.doPaciente(pacienteId), 'evolucoes'] as const,
  evolucao: (pacienteId: string, id: string) =>
    [...chavesProntuario.doPaciente(pacienteId), 'evolucao', id] as const,
  historico: (pacienteId: string, id: string) =>
    [...chavesProntuario.doPaciente(pacienteId), 'historico', id] as const,
}

const base = (pacienteId: string) => `/api/pacientes/${pacienteId}`

export const consultaCatalogo = () =>
  queryOptions({
    queryKey: chavesProntuario.catalogo,
    queryFn: async () => (await requisitar<ProcedimentoDoCatalogo[]>('/api/procedimentos')).dados,
    staleTime: Infinity,
  })

export const consultaProcedimentos = (pacienteId: string, status: StatusProcedimento[]) =>
  queryOptions({
    queryKey: chavesProntuario.procedimentos(pacienteId, status),
    queryFn: async () => {
      const params = new URLSearchParams(status.map((s) => ['status', s]))
      return (await requisitar<ProcedimentoClinico[]>(`${base(pacienteId)}/procedimentos?${params}`)).dados
    },
  })

const TAMANHO_PAGINA = 10

export const consultaEvolucoes = (pacienteId: string) =>
  infiniteQueryOptions({
    queryKey: chavesProntuario.evolucoes(pacienteId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await requisitar<PaginaDeEvolucoes>(
          `${base(pacienteId)}/evolucoes?pagina=${pageParam}&tamanho=${TAMANHO_PAGINA}`,
        )
      ).dados,
    getNextPageParam: (ultima) =>
      ultima.page.number + 1 < ultima.page.totalPages ? ultima.page.number + 1 : undefined,
  })

/** Evolução individual + ETag, necessário para editar. */
export const consultaEvolucao = (pacienteId: string, id: string) =>
  queryOptions({
    queryKey: chavesProntuario.evolucao(pacienteId, id),
    queryFn: () => requisitar<Evolucao>(`${base(pacienteId)}/evolucoes/${id}`),
  })

export const consultaHistorico = (pacienteId: string, id: string) =>
  queryOptions({
    queryKey: chavesProntuario.historico(pacienteId, id),
    queryFn: async () =>
      (await requisitar<VersaoDaEvolucao[]>(`${base(pacienteId)}/evolucoes/${id}/historico`)).dados,
  })

/** Qualquer alteração no prontuário invalida tudo do paciente: plano e linha do tempo andam juntos. */
function useMutacaoDoProntuario<T, R>(pacienteId: string, executar: (variaveis: T) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: executar,
    onSettled: () => queryClient.invalidateQueries({ queryKey: chavesProntuario.doPaciente(pacienteId) }),
  })
}

export const usePlanejarProcedimento = (pacienteId: string) =>
  useMutacaoDoProntuario(pacienteId, (dados: DadosDoProcedimento) =>
    requisitar<ProcedimentoClinico>(`${base(pacienteId)}/procedimentos`, { method: 'POST', corpo: dados }),
  )

export const useAlterarProcedimento = (pacienteId: string) =>
  useMutacaoDoProntuario(
    pacienteId,
    ({ id, acao, motivo }: { id: string; acao: 'cancelar' | 'anular'; motivo: string }) =>
      requisitar<ProcedimentoClinico>(`${base(pacienteId)}/procedimentos/${id}/${acao}`, {
        method: 'POST',
        corpo: { motivo },
      }),
  )

export const useRegistrarAtendimento = (pacienteId: string) =>
  useMutacaoDoProntuario(pacienteId, (registro: RegistroDeAtendimento) =>
    requisitar<Evolucao>(`${base(pacienteId)}/evolucoes`, { method: 'POST', corpo: registro }),
  )

export const useEditarEvolucao = (pacienteId: string) =>
  useMutacaoDoProntuario(
    pacienteId,
    ({ id, edicao, etag }: { id: string; edicao: EdicaoDeEvolucao; etag: string | null }) =>
      requisitar<Evolucao>(`${base(pacienteId)}/evolucoes/${id}`, {
        method: 'PUT',
        corpo: edicao,
        ifMatch: etag,
      }),
  )

export const useAnularEvolucao = (pacienteId: string) =>
  useMutacaoDoProntuario(pacienteId, ({ id, motivo }: { id: string; motivo: string }) =>
    requisitar<Evolucao>(`${base(pacienteId)}/evolucoes/${id}/anular`, { method: 'POST', corpo: { motivo } }),
  )
