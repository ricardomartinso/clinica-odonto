import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatarData, formatarDataHora } from '@/lib/formatos'
import { consultaHistorico } from './api'

const ROTULO_TIPO = { CRIACAO: 'Criação', EDICAO: 'Edição', ANULACAO: 'Anulação' } as const

/** Versões da evolução registradas pelo Envers: o que estava escrito, quem alterou e quando. */
export function HistoricoDialog({
  pacienteId,
  evolucaoId,
  aberto,
  aoMudar,
}: {
  pacienteId: string
  evolucaoId: string
  aberto: boolean
  aoMudar: (aberto: boolean) => void
}) {
  const historico = useQuery({ ...consultaHistorico(pacienteId, evolucaoId), enabled: aberto })

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico da evolução</DialogTitle>
          <DialogDescription>Cada alteração fica registrada e não pode ser apagada.</DialogDescription>
        </DialogHeader>
        {historico.isPending && <Skeleton className="h-24 w-full" />}
        {historico.isError && (
          <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
        )}
        <ol aria-label="Versões" className="space-y-4">
          {historico.data?.map((versao) => (
            <li key={versao.revisao} className="rounded-md border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{ROTULO_TIPO[versao.tipo]}</Badge>
                <span>{versao.alteradaPor.nome}</span>
                <span className="text-muted-foreground">{formatarDataHora(versao.momento)}</span>
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                Atendimento em {formatarData(versao.dataAtendimento)}
              </p>
              <p className="text-sm whitespace-pre-line">{versao.texto}</p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
