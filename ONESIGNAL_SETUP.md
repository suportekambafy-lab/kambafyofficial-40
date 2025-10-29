# 🔔 Configuração Final do OneSignal - Kambafy

## ✅ O Que Foi Implementado

### 1. **Database**
- ✅ Coluna `onesignal_player_id` adicionada à tabela `profiles`
- ✅ Índice criado para otimizar buscas

### 2. **Edge Function**
- ✅ `send-onesignal-notification` criada e configurada
- ✅ Integração com OneSignal REST API

### 3. **Edge Functions Modificadas**
- ✅ `appypay-webhook` - envia notificação quando venda é completada
- ✅ `verify-appypay-order` - envia notificação ao verificar pagamento
- ✅ `update-order-status` - envia notificação ao atualizar status

### 4. **Frontend**
- ✅ Hook `useOneSignal` criado para gerenciar OneSignal no app
- ✅ Integrado no `App.tsx` para inicializar automaticamente
- ✅ Player ID salvo automaticamente no perfil do vendedor

### 5. **Dependências**
- ✅ Pacote `onesignal-cordova-plugin@5.2.6` adicionado

---

## 📱 Próximos Passos - Configuração no Projeto

### 1. **Pull e Instalação**

```bash
git pull
npm install
```

### 2. **Configurar OneSignal no capacitor.config.ts**

Edite o arquivo `capacitor.config.ts` e adicione:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.250e38189046430f852afb55edbf7463',
  appName: 'kambafyofficial-40',
  webDir: 'dist',
  server: {
    url: 'https://250e3818-9046-430f-852a-fb55edbf7463.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    OneSignal: {
      appId: '85da5c4b-c2a7-426f-851f-5c7c42afd64a'
    }
  }
};

export default config;
```

### 3. **Adicionar OneSignal App ID no .env (opcional)**

Se quiser usar variável de ambiente:

```env
VITE_ONESIGNAL_APP_ID=85da5c4b-c2a7-426f-851f-5c7c42afd64a
```

### 4. **Sincronizar com Capacitor**

```bash
npx cap sync
```

### 5. **Testar no Emulador ou Dispositivo**

```bash
# Android
npx cap run android

# iOS (só funciona em Mac com Xcode)
npx cap run ios
```

---

## 🔧 Configuração no Firebase (Android)

Para que o OneSignal funcione no Android, você precisa configurar o Firebase Cloud Messaging (FCM):

### 1. Acessar Firebase Console
- Acesse: https://console.firebase.google.com
- Selecione seu projeto (ou crie um novo)

### 2. Obter Credenciais
- Vá em **Configurações do Projeto** (ícone de engrenagem)
- Clique em **Cloud Messaging**
- Copie:
  - **Server Key** (Legacy)
  - **Sender ID**

### 3. Configurar no OneSignal
- Acesse: https://onesignal.com
- Vá em **Settings → Keys & IDs → Google Android (FCM)**
- Cole o **Firebase Server Key** e **Firebase Sender ID**
- Salve as configurações

---

## 📋 Permissões Necessárias (Android)

O OneSignal adiciona automaticamente as permissões necessárias, mas você pode verificar em `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## 🧪 Como Testar

### 1. **Testar Registro do Player ID**

Abra o app e faça login. No console do navegador/logcat, você deve ver:

```
✅ OneSignal initialized with Player ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
💾 Saving Player ID to profile: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✅ Player ID saved successfully
```

### 2. **Verificar no Supabase**

Acesse o Supabase e verifique se o `onesignal_player_id` foi salvo na tabela `profiles`:

```sql
SELECT user_id, email, onesignal_player_id 
FROM profiles 
WHERE onesignal_player_id IS NOT NULL;
```

### 3. **Testar Envio de Notificação**

Faça uma venda de teste e verifique os logs da Edge Function:

```
📱 Checking OneSignal notification...
📤 Sending OneSignal notification to seller...
✅ OneSignal notification sent successfully
```

### 4. **Testar no Dashboard do OneSignal**

- Acesse: https://onesignal.com
- Vá em **Audience → All Users**
- Você deve ver os Player IDs registrados
- Teste enviar uma notificação manual para confirmar que funciona

---

## 🚀 Fluxo Completo

```
1. Usuário abre o app
   ↓
2. OneSignal inicializa e solicita permissão
   ↓
3. Player ID é capturado e salvo no Supabase (profiles.onesignal_player_id)
   ↓
4. Cliente compra um produto
   ↓
5. Webhook processa pagamento (status = completed)
   ↓
6. Edge Function busca onesignal_player_id do vendedor
   ↓
7. Chama send-onesignal-notification
   ↓
8. OneSignal envia push notification
   ↓
9. Vendedor recebe notificação no celular 🎉
```

---

## 🎨 Personalização

### Alterar Título e Mensagem da Notificação

Edite os arquivos:
- `supabase/functions/appypay-webhook/index.ts`
- `supabase/functions/verify-appypay-order/index.ts`
- `supabase/functions/update-order-status/index.ts`

Procure por:

```typescript
await supabase.functions.invoke('send-onesignal-notification', {
  body: {
    player_id: sellerProfile.onesignal_player_id,
    title: '🎉 Nova Venda!',  // ← Altere aqui
    message: `Você vendeu para ${order.customer_name} - ${order.amount} ${order.currency}`,  // ← Altere aqui
    data: {
      type: 'sale',
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      customer_name: order.customer_name
    }
  }
});
```

### Adicionar Som Personalizado

Edite `supabase/functions/send-onesignal-notification/index.ts`:

```typescript
const notificationPayload = {
  app_id: ONESIGNAL_APP_ID,
  include_player_ids: [player_id],
  headings: { en: title },
  contents: { en: message },
  data: data || {},
  android_channel_id: '85da5c4b-c2a7-426f-851f-5c7c42afd64a',
  priority: 10,
  ttl: 259200,
  android_sound: 'notification_sound',  // ← Adicione aqui
  ios_sound: 'notification_sound.wav'   // ← Adicione aqui
};
```

---

## 🐛 Troubleshooting

### Problema: Player ID não está sendo salvo

**Solução:**
1. Verifique se o usuário está autenticado
2. Verifique os logs do console: `console.log` em `useOneSignal.ts`
3. Verifique se o OneSignal plugin foi instalado corretamente: `npx cap sync`

### Problema: Notificação não está chegando

**Solução:**
1. Verifique se o `onesignal_player_id` está salvo no banco
2. Verifique os logs da Edge Function: `send-onesignal-notification`
3. Verifique se as credenciais do OneSignal estão corretas
4. Teste enviar uma notificação manual pelo dashboard do OneSignal

### Problema: OneSignal não inicializa no app

**Solução:**
1. Verifique se `onesignal-cordova-plugin` está instalado: `npm list onesignal-cordova-plugin`
2. Execute `npx cap sync` novamente
3. Limpe o build: `rm -rf android/build ios/build`
4. Reconstrua: `npm run build && npx cap sync`

---

## 📚 Recursos Adicionais

- **OneSignal Dashboard**: https://onesignal.com
- **OneSignal Docs**: https://documentation.onesignal.com
- **Firebase Console**: https://console.firebase.google.com
- **Supabase Dashboard**: https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd

---

## ✅ Checklist Final

- [ ] `git pull` executado
- [ ] `npm install` executado
- [ ] `capacitor.config.ts` configurado com OneSignal App ID
- [ ] Firebase Cloud Messaging configurado
- [ ] `npx cap sync` executado
- [ ] App testado em dispositivo/emulador
- [ ] Player ID salvo no banco de dados
- [ ] Notificação de teste recebida
- [ ] App atualizado na Play Store (quando pronto)

---

🎉 **Parabéns! Seu sistema de notificações push está pronto!**

Sempre que houver uma venda, o vendedor receberá uma notificação instantânea no celular, mesmo com o app fechado!
