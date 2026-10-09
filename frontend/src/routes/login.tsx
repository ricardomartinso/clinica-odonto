import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ehErroDaApi } from '@/api/cliente'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { consultaUsuarioAtual, useLogin } from '@/features/auth/api'

/** Só caminhos internos: evita open redirect via ?redirect=https://... */
const caminhoInterno = z
  .string()
  .refine((valor) => valor.startsWith('/') && !valor.startsWith('//'))
  .optional()
  .catch(undefined)

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: caminhoInterno }),
  beforeLoad: async ({ context, search }) => {
    const usuario = await context.queryClient.ensureQueryData(consultaUsuarioAtual())
    if (usuario) throw redirect({ href: search.redirect ?? '/pacientes' })
  },
  component: PaginaLogin,
})

const esquema = z.object({
  email: z.email('Informe um e-mail válido'),
  senha: z.string().min(1, 'Informe a senha'),
})

function PaginaLogin() {
  const { redirect: destino } = Route.useSearch()
  const navigate = useNavigate()
  const login = useLogin()
  const form = useForm({ resolver: zodResolver(esquema), defaultValues: { email: '', senha: '' } })

  const entrar = form.handleSubmit(async (credenciais) => {
    try {
      await login.mutateAsync(credenciais)
      await navigate({ href: destino ?? '/pacientes', replace: true })
    } catch {
      // mensagem exibida a partir de login.error
    }
  })

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Clínica Odonto</CardTitle>
          <CardDescription>Entre com seu e-mail e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={entrar} noValidate>
            <FieldGroup>
              {login.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {ehErroDaApi(login.error, 401)
                      ? 'E-mail ou senha inválidos.'
                      : 'Não foi possível entrar. Tente novamente.'}
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.senha}>
                <FieldLabel htmlFor="senha">Senha</FieldLabel>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!form.formState.errors.senha}
                  {...form.register('senha')}
                />
                <FieldError errors={[form.formState.errors.senha]} />
              </Field>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
