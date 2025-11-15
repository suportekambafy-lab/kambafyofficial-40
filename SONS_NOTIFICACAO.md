# 🔔 Configuração de Sons Personalizados para Notificações Push

Este documento explica como o som personalizado "Cha-Ching" foi implementado nas notificações push do Kambafy e como fazer a sincronização para Android e iOS.

## 📁 Estrutura de Arquivos

### Web/Preview
- `public/sounds/notification_sound.wav` - Arquivo WAV original de alta qualidade
- Usado automaticamente no preview web e navegadores

### Android (Nativo)
- **Local necessário**: `android/app/src/main/res/raw/notification_sound.mp3`
- **Formato**: MP3
- **Ação necessária**: Conversão WAV → MP3 e cópia manual

### iOS (Nativo)
- **Local necessário**: `ios/App/App/sounds/notification_sound.caf`
- **Formato**: CAF (Core Audio Format)
- **Ação necessária**: Conversão WAV → MP3 → CAF e configuração no Xcode

## 🎵 Sobre o Som

- **Nome**: Cash Register "Cha-Ching"
- **Formato original**: WAV (alta qualidade)
- **Duração**: ~2 segundos (ideal para notificações)
- **Uso**: Notifica vendedores quando recebem comissão de uma venda

## 🔄 Como Converter os Formatos

### Converter WAV para MP3 (Android/Web)

#### Opção A - Online (Recomendado)
1. Acesse: https://cloudconvert.com/wav-to-mp3
2. Faça upload do arquivo `public/sounds/notification_sound.wav`
3. Clique em "Convert"
4. Faça download do arquivo `notification_sound.mp3`

#### Opção B - FFmpeg (Linha de Comando)
```bash
cd public/sounds
ffmpeg -i notification_sound.wav -codec:a libmp3lame -qscale:a 2 notification_sound.mp3
```

### Converter MP3 para CAF (iOS)

#### Opção A - Mac (Terminal)
```bash
afconvert -f caff -d LEI16 notification_sound.mp3 notification_sound.caf
```

#### Opção B - Online
1. Acesse: https://cloudconvert.com/mp3-to-caf
2. Faça upload do arquivo `notification_sound.mp3`
3. Clique em "Convert"
4. Faça download do arquivo `notification_sound.caf`

## 📱 Sincronização para Android

### Passo a Passo

```bash
# 1. Git pull do projeto
git pull

# 2. Instalar dependências
npm install

# 3. Build do projeto
npm run build

# 4. Se ainda não adicionou Android, adicione:
npx cap add android

# 5. Converter o som para MP3 (se ainda não fez)
# Use uma das opções de conversão acima

# 6. Criar a pasta raw (se não existir)
mkdir -p android/app/src/main/res/raw

# 7. Copiar o arquivo MP3 para a pasta raw
cp notification_sound.mp3 android/app/src/main/res/raw/notification_sound.mp3

# 8. Sincronizar com Capacitor
npx cap sync android

# 9. Abrir no Android Studio
npx cap open android

# 10. No Android Studio:
# - Menu: Build > Rebuild Project
# - Aguardar o rebuild completar
# - Rodar o app em um dispositivo ou emulador
```

### Verificar no Android Studio

Após abrir o projeto no Android Studio:
1. No painel esquerdo, navegue até: `app > src > main > res > raw`
2. Verifique se o arquivo `notification_sound.mp3` está presente
3. Se não estiver, copie manualmente e faça "Sync Project with Gradle Files"

## 🍎 Sincronização para iOS

### Passo a Passo

```bash
# 1. Git pull do projeto
git pull

# 2. Instalar dependências
npm install

# 3. Build do projeto
npm run build

# 4. Se ainda não adicionou iOS, adicione:
npx cap add ios

# 5. Converter o som para CAF (se ainda não fez)
# Mac: afconvert -f caff -d LEI16 notification_sound.mp3 notification_sound.caf
# Ou use CloudConvert (opção online)

# 6. Criar a pasta de sons
mkdir -p ios/App/App/sounds

# 7. Copiar o arquivo CAF
cp notification_sound.caf ios/App/App/sounds/

# 8. Sincronizar com Capacitor
npx cap sync ios

# 9. Abrir no Xcode
npx cap open ios
```

### Configurar no Xcode

**IMPORTANTE**: Adicionar o arquivo ao bundle do app:

1. No Xcode, no **Project Navigator** (painel esquerdo)
2. Clique com botão direito em **"App"**
3. Selecione **"Add Files to App..."**
4. Navegue até: `ios/App/App/sounds/notification_sound.caf`
5. **Marque a opção**: "Copy items if needed"
6. Clique em **"Add"**

7. Verificar se foi adicionado corretamente:
   - Selecione o target "App" no Project Navigator
   - Vá em **"Build Phases"**
   - Expanda **"Copy Bundle Resources"**
   - Verifique se `notification_sound.caf` está na lista

8. Build e Run:
   - Menu: **Product > Clean Build Folder** (⇧⌘K)
   - Menu: **Product > Build** (⌘B)
   - Rodar em dispositivo ou simulador

## 🎛️ Configuração no OneSignal

### OneSignal Dashboard

1. Acesse o OneSignal Dashboard
2. Vá para **Messages > Journeys**
3. Abra a Journey "Nova Venda - Notificação para Vendedor"
4. Clique na mensagem **"Push Notification"**
5. Vá para a seção **"Platform Settings"** ou **"Advanced"**
6. No campo **"Sound"**, digite:
   ```
   notification_sound
   ```
   ⚠️ **IMPORTANTE**: Digite apenas `notification_sound` (sem extensão)
   - O OneSignal adiciona automaticamente `.caf` para iOS
   - E usa `.mp3` para Android

7. Salve e ative a Journey

## 🧪 Como Testar

### Web/Preview
1. Faça uma venda de teste através do checkout
2. O som deve tocar automaticamente no navegador
3. Verifique o console do navegador para logs

### Android
1. Instale o app no dispositivo Android físico
2. Feche completamente o app
3. Faça uma venda de teste
4. Você deve ouvir o som "cha-ching" quando a notificação chegar
5. **Dica**: Certifique-se de que o volume do dispositivo está alto

### iOS
1. Instale o app no dispositivo iOS físico (notificações não funcionam bem no simulador)
2. Feche completamente o app
3. Faça uma venda de teste
4. Você deve ouvir o som "cha-ching" quando a notificação chegar
5. **Dica**: Verifique se o modo silencioso está desligado

## ❗ Troubleshooting

### Som não toca no Android

**Problema**: Notificação chega mas sem som

**Soluções**:
1. Verificar se o arquivo está em: `android/app/src/main/res/raw/notification_sound.mp3`
2. Nome do arquivo deve ser exatamente: `notification_sound.mp3` (tudo minúsculo, sem espaços)
3. Fazer rebuild completo no Android Studio: `Build > Clean Project` depois `Build > Rebuild Project`
4. Verificar o volume do dispositivo
5. Verificar nas configurações do app se notificações têm permissão de som
6. No OneSignal, verificar se o campo Sound está como `notification_sound` (sem extensão)

### Som não toca no iOS

**Problema**: Notificação chega mas sem som

**Soluções**:
1. Verificar se o arquivo está em: `ios/App/App/sounds/notification_sound.caf`
2. Verificar se o arquivo foi adicionado ao bundle no Xcode:
   - Abrir Xcode
   - Selecionar target "App"
   - Build Phases > Copy Bundle Resources
   - Arquivo `notification_sound.caf` deve estar listado
3. Se não estiver, adicionar manualmente:
   - Botão direito em "App" no Project Navigator
   - "Add Files to App..."
   - Selecionar `notification_sound.caf`
   - Marcar "Copy items if needed"
4. Fazer Clean Build Folder: `Product > Clean Build Folder`
5. Fazer rebuild completo
6. Testar em dispositivo físico (simulador pode não reproduzir sons)
7. Verificar se o modo silencioso do iPhone está desligado (switch físico lateral)
8. No OneSignal, verificar se o campo Sound está como `notification_sound` (sem extensão)

### Notificação não chega

**Problema**: Nenhuma notificação é recebida

**Soluções**:
1. Verificar se o OneSignal está configurado corretamente no `capacitor.config.ts`
2. Verificar se o App ID do OneSignal está correto: `85da5c4b-c2a7-426f-851f-5c7c42afd64a`
3. Verificar se as permissões de notificação foram concedidas no dispositivo
4. Verificar se a Journey está ativa no OneSignal Dashboard
5. Verificar os logs do console para erros
6. Testar com uma notificação de teste diretamente do OneSignal Dashboard

### Erro de formato

**Problema**: Erro ao converter o arquivo

**Soluções**:
1. Para MP3: Use CloudConvert online (mais fácil)
2. Para CAF: 
   - No Mac, use `afconvert` (já vem instalado)
   - No Windows/Linux, use CloudConvert online
3. Verifique se o arquivo convertido não está corrompido:
   - Teste abrir o arquivo em um player de áudio
   - Verifique o tamanho do arquivo (não deve ser 0 bytes)

## 📋 Requisitos Técnicos

### Duração do Som
- **Máximo**: 30 segundos
- **Recomendado**: 1-3 segundos
- **Som atual**: ~2 segundos ✅

### Formatos Aceitos por Plataforma
- **Web**: WAV, MP3, OGG
- **Android**: MP3, WAV
- **iOS**: CAF, WAV, AIFF, M4A

### Tamanho do Arquivo
- **Máximo recomendado**: 1 MB
- **Som atual (WAV)**: Verificar propriedades do arquivo
- **Após conversão MP3**: ~50-200 KB (muito menor)

## 🔗 Links Úteis

### Conversores Online
- **WAV para MP3**: https://cloudconvert.com/wav-to-mp3
- **MP3 para CAF**: https://cloudconvert.com/mp3-to-caf
- **Conversor universal**: https://online-audio-converter.com/

### Documentação
- **OneSignal Sound Docs**: https://documentation.onesignal.com/docs/customize-notification-sounds
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Apple Sound Guidelines**: https://developer.apple.com/design/human-interface-guidelines/playing-audio

### Ferramentas
- **FFmpeg**: https://ffmpeg.org/download.html (converter áudio via terminal)
- **Audacity**: https://www.audacityteam.org/ (editor de áudio gratuito)

### Bibliotecas de Sons Gratuitos
- **Freesound**: https://freesound.org/
- **Zapsplat**: https://www.zapsplat.com/
- **SoundBible**: https://soundbible.com/

## ✅ Checklist de Implementação

### Implementação Inicial (Concluído)
- [x] Arquivo WAV adicionado em `public/sounds/notification_sound.wav`
- [x] Documentação criada
- [x] OneSignal configurado no projeto

### Sincronização Android (Fazer quando testar)
- [ ] Converter WAV para MP3
- [ ] Copiar MP3 para `android/app/src/main/res/raw/`
- [ ] Executar `npx cap sync android`
- [ ] Rebuild no Android Studio
- [ ] Testar em dispositivo físico

### Sincronização iOS (Fazer quando testar)
- [ ] Converter MP3 para CAF
- [ ] Copiar CAF para `ios/App/App/sounds/`
- [ ] Adicionar arquivo ao bundle no Xcode
- [ ] Clean Build Folder no Xcode
- [ ] Rebuild no Xcode
- [ ] Testar em dispositivo físico

### Configuração OneSignal (Fazer quando testar)
- [ ] Abrir Journey no OneSignal Dashboard
- [ ] Configurar campo "Sound" como `notification_sound`
- [ ] Ativar Journey
- [ ] Fazer venda de teste

## 💡 Dicas Adicionais

### Para Desenvolvedores
- Use `npx cap sync` sempre após modificar recursos nativos
- O arquivo CAF pode ser criado no Mac com o comando `afconvert` já instalado por padrão
- Para testar localmente no web, você pode usar o `notification_sound.wav` diretamente

### Para Testes
- Sempre teste em dispositivos físicos, não apenas simuladores
- Verifique se as notificações estão habilitadas nas configurações do dispositivo
- Para iOS, certifique-se de desligar o modo silencioso (switch lateral do iPhone)
- Para Android, verifique se o canal de notificações tem som habilitado

### Boas Práticas
- Mantenha o som curto (1-3 segundos)
- Use sons profissionais e agradáveis
- Teste o volume em diferentes dispositivos
- Considere a acessibilidade (alguns usuários podem não ouvir sons)

---

**Última atualização**: 2025-11-15
**Versão**: 1.0.0
