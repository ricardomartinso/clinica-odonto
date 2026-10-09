import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { DadosDaAnamnese } from '@/api/tipos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErrosDaApi } from '@/lib/erros-formulario'
import {
  esquemaAnamnese,
  paraDadosDaAnamnese,
  paraValoresAnamnese,
  PERGUNTAS,
  type ValoresAnamnese,
} from './anamnese'

const OPCOES = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'nao_informado', rotulo: 'Não informado' },
] as const

interface Props {
  respostas: DadosDaAnamnese | null
  aoEnviar: (dados: DadosDaAnamnese) => Promise<unknown>
  aoCancelar: () => void
}

export function AnamneseForm({ respostas, aoEnviar, aoCancelar }: Props) {
  const form = useForm<ValoresAnamnese>({
    resolver: zodResolver(esquemaAnamnese),
    defaultValues: paraValoresAnamnese(respostas),
  })
  const [alergico, gestante] = useWatch({ control: form.control, name: ['alergico', 'gestante'] })

  const enviar = form.handleSubmit(async (valores) => {
    try {
      await aoEnviar(paraDadosDaAnamnese(valores))
    } catch (erro) {
      const mensagem = aplicarErrosDaApi(erro, form.setError)
      if (mensagem) form.setError('root', { message: mensagem })
    }
  })

  return (
    <form onSubmit={enviar} noValidate className="space-y-8">
      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      <FieldSet>
        <FieldLegend>Questionário</FieldLegend>
        <FieldGroup className="divide-y">
          {PERGUNTAS.map(({ campo, pergunta }) => (
            <Controller
              key={campo}
              control={form.control}
              name={campo}
              render={({ field }) => (
                <Field orientation="responsive" className="py-3">
                  <FieldLabel id={`${campo}-rotulo`}>{pergunta}</FieldLabel>
                  <RadioGroup
                    aria-labelledby={`${campo}-rotulo`}
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-4"
                  >
                    {OPCOES.map((opcao) => (
                      <label key={opcao.valor} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={opcao.valor} />
                        {opcao.rotulo}
                      </label>
                    ))}
                  </RadioGroup>
                </Field>
              )}
            />
          ))}
        </FieldGroup>
      </FieldSet>

      {(alergico === 'sim' || gestante === 'sim') && (
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {alergico === 'sim' && (
            <Controller
              control={form.control}
              name="alergiasDescricao"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="alergiasDescricao">Alérgico a</FieldLabel>
                  <Input id="alergiasDescricao" aria-invalid={fieldState.invalid} {...field} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}
          {gestante === 'sim' && (
            <Controller
              control={form.control}
              name="semanasGestacao"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="semanasGestacao">Semanas de gestação</FieldLabel>
                  <Input
                    id="semanasGestacao"
                    type="number"
                    min={1}
                    max={42}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}
        </FieldGroup>
      )}

      <FieldGroup>
        {(['medicamentosEmUso', 'observacoes'] as const).map((campo) => (
          <Controller
            key={campo}
            control={form.control}
            name={campo}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={campo}>
                  {campo === 'medicamentosEmUso' ? 'Medicamentos em uso' : 'Observações'}
                </FieldLabel>
                <Textarea id={campo} rows={3} aria-invalid={fieldState.invalid} {...field} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando…' : 'Salvar anamnese'}
        </Button>
      </div>
    </form>
  )
}
