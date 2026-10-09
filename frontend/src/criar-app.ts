import { QueryCache, QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { ehErroDaApi } from '@/api/cliente'
import { routeTree } from './routeTree.gen'

/**
 * Cria QueryClient e Router juntos: uma resposta 401 em qualquer consulta (sessão expirada) limpa o
 * cache e leva ao login, preservando a página atual para voltar depois.
 */
export function criarApp(history?: RouterHistory) {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (erro) => {
        if (ehErroDaApi(erro, 401)) {
          queryClient.clear()
          void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (tentativas, erro) => !ehErroDaApi(erro) && tentativas < 2,
      },
    },
  })

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })

  return { queryClient, router }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof criarApp>['router']
  }
}
