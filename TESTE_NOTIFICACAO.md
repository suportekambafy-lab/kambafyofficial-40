# 🔔 Guia de Teste - Notificações OneSignal

## Passo 1: Preparar o Ambiente

```bash
# 1. Fazer pull do código
git pull

# 2. Instalar dependências
npm install

# 3. Build do projeto
npm run build

# 4. Sincronizar com Capacitor
npx cap sync android
```

## Passo 2: Configurar Firebase Cloud Messaging (FCM)

⚠️ **OBRIGATÓRIO para Android funcionar!**

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um projeto ou use um existente
3. Vá em **Project Settings > Cloud Messaging**
4. Copie o **Server Key** e **Sender ID**
5. Cole no [OneSignal Dashboard](https://app.onesignal.com/apps/85da5c4b-c2a7-426f-851f-5c7c42afd64a/settings/platforms/google_android_fcm):
   - Android > FCM Configuration
   - Cole Server Key e Sender ID

## Passo 3: Executar no Android

```bash
npx cap run android
```

Isso abrirá o Android Studio. Clique em **Run** para instalar no dispositivo/emulador.

## Passo 4: Testar o Fluxo Completo

### 4.1. Registrar Player ID (Vendedor)

1. **Abra o app** no dispositivo Android
2. **Aceite as permissões** de notificação quando solicitado
3. **Faça login** como vendedor (conta que vende produtos)
4. Verifique nos logs do app:
   ```
   ✅ OneSignal Player ID: [seu-player-id-aqui]
   💾 Saving Player ID to profile
   ```

### 4.2. Verificar Player ID no Supabase

1. Acesse [Supabase Profiles](https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd/editor)
2. Abra a tabela `profiles`
3. Confirme que o campo `onesignal_player_id` foi preenchido para seu usuário

### 4.3. Fazer Venda de Teste

**Opção A: Venda AppyPay (Recomendado)**
1. Crie um produto de teste no painel
2. Acesse a página de checkout desse produto
3. Faça um pagamento usando AppyPay Express
4. Aguarde a confirmação do pagamento

**Opção B: Venda Manual**
1. Acesse o painel admin
2. Vá em Orders
3. Crie um pedido manualmente
4. Altere o status para `completed`

### 4.4. Receber Notificação

Você deve receber uma notificação push como:

```
📱 Nova Venda! 🎉
Você vendeu: [Nome do Produto] - R$ [Valor]
```

## 🔍 Troubleshooting

### Notificação não chegou?

**1. Verifique Player ID:**
```sql
SELECT user_id, onesignal_player_id 
FROM profiles 
WHERE user_id = '[seu-user-id]';
```

**2. Verifique logs da Edge Function:**
- [Logs send-onesignal-notification](https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd/functions/send-onesignal-notification/logs)
- Procure por erros ou confirmações de envio

**3. Verifique OneSignal Dashboard:**
- [OneSignal Messages](https://app.onesignal.com/apps/85da5c4b-c2a7-426f-851f-5c7c42afd64a/notifications)
- Veja se a notificação foi enviada

**4. Permissões Android:**
Verifique se as permissões estão no `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.VIBRATE"/>
```

### OneSignal não inicializa?

1. Verifique se o plugin está instalado:
```bash
npm list onesignal-cordova-plugin
```

2. Force reinstalação:
```bash
npm install onesignal-cordova-plugin
npx cap sync android
```

3. Limpe o cache do Android Studio:
   - Build > Clean Project
   - Build > Rebuild Project

## 📊 Monitoramento

### Logs do App
Abra o Chrome DevTools conectado ao dispositivo:
```bash
chrome://inspect
```

### Logs Supabase
- [Update Order Status](https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd/functions/update-order-status/logs)
- [AppyPay Webhook](https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd/functions/appypay-webhook/logs)
- [Send OneSignal](https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd/functions/send-onesignal-notification/logs)

## ✅ Sucesso!

Se tudo funcionar, você verá:

1. ✅ Player ID salvo no Supabase
2. ✅ Venda processada com sucesso
3. ✅ Notificação enviada pelo OneSignal
4. ✅ Notificação recebida no dispositivo

---

**Dúvidas?** Consulte o [ONESIGNAL_SETUP.md](./ONESIGNAL_SETUP.md) para mais detalhes.
