import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ehErroDaApi } from '@/api/cliente'
import type { Evolucao } from '@/api/tipos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErrosDaApi } from '@/lib/erros-formulario'
import { consultaEvolucao, useEditarEvolucao } from './api'
import { esquemaEvolucao } from './evolucao'

interface Props {
  pacienteId: string
  evolucaoId: string
  aberto: boolean
  aoMudar: (aberto: boolean) => void
}

export function EditarEvolucaoDialog({ pacienteId, evolucaoId, aberto, aoMudar }: Props) {
  // Busca a evolução individual para obter o ETag (a lista não traz versões).
  const consulta = useQuery({ ...consultaEvolucao(pacienteId, evolucaoId), enabled: aberto })

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar evolução</DialogTitle>
          <DialogDescription>A versão anterior continua disponível no histórico.</DialogDescription>
        </DialogHeader>
        {consulta.data ? (
          <Formulario
            key={consulta.data.etag}
            pacienteId={pacienteId}
            evolucao={consulta.data.dados}
            etag={consulta.data.etag}
            aoConcluir={() => aoMudar(false)}
          />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  pacienteId,
  evolucao,
  etag,
  aoConcluir,
}: {
  pacienteId: string
  evolucao: Evolucao
  etag: string | null
  aoConcluir: () => void
}) {
  const editar = useEditarEvolucao(pacienteId)
  const form = useForm({
    resolver: zodResolver(esquemaEvolucao),
    defaultValues: { dataAtendimento: evolucao.dataAtendimento, texto: evolucao.texto },
  })

  const salvar = form.handleSubmit(async (edicao) => {
    try {
      await editar.mutateAsync({ id: evolucao.id, edicao, etag })
      toast.success('Evolução atualizada.')
      aoConcluir()
    } catch (erro) {
      if (ehErroDaApi(erro, 412)) {
        toast.warning(
          'A evolução foi alterada em outra sessão. O texto atual foi carregado: revise e salve novamente.',
        )
        return
      }
      const mensagem = aplicarErrosDaApi(erro, form.setError)
      if (mensagem) form.setError('root', { message: mensagem })
    }
  })

  return (
    <form onSubmit={salvar} noValidate className="space-y-4">
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
              <FieldLabel htmlFor="dataAtendimentoEdicao">Data do atendimento</FieldLabel>
              <Input id="dataAtendimentoEdicao" type="date" aria-invalid={fieldState.invalid} {...field} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="texto"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="textoEdicao">Evolução</FieldLabel>
              <Textarea id="textoEdicao" rows={8} aria-invalid={fieldState.invalid} {...field} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Salvar alterações
        </Button>
      </DialogFooter>
    </form>
  )
}
