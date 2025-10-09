# 📚 Guia de Uso do useStreamingQuery

## ⚠️ PROBLEMA CRÍTICO RESOLVIDO

Esse hook anteriormente causava loops infinitos quando usado incorretamente como dependência em `useCallback` ou `useEffect`.

## ✅ PADRÃO CORRETO DE USO

### 1. Importar o Hook

```typescript
import { useStreamingQuery } from '@/hooks/useStreamingQuery';
```

### 2. Usar no Componente

```typescript
export default function MyComponent() {
  const { user } = useAuth();
  const { loadOrdersWithStats, totalCount } = useStreamingQuery();
  const [data, setData] = useState([]);
  const hasLoadedRef = useRef(false); // ✅ IMPORTANTE

  // ✅ CORRETO: Não incluir loadOrdersWithStats nas dependências
  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      await loadOrdersWithStats(
        user.id,
        (stats) => {
          // Processar estatísticas
          console.log('Stats:', stats);
        },
        (orders) => {
          // Processar vendas
          setData(orders);
        }
      );
    } catch (error) {
      console.error('Erro:', error);
    }
  }, [user]); // ← Sem loadOrdersWithStats

  // ✅ CORRETO: Usar useRef para execução única
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, [user, loadData]);

  return (
    // ... seu componente
  );
}
```

## ❌ PADRÕES INCORRETOS (NÃO FAZER!)

### ❌ ERRADO: Incluir loadOrdersWithStats em dependências

```typescript
// ❌ ISSO CAUSA LOOPS INFINITOS!
const loadData = useCallback(async () => {
  await loadOrdersWithStats(...);
}, [user, loadOrdersWithStats]); // ← ERRADO!
```

### ❌ ERRADO: useEffect sem proteção

```typescript
// ❌ ISSO PODE CAUSAR MÚLTIPLAS EXECUÇÕES!
useEffect(() => {
  if (user) {
    loadData(); // Sem useRef de proteção
  }
}, [user, loadData]); // Pode re-executar várias vezes
```

## 🛡️ PROTEÇÕES IMPLEMENTADAS

O hook agora possui proteções contra:

1. **Chamadas Simultâneas**: Um `isLoadingRef` bloqueia chamadas enquanto outra está em andamento
2. **Aborts Automáticos**: Queries anteriores são canceladas automaticamente
3. **Limpeza de Estado**: O lock é liberado mesmo em caso de erro

## 📊 EXEMPLO COMPLETO

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { useStreamingQuery } from "@/hooks/useStreamingQuery";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Sales() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { loadOrdersWithStats, totalCount } = useStreamingQuery();
  
  const [sales, setSales] = useState([]);
  const [salesStats, setSalesStats] = useState({});
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const loadSales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      await loadOrdersWithStats(
        user.id,
        (stats) => {
          setSalesStats(stats);
        },
        (orders) => {
          setSales(orders);
        }
      );
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadSales();
    }
  }, [user, loadSales]);

  return (
    <div>
      <h1>Vendas ({totalCount})</h1>
      {/* ... resto do componente */}
    </div>
  );
}
```

## 🔍 POR QUE ESSE PADRÃO?

1. **`loadOrdersWithStats` é memoizado com `useCallback` e array vazio `[]`**
   - Isso torna a função estável através de re-renders
   - Mas o OBJETO retornado pelo hook muda a cada render
   
2. **Incluir em dependências causa loop**:
   - Component renderiza → cria novo objeto { loadOrdersWithStats }
   - useEffect detecta mudança → executa
   - setState → component renderiza → ciclo se repete

3. **Solução: Não incluir em dependências + useRef**
   - useRef mantém estado que não causa re-render
   - `hasLoadedRef.current` impede múltiplas execuções
   - Estado é preservado entre renders

## 📝 CHECKLIST ANTES DE USAR

- [ ] Importei o hook corretamente?
- [ ] Criei `hasLoadedRef = useRef(false)`?
- [ ] Meu `useCallback` NÃO inclui `loadOrdersWithStats`?
- [ ] Meu `useEffect` verifica `hasLoadedRef.current`?
- [ ] Atualizo `hasLoadedRef.current = true` antes de chamar a função?

## 🚨 SINAIS DE QUE ESTÁ ERRADO

Se você observar:
- Múltiplos logs de "📋 Iniciando carregamento..."
- Números de vendas diminuindo progressivamente
- Loading infinito
- Console mostrando várias execuções seguidas

**→ Revise seu padrão de uso seguindo este guia!**

## 💡 DICA EXTRA

Se precisar recarregar dados (botão refresh), não resete o `hasLoadedRef`:

```typescript
const handleRefresh = () => {
  // Não resete hasLoadedRef aqui
  loadSales(); // Chame diretamente
};
```

O `isLoadingRef` interno do hook já previne chamadas simultâneas.
