# 🎣 Custom Hooks - Kambafy

Este diretório contém hooks customizados reutilizáveis. Cada hook tem padrões específicos de uso para evitar bugs comuns.

## 📋 Índice de Hooks

### 1. `useStreamingQuery` 
**Localização**: `src/hooks/useStreamingQuery.ts`

**Propósito**: Carrega vendas (próprias + afiliado) com streaming de dados e estatísticas.

**⚠️ ATENÇÃO ESPECIAL**: Este hook requer padrão específico de uso para evitar loops infinitos.

**Documentação Completa**: [Ver STREAMING_QUERY_USAGE.md](../../docs/STREAMING_QUERY_USAGE.md)

**Uso Rápido**:
```typescript
const { loadOrdersWithStats, totalCount } = useStreamingQuery();
const hasLoadedRef = useRef(false);

const loadData = useCallback(async () => {
  await loadOrdersWithStats(userId, onStats, onOrders);
}, [userId]); // ⚠️ NÃO incluir loadOrdersWithStats aqui!

useEffect(() => {
  if (user && !hasLoadedRef.current) {
    hasLoadedRef.current = true;
    loadData();
  }
}, [user, loadData]);
```

---

### 2. `useTabVisibilityOptimizer`
**Localização**: `src/hooks/useTabVisibilityOptimizer.ts`

**Propósito**: Otimiza atualizações quando a tab está invisível.

**Uso**:
```typescript
const { shouldSkipUpdate } = useTabVisibilityOptimizer();

const loadData = async () => {
  if (shouldSkipUpdate(lastUpdate, 30000)) {
    return; // Skip se muito recente
  }
  // ... carregar dados
};
```

---

### 3. `useCurrencyToCountry`
**Localização**: `src/hooks/useCurrencyToCountry.ts`

**Propósito**: Mapeia moedas para países e bandeiras.

**Uso**:
```typescript
const { getCurrencyInfo } = useCurrencyToCountry();

const info = getCurrencyInfo('EUR');
// { country: 'Portugal', flag: '🇵🇹', currencyCode: 'EUR' }
```

---

## 🛡️ Padrões Gerais de Segurança

### 1. Use `useCallback` para funções que são dependências

```typescript
// ✅ CORRETO
const loadData = useCallback(async () => {
  // ...
}, [user, someState]);

// ❌ ERRADO - sem useCallback
const loadData = async () => {
  // ...
};
```

### 2. Use `useRef` para flags que não afetam UI

```typescript
// ✅ CORRETO - não causa re-render
const hasLoadedRef = useRef(false);

// ❌ EVITAR - causa re-render desnecessário
const [hasLoaded, setHasLoaded] = useState(false);
```

### 3. Sempre limpe efeitos com cleanup

```typescript
// ✅ CORRETO
useEffect(() => {
  const channel = supabase.channel('changes');
  // ...
  
  return () => {
    supabase.removeChannel(channel); // Cleanup
  };
}, []);
```

### 4. Evite dependências desnecessárias

```typescript
// ✅ CORRETO - apenas dependências necessárias
const processData = useCallback((data) => {
  return data.map(item => item.value);
}, []); // Função pura, sem dependências

// ❌ ERRADO - dependência desnecessária
const processData = useCallback((data) => {
  return data.map(item => item.value);
}, [user]); // user não é usado!
```

---

## 🐛 Problemas Comuns e Soluções

### Problema: "Too many re-renders"

**Causa**: useEffect ou useCallback com dependências que mudam constantemente.

**Solução**: 
1. Verifique se todas as dependências estão memoizadas
2. Use `useRef` para valores que não afetam a UI
3. Considere `useMemo` para objetos/arrays

### Problema: "Dados carregando múltiplas vezes"

**Causa**: useEffect executando mais vezes que o esperado.

**Solução**:
```typescript
const hasLoadedRef = useRef(false);

useEffect(() => {
  if (!hasLoadedRef.current) {
    hasLoadedRef.current = true;
    loadData();
  }
}, [loadData]);
```

### Problema: "Estado desatualizado em callback"

**Causa**: Closure capturando valor antigo.

**Solução**:
```typescript
// ✅ Use ref para valores atualizados
const valueRef = useRef(value);
useEffect(() => {
  valueRef.current = value;
}, [value]);

const callback = useCallback(() => {
  console.log(valueRef.current); // Sempre atual
}, []); // Pode ser array vazio!
```

---

## 📚 Recursos Adicionais

- [React Hooks Documentation](https://react.dev/reference/react)
- [useCallback Explained](https://react.dev/reference/react/useCallback)
- [useRef Explained](https://react.dev/reference/react/useRef)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

## ✅ Checklist para Criar Novo Hook

- [ ] Nome começa com `use`
- [ ] Usa hooks nativos do React adequadamente
- [ ] Tem documentação inline (JSDoc)
- [ ] Exemplos de uso no código ou em docs/
- [ ] Trata casos de erro
- [ ] Limpa recursos (cleanup functions)
- [ ] Testado em múltiplos cenários
- [ ] Memoização apropriada (useCallback/useMemo)

---

## 🆘 Precisa de Ajuda?

Se encontrar bugs ou comportamentos estranhos:

1. Verifique se está seguindo os padrões deste README
2. Leia a documentação específica do hook em `/docs`
3. Adicione logs para debugar o fluxo
4. Verifique o console do navegador por warnings do React

**Lembre-se**: Hooks são poderosos mas exigem cuidado. Sempre siga os padrões estabelecidos! 🚀
