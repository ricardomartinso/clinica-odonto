import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form'
import { ehErroDaApi } from '@/api/cliente'
import type { DadosDoPaciente } from '@/api/tipos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErrosDaApi } from '@/lib/erros-formulario'
import { mascararCep, mascararCpf, mascararTelefone } from '@/lib/formatos'
import { esquemaPaciente, paraDadosDoPaciente, type ValoresPaciente } from './formulario'

interface Props {
  valoresIniciais: ValoresPaciente
  rotuloEnviar: string
  aoEnviar: (dados: DadosDoPaciente) => Promise<unknown>
  aoCancelar: () => void
}

export function PacienteForm({ valoresIniciais, rotuloEnviar, aoEnviar, aoCancelar }: Props) {
  const form = useForm<ValoresPaciente>({
    resolver: zodResolver(esquemaPaciente),
    defaultValues: valoresIniciais,
    mode: 'onTouched',
  })

  const enviar = form.handleSubmit(async (valores) => {
    try {
      await aoEnviar(paraDadosDoPaciente(valores))
    } catch (erro) {
      if (ehErroDaApi(erro, 409)) {
        form.setError('cpf', { message: erro.message })
        return
      }
      const mensagem = aplicarErrosDaApi(erro, form.setError)
      if (mensagem) form.setError('root', { message: mensagem })
    }
  })

  const { control } = form
  return (
    <form onSubmit={enviar} noValidate className="space-y-8">
      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      <FieldSet>
        <FieldLegend>Identificação</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Campo control={control} nome="nome" rotulo="Nome completo" autoComplete="off" />
          <Campo
            control={control}
            nome="nomeSocial"
            rotulo="Nome social"
            descricao="Será exibido no lugar do nome civil."
          />
          <Campo control={control} nome="dataNascimento" rotulo="Data de nascimento" type="date" />
          <Campo control={control} nome="cpf" rotulo="CPF" mascara={mascararCpf} inputMode="numeric" />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Contato</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Campo
            control={control}
            nome="celular"
            rotulo="Celular"
            mascara={mascararTelefone}
            inputMode="tel"
          />
          <Campo control={control} nome="email" rotulo="E-mail" type="email" />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Endereço</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-6">
          <Campo
            control={control}
            nome="endereco.cep"
            rotulo="CEP"
            mascara={mascararCep}
            inputMode="numeric"
            className="sm:col-span-2"
          />
          <Campo control={control} nome="endereco.logradouro" rotulo="Logradouro" className="sm:col-span-4" />
          <Campo control={control} nome="endereco.numero" rotulo="Número" className="sm:col-span-2" />
          <Campo
            control={control}
            nome="endereco.complemento"
            rotulo="Complemento"
            className="sm:col-span-4"
          />
          <Campo control={control} nome="endereco.bairro" rotulo="Bairro" className="sm:col-span-2" />
          <Campo control={control} nome="endereco.cidade" rotulo="Cidade" className="sm:col-span-3" />
          <Campo
            control={control}
            nome="endereco.uf"
            rotulo="UF"
            mascara={(v) => v.toUpperCase().slice(0, 2)}
            className="sm:col-span-1"
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Responsável legal</FieldLegend>
        <FieldDescription>Obrigatório para pacientes menores de 18 anos.</FieldDescription>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Campo control={control} nome="responsavel.nome" rotulo="Nome do responsável" />
          <Campo control={control} nome="responsavel.parentesco" rotulo="Parentesco" />
          <Campo
            control={control}
            nome="responsavel.cpf"
            rotulo="CPF do responsável"
            mascara={mascararCpf}
            inputMode="numeric"
          />
          <Campo
            control={control}
            nome="responsavel.telefone"
            rotulo="Telefone do responsável"
            mascara={mascararTelefone}
            inputMode="tel"
          />
        </FieldGroup>
      </FieldSet>

      <Controller
        control={control}
        name="observacoes"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
            <Textarea id="observacoes" rows={3} aria-invalid={fieldState.invalid} {...field} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando…' : rotuloEnviar}
        </Button>
      </div>
    </form>
  )
}

interface CampoProps extends Omit<React.ComponentProps<typeof Input>, 'name'> {
  control: Control<ValoresPaciente>
  nome: FieldPath<ValoresPaciente>
  rotulo: string
  descricao?: string
  mascara?: (valor: string) => string
}

function Campo({ control, nome, rotulo, descricao, mascara, className, ...input }: CampoProps) {
  const id = nome.replace('.', '-')
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
          <Input
            id={id}
            aria-invalid={fieldState.invalid}
            {...input}
            {...field}
            value={field.value as string}
            onChange={(e) => field.onChange(mascara ? mascara(e.target.value) : e.target.value)}
          />
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
