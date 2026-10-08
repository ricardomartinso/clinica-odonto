-- DADOS FICTÍCIOS, carregados apenas no perfil "dev".
-- Senha de todos os usuários: clinica123
-- Idempotente: IDs fixos + ON CONFLICT. Para recriar do zero: docker compose down -v

insert into usuario (id, nome, email, senha_hash, papel, cro_numero, cro_uf, ativo, versao, criado_em, atualizado_em)
values
    ('01900000-0000-7000-8000-000000000001', 'Dra. Helena Duarte', 'helena@clinica.test',
     '{bcrypt}$2a$10$gTgvJ9Hax2WMcfGpnpzwkeFkhta2uaOQBaOQwanIIZlp1FIXqjEy2', 'DENTISTA', '90001', 'SP', true, 0, now(), now()),
    ('01900000-0000-7000-8000-000000000002', 'Dr. Rafael Moreira', 'rafael@clinica.test',
     '{bcrypt}$2a$10$gTgvJ9Hax2WMcfGpnpzwkeFkhta2uaOQBaOQwanIIZlp1FIXqjEy2', 'DENTISTA', '90002', 'SP', true, 0, now(), now()),
    ('01900000-0000-7000-8000-000000000003', 'Camila Recepção', 'recepcao@clinica.test',
     '{bcrypt}$2a$10$gTgvJ9Hax2WMcfGpnpzwkeFkhta2uaOQBaOQwanIIZlp1FIXqjEy2', 'RECEPCAO', null, null, true, 0, now(), now())
on conflict (id) do nothing;
