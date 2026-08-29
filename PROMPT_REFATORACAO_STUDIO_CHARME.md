# Prompt — Refatoração completa do Studio Charme

Você é um engenheiro de software sênior responsável por refatorar e evoluir o site **Studio Charme**, atualmente publicado em:

`https://luarafael.github.io/studio-charme/`

O projeto atual é um site estático. Transforme-o em uma aplicação moderna e responsiva que reúna:

1. site público institucional e comercial;
2. agendamento on-line integrado ao WhatsApp;
3. área interna autenticada para as três profissionais;
4. gestão de clientes, agenda e histórico de atendimentos;
5. dashboard financeiro básico para substituir controles em caderno.

Não produza apenas telas demonstrativas. Implemente persistência real, autenticação, autorização, validações, regras de negócio, testes e tratamento de erros.

## Objetivo principal

Refazer completamente o frontend com aparência contemporânea e sofisticada de salão de beleza, preservando a identidade visual do Studio Charme — marrom escuro, dourado e branco — e reutilizando a logo, o favicon e as imagens reais já existentes. Modernize composição, tipografia, espaçamento, hierarquia, navegação, microinterações, acessibilidade e responsividade sem descaracterizar a marca.

O sistema deve permitir que **Lívia, Cibele e Clarisse** entrem com contas individuais e totalmente isoladas. Cada profissional deve acessar somente seus próprios clientes, agendamentos, horários, atendimentos, movimentações financeiras, indicadores e dashboard. Uma funcionária nunca poderá consultar, alterar, inferir ou exportar dados de outra, mesmo alterando URLs, IDs, filtros ou requisições da API.

## Stack obrigatória

- React com TypeScript;
- Vite;
- Tailwind CSS;
- React Router;
- TanStack Query para estado assíncrono e cache;
- React Hook Form + Zod para formulários e validação;
- API REST em Node.js + TypeScript + Fastify;
- Prisma ORM com migrations;
- PostgreSQL no Neon;
- autenticação por sessão segura em cookie `HttpOnly`, `Secure` e `SameSite`;
- Argon2id para hash de senhas;
- armazenamento de imagens e comprovantes em serviço de objetos compatível com S3, configurável por variáveis de ambiente;
- Vitest + React Testing Library;
- Playwright para os principais fluxos de ponta a ponta;
- ESLint e Prettier;
- date-fns com locale `pt-BR`;
- ícones acessíveis, preferencialmente Lucide React;
- deploy do frontend na Vercel;
- API e jobs hospedados no Railway;
- PostgreSQL gerenciado no Neon.

O frontend nunca deve conectar diretamente ao Neon. Toda leitura e escrita privada deve passar pela API do Railway. Não exponha `DATABASE_URL`, segredos de sessão, credenciais de e-mail ou armazenamento no frontend. Configure CORS apenas para as origens autorizadas e use conexão PostgreSQL com SSL e pooling compatível com Neon.

Utilize um monorepo, preferencialmente com pnpm workspaces:

```text
apps/
  web/       # React, TypeScript e Tailwind
  api/       # Fastify, TypeScript e Prisma
packages/
  contracts/ # schemas Zod, DTOs e tipos compartilhados seguros
  config/    # configurações compartilhadas de lint e TypeScript
```

## Estrutura e qualidade do código

Organize por funcionalidades, evitando componentes gigantes:

```text
src/
  app/
  components/
  features/
    auth/
    appointments/
    clients/
    professionals/
    services/
    finance/
    reports/
  layouts/
  lib/
  pages/
  routes/
  schemas/
  types/
  utils/
```

Requisitos de engenharia:

- componentes pequenos, reutilizáveis e acessíveis;
- regras de negócio fora dos componentes visuais;
- tipagem estrita, sem `any` desnecessário;
- funções puras quando possível;
- estados de carregamento, vazio, sucesso e erro;
- Error Boundary;
- nenhuma credencial ou profissional codificado diretamente na interface;
- migrations e seed separados;
- commits convencionais por etapa;
- cada funcionalidade nova deve preservar o comportamento já validado;
- não misturar valores monetários em `float`; armazenar em centavos (`integer`/`bigint`) ou tipo decimal apropriado;
- datas e horários devem respeitar `America/Fortaleza`.
- a API deve seguir organização modular em `routes`, `controllers`, `services`, `repositories`, `schemas` e `plugins`;
- regras de negócio não devem ficar nas rotas ou nos componentes React;
- valide todas as entradas novamente na API;
- publique documentação OpenAPI/Swagger somente em ambiente protegido ou de desenvolvimento;
- implemente endpoint de saúde para o Railway sem revelar dados sensíveis.

## Perfis, isolamento e permissões

Implemente autenticação individual e isolamento obrigatório por `professionalId`.

### `PROFESSIONAL`

- acessa somente sua própria conta e seu perfil;
- possui dashboard individual, calculado apenas com seus registros;
- visualiza e gerencia somente seus próprios agendamentos;
- visualiza somente clientes vinculadas aos seus atendimentos ou cadastradas por ela;
- configura sua disponibilidade, folgas e bloqueios;
- registra conclusão, cancelamento e ausência apenas em seus atendimentos;
- registra pagamentos, despesas e ajustes apenas em seu próprio financeiro;
- consulta somente seus indicadores, receitas, despesas, saldo, comissões e histórico;
- não visualiza nem mesmo nomes, telefones, observações, valores ou detalhes de horários das outras profissionais;
- não escolhe outro `professionalId` em filtros ou payloads privados.

Caso seja necessário um usuário proprietário ou administrador no futuro, implemente-o como uma função separada e documentada, nunca atribuindo esse poder automaticamente a Lívia, Cibele ou Clarisse. Não permita acesso cruzado entre profissionais sem uma mudança explícita de requisito e de permissão.

Implemente o isolamento obrigatoriamente na camada de serviço da API. O `professionalId` das operações privadas deve ser obtido da sessão autenticada, nunca aceito como fonte de verdade do frontend. Todas as consultas, alterações, exclusões, relatórios, exportações e agregações financeiras devem incluir o escopo da profissional autenticada. Esconder menus ou botões não é segurança suficiente. Quando viável, reforce o isolamento com políticas, constraints ou usuários restritos no PostgreSQL.

Crie perfis iniciais para Lívia, Cibele e Clarisse por seed/configuração segura, sem senhas fixas no repositório. O primeiro acesso deve usar convite ou recuperação de senha.

## Banco de dados

Modele, no mínimo, as seguintes entidades:

### `profiles`

- id ligado ao usuário autenticado;
- nome;
- telefone;
- avatar;
- função (`PROFESSIONAL` por padrão; `ADMIN` somente se um proprietário separado for criado futuramente);
- status ativo/inativo;
- timestamps.

### `clients`

- nome;
- telefone/WhatsApp;
- data de nascimento opcional;
- observações;
- consentimento para contato;
- `professionalId` proprietário obrigatório;
- profissional que cadastrou;
- timestamps;
- campo de arquivamento, evitando exclusão acidental.

Evite duplicidade de clientes pelo mesmo telefone normalizado, com tratamento para cadastro sem telefone.

A mesma pessoa pode ser cliente de mais de uma profissional, mas cada profissional mantém seu próprio vínculo, observações e histórico. Não revele que a cliente existe na área de outra profissional.

### `services`

- nome;
- descrição;
- categoria;
- duração em minutos;
- preço em centavos;
- status ativo/inativo;
- profissional ou profissionais habilitadas;
- percentual ou valor de comissão opcional;
- imagem opcional.

### `professional_services`

Relacionamento entre profissionais e serviços, permitindo preço, duração e comissão específicos por profissional quando necessário.

### `business_hours`

- dia da semana;
- horário inicial e final;
- intervalo;
- status de funcionamento.

### `professional_availability`

- profissional;
- data ou recorrência;
- início e fim;
- tipo: disponibilidade extra, folga, intervalo ou bloqueio;
- motivo opcional.

### `appointments`

- cliente;
- profissional;
- serviço;
- início e término;
- preço acordado em centavos;
- status: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`;
- origem: site, WhatsApp, presencial ou interna;
- observações internas;
- observação enviada pela cliente;
- usuário criador;
- timestamps.

Impeça, no banco ou em transação segura, conflitos de horários para a mesma profissional. Considere a duração do serviço, intervalos e bloqueios. Não permita agendamento no passado.

### `payments`

- agendamento;
- cliente;
- profissional;
- valor em centavos;
- método: dinheiro, Pix, débito, crédito ou outro;
- status: pendente, pago, parcial, estornado;
- data do pagamento;
- observação;
- usuário responsável pelo registro.

Permita pagamentos parciais, sem que a soma ultrapasse o valor devido, salvo ajuste administrativo explícito e auditado.

### `expenses`

- descrição;
- categoria;
- valor em centavos;
- vencimento;
- data do pagamento;
- status;
- profissional relacionada opcional;
- comprovante opcional;
- usuário criador.

### `audit_logs`

Registre operações sensíveis: alteração de agendamento, cancelamento, mudança de preço, pagamento, estorno, despesa e alteração de permissão. Guarde usuário, ação, entidade, identificador, valores relevantes antes/depois e data.

Crie migrations Prisma, índices, chaves estrangeiras e constraints. Quando uma regra crítica não puder ser expressa adequadamente pelo Prisma, crie uma migration SQL complementar e documentada. Utilize exclusão lógica quando for importante preservar histórico financeiro.

## API e autenticação

A API é obrigatória nesta arquitetura e será hospedada no Railway. Implemente:

- endpoints REST versionados em `/api/v1`;
- autenticação por sessão persistida no banco;
- cookie seguro e inacessível ao JavaScript;
- proteção CSRF apropriada para requisições mutáveis;
- rotação e revogação de sessões;
- logout de uma sessão e de todas as sessões;
- recuperação de senha com token único, aleatório, com hash no banco e expiração curta;
- convite para o primeiro acesso das profissionais;
- limite de tentativas em login, recuperação e agendamento público;
- autorização por função e por propriedade/escopo do recurso;
- respostas de erro padronizadas, sem expor stack trace ou existência indevida de contas;
- paginação, ordenação e filtros validados;
- idempotência na criação pública de agendamentos e no registro de pagamentos;
- transações para agendamento, conclusão, pagamento, estorno e fechamento;
- logs estruturados com identificador de requisição, sem dados pessoais desnecessários;
- desligamento gracioso e tratamento centralizado de erros;
- jobs agendados no Railway quando forem necessários para lembretes ou manutenção.

Não implemente autenticação com token em `localStorage`. Não armazene senha reversível. O seed não deve conter senhas reais. Convites e recuperação devem usar provedor de e-mail configurável; em desenvolvimento, forneça uma alternativa segura que não envie mensagens reais.

## Site público

Não faça apenas uma conversão do HTML atual para JSX. Reprojete o frontend com técnicas de UI/UX, preservando obrigatoriamente:

- logo oficial atual, sem redesenhar ou substituir;
- favicon atual;
- paleta principal marrom escuro, dourado e branco;
- imagens reais já utilizadas no site;
- contatos e links reais existentes.

Antes de alterar os assets, inventarie os arquivos existentes, identifique logo, favicon e imagens e reutilize seus caminhos ou migre-os sem perda. Não use imagens genéricas ou geradas para substituir as atuais. Otimize cópias para WebP/AVIF, mas preserve os arquivos originais no projeto.

### Direção visual moderna

- estética premium, acolhedora, feminina e profissional, sem excesso de enfeites;
- layout editorial com bastante respiro e hierarquia clara;
- tipografia elegante para títulos e fonte altamente legível para textos e interfaces;
- sistema consistente de espaçamentos, grid, raios, sombras e estados interativos;
- dourado usado como destaque, não como cor dominante em textos longos;
- cards modernos para profissionais e serviços;
- fotografias valorizadas com recortes consistentes e `object-position` ajustado;
- transições discretas entre 150 e 250 ms;
- feedback visual de hover, foco, ativo, desabilitado e carregamento;
- header transparente sobre o hero quando legível e sólido após rolagem;
- menu mobile acessível;
- CTAs claros e repetidos nos pontos de decisão;
- evitar carrosséis automáticos, excesso de animações, glassmorphism exagerado e elementos apenas decorativos que prejudiquem desempenho;
- criar design tokens no Tailwind para cores, tipografia, espaçamento, sombras, raios e breakpoints;
- garantir consistência entre o site público, login e dashboards, adaptando densidade e componentes ao contexto administrativo.

Crie primeiro um pequeno inventário visual e um design system com tokens e componentes fundamentais: `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `Modal`, `Drawer`, `Tabs`, `Table`, `EmptyState`, `Skeleton`, `Alert`, `Toast`, `DatePicker` e componentes de agenda. Não copie visualmente outras marcas.

Refatore o conteúdo atual mantendo a identidade da marca e corrigindo:

- “Inicio” para “Início”;
- “Conheça nosso Serviços” para “Conheça nossos Serviços”;
- “Cilios” para “Cílios”;
- completar a descrição de Clarisse para “Clarisse é especialista em cílios, sobrancelhas e depilação...”;
- padronizar capitalização de nomes próprios;
- gerar o ano do rodapé automaticamente.

### Página inicial

Inclua:

- cabeçalho responsivo;
- hero com proposta clara e CTA “Agendar agora”;
- seção sobre o Studio Charme;
- cards individuais de Lívia, Cibele e Clarisse com foto, especialidades e botão de agendamento;
- cards de serviços com imagem otimizada, nome, profissional, duração, preço inicial e CTA;
- galeria de trabalhos;
- Instagram;
- endereço completo configurável;
- horário de funcionamento;
- mapa ou link para Google Maps;
- contatos;
- botão flutuante de WhatsApp no celular;
- Política de Privacidade e Termos de Uso.

Não invente endereço, preços, horários, fotos ou biografias. Centralize essas informações em dados configuráveis e use marcadores claros até serem fornecidas.

## Agendamento público

Crie um fluxo em etapas:

1. selecionar serviço;
2. selecionar profissional compatível ou “qualquer disponível”;
3. selecionar data;
4. consultar horários realmente disponíveis no banco;
5. informar nome, WhatsApp e observação opcional;
6. revisar dados;
7. criar solicitação de agendamento;
8. oferecer confirmação ou continuidade pelo WhatsApp.

Regras:

- o botão do WhatsApp deve gerar uma mensagem com cliente, serviço, profissional, data e horário;
- informe claramente se o agendamento está pendente ou confirmado;
- enviar mensagem pelo WhatsApp não deve, sozinho, significar confirmação definitiva;
- horários devem ser calculados usando duração, jornada, intervalo, folgas, bloqueios e outros agendamentos;
- impedir cliques repetidos e criação duplicada;
- validar telefone brasileiro;
- incluir consentimento e link para a Política de Privacidade;
- nunca exibir agenda interna ou dados de outras clientes;
- opcionalmente usar link/token seguro para a cliente consultar ou solicitar cancelamento, sem expor IDs sequenciais.

## Área autenticada

Crie uma única rota de login segura, com identidade visual do Studio Charme. Após autenticar, redirecione a profissional para sua área individual. Não crie segurança baseada em três URLs ou três frontends separados; o isolamento deve vir da sessão e da API.

Crie layout responsivo com sidebar no desktop e navegação adequada no celular. O cabeçalho deve mostrar nome e avatar da profissional autenticada, deixando claro em qual conta ela está. As rotas podem seguir `/app/dashboard`, `/app/agenda`, `/app/clientes` e `/app/financeiro`, sem incluir ou confiar em IDs de profissionais enviados pela URL.

Se uma sessão tentar acessar um registro de outra profissional, a API deve responder de forma segura com `404` ou `403`, conforme a política definida, sem confirmar a existência do registro. O frontend deve exibir uma página de acesso negado ou recurso não encontrado sem revelar dados.

### Dashboard

Cada dashboard é individual. Exiba somente dados pertencentes à profissional autenticada:

- atendimentos de hoje;
- próximos agendamentos;
- confirmações pendentes;
- cancelamentos e ausências;
- receita recebida no dia, semana e mês;
- valores pendentes;
- ticket médio;
- serviços mais realizados;
- clientes atendidas no período;
- despesas e saldo do período;
- comissões estimadas e pagas.

Não confundir faturamento, recebimento, lucro e comissão. Identifique cada indicador claramente.

### Agenda

- visualização diária, semanal e mensal;
- filtros por serviço e status, sempre dentro da conta autenticada;
- criação e edição de agendamento;
- bloqueio manual de horário;
- detecção de conflito;
- ações rápidas: confirmar, iniciar, concluir, cancelar e marcar ausência;
- cores por status e serviço com legenda acessível, sem depender somente de cor;
- lista otimizada para celular;
- busca por cliente;
- histórico das alterações do agendamento.

### Clientes

- cadastro e edição;
- busca por nome ou telefone;
- histórico de atendimentos;
- serviços realizados;
- profissional que atendeu;
- valores pagos e pendentes;
- observações internas;
- próxima visita;
- clientes inativas ou que não retornam há determinado período;
- exportação autorizada em CSV;
- arquivamento e restauração.

Proteja observações internas e dados pessoais conforme as permissões.

### Financeiro

- contas recebidas e pendentes;
- pagamentos parciais;
- receitas por período, serviço e método de pagamento da profissional autenticada;
- cadastro de despesas;
- fluxo de caixa simples;
- comissão individual da profissional autenticada;
- fechamento diário e mensal;
- filtros por período;
- resumo e relatórios exportáveis;
- registro de estorno e ajuste com motivo obrigatório;
- auditoria das alterações.

Este módulo é de controle gerencial e não deve ser apresentado como substituto de contabilidade fiscal.

### Serviços e configurações

- CRUD de serviços;
- associação dos serviços à profissional autenticada;
- preço, duração, comissão e status;
- horários de funcionamento;
- disponibilidade individual;
- folgas, feriados e bloqueios;
- seus contatos e redes sociais;
- preferências de visualização da própria agenda.

## UX, acessibilidade e design

- mobile-first;
- preservar marrom, dourado e branco com contraste WCAG AA;
- não usar dourado claro sobre fundo branco sem contraste suficiente;
- navegação completa por teclado;
- foco visível;
- labels associados aos campos;
- modal com `role="dialog"`, foco preso, retorno de foco e fechamento com `Esc`;
- botões fora de formulário devem usar `type="button"`;
- feedback com mensagens claras, sem depender apenas de toast;
- confirmação antes de cancelamentos, estornos e alterações financeiras sensíveis;
- skeletons e estados vazios úteis;
- tabelas adaptadas para cartões no celular;
- respeitar `prefers-reduced-motion`;
- utilizar textos em português do Brasil.

## SEO e desempenho

- `title` e `meta description` exclusivos;
- favicon;
- Open Graph e Twitter Cards;
- URL canônica;
- sitemap e robots.txt;
- dados estruturados `BeautySalon`/`LocalBusiness` quando as informações reais estiverem disponíveis;
- imagens em WebP ou AVIF;
- dimensões explícitas nas imagens;
- `loading="lazy"` abaixo da dobra;
- `srcset`/imagens responsivas;
- lazy loading das rotas internas;
- evitar carregar imagens duplicadas da galeria;
- meta description sugerida, adaptável à localização real: “Studio Charme: unhas, cabelos, cílios, sobrancelhas e cuidados de beleza. Conheça nossos serviços e agende seu atendimento pelo WhatsApp.”

Todos os links com `target="_blank"` devem usar `rel="noopener noreferrer"`.

## Segurança e LGPD

- aplicar autenticação e autorização em todos os endpoints privados;
- nunca confiar no `role`, `professionalId`, valores financeiros ou permissões enviados pelo cliente;
- validar dados no frontend e no banco/servidor;
- proteger rotas autenticadas;
- limitar tentativas de autenticação quando aplicável;
- não registrar tokens, senhas, telefones completos ou observações pessoais em logs técnicos;
- usar variáveis de ambiente com `.env.example` sem segredos;
- coletar apenas dados necessários;
- registrar consentimento para contato;
- permitir correção, exportação e arquivamento de dados por processo administrativo;
- definir política de retenção e exclusão/anônimização;
- impedir acesso indevido por URL ou ID alterado manualmente, sempre filtrando recursos pelo escopo do usuário autenticado na API;
- configurar headers de segurança na hospedagem;
- manter backups e procedimento documentado de restauração.

## Relatórios

Implemente relatórios filtráveis por período:

- agenda e atendimentos;
- receitas recebidas e pendentes;
- despesas;
- fluxo de caixa;
- serviços mais realizados;
- métodos de pagamento;
- comissões;
- desempenho individual da profissional autenticada;
- clientes novas, recorrentes e inativas;
- cancelamentos e ausências.

Permita exportação CSV e impressão/PDF somente para usuários autorizados. Os totais dos relatórios devem ser calculados a partir dos registros persistidos, sem valores simulados.

## Testes obrigatórios

### Unitários

- cálculo de duração e término;
- cálculo de disponibilidade;
- detecção de conflito;
- total devido, pagamentos parciais e saldo;
- comissão;
- receita, despesa e saldo;
- validações de data, telefone e valores.

### Integração

- criação e atualização de cliente;
- criação de agendamento válido;
- rejeição de conflito;
- políticas de acesso por perfil;
- conclusão do atendimento e registro de pagamento;
- cancelamento, estorno e auditoria.

### E2E

- visitante solicita um agendamento;
- profissional entra e consulta sua agenda;
- profissional conclui atendimento e registra pagamento;
- admin consulta financeiro geral;
- Lívia não acessa agendamentos, clientes, financeiro ou dashboard de Cibele e Clarisse;
- Cibele não acessa dados de Lívia e Clarisse;
- Clarisse não acessa dados de Lívia e Cibele;
- tentativas de trocar IDs em URL, query string, body e chamadas diretas à API são bloqueadas;
- agregações, busca, autocomplete, relatórios e exportações não vazam dados cruzados;
- layout essencial funciona em desktop e celular.

Não considere a tarefa concluída com testes ignorados ou mocks que não validem as regras principais.

## Migração do site atual

- inventariar textos, imagens, links e contatos existentes;
- preservar URLs legais existentes ou criar redirects;
- migrar imagens para armazenamento organizado e otimizado;
- manter os contatos reais das três profissionais;
- não alterar números, perfis sociais ou conteúdo real sem confirmação;
- criar script opcional para importar clientes e agendamentos caso os dados do caderno sejam digitados em CSV;
- criar modelo CSV documentado para importação, validando duplicidades e erros antes de confirmar.

## Etapas de implementação

Execute em fases pequenas e verificáveis:

1. auditoria do projeto atual, definição da arquitetura e configuração;
2. design system e refatoração do site público;
3. banco Neon, migrations, seed, API, autenticação e autorização;
4. profissionais, serviços e disponibilidade;
5. clientes;
6. agenda interna e prevenção de conflitos;
7. agendamento público e WhatsApp;
8. pagamentos, despesas, comissões e dashboard;
9. relatórios e exportações;
10. acessibilidade, SEO, desempenho e segurança;
11. testes, documentação, homologação e deploy.

Ao terminar cada fase:

- execute lint, verificação de tipos e testes;
- corrija falhas antes de avançar;
- mostre arquivos criados ou alterados;
- explique migrations e regras adicionadas;
- gere um commit convencional sugerido;
- não faça push ou deploy sem autorização explícita;
- não refatore partes não relacionadas sem necessidade.

## Critérios de aceite

O projeto somente estará pronto quando:

- as três profissionais possuírem acesso individual seguro;
- cada conta possuir dashboard, agenda, clientes e financeiro próprios;
- nenhuma profissional conseguir acessar ou inferir dados das outras por interface ou API;
- logo, favicon, cores e imagens existentes forem preservados;
- o frontend tiver sido reprojetado com design system moderno e responsivo, e não apenas convertido para React;
- agenda e clientes forem persistidos no banco;
- conflitos de horário forem impedidos;
- o site público consultar disponibilidade real;
- atendimentos possuírem histórico e status;
- pagamentos e despesas alimentarem o financeiro corretamente;
- permissões forem aplicadas na API e, quando viável, reforçadas no banco, nunca apenas na interface;
- dashboard e relatórios utilizarem dados reais;
- o fluxo funcionar no celular;
- não houver erros de TypeScript, lint ou testes;
- migrations, conexão Neon, API Railway e setup estiverem documentados;
- variáveis de ambiente estiverem no `.env.example` sem segredos;
- existir README com instalação, execução, testes, seed, deploy, backup e recuperação;
- o sistema tiver estados de erro e carregamento adequados;
- as informações atuais do Studio Charme forem preservadas e os textos identificados forem corrigidos.

## Entregáveis

- código-fonte completo;
- schema Prisma, migrations e regras de autorização da API;
- seed seguro sem senhas reais;
- testes automatizados;
- `.env.example`;
- README técnico e guia simples para as profissionais;
- modelo CSV para importação inicial;
- checklist de homologação;
- documentação resumida das permissões;
- instruções de deploy na Vercel, Railway e Neon, incluindo rollback;
- lista de decisões ou informações reais ainda necessárias, como endereço, horários, preços, comissões e fotos.

## Regras obrigatórias de Git para o Cursor

Estas regras fazem parte do prompt e devem ser obedecidas durante toda a implementação no monorepo do Studio Charme:

- `apps/web`: React, TypeScript, Tailwind CSS e Vite;
- `apps/api`: Node.js, TypeScript, Fastify e Prisma;
- `packages/contracts`: schemas Zod, DTOs e tipos compartilhados;
- banco PostgreSQL no Neon;
- API hospedada no Railway;
- frontend hospedado na Vercel.

### Conventional Commits

- Use Conventional Commits em português: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `style:`, `build:` e `ci:`.
- Escreva mensagem curta, em uma linha e com descrição direta do resultado.
- Use corpo somente quando ele acrescentar contexto importante.
- Quando ajudar a identificar a área, use os escopos `web`, `api`, `db`, `auth`, `agenda`, `clientes`, `financeiro`, `ui`, `seo`, `deploy` ou `docs`.
- Cada commit deve representar uma mudança coesa.
- Não misture refatoração visual, migration, autenticação e financeiro no mesmo commit sem necessidade.
- Não utilize mensagens vagas como `ajustes`, `mudanças`, `update` ou `correções gerais`.

Exemplos permitidos:

```text
feat(web): modernizar hero mantendo identidade do Studio Charme
feat(auth): isolar dados pela profissional autenticada
feat(agenda): impedir conflito de horários da profissional
feat(financeiro): adicionar fechamento diário individual
fix(api): bloquear acesso a clientes de outra profissional
fix(db): aplicar escopo profissional nas consultas financeiras
perf(web): otimizar galeria com imagens WebP responsivas
test(auth): validar isolamento entre Lívia, Cibele e Clarisse
docs(deploy): documentar Neon, Railway e Vercel
```

### Segurança antes de commits

- Nunca commitar `.env`, `.env.local`, `DATABASE_URL`, segredos de sessão ou credenciais do Neon, Railway, Vercel, e-mail ou armazenamento.
- Nunca commitar dados reais de clientes, telefones, observações, agendamentos ou valores financeiros usados em testes locais.
- Seeds e fixtures devem usar dados fictícios e nenhuma senha real.
- Não commitar arquivos gerados, logs, cobertura ou builds, salvo quando o projeto exigir explicitamente.
- Não usar `--no-verify` para ignorar lint, testes ou hooks sem autorização explícita.
- Antes de sugerir ou criar um commit, executar as verificações relevantes: lint, typecheck e testes.
- Alterações no schema Prisma devem incluir a migration correspondente.
- Alterações de autenticação ou autorização devem incluir testes que comprovem que uma profissional não acessa dados das outras.

### Proibições

- Nunca incluir `Co-authored-by:` de Cursor, Copilot ou qualquer agente no commit.
- Nunca usar `--trailer "Co-authored-by:..."`.
- Nunca reescrever histórico com `filter-branch`, rebase forçado ou amend de commits já enviados apenas para remover coautoria; evite o trailer desde o início.
- Nunca usar `git push --force` ou `--force-with-lease` sem explicar o impacto e receber autorização explícita.

### Procedimento para commit

1. Só criar commit quando o usuário pedir explicitamente.
2. Revisar `git status` e o diff antes de adicionar arquivos.
3. Adicionar somente arquivos relacionados à tarefa.
4. Não incluir alterações preexistentes do usuário que não façam parte da solicitação.
5. Executar lint, typecheck e testes relevantes e informar qualquer falha.
6. Usar `git commit -m "mensagem"`, somente com a mensagem e sem trailers extras.
7. No PowerShell, usar aspas simples ou `-m "texto"` diretamente; não usar heredoc.
8. Evitar `git add .` quando existirem alterações não relacionadas; usar caminhos explícitos.

### Push e deploy

- Não fazer push para `main` sem pedido explícito.
- Não fazer deploy na Vercel ou Railway como consequência automática de commit ou push sem autorização explícita.
- Se for necessário reescrever histórico, explicar o motivo, os riscos e pedir confirmação antes de agir.
- Ao concluir cada fase, apenas sugira a mensagem convencional de commit; não execute commit, push ou deploy automaticamente.

## Forma de trabalhar

Antes de implementar, analise o repositório existente e apresente:

1. diagnóstico curto da estrutura atual;
2. arquivos que serão preservados;
3. plano por fases;
4. modelo inicial do banco;
5. riscos e decisões pendentes.

Depois, inicie pela primeira fase sem apagar o projeto existente. Preserve a lógica útil, mantenha commits pequenos e não use dados fictícios como se fossem definitivos. Quando faltar uma decisão comercial que mude regras importantes — por exemplo, comissão, visibilidade entre profissionais ou confirmação automática — implemente uma configuração segura ou pare e solicite a informação necessária.
