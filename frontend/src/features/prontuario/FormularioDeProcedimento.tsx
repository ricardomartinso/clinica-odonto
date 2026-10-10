import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { Arcada, DadosDoProcedimento, Face, ProcedimentoDoCatalogo } from '@/api/tipos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { aplicarErrosDaApi } from '@/lib/erros-formulario'
import { consultaCatalogo } from './api'
import { descreverLocal, FACES, nomeDaFace, ROTULO_ARCADA } from './dentes'
import { SeletorDeDentes } from './SeletorDeDentes'

const esquemaBase = z.object({
  procedimentoId: z.string().min(1, 'Escolha o procedimento'),
  dentes: z.array(z.number()),
  faces: z.array(z.enum(['M', 'D', 'O_I', 'V', 'L_P'])),
  arcada: z.enum(['', 'SUPERIOR', 'INFERIOR', 'AMBAS']),
  observacao: z.string().trim().max(500),
})
type Valores = z.infer<typeof esquemaBase>

/** Os campos exigidos dependem da abrangência do procedimento escolhido (mesma regra do backend). */
function esquemaPara(catalogo: Map<string, ProcedimentoDoCatalogo>) {
  return esquemaBase.superRefine((v, ctx) => {
    const abrangencia = catalogo.get(v.procedimentoId)?.abrangencia
    if (abrangencia === 'FACE' && v.dentes.length !== 1) {
      ctx.addIssue({ code: 'custom', path: ['dentes'], message: 'Escolha o dente' })
    }
    if (abrangencia === 'DENTE' && v.dentes.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['dentes'], message: 'Escolha ao menos um dente' })
    }
    if (abrangencia === 'FACE' && v.faces.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['faces'], message: 'Marque ao menos uma face' })
    }
    if (abrangencia === 'ARCADA' && !v.arcada) {
      ctx.addIssue({ code: 'custom', path: ['arcada'], message: 'Escolha a arcada' })
    }
  })
}

const vazio: Valores = { procedimentoId: '', dentes: [], faces: [], arcada: '', observacao: '' }

export interface ItemDeProcedimento {
  dados: DadosDoProcedimento
  /** Descrição legível: "Selante · Dente 16". */
  descricao: string
}

/**
 * Uma escolha no formulário pode virar vários itens: um por dente (selante em 16, 26, 36 e 46) ou um
 * por arcada ("ambas as arcadas"). Cada item segue independente no prontuário (pode ser realizado ou
 * cancelado separadamente).
 */
function paraItens(procedimento: ProcedimentoDoCatalogo, v: Valores): ItemDeProcedimento[] {
  const observacao = v.observacao || null
  const item = (dente: number | null, faces: Face[], arcada: Arcada | null): ItemDeProcedimento => ({
    dados: { procedimentoId: procedimento.id, dente, faces, arcada, observacao },
    descricao: `${procedimento.nome} · ${descreverLocal(procedimento.abrangencia, dente, faces, arcada)}`,
  })
  switch (procedimento.abrangencia) {
    case 'FACE':
      return [
        item(
          v.dentes[0]!,
          FACES.filter((f) => v.faces.includes(f)),
          null,
        ),
      ]
    case 'DENTE':
      return v.dentes.map((dente) => item(dente, [], null))
    case 'ARCADA': {
      const arcadas: Arcada[] = v.arcada === 'AMBAS' ? ['SUPERIOR', 'INFERIOR'] : [v.arcada as Arcada]
      return arcadas.map((arcada) => item(null, [], arcada))
    }
    case 'BOCA':
      return [item(null, [], null)]
  }
}

interface Props {
  rotuloConfirmar: string
  aoConfirmar: (itens: ItemDeProcedimento[]) => Promise<unknown> | void
  aoCancelar?: () => void
}

export function FormularioDeProcedimento({ rotuloConfirmar, aoConfirmar, aoCancelar }: Props) {
  const catalogo = useQuery(consultaCatalogo())
  const porId = useMemo(() => new Map((catalogo.data ?? []).map((p) => [p.id, p])), [catalogo.data])
  const form = useForm<Valores>({ resolver: zodResolver(esquemaPara(porId)), defaultValues: vazio })
  const [procedimentoId, dentes, arcada] = useWatch({
    control: form.control,
    name: ['procedimentoId', 'dentes', 'arcada'],
  })
  const abrangencia = porId.get(procedimentoId)?.abrangencia

  if (catalogo.isPending) return <Skeleton className="h-40 w-full" />
  if (catalogo.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar o catálogo de procedimentos.</AlertDescription>
      </Alert>
    )
  }

  const quantidade =
    abrangencia === 'DENTE' ? dentes.length : abrangencia === 'ARCADA' && arcada === 'AMBAS' ? 2 : 1

  const confirmar = form.handleSubmit(async (v) => {
    try {
      await aoConfirmar(paraItens(porId.get(v.procedimentoId)!, v))
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
                onChange={(e) => {
                  // a localização depende do tipo de procedimento: recomeça ao trocar
                  field.onChange(e.target.value)
                  form.setValue('dentes', [])
                  form.setValue('faces', [])
                  form.setValue('arcada', '')
                  form.clearErrors()
                }}
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
            name="dentes"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                <FieldLabel id="rotulo-dentes">{abrangencia === 'DENTE' ? 'Dentes' : 'Dente'}</FieldLabel>
                <SeletorDeDentes
                  idRotulo="rotulo-dentes"
                  selecionados={field.value}
                  aoMudar={field.onChange}
                  multiplo={abrangencia === 'DENTE'}
                  invalido={fieldState.invalid}
                />
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
                  <NativeSelectOption value="AMBAS">Ambas as arcadas</NativeSelectOption>
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
                      {nomeDaFace(face, dentes[0] ?? null)}
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
          {quantidade > 1 ? `${rotuloConfirmar} (${quantidade})` : rotuloConfirmar}
        </Button>
      </div>
    </div>
  )
}
