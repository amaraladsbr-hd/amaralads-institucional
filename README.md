# amaral.ads — Landing + Portal local

Projeto **local** (sem build). Servir a pasta `lp/` por HTTP.

## Rodar

```bash
cd lp
python3 -m http.server 8080
```

- Site: http://localhost:8080/
- Bio / Linktree: http://localhost:8080/bio/
- Admin CRM: http://localhost:8080/admin/

**Login admin:** `adminamaral` / `_Maralleads`

## O que tem aqui

| Caminho | Função |
|---|---|
| `index.html` | Landing page + formulário de diagnóstico |
| `admin/` | Portal: dashboard, Kanban CRM, lista, configurações |
| `assets/storage.js` | localStorage (leads, settings, UTMs, auth) |
| `assets/tracking.js` | GTM / GA4 / Meta Pixel |
| `assets/app.js` | Lógica da LP |
| `robots.txt` / `sitemap.xml` / `manifest.webmanifest` | SEO / PWA leve |
| `DEPLOY-ANTIGRAVITY.md` | Prompt para publicar com Supabase |

## Contatos padrão

- E-mail: amaral.ads.br@gmail.com
- Instagram: https://www.instagram.com/amaral.ads.br/
- WhatsApp: 5531994954607 (numero real da Amaral Ads, usado provisoriamente pra tudo)

## Pesquisa de mercado / SEO

Ver `../docs/pesquisa-mercado-seo.md`.
