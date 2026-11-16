# CHEI — Landing page

Site estático em HTML, CSS e JavaScript puros. Sem frameworks e sem dependências.

```
index.html               Página
css/styles.css           Design system (tokens no topo) + estilos por secção
css/fonts.css            Fontes alojadas no próprio site (Bodoni Moda, Jost)
js/i18n.js               Traduções em português (Moçambique) + mensagens dinâmicas EN/PT
js/main.js               Idioma, header, menu mobile, animações, favoritos, carrinho, newsletter
assets/img/              Fotografias (WebP)
assets/fonts/            Ficheiros das fontes (woff2)
_headers                 Cabeçalhos HTTP de segurança (Cloudflare Pages / Netlify)
.well-known/security.txt Contacto para reportar problemas de segurança
robots.txt
scripts/build.mjs        Build + verificações de segurança → dist/
.github/workflows/       Publicação automática no GitHub Pages
```

## Correr localmente

```bash
python3 -m http.server 8000      # ou: npm start
# abrir http://localhost:8000
```

## Build

```bash
node scripts/build.mjs           # ou: npm run build
```

Gera a pasta `dist/` (é essa que se publica). O build pára com erro se encontrar:
referências partidas, recursos externos, código inline, links `target="_blank"` sem `noopener`,
`innerHTML`/`eval` no JavaScript, ou uma CSP em falta ou fraca.

## Publicar

**GitHub Pages**
1. Criar um repositório e enviar o projeto para a branch `main`.
2. No repositório: *Settings → Pages → Source: GitHub Actions*.
3. Cada `push` para `main` faz o build e publica automaticamente (`.github/workflows/deploy.yml`).

**Cloudflare Pages** (recomendado: aplica os cabeçalhos de `_headers`)
- Build command: `node scripts/build.mjs`
- Build output directory: `dist`

## Segurança

- **Sem cookies.** O site não cria cookies, por isso não há cookies para roubar via XSS nem banner de cookies obrigatório. O idioma e o carrinho ficam no `localStorage` do próprio dispositivo e nunca saem dele.
- **XSS:** o JavaScript nunca usa `innerHTML`, `eval` ou semelhantes. Todo o conteúdo dinâmico é criado com `textContent`/DOM, e o build verifica isso.
- **Content-Security-Policy estrita** (no `<head>` e em `_headers`): tudo vem do próprio site (`'self'`), sem JS ou CSS inline, sem iframes, sem plugins. Inclui **Trusted Types**, que faz o browser recusar `innerHTML` & co.
- **Zero terceiros:** fontes e imagens estão no próprio site. Nenhum pedido sai para Google ou outros domínios.
- **Dados guardados validados:** o carrinho lido do `localStorage` só aceita produtos que existem na página, quantidades inteiras de 1 a 20 e imagens de `assets/img/`. O idioma só aceita `en` ou `pt`.
- **Newsletter:** o e-mail é limpo (espaços e caracteres de controlo removidos, máx. 254) e validado com regras restritas. Tentativas de injeção (`<script>`, quebras de linha com `Bcc:`) são rejeitadas. Inclui um campo-armadilha (honeypot) contra bots.
- **Links do WhatsApp e e-mail** são montados com `encodeURIComponent`, por isso o conteúdo do carrinho não consegue alterar o destino.
- **Clickjacking:** `frame-ancestors 'none'` + `X-Frame-Options: DENY` em `_headers`; no GitHub Pages (que não envia cabeçalhos), o `main.js` recusa correr dentro de um iframe.
- **Outros cabeçalhos** (`_headers`): HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (câmara, microfone, localização… desligados), `Cross-Origin-Opener-Policy`.
- **GitHub Actions** com permissões mínimas e sem guardar credenciais no checkout.

> O GitHub Pages ignora `_headers`. Lá ficam ativos a CSP via `<meta>` e a proteção anti-iframe em JS, mas não HSTS nem `nosniff` (o GitHub já força HTTPS). Para ter todos os cabeçalhos, use Cloudflare Pages.

## Antes de publicar

- **Fotografias:** as imagens atuais são de stock (Unsplash, uso comercial permitido) e servem de direção visual. Substitua-as por fotografias reais, com os mesmos nomes em `assets/img/`.
- **Preços fictícios, só para testes.** Para mudar um preço, altere no `index.html` o `data-price="4500"` do produto (valor usado pelo carrinho) e o preço visível logo abaixo (`4&nbsp;500&nbsp;MT`).
- **Redes sociais e páginas legais** (Envios, Privacidade, Termos) ainda apontam para `#`.
- **Newsletter:** por agora só valida no browser. Para receber inscrições, defina `action="https://…"` e `method="post"` no `<form>` com o endpoint do fornecedor (Brevo, Mailchimp, Formspree…) e acrescente esse domínio a `form-action` na CSP (no `<head>` **e** em `_headers`).
- **Carrinho:** a encomenda é enviada por WhatsApp (+258 84 227 3769) ou e-mail (chei.purse@gmail.com). Para mudar, edite `ORDER_PHONE` e `ORDER_EMAIL` no topo de `js/main.js`.
- **security.txt** expira a 16/11/2027. Atualize a data antes disso.

## Idiomas (EN / PT)

- O inglês fica escrito diretamente no `index.html`, por isso o site funciona mesmo sem JavaScript.
- O português fica em `js/i18n.js`. Cada texto traduzível tem `data-i18n="chave"` (texto) ou `data-i18n-attr="alt:chave"` (atributos).
- Na primeira visita, o idioma vem do browser. Depois, a escolha do visitante fica guardada.
- A tagline "Handcrafted with care." e o nome CHEI ficam em inglês nos dois idiomas, por serem parte da marca.

## Acessibilidade

HTML semântico, link "Skip to content", menu e carrinho com gestão de foco e Esc para fechar, mensagens anunciadas por `aria-live`. As animações desligam-se quando o sistema pede `prefers-reduced-motion`.
