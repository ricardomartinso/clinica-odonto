-- DADOS FICTÍCIOS, carregados apenas no perfil "dev": prontuários de exemplo.
-- Idempotente: IDs fixos + ON CONFLICT. Para recriar do zero: docker compose down -v

-- Dra. Helena (…0001) e Dr. Rafael (…0002)
insert into evolucao_clinica (id, paciente_id, autor_id, data_atendimento, texto, editada_em, anulada_em, anulada_por,
                              motivo_anulacao, versao, criado_em, criado_por, atualizado_em, atualizado_por)
values
    -- Paciente 1: avaliação inicial e restauração
    ('01930000-0000-7000-8000-000000000001', '01910000-0000-7000-8000-000000000001',
     '01900000-0000-7000-8000-000000000001', current_date - 60,
     'Avaliação inicial. Queixa de sensibilidade ao frio no 16. Exame clínico: lesão de cárie ativa em 16 (MO) '
     || 'e 26 (O). Radiografia periapical do 16 sem envolvimento pulpar. Realizada profilaxia e orientação de '
     || 'higiene. Plano: restaurações em resina no 16 e 26.',
     null, null, null, null, 0, now() - interval '60 days', '01900000-0000-7000-8000-000000000001',
     now() - interval '60 days', '01900000-0000-7000-8000-000000000001'),
    ('01930000-0000-7000-8000-000000000002', '01910000-0000-7000-8000-000000000001',
     '01900000-0000-7000-8000-000000000001', current_date - 30,
     'Restauração MO no 16 em resina composta (cor A2), isolamento relativo, anestesia infiltrativa com '
     || 'lidocaína 2% com epinefrina. Sem intercorrências. Retorno para o 26.',
     now() - interval '29 days', null, null, null, 1, now() - interval '30 days', '01900000-0000-7000-8000-000000000001',
     now() - interval '29 days', '01900000-0000-7000-8000-000000000001'),
    -- Paciente 4 (idoso): exodontia, com uma evolução anulada por erro de registro
    ('01930000-0000-7000-8000-000000000003', '01910000-0000-7000-8000-000000000004',
     '01900000-0000-7000-8000-000000000002', current_date - 20,
     'Exodontia do 38 sob anestesia local. Hemostasia satisfatória. Prescrito analgésico e orientações pós-operatórias.',
     null, now() - interval '19 days', '01900000-0000-7000-8000-000000000002',
     'Registrado no prontuário do paciente errado.', 1, now() - interval '20 days',
     '01900000-0000-7000-8000-000000000002', now() - interval '19 days', '01900000-0000-7000-8000-000000000002'),
    ('01930000-0000-7000-8000-000000000004', '01910000-0000-7000-8000-000000000004',
     '01900000-0000-7000-8000-000000000002', current_date - 10,
     'Raspagem supragengival na arcada inferior. Sangramento à sondagem moderado. Reforçadas orientações de higiene.',
     null, null, null, null, 0, now() - interval '10 days', '01900000-0000-7000-8000-000000000002',
     now() - interval '10 days', '01900000-0000-7000-8000-000000000002'),
    -- Paciente 3 (criança): dentes decíduos
    ('01930000-0000-7000-8000-000000000005', '01910000-0000-7000-8000-000000000003',
     '01900000-0000-7000-8000-000000000001', current_date - 5,
     'Consulta acompanhada da mãe. Aplicação tópica de flúor. Cárie oclusal no 85; restauração em ionômero de vidro.',
     null, null, null, null, 0, now() - interval '5 days', '01900000-0000-7000-8000-000000000001',
     now() - interval '5 days', '01900000-0000-7000-8000-000000000001')
on conflict (id) do nothing;

insert into procedimento_clinico (id, paciente_id, procedimento_id, dente, faces, arcada, status, observacao,
                                  evolucao_id, realizado_em, realizado_por, motivo, versao, criado_em, criado_por,
                                  atualizado_em, atualizado_por)
values
    -- Paciente 1
    ('01940000-0000-7000-8000-000000000001', '01910000-0000-7000-8000-000000000001',
     '01920000-0000-7000-8000-000000000002', null, null, null, 'REALIZADO', null,
     '01930000-0000-7000-8000-000000000001', current_date - 60, '01900000-0000-7000-8000-000000000001', null, 1,
     now() - interval '60 days', '01900000-0000-7000-8000-000000000001', now() - interval '60 days',
     '01900000-0000-7000-8000-000000000001'),
    ('01940000-0000-7000-8000-000000000002', '01910000-0000-7000-8000-000000000001',
     '01920000-0000-7000-8000-000000000011', 16, null, null, 'REALIZADO', null,
     '01930000-0000-7000-8000-000000000001', current_date - 60, '01900000-0000-7000-8000-000000000001', null, 1,
     now() - interval '60 days', '01900000-0000-7000-8000-000000000001', now() - interval '60 days',
     '01900000-0000-7000-8000-000000000001'),
    ('01940000-0000-7000-8000-000000000003', '01910000-0000-7000-8000-000000000001',
     '01920000-0000-7000-8000-000000000019', 16, 'M,O_I', null, 'REALIZADO', 'Resina A2',
     '01930000-0000-7000-8000-000000000002', current_date - 30, '01900000-0000-7000-8000-000000000001', null, 1,
     now() - interval '60 days', '01900000-0000-7000-8000-000000000001', now() - interval '30 days',
     '01900000-0000-7000-8000-000000000001'),
    ('01940000-0000-7000-8000-000000000004', '01910000-0000-7000-8000-000000000001',
     '01920000-0000-7000-8000-000000000019', 26, 'O_I', null, 'PLANEJADO', null,
     null, null, null, null, 0, now() - interval '60 days', '01900000-0000-7000-8000-000000000001',
     now() - interval '60 days', '01900000-0000-7000-8000-000000000001'),
    -- Paciente 4
    ('01940000-0000-7000-8000-000000000005', '01910000-0000-7000-8000-000000000004',
     '01920000-0000-7000-8000-000000000013', 38, null, null, 'ANULADO', null,
     '01930000-0000-7000-8000-000000000003', current_date - 20, '01900000-0000-7000-8000-000000000002',
     'Registrado no prontuário do paciente errado.', 2, now() - interval '20 days',
     '01900000-0000-7000-8000-000000000002', now() - interval '19 days', '01900000-0000-7000-8000-000000000002'),
    ('01940000-0000-7000-8000-000000000006', '01910000-0000-7000-8000-000000000004',
     '01920000-0000-7000-8000-000000000006', null, null, 'INFERIOR', 'REALIZADO', null,
     '01930000-0000-7000-8000-000000000004', current_date - 10, '01900000-0000-7000-8000-000000000002', null, 1,
     now() - interval '10 days', '01900000-0000-7000-8000-000000000002', now() - interval '10 days',
     '01900000-0000-7000-8000-000000000002'),
    ('01940000-0000-7000-8000-000000000007', '01910000-0000-7000-8000-000000000004',
     '01920000-0000-7000-8000-000000000006', null, null, 'SUPERIOR', 'PLANEJADO', null,
     null, null, null, null, 0, now() - interval '10 days', '01900000-0000-7000-8000-000000000002',
     now() - interval '10 days', '01900000-0000-7000-8000-000000000002'),
    ('01940000-0000-7000-8000-000000000008', '01910000-0000-7000-8000-000000000004',
     '01920000-0000-7000-8000-000000000017', 46, null, null, 'PLANEJADO', 'Avaliar após endodontia',
     null, null, null, null, 0, now() - interval '10 days', '01900000-0000-7000-8000-000000000002',
     now() - interval '10 days', '01900000-0000-7000-8000-000000000002'),
    ('01940000-0000-7000-8000-000000000009', '01910000-0000-7000-8000-000000000004',
     '01920000-0000-7000-8000-000000000016', 46, null, null, 'CANCELADO', null,
     null, null, null, 'Paciente optou por exodontia; reavaliar.', 1, now() - interval '20 days',
     '01900000-0000-7000-8000-000000000002', now() - interval '10 days', '01900000-0000-7000-8000-000000000002'),
    -- Paciente 3 (decíduos)
    ('01940000-0000-7000-8000-000000000010', '01910000-0000-7000-8000-000000000003',
     '01920000-0000-7000-8000-000000000003', null, null, null, 'REALIZADO', null,
     '01930000-0000-7000-8000-000000000005', current_date - 5, '01900000-0000-7000-8000-000000000001', null, 1,
     now() - interval '5 days', '01900000-0000-7000-8000-000000000001', now() - interval '5 days',
     '01900000-0000-7000-8000-000000000001'),
    ('01940000-0000-7000-8000-000000000011', '01910000-0000-7000-8000-000000000003',
     '01920000-0000-7000-8000-000000000020', 85, 'O_I', null, 'REALIZADO', null,
     '01930000-0000-7000-8000-000000000005', current_date - 5, '01900000-0000-7000-8000-000000000001', null, 1,
     now() - interval '5 days', '01900000-0000-7000-8000-000000000001', now() - interval '5 days',
     '01900000-0000-7000-8000-000000000001'),
    ('01940000-0000-7000-8000-000000000012', '01910000-0000-7000-8000-000000000003',
     '01920000-0000-7000-8000-000000000012', 75, null, null, 'PLANEJADO', null,
     null, null, null, null, 0, now() - interval '5 days', '01900000-0000-7000-8000-000000000001',
     now() - interval '5 days', '01900000-0000-7000-8000-000000000001')
on conflict (id) do nothing;
