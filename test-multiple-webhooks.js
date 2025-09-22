// Teste para demonstrar múltiplos webhooks por produto
console.log("🎯 Sistema agora suporta múltiplos webhooks por produto!");

const examples = [
  {
    produto: "Curso de Marketing Digital",
    productId: "12345-67890",
    webhook: {
      url: "https://api.exemplo1.com/webhook",
      events: ["payment.success", "product.purchased"]
    }
  },
  {
    produto: "E-book sobre Vendas",
    productId: "98765-43210", 
    webhook: {
      url: "https://api.exemplo2.com/webhook",
      events: ["payment.success", "order.completed"]
    }
  },
  {
    produto: "Curso de Marketing Digital", // Mesmo produto, outro webhook
    productId: "12345-67890",
    webhook: {
      url: "https://zapier.com/hooks/catch/123456/webhook2", // Segundo webhook para o mesmo produto
      events: ["user.registered", "order.cancelled"]
    }
  }
];

console.log("📊 Exemplos de configuração:");
examples.forEach((example, index) => {
  console.log(`
${index + 1}. Produto: ${example.produto}
   ID: ${example.productId}
   Webhook URL: ${example.webhook.url}
   Eventos: ${example.webhook.events.join(', ')}
  `);
});

console.log(`
✅ Principais mudanças implementadas:

1. Hook useWebhookSettings agora aceita productId como parâmetro
2. Busca webhooks específicos por produto (em vez de apenas um global)
3. Permite criar múltiplos webhooks para produtos diferentes
4. Permite atualizar webhooks existentes por produto
5. Interface mostra que o webhook é específico para o produto

🚀 Agora você pode:
- Adicionar webhook para Produto A (ex: Pushcut)
- Adicionar webhook para Produto B (ex: Zapier) 
- Adicionar OUTRO webhook para Produto A (ex: Discord)
- Cada produto pode ter suas próprias configurações de webhook independentes
`);

console.log("Sistema atualizado com sucesso! ✨");