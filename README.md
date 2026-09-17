# GAM — versão online com Supabase

## Configuração
1. No Supabase, abra Authentication > URL Configuration.
2. Em Site URL, coloque o endereço publicado da GAM.
3. Em Redirect URLs, adicione o mesmo endereço publicado.
4. Publique todos os arquivos desta pasta no GitHub Pages, Netlify ou Vercel.
5. Para ver os e-mails cadastrados: Supabase > Authentication > Users.

## Observações
- As senhas são gerenciadas pelo Supabase e não ficam visíveis para o administrador.
- A chave `sb_publishable` pode ficar no frontend; nunca coloque chaves secretas ou `service_role` no site.
- O arquivo `gestor.html` foi mantido como base visual. A sincronização antiga com `/api` não funcionará em hospedagem estática sem um backend adicional.
