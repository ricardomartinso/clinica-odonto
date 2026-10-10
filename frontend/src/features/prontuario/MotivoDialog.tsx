import { useState } from 'react'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao: string
  rotuloConfirmar: string
  aoConfirmar: (motivo: string) => Promise<unknown>
}

/** Confirmação de cancelamento/anulação: registros clínicos nunca somem sem justificativa. */
export function MotivoDialog({ aberto, aoMudar, titulo, descricao, rotuloConfirmar, aoConfirmar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const confirmar = async () => {
    if (!motivo.trim()) {
      setErro('Informe o motivo')
      return
    }
    setEnviando(true)
    try {
      await aoConfirmar(motivo.trim())
      setMotivo('')
      setErro(null)
      aoMudar(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="motivo">Motivo</FieldLabel>
          <Textarea
            id="motivo"
            rows={3}
            value={motivo}
            aria-invalid={!!erro}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {erro && erro !== 'Informe o motivo' ? (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          ) : (
            <FieldError>{erro}</FieldError>
          )}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => aoMudar(false)}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={enviando}>
            {rotuloConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
