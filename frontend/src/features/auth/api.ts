import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { ehErroDaApi, requisitar } from '@/api/cliente'
import type { UsuarioLogado } from '@/api/tipos'

const chaveUsuario = ['auth', 'usuario'] as const

/** Usuário da sessão atual, ou null se não houver sessão. */
export const consultaUsuarioAtual = () =>
  queryOptions({
    queryKey: chaveUsuario,
    queryFn: async (): Promise<UsuarioLogado | null> => {
      try {
        return (await requisitar<UsuarioLogado>('/api/auth/me')).dados
      } catch (erro) {
        if (ehErroDaApi(erro, 401)) return null
        throw erro
      }
    },
    staleTime: Infinity,
  })

/** Para uso dentro da área autenticada, onde a rota já garantiu que há usuário. */
export function useUsuarioLogado(): UsuarioLogado {
  const { data } = useSuspenseQuery(consultaUsuarioAtual())
  if (!data) throw new Error('useUsuarioLogado usado fora da área autenticada')
  return data
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (credenciais: { email: string; senha: string }) =>
      (await requisitar<UsuarioLogado>('/api/auth/login', { method: 'POST', corpo: credenciais })).dados,
    onSuccess: (usuario) => {
      queryClient.setQueryData(chaveUsuario, usuario)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => requisitar<void>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Nada de dados de pacientes no cache após sair.
      queryClient.clear()
      queryClient.setQueryData(chaveUsuario, null)
    },
  })
}
