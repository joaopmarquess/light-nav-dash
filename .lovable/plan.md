# Administração de usuários e acessos no AXIS

## Tela de Configurações
- **Usuários:** nome, e-mail, perfil (Comum ou Máster), situação (Convite pendente, OK ou Bloqueado), cadastro e edição.
- Dênis permanece como administrador principal; somente ele acessa Configurações. Outros usuários Máster acessam todos os demais menus.
- **Permissões:** selecionar um usuário pelo e-mail e autorizar menus/submenus numa árvore com setas para expandir e recolher. Selecionar o menu marca seus submenus; autorizações parciais exibem apenas os filhos permitidos.
- Usuários comuns sem permissões não acessam menus. Botão Salvar confirma as alterações.

## Convite sem envio de e-mail
- Ao cadastrar o usuário, gerar um link individual com validade e botão **Copiar link** para Dênis compartilhar manualmente.
- O destinatário abre uma página do AXIS para definir e confirmar sua própria senha.
- O link será secreto e destinado somente à pessoa convidada; não será um link público de cadastro livre.
- Após a senha ser definida e a conclusão validada, o usuário aparece como **OK**. Abrir o convite sozinho não conclui o cadastro.
- Links inválidos ou expirados exibem erro; Dênis pode gerar outro convite.
- Avisos por e-mail ficam para a próxima etapa, após a ativação do domínio. Nenhum remetente genérico será necessário para este fluxo.

## Proteção dos acessos
- Gravar perfis e permissões com validação no servidor, sem confiar em informações editáveis no navegador.
- Proteger Configurações, ações administrativas e navegação, inclusive atalhos da Home e telas acessadas diretamente.
- Preservar os acessos de Dênis e impedir que outro usuário conceda privilégios a si mesmo.
- Ajustar os serviços próprios do AXIS para verificar os acessos correspondentes.

## Limitação importante: dados da Hostinger
As telas atuais consultam a Hostinger diretamente usando uma conexão de leitura independente da conta do AXIS. Esconder um menu não revoga essa conexão. A administração de usuários poderá funcionar aqui, mas a proteção completa dos dados externos exige também restringir essa leitura na Hostinger e usar consultas intermediadas com permissões. Não apresentar a ocultação de menus como proteção completa dos dados; identificar as alterações externas necessárias sem modificar as regras financeiras nem as consultas de negócio.

## Detalhes técnicos
- Reutilizar o login e os perfis existentes; separar papéis protegidos e permissões dos dados pessoais.
- Centralizar o catálogo de navegação para a tela administrativa e os filtros de acesso usarem os mesmos identificadores.
- Gerar convites por uma função autenticada usando os recursos administrativos de autenticação, sem enviar e-mail ou expor chaves privadas.
- Reaproveitar a página de definição de senha e validar a conclusão do convite no servidor.
- Remover a exceção de convite sem autenticação existente na função antiga.

## Conferência
- Testes de administrador principal, Máster sem Configurações, usuário comum sem acesso e autorização parcial de submenus.
- Conferir cadastro, edição, gravação e releitura de permissões com a conta de Dênis.
- Conferir convite por link, definição de senha, situação OK e entrada com os acessos autorizados usando uma conta de teste; descartar seus dados ao terminar.
- Sem publicação automática.
