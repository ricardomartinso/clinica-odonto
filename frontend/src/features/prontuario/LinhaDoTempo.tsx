import { useInfiniteQuery } from '@tanstack/react-query'
import { HistoryIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Evolucao } from '@/api/tipos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsuarioLogado } from '@/features/auth/api'
import { formatarData, formatarDataHora } from '@/lib/formatos'
import { consultaEvolucoes, useAnularEvolucao } from './api'
import { EditarEvolucaoDialog } from './EditarEvolucaoDialog'
import { HistoricoDialog } from './HistoricoDialog'
import { MotivoDialog } from './MotivoDialog'

export function LinhaDoTempo({ pacienteId }: { pacienteId: string }) {
  const consulta = useInfiniteQuery(consultaEvolucoes(pacienteId))
  const evolucoes = consulta.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <section aria-label="Evoluções" className="space-y-3">
      <h2 className="text-lg font-semibold">Evoluções</h2>
      {consulta.isPending && <Skeleton className="h-32 w-full" />}
      {consulta.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar as evoluções.</p>
      )}
      {consulta.isSuccess && evolucoes.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
      )}
      {evolucoes.map((evolucao) => (
        <CartaoDeEvolucao key={evolucao.id} pacienteId={pacienteId} evolucao={evolucao} />
      ))}
      {consulta.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void consulta.fetchNextPage()}
          disabled={consulta.isFetchingNextPage}
        >
          Carregar anteriores
        </Button>
      )}
    </section>
  )
}

function CartaoDeEvolucao({ pacienteId, evolucao }: { pacienteId: string; evolucao: Evolucao }) {
  const usuario = useUsuarioLogado()
  const anular = useAnularEvolucao(pacienteId)
  const [dialogo, setDialogo] = useState<'editar' | 'anular' | 'historico' | null>(null)
  const anulada = evolucao.anulacao !== null
  const ehAutor = evolucao.autor.id === usuario.id
  const fechar = (aberto: boolean) => !aberto && setDialogo(null)

  return (
    <Card
      aria-label={`Evolução de ${formatarData(evolucao.dataAtendimento)}`}
      className={anulada ? 'opacity-70' : ''}
    >
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {formatarData(evolucao.dataAtendimento)}
          {anulada && <Badge variant="destructive">Anulada</Badge>}
          {evolucao.editadaEm && !anulada && <Badge variant="outline">Editada</Badge>}
        </CardTitle>
        <CardDescription>{evolucao.autor.nome}</CardDescription>
        <CardAction className="flex gap-1">
          {(evolucao.editadaEm || anulada) && (
            <Button variant="ghost" size="sm" onClick={() => setDialogo('historico')}>
              <HistoryIcon />
              Histórico
            </Button>
          )}
          {ehAutor && !anulada && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDialogo('editar')}>
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDialogo('anular')}>
                Anular
              </Button>
            </>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {anulada && evolucao.anulacao && (
          <p className="text-sm text-destructive">
            Anulada por {evolucao.anulacao.por.nome} em {formatarDataHora(evolucao.anulacao.em)}:{' '}
            {evolucao.anulacao.motivo}
          </p>
        )}
        <p className={`text-sm whitespace-pre-line ${anulada ? 'line-through' : ''}`}>{evolucao.texto}</p>
        {evolucao.procedimentosRealizados.length > 0 && (
          <ul aria-label="Procedimentos realizados" className="flex flex-wrap gap-2">
            {evolucao.procedimentosRealizados.map((p) => (
              <li key={p.id}>
                <Badge variant={p.status === 'ANULADO' ? 'outline' : 'secondary'}>
                  <span className={p.status === 'ANULADO' ? 'line-through' : ''}>
                    {p.procedimento.nome} · {p.local}
                  </span>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {dialogo === 'editar' && (
        <EditarEvolucaoDialog pacienteId={pacienteId} evolucaoId={evolucao.id} aberto aoMudar={fechar} />
      )}
      {dialogo === 'historico' && (
        <HistoricoDialog pacienteId={pacienteId} evolucaoId={evolucao.id} aberto aoMudar={fechar} />
      )}
      <MotivoDialog
        aberto={dialogo === 'anular'}
        aoMudar={fechar}
        titulo="Anular evolução?"
        descricao="A evolução e os procedimentos realizados nela ficam marcados como anulados, com o motivo. Nada é apagado."
        rotuloConfirmar="Anular evolução"
        aoConfirmar={async (motivo) => {
          await anular.mutateAsync({ id: evolucao.id, motivo })
          toast.success('Evolução anulada.')
        }}
      />
    </Card>
  )
}
