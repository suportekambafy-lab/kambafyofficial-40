# 🎯 Instruções: Implementar External User ID Nativo

## Problema
- No web normal, External User ID funciona ✅
- No app (WebView), External User ID não é gerado ❌
- Journeys não funcionam no mobile ❌

## Solução
Gerar um UUID nativo persistente e injetá-lo no WebView.

---

## 📱 Passo 1: Adicionar plataformas nativas

Se ainda não fez:

```bash
npx cap add android
npx cap add ios
```

---

## 🤖 Passo 2: Android

### Arquivo: `android/app/src/main/java/app/lovable/a250e38189046430f852afb55edbf7463/MainActivity.kt`

Copie o código de **android-implementation.md**

Principais pontos:
- Gera UUID uma vez e persiste em SharedPreferences
- Injeta como `window.NATIVE_EXTERNAL_ID` no WebView
- Logs para debug

---

## 🍎 Passo 3: iOS

### Arquivo: `ios/App/App/AppDelegate.swift`

Copie o código de **ios-implementation.md**

Principais pontos:
- Gera UUID uma vez e persiste em UserDefaults
- Injeta como `window.NATIVE_EXTERNAL_ID` no WebView
- Aguarda 0.5s para WebView estar pronto
- Logs para debug

---

## 🌐 Passo 4: Sync e Build

```bash
npm run build
npx cap sync
npx cap run android  # ou ios
```

---

## ✅ Teste

1. Abra o app no dispositivo
2. Verifique os logs nativos:
   - Android: `adb logcat | grep "External ID"`
   - iOS: Xcode Console
3. Deve ver:
   - `📱 [Android/iOS] Novo External ID gerado: xxx`
   - `📱 [Android/iOS] External ID injetado no WebView: xxx`
4. No console do WebView:
   - `📱 [OneSignal] External ID nativo detectado: xxx`
   - `🌐 [OneSignal] Fazendo login com External ID nativo: xxx`

---

## 🎉 Resultado Final

- ✅ UUID único gerado no app nativo
- ✅ UUID persistido (não muda entre sessões)
- ✅ UUID injetado no WebView
- ✅ OneSignal faz login automático com esse UUID
- ✅ Journeys funcionam no mobile igual ao web

---

## 🔍 Debug

Se não funcionar, verifique:
1. Logs nativos aparecem?
2. `window.NATIVE_EXTERNAL_ID` está definido no console?
3. OneSignal fez login com esse ID?
4. Player ID está vinculado ao External ID no dashboard OneSignal?
