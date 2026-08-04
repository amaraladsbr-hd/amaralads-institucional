# Prompt de publicação — amaral.ads (Anti-Gravity / Cursor)

Use este documento quando for **publicar** o portal. Hoje tudo roda **100% local** no navegador (`localStorage`). Em produção isso NÃO é seguro nem suficiente para receber leads de visitantes reais.

---

## Prompt pronto para colar no Anti-Gravity

```
Você vai publicar o portal amaral.ads que hoje está em:
squads/amaral-ads/clientes/amaral-ads/lp/

Estado atual (local):
- LP estática em index.html com form de diagnóstico
- CRM Kanban em /admin (login local adminamaral)
- Persistência em localStorage (leads, settings, UTMs)
- Tracking GTM/GA4/Meta Pixel configurável no admin (só IDs públicos)
- SEO: title/description/OG/JSON-LD/favicon/robots/sitemap modelo
- E-mail: amaral.ads.br@gmail.com
- Instagram: https://www.instagram.com/amaral.ads.br/
- Pesquisa de mercado em ../docs/pesquisa-mercado-seo.md

TAREFA: migrar para produção com backend seguro.

1) Stack sugerida
- Frontend: manter HTML/JS ou migrar para Astro/Next estático + admin SPA
- Backend: Supabase (Auth + Postgres + RLS)
- Hosting: Vercel ou Hostinger com Node/edge functions
- Domínio real: perguntar ao usuário e usar em canonical/sitemap/OG absolutos

2) Auth
- Remover autenticação client-side (PBKDF2 no browser)
- Criar usuário admin no Supabase Auth
- NÃO hardcodar senha no repositório
- Sessão server-side / JWT com RLS
- Rotacionar a senha local atual (_Maralleads) — ela foi usada só no protótipo local

3) Schema mínimo
- settings (gtm_id, ga4_id, meta_pixel_id, email, whatsapp, instagram, tracking flags)
- leads (campos do form + stage + notes + value + next_contact_at + source)
- lead_attribution (first/last utm_*, gclid, fbclid, referrer, landing_page)
- lead_history (at, type, text, from_stage, to_stage)
- RLS: anon pode INSERT lead (+ attribution); só authenticated admin SELECT/UPDATE/DELETE

4) Form da LP
- POST para Edge Function ou insert via supabase-js anon com RLS de insert-only
- Continuar abrindo WhatsApp com mensagem montada
- Disparar generate_lead no dataLayer / GA4 / Meta Pixel
- Capturar UTMs first/last touch (já existe lógica em assets/storage.js e tracking.js — reaproveitar)

5) Admin
- Reescrever /admin para ler/escrever no Supabase
- Manter Kanban drag-and-drop, drawer, CSV/JSON export
- Settings de tracking só com IDs públicos (nunca Measurement Protocol secret / access token)

6) SEO pós-domínio
- Ativar <link rel="canonical">
- Trocar SEU-DOMINIO em sitemap.xml e robots.txt
- OG/Twitter image com URL absoluta https://
- Submeter Search Console + sitemap
- Revisar JSON-LD Organization.url

7) LGPD / consentimento
- Banner de cookies se GTM/GA4/Pixel ativos
- Política de privacidade (página nova)
- Base legal: contato solicitado pelo titular via formulário

8) Checklist de go-live
- [ ] Domínio + HTTPS
- [ ] Variáveis SUPABASE_URL / ANON_KEY / SERVICE_ROLE só no server
- [ ] WhatsApp real em settings
- [ ] GTM Preview + GA4 DebugView + Meta Test Events
- [ ] Teste form → lead no banco → card no Kanban
- [ ] Admin noindex + Disallow /admin em robots
- [ ] Backup automático dos leads
- [ ] Remover hash/credenciais locais do código client

Não invente cases, certificações ou números de resultado. Preserve a identidade visual (preto #0D000D, ciano #00D4FF, vermelho #FF2D2D).
```

---

## Limitações do modo local (importante)

| Capacidade | Local hoje | Produção |
|---|---|---|
| Ver leads do form | Só no mesmo navegador/origem | Banco compartilhado |
| Login | Barreira client-side | Auth real |
| Tracking | Só se forçar em localhost | GTM/GA4/Pixel no domínio |
| Backup | Export JSON/CSV manual | Backup automático |
| Multi-dispositivo | Não | Sim |

## Como rodar local agora

```bash
cd squads/amaral-ads/clientes/amaral-ads/lp
python3 -m http.server 8080
```

- LP: http://localhost:8080/
- Admin: http://localhost:8080/admin/
- Usuário: `adminamaral`
- Senha: `_Maralleads`

Testar UTMs:
`http://localhost:8080/?utm_source=teste&utm_medium=cpc&utm_campaign=diagnostico`
