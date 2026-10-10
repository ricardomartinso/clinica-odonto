import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClipboardPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertasClinicos } from '@/features/pacientes/AlertasClinicos'
import { consultaAnamnese } from '@/features/pacientes/api'
import { LinhaDoTempo } from './LinhaDoTempo'
import { PlanoDeTratamento } from './PlanoDeTratamento'

export function ProntuarioDoPaciente({ pacienteId, ativo }: { pacienteId: string; ativo: boolean }) {
  const anamnese = useQuery(consultaAnamnese(pacienteId))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Alertas sempre visíveis antes de qualquer procedimento */}
        <div>
          {anamnese.data === null && (
            <p className="text-sm text-amber-700">Anamnese não registrada: confira o histórico de saúde.</p>
          )}
          {anamnese.data && <AlertasClinicos alertas={anamnese.data.dados.alertas} />}
        </div>
        {ativo && (
          <Button asChild>
            <Link to="/pacientes/$pacienteId/atendimento" params={{ pacienteId }}>
              <ClipboardPlusIcon />
              Registrar atendimento
            </Link>
          </Button>
        )}
      </div>
      <PlanoDeTratamento pacienteId={pacienteId} editavel={ativo} />
      <LinhaDoTempo pacienteId={pacienteId} />
    </div>
  )
}
