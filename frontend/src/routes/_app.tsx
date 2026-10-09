import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { consultaUsuarioAtual, useLogout, useUsuarioLogado } from '@/features/auth/api'

/** Área autenticada: sem sessão, vai para o login e volta para cá depois. */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const usuario = await context.queryClient.ensureQueryData(consultaUsuarioAtual())
    if (!usuario) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { usuario }
  },
  component: Layout,
})

const ROTULO_PAPEL = { DENTISTA: 'Dentista', RECEPCAO: 'Recepção' } as const

function Layout() {
  const usuario = useUsuarioLogado()
  const logout = useLogout()
  const navigate = useNavigate()

  const sair = async () => {
    await logout.mutateAsync().catch(() => undefined)
    await navigate({ to: '/login', search: {}, replace: true })
  }

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/pacientes" className="font-semibold">
            Clínica Odonto
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/pacientes" activeProps={{ className: 'text-foreground font-medium' }}>
              Pacientes
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{usuario.nome}</span>
            <Badge variant="secondary">{ROTULO_PAPEL[usuario.papel]}</Badge>
            <Button variant="ghost" size="sm" onClick={sair} disabled={logout.isPending}>
              <LogOutIcon />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
