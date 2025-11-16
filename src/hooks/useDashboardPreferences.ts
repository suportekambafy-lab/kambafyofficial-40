import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface WidgetConfig {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'custom';
  visible: boolean;
  order: number;
  size?: 'small' | 'medium' | 'large';
}

export interface DashboardPreferences {
  widgets: WidgetConfig[];
  layout: 'grid' | 'list';
  quickFilter: string;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'revenue', title: 'Receita Total', type: 'metric', visible: true, order: 0, size: 'medium' },
  { id: 'sales', title: 'Vendas Totais', type: 'metric', visible: true, order: 1, size: 'medium' },
  { id: 'chart', title: 'Gráfico de Vendas', type: 'chart', visible: true, order: 2, size: 'large' },
  { id: 'recent', title: 'Vendas Recentes', type: 'list', visible: true, order: 3, size: 'large' },
  { id: 'achievements', title: 'Conquistas Kamba', type: 'custom', visible: true, order: 4, size: 'large' },
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  widgets: DEFAULT_WIDGETS,
  layout: 'grid',
  quickFilter: '7days',
};

export function useDashboardPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem(`dashboard_prefs_${user?.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = (newPreferences: Partial<DashboardPreferences>) => {
    try {
      const updated = { ...preferences, ...newPreferences };
      setPreferences(updated);
      localStorage.setItem(`dashboard_prefs_${user?.id}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
    }
  };

  const updateWidgetVisibility = (widgetId: string, visible: boolean) => {
    const updatedWidgets = preferences.widgets.map(w =>
      w.id === widgetId ? { ...w, visible } : w
    );
    savePreferences({ widgets: updatedWidgets });
  };

  const reorderWidgets = (newOrder: WidgetConfig[]) => {
    const updatedWidgets = newOrder.map((w, index) => ({ ...w, order: index }));
    savePreferences({ widgets: updatedWidgets });
  };

  const resetPreferences = () => {
    savePreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    loading,
    savePreferences,
    updateWidgetVisibility,
    reorderWidgets,
    resetPreferences,
  };
}
