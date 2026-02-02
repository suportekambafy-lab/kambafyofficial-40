
Objetivo
- Garantir que vendas feitas com link de afiliado (ex: `?ref=079DB20D`) sejam registradas com:
  - `orders.affiliate_code` e `orders.affiliate_commission` preenchidos
  - histórico do vendedor mostrando o valor líquido dele
  - histórico do afiliado mostrando a comissão dele
- Corrigir o “tempo do checkout esgotando” antes de marcar como pago (principalmente no Multicaixa Express).

O que já está comprovado (com evidência)
1) A venda `T0Y4J6FKV` (produto `08483bc7-2929-4214-95c3-d4e2b57d5428`) foi salva como `completed`, porém:
   - `orders.affiliate_code = NULL`
   - `orders.affiliate_commission = NULL`
   - `orders.seller_commission = 9.1` (em KZ)
   Isso prova que o problema começa antes do trigger: o checkout não está enviando/gravando o `affiliate_code` no pedido.
2) O afiliado existe e está ativo no banco:
   - `affiliates.affiliate_code = 079DB20D`
   - `status = ativo`
   - `commission_rate = 90%`
3) Logs do Edge Function `create-appypay-charge` mostram:
   - “Affiliate code received from frontend” com `affiliate_code: null` para esse `productId`.
   Ou seja: o backend não está recebendo o código.
4) Mesmo quando o código vier a chegar corretamente no `orders`, existe um bug potencial no trigger SQL que cria `balance_transactions`:
   - Ele procura afiliados com `status = 'approved'`, mas no sistema o status é `ativo`.
   Isso por si só faria a venda ser tratada como “sem afiliado”, mesmo com `affiliate_code` preenchido.

Causas-raiz prováveis (2 problemas ao mesmo tempo)
A) Perda do `ref` no frontend (antes de chamar o Edge Function)
- Existem trechos no `Checkout.tsx` que executam `window.history.replaceState(..., window.location.pathname)`, removendo todos os query params. Se isso acontecer antes do clique em “Pagar”, o `ref` some da URL.
- Existe um efeito que valida afiliado e, ao falhar, chama `clearAffiliateCode()`. Isso apaga o código do storage. Se essa validação falhar por timing (produto ainda carregando) ou por qualquer motivo transitório, o código some.
- `localStorage` não é compartilhado entre subdomínios. Se em algum momento o fluxo pula para `app.kambafy.com` (ex.: login) e depois volta para `pay.kambafy.com`, o código salvo em `localStorage` pode não existir no subdomínio atual.
Resultado: na hora do pagamento, as três fontes (hook, localStorage, URL) podem estar vazias → o pedido vai com `affiliate_code: null`.

B) Trigger/registro financeiro não compatível com status “ativo”
- O trigger `create_balance_transaction_on_sale()` usa `status='approved'`. Isso não bate com `ativo`.
- Além disso, do jeito que o trigger está escrito, quando o caso “com afiliado” passar a funcionar, a matemática precisa estar coerente com a arquitetura atual (edge functions calculam `seller_commission = (gross - affiliate) * (1 - fee)`), senão corremos o risco de valores errados/negativos.

Plano de implementação (sequência)
1) Tornar o “ref” persistente entre subdomínios e entre navegações
1.1) Atualizar `useAffiliateTracking` para usar um storage cross-subdomain
- Implementar leitura/escrita em cookie com `domain=.kambafy.com` (ex.: `kambafy_affiliate_code`).
  - Quando houver `?ref=...` na URL: salvar no cookie e no localStorage do subdomínio atual.
  - Quando não houver `?ref=...`: tentar recuperar primeiro do cookie (cross-subdomain), depois localStorage.
- (Opcional complementar) também salvar em `window.name` com prefixo próprio (como fallback adicional), já que `window.name` persiste na mesma aba atravessando subdomínios.

1.2) Não apagar automaticamente o afiliado por falhas transitórias
- No `Checkout.tsx`, revisar o efeito que valida afiliado e hoje chama `clearAffiliateCode()` quando não encontra.
- Mudar o comportamento para:
  - “Não validou para este produto agora” → marcar como inválido no estado (para UI), mas não apagar do cookie/localStorage automaticamente.
  - Só apagar em ações explícitas (ex.: botão “remover código” / limpar manualmente) ou se o usuário entrar com outro `ref`.

1.3) Evitar que rotinas “limpem” a URL removendo `ref`
- Onde hoje faz `window.history.replaceState(... pathname)`:
  - Em vez de remover todos os query params, remover apenas os params de retorno/erro do gateway (ex.: `error`, `payment_return`, `redirect_status`, `payment_intent_id`, etc.) e preservar `ref` e UTMs.
  - Exemplo de estratégia:
    - `const params = new URLSearchParams(window.location.search); params.delete('error'); params.delete('payment_return'); ...; window.history.replaceState({}, title, pathname + '?' + params.toString());`
  - Assim o `ref` continua disponível até o clique “Pagar”.

2) Garantir que o checkout sempre envie `affiliate_code` ao backend (mesmo se o hook falhar)
2.1) Consolidar uma função única “getAffiliateCodeToUse()”
- Dentro do `Checkout.tsx`, criar uma função helper que resolve o código com prioridade:
  1) `ref` da URL atual
  2) cookie `.kambafy.com`
  3) localStorage do subdomínio atual
  4) estado do hook `affiliateCode`
- Usar esse valor:
  - para preencher `orderData.affiliate_code`
  - e também para a validação on-demand (não depender de `hasAffiliate && affiliateCode`, porque isso falha quando o hook limpou o estado mas o ref ainda existe em cookie/URL).

2.2) Ajustar `validateAffiliateOnDemand`
- Hoje ele faz early return se `!hasAffiliate || !affiliateCode`. Isso impede validar quando a fonte é URL/cookie.
- Mudar para receber o `affiliate_code_to_use` como parâmetro e validar com ele.

2.3) Logs de diagnóstico no frontend
- No clique “Pagar”, logar (somente em ambiente dev/preview, se houver esse padrão no projeto):
  - URL atual, `ref` da URL, cookie, localStorage e o valor final enviado para o backend.
- Isso reduz muito o “não sei onde está perdendo”.

3) Corrigir o processamento financeiro (vendedor + afiliado no histórico)
3.1) Corrigir o trigger SQL para reconhecer afiliado “ativo”
- Alterar `create_balance_transaction_on_sale()` para buscar afiliado por:
  - `status IN ('ativo', 'approved')` (compatibilidade com dados antigos), ou diretamente `ativo` se “approved” não for usado.
- Isso garante que, quando o pedido tiver `affiliate_code`, o trigger crie também a transação `affiliate_commission`.

3.2) Corrigir a matemática do trigger para bater com a arquitetura atual
- Regra (alinhada com o que já está no backend/edge functions):
  - `affiliate_commission = gross * rate` (ou usar `NEW.affiliate_commission` se já veio calculada)
  - `seller_gross = gross - affiliate_commission`
  - `platform_fee = seller_gross * fee_rate` (a taxa incide depois de descontar o afiliado)
  - `seller_net = seller_gross - platform_fee`
- Inserções em `balance_transactions`:
  - `platform_fee`: negativo, no `user_id` do vendedor
  - `sale_revenue`: positivo, no `user_id` do vendedor, valor `seller_net`
  - `affiliate_commission`: positivo, no `affiliate_user_id`, valor `affiliate_commission`
- Garantir idempotência (já existe verificação `existing_count`) e consistência com `seller_commission` do pedido:
  - Se `NEW.seller_commission` estiver preenchida, podemos optar por usar `seller_net = NEW.seller_commission` e derivar `platform_fee = seller_gross - seller_net` para reduzir divergência por arredondamento.

4) Ajustar o comportamento do “tempo esgotando” vs “marcando pago”
4.1) Confirmar o fluxo real do Express
- Se o Express só confirma “pago” via webhook/polling, o checkout precisa:
  - manter o countdown até `expires_at`
  - mostrar status “Aguardando confirmação”
  - atualizar imediatamente quando o status mudar para `completed`

4.2) Atualização de status em tempo real (melhor UX e evita “só marca pago depois”)
- Implementar um polling leve (ex.: a cada 2–3s por 30–60s, depois espaça) chamando um endpoint já existente (há funções como `check-appypay-status` / `check-order-status` no projeto).
OU
- Usar Realtime (subscription) no registro do pedido (se já estiver habilitado e o projeto já usar esse padrão).
- Assim que detectar `status=completed`, parar countdown e redirecionar/atualizar UI.

5) Testes de validação (critério de aceite)
5.1) Teste principal (seu caso real)
- Abrir exatamente:
  - `https://pay.kambafy.com/checkout/08483bc7-2929-4214-95c3-d4e2b57d5428?ref=079DB20D`
- Fazer uma compra via Multicaixa Express com email de comprador diferente do email do afiliado (para eliminar qualquer regra de anti-auto-comissão, se existir).
- Verificar no banco:
  - `orders.affiliate_code = '079DB20D'`
  - `orders.affiliate_commission` preenchido
  - `balance_transactions` tem 3 lançamentos para o mesmo `order_id` (platform_fee, sale_revenue, affiliate_commission)
- Verificar no UI:
  - vendedor vê a venda com a percentagem/valor correto
  - afiliado vê a comissão no histórico

5.2) Teste de robustez: fluxo com login no meio
- Abrir checkout com `?ref=...`
- Navegar para login (`/auth`) e voltar para checkout
- Confirmar que o `affiliate_code` ainda é recuperado via cookie cross-subdomain.

Arquivos que serão alterados (quando você aprovar)
- `src/hooks/useAffiliateTracking.ts` (persistência em cookie + não depender só de localStorage)
- `src/pages/Checkout.tsx`
  - não apagar `ref` ao limpar URL
  - não chamar `clearAffiliateCode()` automaticamente em validação falha transitória
  - validar afiliado usando `affiliate_code_to_use` (URL/cookie/localStorage)
- `supabase/migrations/...` (nova migration ajustando `create_balance_transaction_on_sale()` e trigger relacionado)
- (Opcional) Ajustes pequenos em componentes que navegam para `/auth` a partir do checkout, para preservar a intenção de retorno.

Riscos e mitigação
- Risco: passar a creditar comissão quando comprador=afiliado (auto-compra). Se isso não for desejado, vamos precisar de uma regra explícita (bloquear por email/user_id/IP).
  - Mitigação: definir regra de negócio claramente e implementar verificação no backend (edge function ou trigger) antes de criar transação `affiliate_commission`.

Entrega incremental recomendada
- Primeiro: persistência do `ref` + envio correto para `create-appypay-charge` (para `orders.affiliate_code` nunca mais ser NULL quando o link tem ref).
- Segundo: trigger corrigido (para aparecer no histórico de ambos com percentagens corretas).
- Terceiro: melhoria do tempo/atualização de status (UX/ansiedade do checkout).
