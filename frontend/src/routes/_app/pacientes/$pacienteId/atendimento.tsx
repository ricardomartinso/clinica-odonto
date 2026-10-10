import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { DadosDoProcedimento } from '@/api/tipos'
import { ErroDeCarregamento } from '@/components/ErroDeCarregamento'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { consultaPaciente } from '@/features/pacientes/api'
import { NomeDoPaciente } from '@/features/pacientes/NomeDoPaciente'
import { consultaProcedimentos, useRegistrarAtendimento } from '@/features/prontuario/api'
import { esquemaEvolucao } from '@/features/prontuario/evolucao'
import { FormularioDeProcedimento } from '@/features/prontuario/FormularioDeProcedimento'
import { aplicarErrosDaApi } from '@/lib/erros-formulario'
import { hojeIso } from '@/lib/formatos'

export const Route = createFileRoute('/_app/pacientes/$pacienteId/atendimento')({
  beforeLoad: ({ context, params }) => {
    if (context.usuario.papel !== 'DENTISTA') {
      throw redirect({ to: '/pacientes/$pacienteId', params })
    }
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(consultaPaciente(params.pacienteId)),
      context.queryClient.ensureQueryData(consultaProcedimentos(params.pacienteId, ['PLANEJADO'])),
    ]),
  errorComponent: ErroDeCarregamento,
  component: RegistrarAtendimento,
})

interface NaoPlanejado {
  chave: number
  dados: DadosDoProcedimento
  descricao: string
}

function RegistrarAtendimento() {
  const { pacienteId } = Route.useParams()
  const { data: paciente } = useSuspenseQuery(consultaPaciente(pacienteId))
  const { data: planejados } = useSuspenseQuery(consultaProcedimentos(pacienteId, ['PLANEJADO']))
  const registrar = useRegistrarAtendimento(pacienteId)
  const navigate = useNavigate()
  const voltar = () =>
    navigate({ to: '/pacientes/$pacienteId', params: { pacienteId }, search: { aba: 'prontuario' } })

  const [realizados, setRealizados] = useState<string[]>([])
  const [naoPlanejados, setNaoPlanejados] = useState<NaoPlanejado[]>([])
  const [incluindo, setIncluindo] = useState(false)
  const form = useForm({
    resolver: zodResolver(esquemaEvolucao),
    defaultValues: { dataAtendimento: hojeIso(), texto: '' },
  })

  const salvar = form.handleSubmit(async (evolucao) => {
    try {
      await registrar.mutateAsync({
        ...evolucao,
        procedimentosRealizados: realizados,
        novosProcedimentos: naoPlanejados.map((n) => n.dados),
      })
      toast.success('Atendimento registrado.')
      await voltar()
    } catch (erro) {
      const mensagem = aplicarErrosDaApi(erro, form.setError)
      if (mensagem) form.setError('root', { message: mensagem })
    }
  })

  return (
    <form onSubmit={salvar} noValidate className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Registrar atendimento</h1>
        <p className="text-muted-foreground">
          <NomeDoPaciente nome={paciente.dados.nome} nomeSocial={paciente.dados.nomeSocial} />
        </p>
      </div>

      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Controller
          control={form.control}
          name="dataAtendimento"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="max-w-48">
              <FieldLabel htmlFor="dataAtendimento">Data do atendimento</FieldLabel>
              <Input id="dataAtendimento" type="date" aria-invalid={fieldState.invalid} {...field} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="texto"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="texto">Evolução</FieldLabel>
              <Textarea
                id="texto"
                rows={8}
                placeholder="Queixa, exame, conduta, materiais, intercorrências e orientações."
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <Card>
        <CardHeader>
          <CardTitle>Procedimentos realizados</CardTitle>
          <CardDescription>
            Marque os planejados que foram feitos e inclua os que não estavam no plano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {planejados.length > 0 ? (
            <ul aria-label="Procedimentos planejados" className="space-y-2">
              {planejados.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={realizados.includes(p.id)}
                      onCheckedChange={(marcado) =>
                        setRealizados((atual) =>
                          marcado ? [...atual, p.id] : atual.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {p.procedimento.nome} · {p.local}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum procedimento planejado.</p>
          )}

          {naoPlanejados.length > 0 && (
            <ul aria-label="Procedimentos não planejados" className="space-y-1">
              {naoPlanejados.map((n) => (
                <li
                  key={n.chave}
                  className="flex items-center justify-between rounded-md border px-3 py-1 text-sm"
                >
                  {n.descricao}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${n.descricao}`}
                    onClick={() => setNaoPlanejados((atual) => atual.filter((x) => x.chave !== n.chave))}
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {incluindo ? (
            <div className="rounded-md border p-4">
              <FormularioDeProcedimento
                rotuloConfirmar="Incluir"
                aoCancelar={() => setIncluindo(false)}
                aoConfirmar={(dados, descricao) => {
                  setNaoPlanejados((atual) => [...atual, { chave: Date.now(), dados, descricao }])
                  setIncluindo(false)
                }}
              />
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setIncluindo(true)}>
              Incluir procedimento não planejado
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void voltar()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando…' : 'Registrar atendimento'}
        </Button>
      </div>
    </form>
  )
}
