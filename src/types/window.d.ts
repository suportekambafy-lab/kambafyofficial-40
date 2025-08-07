
declare global {
  interface Window {
    solicitarPermissaoNotificacao?: () => Promise<string>;
    testarNotificacaoKambafy?: (valor?: string, produto?: string) => void;
    notificarVenda?: (valorComissao: string, produtoNome: string) => void;
  }
}

export {};
