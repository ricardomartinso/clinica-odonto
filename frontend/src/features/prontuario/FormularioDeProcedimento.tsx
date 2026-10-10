import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { DadosDoProcedimento, Face, ProcedimentoDoCatalogo } from '@/api/tipos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { aplicarErrosDaApi } from '@/lib/erros-formulario'
import { consultaCatalogo } from './api'
import { descreverLocal, FACES, nomeDaFace, QUADRANTES, ROTULO_ARCADA } from './dentes'

const esquemaBase = z.object({
  procedimentoId: z.string().min(1, 'Escolha o procedimento'),
  dente: z.string(),
  faces: z.array(z.enum(['M', 'D', 'O_I', 'V', 'L_P'])),
  arcada: z.enum(['', 'SUPERIOR', 'INFERIOR']),
  observacao: z.string().trim().max(500),
})
type Valores = z.infer<typeof esquemaBase>

/** Os campos exigidos dependem da abrangência do procedimento escolhido (mesma regra do backend). */
function esquemaPara(catalogo: Map<string, ProcedimentoDoCatalogo>) {
  return esquemaBase.superRefine((v, ctx) => {
    const abrangencia = catalogo.get(v.procedimentoId)?.abrangencia
    if ((abrangencia === 'FACE' || abrangencia === 'DENTE') && !v.dente) {
      ctx.addIssue({ code: 'custom', path: ['dente'], message: 'Escolha o dente' })
    }
    if (abrangencia === 'FACE' && v.faces.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['faces'], message: 'Marque ao menos uma face' })
    }
    if (abrangencia === 'ARCADA' && !v.arcada) {
      ctx.addIssue({ code: 'custom', path: ['arcada'], message: 'Escolha a arcada' })
    }
  })
}

const vazio: Valores = { procedimentoId: '', dente: '', faces: [], arcada: '', observacao: '' }

interface Props {
  rotuloConfirmar: string
  /** Recebe os dados no formato da API e uma descrição legível ("Restauração · 16 · Mesial"). */
  aoConfirmar: (dados: DadosDoProcedimento, descricao: string) => Promise<unknown> | void
  aoCancelar?: () => void
}

export function FormularioDeProcedimento({ rotuloConfirmar, aoConfirmar, aoCancelar }: Props) {
  const catalogo = useQuery(consultaCatalogo())
  const porId = useMemo(() => new Map((catalogo.data ?? []).map((p) => [p.id, p])), [catalogo.data])
  const form = useForm<Valores>({ resolver: zodResolver(esquemaPara(porId)), defaultValues: vazio })
  const [procedimentoId, dente] = useWatch({ control: form.control, name: ['procedimentoId', 'dente'] })
  const abrangencia = porId.get(procedimentoId)?.abrangencia

  if (catalogo.isPending) return <Skeleton className="h-40 w-full" />
  if (catalogo.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar o catálogo de procedimentos.</AlertDescription>
      </Alert>
    )
  }

  const confirmar = form.handleSubmit(async (v) => {
    const procedimento = porId.get(v.procedimentoId)!
    const usaDente = procedimento.abrangencia === 'FACE' || procedimento.abrangencia === 'DENTE'
    const dados: DadosDoProcedimento = {
      procedimentoId: v.procedimentoId,
      dente: usaDente ? Number(v.dente) : null,
      faces: procedimento.abrangencia === 'FACE' ? v.faces : [],
      arcada: procedimento.abrangencia === 'ARCADA' && v.arcada ? v.arcada : null,
      observacao: v.observacao || null,
    }
    const local = descreverLocal(
      procedimento.abrangencia,
      dados.dente ?? null,
      dados.faces ?? [],
      dados.arcada ?? null,
    )
    try {
      await aoConfirmar(dados, `${procedimento.nome} · ${local}`)
      form.reset(vazio)
    } catch (erro) {
      const mensagem = aplicarErrosDaApi(erro, form.setError)
      if (mensagem) form.setError('root', { message: mensagem })
    }
  })

  return (
    // Este formulário fica dentro do formulário do atendimento: Enter num campo aqui deve confirmar o
    // procedimento, não enviar o atendimento inteiro.
    <div
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          void confirmar()
        }
      }}
    >
      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="procedimentoId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor="procedimentoId">Procedimento</FieldLabel>
              <NativeSelect
                id="procedimentoId"
                className="w-full"
                aria-invalid={fieldState.invalid}
                {...field}
              >
                <NativeSelectOption value="">Selecione…</NativeSelectOption>
                {catalogo.data.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.nome}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {(abrangencia === 'FACE' || abrangencia === 'DENTE') && (
          <Controller
            control={form.control}
            name="dente"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="dente">Dente (FDI)</FieldLabel>
                <NativeSelect id="dente" className="w-full" aria-invalid={fieldState.invalid} {...field}>
                  <NativeSelectOption value="">Selecione…</NativeSelectOption>
                  {QUADRANTES.map((q) => (
                    <NativeSelectOptGroup key={q.titulo} label={q.titulo}>
                      {q.dentes.map((d) => (
                        <NativeSelectOption key={d} value={String(d)}>
                          {d}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}

        {abrangencia === 'ARCADA' && (
          <Controller
            control={form.control}
            name="arcada"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="arcada">Arcada</FieldLabel>
                <NativeSelect id="arcada" className="w-full" aria-invalid={fieldState.invalid} {...field}>
                  <NativeSelectOption value="">Selecione…</NativeSelectOption>
                  {(['SUPERIOR', 'INFERIOR'] as const).map((a) => (
                    <NativeSelectOption key={a} value={a}>
                      {ROTULO_ARCADA[a]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}

        {abrangencia === 'FACE' && (
          <Controller
            control={form.control}
            name="faces"
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid} className="sm:col-span-2">
                <FieldLegend variant="label">Faces</FieldLegend>
                <div className="flex flex-wrap gap-4">
                  {FACES.map((face) => (
                    <label key={face} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(face)}
                        onCheckedChange={(marcado) =>
                          field.onChange(
                            marcado ? [...field.value, face] : field.value.filter((f: Face) => f !== face),
                          )
                        }
                      />
                      {nomeDaFace(face, dente ? Number(dente) : null)}
                    </label>
                  ))}
                </div>
                <FieldError errors={[fieldState.error]} />
              </FieldSet>
            )}
          />
        )}

        {abrangencia && (
          <Controller
            control={form.control}
            name="observacao"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                <FieldLabel htmlFor="observacaoProcedimento">Observação</FieldLabel>
                <Input id="observacaoProcedimento" aria-invalid={fieldState.invalid} {...field} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}
      </FieldGroup>
      <div className="flex justify-end gap-2">
        {aoCancelar && (
          <Button type="button" variant="outline" onClick={aoCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="button" onClick={confirmar} disabled={form.formState.isSubmitting}>
          {rotuloConfirmar}
        </Button>
      </div>
    </div>
  )
}
