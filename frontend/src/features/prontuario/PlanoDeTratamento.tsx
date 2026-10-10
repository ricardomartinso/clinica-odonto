import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ProcedimentoClinico } from '@/api/tipos'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { consultaProcedimentos, useAlterarProcedimento, usePlanejarProcedimento } from './api'
import { FormularioDeProcedimento } from './FormularioDeProcedimento'
import { MotivoDialog } from './MotivoDialog'

export function PlanoDeTratamento({ pacienteId, editavel }: { pacienteId: string; editavel: boolean }) {
  const planejados = useQuery(consultaProcedimentos(pacienteId, ['PLANEJADO']))
  const planejar = usePlanejarProcedimento(pacienteId)
  const [planejando, setPlanejando] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano de tratamento</CardTitle>
        <CardDescription>Procedimentos planejados, ainda não realizados.</CardDescription>
        {editavel && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setPlanejando(true)}>
              <PlusIcon />
              Planejar procedimento
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {planejados.isPending && <Skeleton className="h-16 w-full" />}
        {planejados.isError && <p className="text-sm text-destructive">Não foi possível carregar o plano.</p>}
        {planejados.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum procedimento planejado.</p>
        )}
        {planejados.data && planejados.data.length > 0 && (
          <ul aria-label="Procedimentos planejados" className="divide-y">
            {planejados.data.map((p) => (
              <ItemPlanejado key={p.id} pacienteId={pacienteId} procedimento={p} editavel={editavel} />
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={planejando} onOpenChange={setPlanejando}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Planejar procedimento</DialogTitle>
            <DialogDescription>
              O procedimento entra no plano e pode ser realizado num atendimento.
            </DialogDescription>
          </DialogHeader>
          <FormularioDeProcedimento
            rotuloConfirmar="Adicionar ao plano"
            aoCancelar={() => setPlanejando(false)}
            aoConfirmar={async (dados) => {
              await planejar.mutateAsync(dados)
              toast.success('Procedimento adicionado ao plano.')
              setPlanejando(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ItemPlanejado({
  pacienteId,
  procedimento,
  editavel,
}: {
  pacienteId: string
  procedimento: ProcedimentoClinico
  editavel: boolean
}) {
  const alterar = useAlterarProcedimento(pacienteId)
  const [cancelando, setCancelando] = useState(false)

  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{procedimento.procedimento.nome}</p>
        <p className="text-sm text-muted-foreground">
          {procedimento.local}
          {procedimento.observacao && ` — ${procedimento.observacao}`}
        </p>
      </div>
      {editavel && (
        <Button variant="ghost" size="sm" onClick={() => setCancelando(true)}>
          Cancelar
        </Button>
      )}
      <MotivoDialog
        aberto={cancelando}
        aoMudar={setCancelando}
        titulo="Cancelar procedimento planejado?"
        descricao={`${procedimento.procedimento.nome} · ${procedimento.local}. O registro permanece no histórico.`}
        rotuloConfirmar="Cancelar procedimento"
        aoConfirmar={async (motivo) => {
          await alterar.mutateAsync({ id: procedimento.id, acao: 'cancelar', motivo })
          toast.success('Procedimento cancelado.')
        }}
      />
    </li>
  )
}
