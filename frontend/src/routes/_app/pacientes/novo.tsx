import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useCadastrarPaciente } from '@/features/pacientes/api'
import { valoresVazios } from '@/features/pacientes/formulario'
import { PacienteForm } from '@/features/pacientes/PacienteForm'

export const Route = createFileRoute('/_app/pacientes/novo')({
  component: NovoPaciente,
})

function NovoPaciente() {
  const navigate = useNavigate()
  const cadastrar = useCadastrarPaciente()

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Novo paciente</h1>
      <PacienteForm
        valoresIniciais={valoresVazios}
        rotuloEnviar="Cadastrar"
        aoCancelar={() => void navigate({ to: '/pacientes' })}
        aoEnviar={async (dados) => {
          const { dados: paciente } = await cadastrar.mutateAsync(dados)
          toast.success('Paciente cadastrado.')
          await navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: paciente.id } })
        }}
      />
    </div>
  )
}
