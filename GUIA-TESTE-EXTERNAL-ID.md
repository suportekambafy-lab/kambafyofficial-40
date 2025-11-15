# 🧪 Guia de Teste: External ID

## Status Atual

Você fez login no app e viu:
- ✅ OneSignal ID: `d3bfdc04-3fa8-4934-9fb...` (presente)
- ❌ External ID: vazio

## Por que isso acontece?

O External ID está vazio porque **o código nativo ainda não foi implementado**.

---

## 🔍 Como Verificar o Status

Agora há um **painel de debug no canto inferior direito** da tela que mostra:

1. **Native External ID**: ID gerado pelo código nativo (Android/iOS)
   - 🟢 Verde = código nativo funcionando
   - 🔴 Vermelho = código nativo não implementado

2. **Fallback External ID**: ID gerado no localStorage como backup
   - 🟡 Amarelo = usando ID local (temporário)
   
3. **External ID Ativo**: Qual ID está sendo usado
4. **Fonte**: NATIVE, FALLBACK ou NONE

---

## 📱 Cenários de Teste

### Cenário 1: App sem código nativo (ATUAL)
```
Native External ID: ❌ Não encontrado
Fallback External ID: 🟡 a1b2c3d4-e5f6-...
External ID Ativo: 🟡 a1b2c3d4-e5f6-...
Fonte: FALLBACK
```

**O que fazer:**
- Implemente o código nativo (veja abaixo)
- Este ID fallback é temporário e mudará quando implementar o nativo

---

### Cenário 2: App com código nativo (OBJETIVO)
```
Native External ID: 🟢 z9y8x7w6-v5u4-...
Fallback External ID: 🟡 (ignorado)
External ID Ativo: 🟢 z9y8x7w6-v5u4-...
Fonte: NATIVE
```

**O que fazer:**
- ✅ Está tudo funcionando!
- O ID nativo será usado em todos os Journeys

---

## 🛠️ Como Implementar o Código Nativo

### 1. Adicionar Plataformas (se ainda não tem)
```bash
npx cap add android
npx cap add ios
```

### 2. Implementar Android

Edite: `android/app/src/main/java/app/lovable/a250e38189046430f852afb55edbf7463/MainActivity.kt`

Copie o código de: **android-implementation.md**

### 3. Implementar iOS

Edite: `ios/App/App/AppDelegate.swift`

Copie o código de: **ios-implementation.md**

### 4. Sync e Build
```bash
npm run build
npx cap sync
npx cap run android  # ou ios
```

---

## 🎯 Como Confirmar que Funcionou

Após implementar o código nativo:

1. Abra o app no dispositivo
2. Veja o painel de debug no canto inferior direito
3. Deve mostrar:
   - Native External ID: 🟢 (com UUID)
   - Fonte: NATIVE

4. Abra o Console de Logs e procure:
```
✅ [OneSignal] External ID NATIVO detectado do WebView: xxx
✅ [OneSignal Web SDK] Login com External ID NATIVO bem-sucedido!
```

5. No Dashboard do OneSignal:
   - Abra o perfil do usuário
   - Deve ver o External ID preenchido

---

## 🐛 Troubleshooting

### O painel mostra "Fallback" em vez de "Native"

**Problema:** O código nativo não está injetando o ID no WebView

**Solução:**
1. Verifique os logs nativos:
   - Android: `adb logcat | grep "NATIVE_EXTERNAL_ID"`
   - iOS: Xcode Console
2. Deve ver: `External ID injetado no WebView: xxx`
3. Se não vê, o código nativo não está correto

---

### O painel mostra "None"

**Problema:** Nem o nativo nem o fallback estão funcionando

**Solução:**
1. Abra o Console do navegador
2. Procure por erros relacionados a OneSignal
3. Verifique se `crypto.randomUUID()` está disponível

---

### External ID aparece no painel mas não no OneSignal

**Problema:** O login com External ID está falhando

**Solução:**
1. Verifique os logs:
   ```
   ❌ [OneSignal Web SDK] Erro ao fazer login com External ID
   ```
2. Verifique se o OneSignal SDK está inicializado
3. Verifique se há erros de permissão

---

## ✅ Checklist Final

Antes de testar Journeys, confirme:

- [ ] Painel de debug mostra "NATIVE" como fonte
- [ ] Native External ID está preenchido (verde)
- [ ] Console mostra "Login com External ID NATIVO bem-sucedido"
- [ ] Dashboard OneSignal mostra External ID no perfil
- [ ] External ID é o mesmo entre sessões (não muda)

---

## 🎉 Próximos Passos

Quando o painel mostrar "NATIVE":
1. Teste um Journey no OneSignal
2. Deveria funcionar corretamente
3. O External ID será usado para identificar o usuário

Se ainda usar "FALLBACK":
1. Journeys podem funcionar mas o ID não será persistente entre reinstalações
2. Implemente o código nativo para ter um ID estável
