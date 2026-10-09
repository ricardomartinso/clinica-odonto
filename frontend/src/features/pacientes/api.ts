import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { ehErroDaApi, requisitar } from '@/api/cliente'
import type {
  AnamneseResponse,
  DadosDaAnamnese,
  DadosDoPaciente,
  PacienteResponse,
  PaginaDePacientes,
} from '@/api/tipos'

export interface FiltrosPacientes {
  busca?: string
  pagina: number
  incluirInativos: boolean
}

export const chavesPacientes = {
  todos: ['pacientes'] as const,
  listas: () => [...chavesPacientes.todos, 'lista'] as const,
  lista: (filtros: FiltrosPacientes) => [...chavesPacientes.listas(), filtros] as const,
  detalhe: (id: string) => [...chavesPacientes.todos, 'detalhe', id] as const,
  anamnese: (id: string) => [...chavesPacientes.todos, 'anamnese', id] as const,
}

export const TAMANHO_PAGINA = 20

export const consultaPacientes = (filtros: FiltrosPacientes) =>
  queryOptions({
    queryKey: chavesPacientes.lista(filtros),
    queryFn: async () => {
      const params = new URLSearchParams({
        pagina: String(filtros.pagina),
        tamanho: String(TAMANHO_PAGINA),
        incluirInativos: String(filtros.incluirInativos),
      })
      if (filtros.busca) params.set('busca', filtros.busca)
      return (await requisitar<PaginaDePacientes>(`/api/pacientes?${params}`)).dados
    },
    // mantém a página anterior visível enquanto a nova busca carrega
    placeholderData: keepPreviousData,
  })

/** Detalhe + ETag: a versão é necessária para alterar o paciente. */
export const consultaPaciente = (id: string) =>
  queryOptions({
    queryKey: chavesPacientes.detalhe(id),
    queryFn: () => requisitar<PacienteResponse>(`/api/pacientes/${id}`),
  })

/** null quando a anamnese ainda não foi registrada. */
export const consultaAnamnese = (pacienteId: string) =>
  queryOptions({
    queryKey: chavesPacientes.anamnese(pacienteId),
    queryFn: async () => {
      try {
        return await requisitar<AnamneseResponse>(`/api/pacientes/${pacienteId}/anamnese`)
      } catch (erro) {
        if (ehErroDaApi(erro, 404)) return null
        throw erro
      }
    },
  })

export function useCadastrarPaciente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: DadosDoPaciente) =>
      requisitar<PacienteResponse>('/api/pacientes', { method: 'POST', corpo: dados }),
    onSuccess: (resposta) => {
      queryClient.setQueryData(chavesPacientes.detalhe(resposta.dados.id), resposta)
      return queryClient.invalidateQueries({ queryKey: chavesPacientes.listas() })
    },
  })
}

export function useAtualizarPaciente(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dados, etag }: { dados: DadosDoPaciente; etag: string | null }) =>
      requisitar<PacienteResponse>(`/api/pacientes/${id}`, { method: 'PUT', corpo: dados, ifMatch: etag }),
    onSuccess: (resposta) => {
      queryClient.setQueryData(chavesPacientes.detalhe(id), resposta)
      return queryClient.invalidateQueries({ queryKey: chavesPacientes.listas() })
    },
    onError: (erro) => {
      // 412: outra pessoa alterou o cadastro; recarrega para o usuário ver a versão atual.
      if (ehErroDaApi(erro, 412)) {
        return queryClient.invalidateQueries({ queryKey: chavesPacientes.detalhe(id) })
      }
    },
  })
}

export function useAlterarStatusPaciente(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (acao: 'inativar' | 'reativar') =>
      requisitar<void>(`/api/pacientes/${id}/${acao}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chavesPacientes.todos }),
  })
}

export function useGravarAnamnese(pacienteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dados, etag }: { dados: DadosDaAnamnese; etag: string | null }) =>
      requisitar<AnamneseResponse>(`/api/pacientes/${pacienteId}/anamnese`, {
        method: 'PUT',
        corpo: dados,
        ifMatch: etag,
      }),
    onSuccess: (resposta) => {
      queryClient.setQueryData(chavesPacientes.anamnese(pacienteId), resposta)
    },
    onError: (erro) => {
      if (ehErroDaApi(erro, 412)) {
        return queryClient.invalidateQueries({ queryKey: chavesPacientes.anamnese(pacienteId) })
      }
    },
  })
}
