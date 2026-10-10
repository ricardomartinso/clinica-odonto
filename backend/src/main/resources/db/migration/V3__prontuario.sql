-- Prontuário: catálogo de procedimentos, evolução clínica e procedimentos por dente/face.
-- Evolução e procedimentos clínicos são auditados pelo Envers.

-- Dente na notação FDI: permanentes 11–48, decíduos 51–85.
create function dente_fdi_valido(codigo smallint) returns boolean
    language sql immutable parallel safe
as $$
    select codigo is null
        or (codigo / 10 between 1 and 4 and codigo % 10 between 1 and 8)
        or (codigo / 10 between 5 and 8 and codigo % 10 between 1 and 5)
$$;

-- Dado de referência (existe em todos os ambientes, não só no dev).
create table procedimento (
    id           uuid primary key,
    nome         varchar(150) not null unique,
    abrangencia  varchar(10)  not null,
    ativo        boolean      not null default true,

    constraint ck_procedimento_abrangencia check (abrangencia in ('BOCA', 'ARCADA', 'DENTE', 'FACE'))
);

insert into procedimento (id, nome, abrangencia) values
    ('01920000-0000-7000-8000-000000000001', 'Consulta de avaliação', 'BOCA'),
    ('01920000-0000-7000-8000-000000000002', 'Profilaxia (limpeza)', 'BOCA'),
    ('01920000-0000-7000-8000-000000000003', 'Aplicação tópica de flúor', 'BOCA'),
    ('01920000-0000-7000-8000-000000000004', 'Orientação de higiene bucal', 'BOCA'),
    ('01920000-0000-7000-8000-000000000005', 'Radiografia panorâmica', 'BOCA'),
    ('01920000-0000-7000-8000-000000000006', 'Raspagem supragengival', 'ARCADA'),
    ('01920000-0000-7000-8000-000000000007', 'Raspagem subgengival', 'ARCADA'),
    ('01920000-0000-7000-8000-000000000008', 'Clareamento dental', 'ARCADA'),
    ('01920000-0000-7000-8000-000000000009', 'Prótese total', 'ARCADA'),
    ('01920000-0000-7000-8000-000000000010', 'Placa miorrelaxante', 'ARCADA'),
    ('01920000-0000-7000-8000-000000000011', 'Radiografia periapical', 'DENTE'),
    ('01920000-0000-7000-8000-000000000012', 'Selante', 'DENTE'),
    ('01920000-0000-7000-8000-000000000013', 'Exodontia simples', 'DENTE'),
    ('01920000-0000-7000-8000-000000000014', 'Exodontia de dente incluso', 'DENTE'),
    ('01920000-0000-7000-8000-000000000015', 'Pulpotomia', 'DENTE'),
    ('01920000-0000-7000-8000-000000000016', 'Tratamento endodôntico (canal)', 'DENTE'),
    ('01920000-0000-7000-8000-000000000017', 'Coroa protética', 'DENTE'),
    ('01920000-0000-7000-8000-000000000018', 'Implante dentário', 'DENTE'),
    ('01920000-0000-7000-8000-000000000019', 'Restauração em resina composta', 'FACE'),
    ('01920000-0000-7000-8000-000000000020', 'Restauração em ionômero de vidro', 'FACE'),
    ('01920000-0000-7000-8000-000000000021', 'Restauração em amálgama', 'FACE');

create table evolucao_clinica (
    id                uuid primary key,
    paciente_id       uuid          not null references paciente (id),
    autor_id          uuid          not null references usuario (id),
    data_atendimento  date          not null,
    texto             varchar(10000) not null,
    editada_em        timestamptz,
    anulada_em        timestamptz,
    anulada_por       uuid references usuario (id),
    motivo_anulacao   varchar(500),
    versao            bigint        not null,
    criado_em         timestamptz   not null,
    criado_por        uuid references usuario (id),
    atualizado_em     timestamptz   not null,
    atualizado_por    uuid references usuario (id),

    constraint ck_evolucao_anulacao check (
        (anulada_em is null) = (anulada_por is null)
        and (anulada_em is null) = (motivo_anulacao is null)
    )
);

create index ix_evolucao_paciente on evolucao_clinica (paciente_id, data_atendimento desc, criado_em desc);

create table procedimento_clinico (
    id               uuid primary key,
    paciente_id      uuid         not null references paciente (id),
    procedimento_id  uuid         not null references procedimento (id),
    dente            smallint,
    faces            varchar(20),
    arcada           varchar(10),
    status           varchar(10)  not null,
    observacao       varchar(500),
    evolucao_id      uuid references evolucao_clinica (id),
    realizado_em     date,
    realizado_por    uuid references usuario (id),
    motivo           varchar(500),
    versao           bigint       not null,
    criado_em        timestamptz  not null,
    criado_por       uuid references usuario (id),
    atualizado_em    timestamptz  not null,
    atualizado_por   uuid references usuario (id),

    constraint ck_procedimento_clinico_dente check (dente_fdi_valido(dente)),
    constraint ck_procedimento_clinico_faces check (
        faces is null or (faces ~ '^(M|D|O_I|V|L_P)(,(M|D|O_I|V|L_P)){0,4}$' and dente is not null)
    ),
    constraint ck_procedimento_clinico_arcada check (arcada in ('SUPERIOR', 'INFERIOR')),
    constraint ck_procedimento_clinico_status check (status in ('PLANEJADO', 'REALIZADO', 'CANCELADO', 'ANULADO')),
    -- Procedimento só é realizado dentro de uma evolução (ver docs/adr/0003).
    constraint ck_procedimento_clinico_realizacao check (
        (status in ('REALIZADO', 'ANULADO')) =
        (evolucao_id is not null and realizado_em is not null and realizado_por is not null)
    ),
    constraint ck_procedimento_clinico_motivo check ((status in ('CANCELADO', 'ANULADO')) = (motivo is not null))
);

create index ix_procedimento_clinico_paciente on procedimento_clinico (paciente_id, status);
create index ix_procedimento_clinico_evolucao on procedimento_clinico (evolucao_id);

create table evolucao_clinica_aud (
    id                uuid     not null,
    rev               bigint   not null references revisao (id),
    revtype           smallint not null,
    paciente_id       uuid,
    autor_id          uuid,
    data_atendimento  date,
    texto             varchar(10000),
    editada_em        timestamptz,
    anulada_em        timestamptz,
    anulada_por       uuid,
    motivo_anulacao   varchar(500),
    primary key (id, rev)
);

create table procedimento_clinico_aud (
    id               uuid     not null,
    rev              bigint   not null references revisao (id),
    revtype          smallint not null,
    paciente_id      uuid,
    procedimento_id  uuid,
    dente            smallint,
    faces            varchar(20),
    arcada           varchar(10),
    status           varchar(10),
    observacao       varchar(500),
    evolucao_id      uuid,
    realizado_em     date,
    realizado_por    uuid,
    motivo           varchar(500),
    primary key (id, rev)
);
