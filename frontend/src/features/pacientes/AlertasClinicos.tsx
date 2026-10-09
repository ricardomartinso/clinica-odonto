import { TriangleAlertIcon } from 'lucide-react'
import type { AlertaClinico } from '@/api/tipos'
import { Badge } from '@/components/ui/badge'

const ROTULO_ALERTA: Record<AlertaClinico, string> = {
  ALERGIA: 'Alergia',
  ANTICOAGULANTE: 'Anticoagulante',
  DIABETES: 'Diabetes',
  HIPERTENSAO: 'Hipertensão',
  CARDIOPATIA: 'Cardiopatia',
  COAGULOPATIA: 'Coagulopatia',
  GESTANTE: 'Gestante',
  BISFOSFONATOS: 'Bisfosfonatos',
  REACAO_ANESTESIA: 'Reação a anestesia',
}

export function AlertasClinicos({ alertas }: { alertas: AlertaClinico[] }) {
  if (alertas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum alerta clínico.</p>
  }
  return (
    <ul aria-label="Alertas clínicos" className="flex flex-wrap gap-2">
      {alertas.map((alerta) => (
        <li key={alerta}>
          <Badge variant="destructive">
            <TriangleAlertIcon data-icon="inline-start" />
            {ROTULO_ALERTA[alerta]}
          </Badge>
        </li>
      ))}
    </ul>
  )
}
