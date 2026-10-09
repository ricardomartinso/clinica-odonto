import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <Link to="/pacientes" className="mt-4 inline-block text-primary underline">
        Voltar para pacientes
      </Link>
    </main>
  ),
})
