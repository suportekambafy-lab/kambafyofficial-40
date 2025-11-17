# 🔔 Sistema de Notificações OneSignal - Correções Implementadas

## 📋 Resumo das Correções

Sistema completamente reformulado para garantir que os Player IDs do OneSignal sejam salvos corretamente no Supabase e que as notificações de venda cheguem a todos os vendedores.

---

## ✅ Fase 1: Correção Crítica - Salvamento do Player ID

### Problema Identificado
- Apenas 1 de 2.575 usuários tinha Player ID salvo no Supabase
- Função `savePlayerIdToProfile` usava `.update()` que falhava silenciosamente
- Race condition: tentava salvar antes da autenticação estar pronta
- Sem retry logic para falhas temporárias

### Solução Implementada

#### 1. Uso de UPSERT ao invés de UPDATE
```typescript
// ❌ ANTES (falhava silenciosamente)
await supabase.from('profiles')
  .update({ onesignal_player_id: playerIdValue })
  .eq('user_id', user.id);

// ✅ AGORA (cria ou atualiza)
await supabase.from('profiles')
  .upsert({ 
    user_id: user.id,
    onesignal_player_id: playerIdValue,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id',
    ignoreDuplicates: false
  });
```

#### 2. Verificação de Autenticação
```typescript
// Espera até 10 segundos pela autenticação estar pronta
let attempts = 0;
const maxAuthAttempts = 20;

while (!user && attempts < maxAuthAttempts) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) {
    user = authUser;
    break;
  }
  attempts++;
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

#### 3. Retry Logic com Backoff Exponencial
- 3 tentativas automáticas
- Delay: 1s, 2s, 4s (backoff exponencial)
- Se falhar tudo, salva em `localStorage` para retry posterior

#### 4. Retry Queue
```typescript
// Salva em fila se falhar
const retryQueue = JSON.parse(localStorage.getItem('onesignal_retry_queue') || '[]');
retryQueue.push({ playerIdValue, timestamp: Date.now() });
localStorage.setItem('onesignal_retry_queue', JSON.stringify(retryQueue));

// Processa fila no próximo login
const processRetryQueue = async () => {
  const retryQueue = JSON.parse(localStorage.getItem('onesignal_retry_queue') || '[]');
  for (const item of retryQueue) {
    await savePlayerIdToProfile(item.playerIdValue);
  }
};
```

---

## ✅ Fase 2: Sistema de Sincronização

### 1. Tabela de Logs (`onesignal_sync_logs`)
```sql
CREATE TABLE onesignal_sync_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  player_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Propósito:**
- Rastrear todas as tentativas de salvamento
- Debug de problemas
- Estatísticas de sucesso/falha

### 2. Edge Function `sync-onesignal-player-ids`
**Funcionalidade:**
- Busca Player ID no perfil do Supabase
- Se não encontrar, busca na API do OneSignal
- Salva automaticamente se encontrar
- Retorna status e necessidade de reativação

**Uso:**
```typescript
const { data } = await supabase.functions.invoke('sync-onesignal-player-ids', {
  body: { user_id: userId }
});

if (data.player_id) {
  // Player ID sincronizado!
} else if (data.needs_reactivation) {
  // Usuário precisa reativar notificações
}
```

### 3. Componente `NotificationSettings`
**Localização:** `/vendedor` → Perfil → Configurações de Notificação

**Recursos:**
- ✅ Status visual (Ativo/Inativo)
- ✅ Mostra se permissão foi concedida
- ✅ Exibe Player ID (primeiros 8 caracteres)
- ✅ Botão "Reativar Notificações"
- ✅ Feedback visual com badges

**Como usar:**
1. Acesse seu perfil no app
2. Role até "Notificações Push"
3. Se inativo, clique em "Reativar Notificações"
4. Aguarde alguns segundos
5. Status mudará para "Ativo" ✅

---

## ✅ Fase 3: Sistema de Fallback Robusto

### Melhorias na Edge Function `send-onesignal-notification`

#### Sistema de 3 Níveis de Fallback:

**Nível 1: Player ID Direto**
```typescript
if (player_id) {
  // Usa player_id se fornecido diretamente
  notificationPayload.include_player_ids = [player_id];
}
```

**Nível 2: Busca no Supabase**
```typescript
if (!player_id && user_id) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onesignal_player_id')
    .eq('user_id', user_id)
    .single();
    
  if (profile?.onesignal_player_id) {
    player_id = profile.onesignal_player_id;
  }
}
```

**Nível 3: External User ID**
```typescript
if (!player_id && external_user_id) {
  // Fallback para external_user_id
  notificationPayload.include_external_user_ids = [external_user_id];
}
```

### Hook `useRealtimeSellerNotifications` Atualizado
```typescript
// Busca player_id do perfil automaticamente
const { data: profile } = await supabase
  .from('profiles')
  .select('onesignal_player_id')
  .eq('user_id', userId)
  .single();

const notificationPayload: any = {
  title: notification.title,
  message: notification.message,
  user_id: userId, // Para fallback na edge function
  data: { /* ... */ }
};

// Usa player_id se disponível
if (profile?.onesignal_player_id) {
  notificationPayload.player_id = profile.onesignal_player_id;
} else {
  notificationPayload.external_user_id = userId;
}
```

---

## ✅ Fase 4: Logging Estruturado

### Logs em Todas as Operações

**Sucesso:**
```typescript
await supabase.from('onesignal_sync_logs').insert([{
  user_id: user.id,
  player_id: playerIdValue,
  action: 'save_player_id',
  status: 'success',
  metadata: { retry_count: retryCount }
}]);
```

**Erro:**
```typescript
await supabase.from('onesignal_sync_logs').insert([{
  user_id: user.id,
  player_id: playerIdValue,
  action: 'save_player_id',
  status: 'error',
  error_message: error.message,
  metadata: { 
    retry_count: retryCount, 
    error_code: error.code 
  }
}]);
```

### Dashboard de Logs (TODO para Admin)
Query para ver logs recentes:
```sql
SELECT 
  user_id,
  player_id,
  action,
  status,
  error_message,
  created_at
FROM onesignal_sync_logs
ORDER BY created_at DESC
LIMIT 100;
```

---

## ✅ Fase 5: Recuperação em Massa

### Edge Function `recover-missing-player-ids`

**Funcionalidade:**
- Processa usuários em lotes (padrão: 100)
- Busca Player IDs na API do OneSignal
- Salva automaticamente se encontrar
- Retorna estatísticas detalhadas

**Uso via Admin:**
```typescript
const { data } = await supabase.functions.invoke('recover-missing-player-ids', {
  body: { batch_size: 100 }
});

console.log(`
  Processados: ${data.results.total_processed}
  Recuperados: ${data.results.recovered}
  Não encontrados: ${data.results.not_found}
  Erros: ${data.results.errors}
`);
```

### Componente Admin `RecoverPlayerIdsButton`

**Recursos:**
- ✅ Estatísticas em tempo real
- ✅ Execução em lotes de 100
- ✅ Resultados detalhados
- ✅ Progress feedback

---

## 🧪 Como Testar

### 1. Teste de Salvamento Automático

**Novos Usuários:**
1. Crie uma nova conta
2. Aceite permissão de notificações
3. Aguarde 5 segundos
4. Verifique no Supabase:
```sql
SELECT user_id, onesignal_player_id 
FROM profiles 
WHERE user_id = 'SEU_USER_ID';
```
5. ✅ `onesignal_player_id` deve estar preenchido

**Usuários Existentes:**
1. Faça login
2. Vá para Perfil → Notificações Push
3. Se mostrar "Inativo", clique em "Reativar"
4. Aguarde alguns segundos
5. ✅ Status deve mudar para "Ativo"

### 2. Teste de Notificação de Venda

**Usando Botão de Teste:**
1. Acesse seu perfil no app (`/vendedor`)
2. Role até encontrar o botão "Testar Notificação"
3. Clique no botão
4. Aguarde 5-10 segundos
5. ✅ Você deve receber uma notificação push

**Simulando Venda Real:**
```typescript
// Usar a edge function de teste
const { data } = await supabase.functions.invoke('test-seller-notification', {
  body: { userId: 'SEU_USER_ID' }
});
```

### 3. Teste de Recuperação em Massa

**Para Administradores:**
1. Acesse área de admin
2. Localize "Recuperar Player IDs do OneSignal"
3. Veja estatísticas atuais
4. Clique em "Recuperar Player IDs (Lote de 100)"
5. Aguarde processamento (1-2 minutos)
6. ✅ Veja resultados: recuperados, não encontrados, erros

### 4. Verificar Logs

```sql
-- Ver últimas tentativas de salvamento
SELECT 
  user_id,
  action,
  status,
  error_message,
  created_at
FROM onesignal_sync_logs
WHERE action = 'save_player_id'
ORDER BY created_at DESC
LIMIT 20;

-- Ver taxa de sucesso
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM onesignal_sync_logs
WHERE action = 'save_player_id'
GROUP BY status;
```

---

## 📊 Estatísticas Antes vs Depois

### Antes das Correções
- ❌ Player IDs salvos: **1 de 2.575** (0.04%)
- ❌ Notificações chegando: **~0%**
- ❌ Retry logic: **Inexistente**
- ❌ Logging: **Básico**

### Depois das Correções
- ✅ Player IDs salvos: **Meta >95%**
- ✅ Notificações chegando: **3 níveis de fallback**
- ✅ Retry logic: **3 tentativas + queue**
- ✅ Logging: **Estruturado e completo**
- ✅ Sistema de reativação: **Self-service**
- ✅ Recuperação em massa: **Disponível**

---

## 🚀 Próximos Passos Recomendados

### Curto Prazo (1-2 dias)
1. ✅ Executar `recover-missing-player-ids` para os 2.574 usuários
2. ✅ Monitorar logs de salvamento por 24-48h
3. ✅ Verificar taxa de sucesso de notificações
4. ✅ Testar em diferentes dispositivos (Web, Android, iOS)

### Médio Prazo (1 semana)
1. 📧 Campanha de email para usuários sem Player ID
   - "Ative notificações para não perder vendas"
   - Link direto para configurações no app
2. 📊 Dashboard admin com estatísticas
   - Taxa de ativação de notificações
   - Notificações enviadas vs entregues
   - Usuários sem Player ID
3. 🔔 Reminder in-app para ativar notificações
   - Banner no topo para usuários sem Player ID
   - Botão de ação rápida

### Longo Prazo (1 mês)
1. 🤖 Sincronização automática periódica
   - Cron job diário via `sync-onesignal-player-ids`
   - Auto-recovery para novos usuários
2. 📈 Analytics de notificações
   - Taxa de abertura
   - Conversão (vendas após notificação)
   - Churn vs notificações ativas
3. 🎯 Segmentação de notificações
   - Por nível Kamba
   - Por volume de vendas
   - Por engagement

---

## 🐛 Troubleshooting

### Player ID não está salvando

**Verificar:**
1. Console do navegador/app para erros
2. Logs na tabela `onesignal_sync_logs`
3. Permissão de notificações concedida
4. OneSignal SDK inicializado corretamente

**Soluções:**
```typescript
// Forçar novo salvamento
const { playerId, updatePlayerId } = useOneSignal();
await updatePlayerId();
```

### Notificações não chegam

**Verificar:**
1. Player ID salvo no Supabase
2. OneSignal Dashboard → Delivery Logs
3. Edge Function logs (`send-onesignal-notification`)
4. Dispositivo não está em modo "Não Perturbe"

**Soluções:**
```typescript
// Teste direto via edge function
await supabase.functions.invoke('send-onesignal-notification', {
  body: {
    player_id: 'SEU_PLAYER_ID',
    title: 'Teste',
    message: 'Teste de notificação'
  }
});
```

### Erro "Cannot send notification: no player_id or external_user_id available"

**Causa:** Todos os 3 níveis de fallback falharam

**Soluções:**
1. Reativar notificações no app
2. Executar `sync-onesignal-player-ids` para o usuário
3. Verificar se OneSignal está inicializado

---

## 📚 Referências

- [OneSignal REST API Docs](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal Cordova Plugin](https://documentation.onesignal.com/docs/cordova-sdk-setup)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## ✨ Conclusão

Sistema de notificações completamente reformulado com:
- ✅ Salvamento confiável de Player IDs
- ✅ Múltiplos níveis de fallback
- ✅ Retry automático e queue
- ✅ Logging estruturado
- ✅ Recuperação em massa
- ✅ Self-service para reativação
- ✅ Componentes de UI prontos

**Taxa de sucesso esperada:** >95% dos usuários com notificações funcionando 🎉