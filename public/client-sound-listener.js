
// Cliente melhorado para escutar mensagens do service worker e tocar sons
console.log('Client Sound Listener: Carregado e inicializando...');

// Função melhorada para tocar o som de moedas
function playNotificationSound() {
  try {
    console.log('Client Sound Listener: Tentando tocar som de notificação');
    
    // Criar elemento de áudio
    const audio = new Audio('/sounds/coins-shopify.mp3'); // Som de moedas estilo Shopify
    audio.volume = 1.0; // Volume máximo
    audio.preload = 'auto';
    
    // Log do estado do áudio
    console.log('Audio criado:', {
      src: audio.src,
      volume: audio.volume,
      readyState: audio.readyState
    });
    
    // Tentar tocar o som
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Client Sound Listener: Som de notificação tocado com sucesso');
        })
        .catch((error) => {
          console.warn('Client Sound Listener: Não foi possível tocar o som automaticamente:', error);

          // Fallback imediato com WebAudio (beep curto)
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = 'sine';
              o.frequency.value = 880; // A5
              o.connect(g);
              g.connect(ctx.destination);
              g.gain.setValueAtTime(0.001, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
              o.start();
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
              o.stop(ctx.currentTime + 0.3);
            }
          } catch (e) {
            console.warn('WebAudio beep fallback falhou:', e);
          }
          
          // Adicionar listener para próxima interação do usuário
          const playOnNextClick = () => {
            audio.play()
              .then(() => console.log('Som tocado após interação do usuário'))
              .catch(e => console.error('Erro ao tocar som após interação:', e));
            
            // Remover listener após uso
            document.removeEventListener('click', playOnNextClick);
            document.removeEventListener('touchstart', playOnNextClick);
            document.removeEventListener('keydown', playOnNextClick);
          };
          
          // Adicionar múltiplos tipos de eventos para maior compatibilidade
          document.addEventListener('click', playOnNextClick, { once: true });
          document.addEventListener('touchstart', playOnNextClick, { once: true });
          document.addEventListener('keydown', playOnNextClick, { once: true });
        });
    }
  } catch (error) {
    console.error('Client Sound Listener: Erro ao criar/tocar som:', error);
  }
}

// MELHORADO: Inicialização e escuta de mensagens
function inicializarClientSoundListener() {
  console.log('Client Sound Listener: Inicializando sistema de notificações...');
  
  if ('serviceWorker' in navigator) {
    // Escutar mensagens do service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Client Sound Listener: Mensagem recebida do Service Worker:', event.data);
      
      if (event.data && (event.data.type === 'TOCAR_SOM_VENDA' || event.data.type === 'PLAY_NOTIFICATION_SOUND')) {
        console.log('Client Sound Listener: Comando para tocar som recebido');
        playNotificationSound();
      }
    });

    // Aguardar service worker estar pronto
    navigator.serviceWorker.ready
      .then((registration) => {
        console.log('Client Sound Listener: Service Worker está pronto', {
          active: !!registration.active,
          controller: !!navigator.serviceWorker.controller,
          scope: registration.scope
        });
      })
      .catch((error) => {
        console.error('Client Sound Listener: Erro ao aguardar service worker:', error);
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
  console.log('Cliente: Solicitando permissão de notificação...');
  
  if ('Notification' in window) {
    const currentPermission = Notification.permission;
    console.log('Permissão atual:', currentPermission);
    
    if (currentPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Nova permissão de notificação:', permission);
        
        if (permission === 'granted') {
          console.log('Notificações permitidas!');
          
          // Testar com uma notificação de boas-vindas
          setTimeout(() => {
            console.log('Enviando notificação de teste...');
            window.testarNotificacaoKambafy('1.250 KZ', 'E-book Teste');
          }, 1000);
        } else {
          console.warn('Permissão de notificação negada');
        }
        
        return permission;
      } catch (error) {
        console.error('Erro ao solicitar permissão:', error);
        return 'error';
      }
    } else {
      console.log('Permissão já definida:', currentPermission);
      return currentPermission;
    }
  } else {
    console.warn('Notificações não são suportadas neste navegador');
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
    console.log('Status de notificação atual:', permission);
    
    // Se ainda não foi solicitada permissão, solicitar após 3 segundos
    if (permission === 'default') {
      setTimeout(() => {
        console.log('Solicitando permissão de notificação automaticamente...');
        window.solicitarPermissaoNotificacao();
      }, 3000);
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
