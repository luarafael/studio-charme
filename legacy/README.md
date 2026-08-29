# Site estático original (arquivo histórico)

Esta pasta guarda a versão original do site do Studio Charme, exatamente como
estava publicada em `https://luarafael.github.io/studio-charme/` antes da
refatoração. Os arquivos foram movidos com `git mv`, então todo o histórico de
commits continua acessível.

| Arquivo                          | Papel original                      |
| -------------------------------- | ----------------------------------- |
| `index.html`                     | página única do site                |
| `style.css`                      | estilos                             |
| `script.js`                      | modal de agendamento e voltar ao topo |
| `politica_privacidade_final.html`| Política de Privacidade             |
| `termos_uso_final.html`          | Termos de Uso                       |
| `.nojekyll`                       | desativa o Jekyll no GitHub Pages   |

## Imagens

As imagens **não** estão duplicadas aqui. Os arquivos originais foram movidos
para `apps/web/public/assets/`, que agora é o único local canônico, e por isso as
referências relativas deste HTML não resolvem mais ao abrir os arquivos direto no
navegador. Nenhuma imagem foi substituída, redesenhada ou recomprimida com perda.

## Por que manter

- Serve de referência para conferir textos, contatos e links reais durante a migração.
- Permite comparar o resultado da refatoração com o conteúdo aprovado anteriormente.

Esta pasta está fora do lint, do Prettier e do build. Não é publicada e não deve
receber novas alterações: correções de conteúdo vão para `apps/web`.

## URLs preservadas

As páginas legais tinham endereços próprios no GitHub Pages. A aplicação nova
responde nos caminhos abaixo e mantém redirecionamento dos antigos:

| URL antiga                        | URL nova                     |
| --------------------------------- | ---------------------------- |
| `politica_privacidade_final.html` | `/politica-de-privacidade`   |
| `termos_uso_final.html`           | `/termos-de-uso`             |
