import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ehErroDaApi } from '@/api/cliente'
import { ErroDeCarregamento } from '@/components/ErroDeCarregamento'
import { consultaAnamnese, consultaPaciente, useGravarAnamnese } from '@/features/pacientes/api'
import { AnamneseForm } from '@/features/pacientes/AnamneseForm'
import { NomeDoPaciente } from '@/features/pacientes/NomeDoPaciente'

/** Dados de saúde: só dentistas. O backend também barra (403); aqui evitamos a tela inútil. */
export const Route = createFileRoute('/_app/pacientes/$pacienteId/anamnese')({
  beforeLoad: ({ context, params }) => {
    if (context.usuario.papel !== 'DENTISTA') {
      throw redirect({ to: '/pacientes/$pacienteId', params })
    }
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(consultaPaciente(params.pacienteId)),
      context.queryClient.ensureQueryData(consultaAnamnese(params.pacienteId)),
    ]),
  errorComponent: ErroDeCarregamento,
  component: PaginaAnamnese,
})

function PaginaAnamnese() {
  const { pacienteId } = Route.useParams()
  const { data: paciente } = useSuspenseQuery(consultaPaciente(pacienteId))
  const { data: anamnese } = useSuspenseQuery(consultaAnamnese(pacienteId))
  const gravar = useGravarAnamnese(pacienteId)
  const navigate = useNavigate()
  const voltar = () => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId } })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Anamnese</h1>
        <p className="text-muted-foreground">
          <NomeDoPaciente nome={paciente.dados.nome} nomeSocial={paciente.dados.nomeSocial} />
        </p>
      </div>
      <AnamneseForm
        key={anamnese?.etag ?? 'nova'}
        respostas={anamnese?.dados.respostas ?? null}
        aoCancelar={() => void voltar()}
        aoEnviar={async (dados) => {
          try {
            await gravar.mutateAsync({ dados, etag: anamnese?.etag ?? null })
          } catch (erro) {
            if (ehErroDaApi(erro, 412)) {
              toast.warning(
                'A anamnese foi alterada por outra pessoa enquanto você editava. As respostas atuais foram carregadas: revise e salve novamente.',
                { duration: 10_000 },
              )
              return
            }
            throw erro
          }
          toast.success('Anamnese salva.')
          await voltar()
        }}
      />
    </div>
  )
}
