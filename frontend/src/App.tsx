import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import type { criarApp } from './criar-app'

export function App({ app }: { app: ReturnType<typeof criarApp> }) {
  return (
    <QueryClientProvider client={app.queryClient}>
      <RouterProvider router={app.router} />
    </QueryClientProvider>
  )
}
