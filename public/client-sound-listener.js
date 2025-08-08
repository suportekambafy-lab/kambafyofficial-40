
// Cliente melhorado para escutar mensagens do service worker e tocar sons
console.log('Client Sound Listener: Carregado e inicializando...');

// Função melhorada para tocar o som de moedas
function playNotificationSound() {
  try {
    console.log('🔊 [SOM] Tentando tocar som de notificação');
    
    // FORÇAR som de moeda do Supabase
    const soundUrls = [
      'https://hcbkqygdtzpxvctfdqbd.supabase.co/storage/v1/object/public/sons/coins-shopify.mp3.mp3'
    ];
    
    console.log('🔊 [SOM] URLs disponíveis:', soundUrls);
    
    // Tentar cada URL sequencialmente
    let audioAttempt = 0;
    const tryNextAudio = () => {
      if (audioAttempt >= soundUrls.length) {
        console.warn('🔊 [SOM] Todos os áudios falharam, usando fallback sintético');
        playFallbackSound();
        return;
      }
      
      const url = soundUrls[audioAttempt];
      console.log(`🔊 [SOM] Tentativa ${audioAttempt + 1}: ${url}`);
      
      const audio = new Audio(url);
      audio.volume = 0.8;
      audio.preload = 'auto';
      
      audio.addEventListener('loadeddata', () => {
        console.log(`🔊 [SOM] Áudio carregado: ${url}`);
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log(`🔊 [SOM] Áudio pronto para reproduzir: ${url}`);
      });
      
      audio.addEventListener('error', (e) => {
        console.error(`🔊 [SOM] Erro ao carregar ${url}:`, e);
        audioAttempt++;
        tryNextAudio();
      });
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`✅ [SOM] Som tocado com sucesso: ${url}`);
          })
          .catch((error) => {
            console.warn(`❌ [SOM] Falha ao tocar ${url}:`, error);
            audioAttempt++;
            tryNextAudio();
          });
      }
    };
    
    tryNextAudio();
    
  } catch (error) {
    console.error('🔊 [SOM] Erro crítico ao tocar som:', error);
    playFallbackSound();
  }
}

// Função de fallback para som sintético
function playFallbackSound() {
  try {
    console.log('🔧 [SOM] Gerando som sintético de moedas...');
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      
      // Som de moeda sintético (múltiplos tons)
      const frequencies = [523, 659, 784]; // C5, E5, G5 (acorde de Dó maior)
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
          o.start();
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          o.stop(ctx.currentTime + 0.35);
        }, index * 100);
      });
      
      console.log('✅ [SOM] Som sintético de moedas gerado');
    }
  } catch (e) {
    console.warn('🔧 [SOM] Fallback sintético falhou:', e);
  }
}

// MELHORADO: Inicialização e escuta de mensagens
function inicializarClientSoundListener() {
  console.log('🎧 [LISTENER] Inicializando sistema de notificações...');
  
  if ('serviceWorker' in navigator) {
    // Escutar mensagens do service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('🎧 [LISTENER] Mensagem recebida do Service Worker:', event.data);
      
      if (event.data && (event.data.type === 'TOCAR_SOM_VENDA' || event.data.type === 'PLAY_NOTIFICATION_SOUND')) {
        console.log('🎧 [LISTENER] ⚡ COMANDO PARA TOCAR SOM RECEBIDO!');
        console.log('🎧 [LISTENER] É venda?', event.data.isVenda);
        console.log('🎧 [LISTENER] Tipo de som:', event.data.sound);
        
        // SEMPRE tocar som de moeda para notificações de venda
        playNotificationSound();
      } else {
        console.log('🎧 [LISTENER] Mensagem ignorada, tipo:', event.data?.type);
      }
    });

    // Aguardar service worker estar pronto
    navigator.serviceWorker.ready
      .then((registration) => {
        console.log('🎧 [LISTENER] Service Worker está pronto', {
          active: !!registration.active,
          controller: !!navigator.serviceWorker.controller,
          scope: registration.scope
        });
      })
      .catch((error) => {
        console.error('🎧 [LISTENER] Erro ao aguardar service worker:', error);
      });
      
    // Verificar estado atual do service worker
    if (navigator.serviceWorker.controller) {
      console.log('Client Sound Listener: Service Worker controller disponível');
    } else {
      console.log('Client Sound Listener: Aguardando Service Worker controller...');
      
      // Aguardar controller ficar disponível
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Client Sound Listener: Service Worker controller mudou');
        if (navigator.serviceWorker.controller) {
          console.log('Client Sound Listener: Controller agora disponível');
        }
      });
    }
  } else {
    console.warn('Client Sound Listener: Service Worker não é suportado neste navegador');
  }
}

// Expor função para teste direto
window.playNotificationSound = playNotificationSound;

// MELHORADA: Função global para disparar notificação de venda
window.notificarVenda = function(valorComissao, produtoNome) {
  console.log('Cliente: Disparando notificação de venda:', { valorComissao, produtoNome });
  
  const dadosNotificacao = {
    type: 'VENDA_REALIZADA',
    valorComissao: valorComissao,
    produtoNome: produtoNome,
    timestamp: Date.now()
  };
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        console.log('Cliente: Service Worker pronto para receber notificação');
        
        // Enviar para o service worker ativo
        if (registration.active) {
          console.log('Cliente: Enviando mensagem para Service Worker ativo');
          registration.active.postMessage(dadosNotificacao);
        } else {
          console.warn('Cliente: Service Worker não está ativo');
        }
        
        // Também tentar via controller se existir
        if (navigator.serviceWorker.controller) {
          console.log('Cliente: Enviando via controller');
          navigator.serviceWorker.controller.postMessage(dadosNotificacao);
        } else {
          console.warn('Cliente: Controller não disponível');
        }
        
        console.log('Cliente: Notificação de venda enviada para Service Worker');
      })
      .catch((error) => {
        console.error('Cliente: Erro ao enviar notificação:', error);
      });
  } else {
    console.warn('Cliente: Service Worker não é suportado');
    
    // Fallback: tentar mostrar notificação diretamente
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('Kambafy - Venda Realizada! 🎉', {
          body: `Sua comissão: ${valorComissao}\nProduto: ${produtoNome}`,
          icon: "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3e%3crect width='192' height='192' rx='24' fill='%2316a34a'/%3e%3ctext x='96' y='132' text-anchor='middle' fill='white' font-family='system-ui' font-size='120' font-weight='bold'%3eK%3c/text%3e%3c/svg%3e",
          tag: 'kambafy-sale-fallback'
        });
        
        // Tocar som junto com notificação
        playNotificationSound();
        
        // Fechar após 5 segundos
        setTimeout(() => notification.close(), 5000);
        
      } catch (error) {
        console.error('Cliente: Erro ao mostrar notificação fallback:', error);
      }
    }
  }
};

// Função para testar notificações (para desenvolvimento)
window.testarNotificacaoKambafy = function(valor = '5.000 KZ', produto = 'Curso Digital') {
  console.log('Cliente: Testando notificação:', { valor, produto });
  window.notificarVenda(valor, produto);
};

// MELHORADA: Função para solicitar permissão de notificação
window.solicitarPermissaoNotificacao = async function() {
  console.log('🔔 [PERMISSÕES] Solicitando permissão de notificação...');
  
  if ('Notification' in window) {
    const currentPermission = Notification.permission;
    console.log('🔔 [PERMISSÕES] Status atual:', currentPermission);
    
    if (currentPermission === 'denied') {
      console.warn('🔔 [PERMISSÕES] ❌ Permissões foram NEGADAS pelo usuário');
      console.warn('🔔 [PERMISSÕES] 💡 Para ativar: vá em Configurações do Site > Notificações > Permitir');
      alert('🔔 Notificações estão BLOQUEADAS!\n\n💡 Para receber alertas de venda:\n1. Clique no ícone 🔒 ao lado da URL\n2. Mude "Notificações" para "Permitir"\n3. Recarregue a página');
      return 'denied';
    }
    
    if (currentPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('🔔 [PERMISSÕES] Nova permissão:', permission);
        
        if (permission === 'granted') {
          console.log('✅ [PERMISSÕES] Notificações permitidas!');
          
          // Limpar subscriptions antigas duplicadas
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(async (registration) => {
              console.log('🧹 [LIMPEZA] Limpando subscriptions duplicadas...');
              const subscription = await registration.pushManager.getSubscription();
              if (subscription) {
                console.log('🧹 [LIMPEZA] Subscription atual encontrada');
              }
            });
          }
          
          // Testar com uma notificação de boas-vindas
          setTimeout(() => {
            console.log('🔔 [TESTE] Enviando notificação de teste...');
            window.testarNotificacaoKambafy('1.250 KZ', 'E-book Teste');
          }, 1000);
        } else {
          console.warn('🔔 [PERMISSÕES] ❌ Permissão negada');
        }
        
        return permission;
      } catch (error) {
        console.error('🔔 [PERMISSÕES] ❌ Erro ao solicitar permissão:', error);
        return 'error';
      }
    } else {
      console.log('🔔 [PERMISSÕES] ✅ Permissão já definida:', currentPermission);
      return currentPermission;
    }
  } else {
    console.warn('🔔 [PERMISSÕES] ❌ Notificações não são suportadas neste navegador');
    return 'not-supported';
  }
};

// Verificar permissão de notificação e inicializar
function verificarEInicializar() {
  console.log('Client Sound Listener: Verificando permissões e inicializando...');
  
  // Garantir que o Service Worker esteja registrado
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration()
      .then((reg) => {
        if (!reg) {
          console.log('Client Sound Listener: Registrando Service Worker /sw.js');
          return navigator.serviceWorker.register('/sw.js');
        }
      })
      .catch((e) => console.error('Erro ao registrar Service Worker:', e));
  }
  
  if ('Notification' in window) {
    const permission = Notification.permission;
    console.log('🔔 [PERMISSÕES] Status atual:', permission);
    
    // Se ainda não foi solicitada ou negada, solicitar automaticamente após 1 segundo
    if (permission === 'default' || permission === 'denied') {
      setTimeout(() => {
        console.log('🔔 [PERMISSÕES] Solicitando permissão automaticamente...');
        window.solicitarPermissaoNotificacao();
      }, 1000);
    } else if (permission === 'granted') {
      console.log('✅ [PERMISSÕES] Notificações já permitidas!');
    }
  }
  
  // Inicializar listener de mensagens
  inicializarClientSoundListener();
}

// Detectar quando o usuário está ativo para melhor experiência (otimizado)
let userIsActive = true;
let lastVisibilityLog = 0;

document.addEventListener('visibilitychange', () => {
  const now = Date.now();
  userIsActive = !document.hidden;
  
  // Throttle logs para evitar spam
  if (now - lastVisibilityLog > 5000) {
    console.log('Client Sound Listener: Usuário ativo:', userIsActive);
    lastVisibilityLog = now;
  }
  // REMOVIDO: não fazer refresh automático ao retornar para a aba
});

// Adicionar logs de interação para debug
document.addEventListener('click', () => {
  console.log('Client Sound Listener: Clique detectado (útil para tocar sons)');
}, { once: true });

// Inicializar quando DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', verificarEInicializar);
} else {
  // DOM já carregado
  verificarEInicializar();
}

// Também inicializar imediatamente para casos onde o script carrega após DOM ready
setTimeout(verificarEInicializar, 100);

console.log('Client Sound Listener: Script totalmente carregado e configurado');
