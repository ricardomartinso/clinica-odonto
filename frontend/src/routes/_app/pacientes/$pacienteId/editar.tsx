import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ehErroDaApi } from '@/api/cliente'
import { ErroDeCarregamento } from '@/components/ErroDeCarregamento'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { consultaPaciente, useAtualizarPaciente } from '@/features/pacientes/api'
import { paraValores } from '@/features/pacientes/formulario'
import { PacienteForm } from '@/features/pacientes/PacienteForm'

export const Route = createFileRoute('/_app/pacientes/$pacienteId/editar')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(consultaPaciente(params.pacienteId)),
  errorComponent: ErroDeCarregamento,
  component: EditarPaciente,
})

function EditarPaciente() {
  const { pacienteId } = Route.useParams()
  const { data } = useSuspenseQuery(consultaPaciente(pacienteId))
  const atualizar = useAtualizarPaciente(pacienteId)
  const navigate = useNavigate()
  const voltar = () => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId } })

  if (!data.dados.ativo) {
    return (
      <Alert className="max-w-xl">
        <AlertDescription>Paciente inativo. Reative o cadastro antes de alterá-lo.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar paciente</h1>
      {/* key: quando a versão muda (ex.: após um 412), o formulário reinicia com os dados atuais */}
      <PacienteForm
        key={data.etag}
        valoresIniciais={paraValores(data.dados)}
        rotuloEnviar="Salvar alterações"
        aoCancelar={() => void voltar()}
        aoEnviar={async (dados) => {
          try {
            await atualizar.mutateAsync({ dados, etag: data.etag })
          } catch (erro) {
            if (ehErroDaApi(erro, 412)) {
              toast.warning(
                'Este cadastro foi alterado por outra pessoa enquanto você editava. Os dados atuais foram carregados: revise e salve novamente.',
                { duration: 10_000 },
              )
              return
            }
            throw erro
          }
          toast.success('Alterações salvas.')
          await voltar()
        }}
      />
    </div>
  )
}
