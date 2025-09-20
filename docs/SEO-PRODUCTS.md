# SEO para Produtos - Sistema Completo

Este documento explica como funciona o sistema SEO otimizado para produtos no Kambafy.

## Visão Geral

O sistema SEO para produtos utiliza **prerendering** através de Edge Functions para garantir que crawlers de redes sociais (Facebook, WhatsApp, Twitter, etc.) vejam as meta tags corretas com informações do produto específico.

## Como Funciona

### 1. URLs de Prerender

Quando alguém compartilha um link de produto, o sistema gera automaticamente uma URL otimizada:

- **Produto**: `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/product-prerender/[PRODUCT_ID]`
- **Checkout**: `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/checkout-prerender/[PRODUCT_ID]`

### 2. Edge Functions

#### `product-prerender`
- Gera HTML otimizado para qualquer produto
- Inclui Open Graph, Twitter Cards, Schema.org
- Redireciona usuários normais para o checkout
- Cache de 5-10 minutos

#### `checkout-prerender` 
- Específico para páginas de checkout
- Mesmas funcionalidades SEO
- Foca no contexto de compra

### 3. Componentes React

#### `ProductLink`
```tsx
<ProductLink productId="abc-123" context="product">
  Compartilhar Produto
</ProductLink>
```
- Gera links SEO-friendly automaticamente
- Prefetch para melhor performance
- Funciona com crawlers e usuários normais

#### `ProductShareDialog`
- Usa o novo sistema SEO
- Gera links otimizados para redes sociais
- Suporte a Web Share API

### 4. Utilidades SEO

#### `src/utils/productSEO.ts`
```typescript
// Gerar link SEO
const link = generateProductSEOLink(productId, 'product');

// Dados Open Graph
const ogData = generateProductOGData(product);

// Structured Data
const jsonLD = generateProductStructuredData(product);

// Copiar link otimizado
await copyProductLink(productId);

// Compartilhar via Web Share API
await shareProduct(product);
```

## Meta Tags Geradas

### Open Graph (Facebook, WhatsApp)
```html
<meta property="og:type" content="product" />
<meta property="og:title" content="[PRODUTO] | Kambafy" />
<meta property="og:description" content="[DESCRIÇÃO]" />
<meta property="og:image" content="[CAPA_DO_PRODUTO]" />
<meta property="og:url" content="[URL_DO_PRODUTO]" />
<meta property="product:price:amount" content="[PREÇO]" />
<meta property="product:price:currency" content="AOA" />
```

### Twitter Cards
```html
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:title" content="[PRODUTO] | Kambafy" />
<meta property="twitter:description" content="[DESCRIÇÃO]" />
<meta property="twitter:image" content="[CAPA_DO_PRODUTO]" />
```

### Schema.org (Google)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[PRODUTO]",
  "description": "[DESCRIÇÃO]",
  "image": "[CAPA_DO_PRODUTO]",
  "offers": {
    "@type": "Offer",
    "price": "[PREÇO]",
    "priceCurrency": "AOA",
    "availability": "https://schema.org/InStock"
  }
}
```

## Configuração SEO por Produto

Cada produto pode ter campos SEO personalizados:

- `seo_title`: Título customizado (senão usa nome do produto)
- `seo_description`: Descrição customizada (senão usa description)
- `seo_keywords`: Array de palavras-chave
- `image_alt`: Texto alternativo da imagem
- `cover`: Imagem de capa (processada automaticamente)

## Detecção Automática

O script `public/product-seo-loader.js` detecta automaticamente:
- URLs de checkout: `/checkout/[id]`
- URLs de produto: `/produto/[id]`
- Aplica SEO dinamicamente via JavaScript

## Fluxo de Compartilhamento

1. **Usuário gera link** → Sistema usa prerender URL
2. **Crawler acessa** → Edge Function retorna HTML com meta tags
3. **Rede social** → Exibe preview com dados do produto
4. **Usuário clica** → Redireciona para checkout na SPA

## Performance

- **Cache**: 5-10 minutos nas Edge Functions
- **Prefetch**: Links são pré-carregados no hover
- **CDN**: Supabase Edge distribui globalmente
- **Fallback**: Script JS para SPAs

## URLs Suportadas

- `/checkout/[id]` → Sempre funciona
- `/produto/[id]` → Nova rota adicionada
- Links diretos via `ProductLink` component

## Testando o SEO

### Ferramentas de Teste
1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **LinkedIn Inspector**: https://www.linkedin.com/post-inspector/
4. **WhatsApp**: Compartilhar link e ver preview

### URL de Teste
```
https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/product-prerender/[PRODUCT_ID]
```

## Monitoramento

- Logs nas Edge Functions mostram acessos
- Console do navegador mostra aplicação de SEO
- Analytics podem rastrear origins de tráfego social

## Próximos Passos

1. **Implementar analytics** de compartilhamento
2. **A/B testing** de meta tags
3. **Imagens otimizadas** para diferentes redes
4. **Rich snippets** adicionais (reviews, availability)
5. **Sitemap** com produtos dinâmicos