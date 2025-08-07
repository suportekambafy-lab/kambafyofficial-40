// Sistema de logging otimizado para produção

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  level: LogLevel;
  component?: string;
  data?: any;
}

class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  debug(message: string, options?: Omit<LogOptions, 'level'>) {
    this.log(message, { ...options, level: 'debug' });
  }

  info(message: string, options?: Omit<LogOptions, 'level'>) {
    this.log(message, { ...options, level: 'info' });
  }

  warn(message: string, options?: Omit<LogOptions, 'level'>) {
    this.log(message, { ...options, level: 'warn' });
  }

  error(message: string, options?: Omit<LogOptions, 'level'>) {
    this.log(message, { ...options, level: 'error' });
  }

  private log(message: string, options: LogOptions) {
    const { level, component, data } = options;
    
    // Em produção, só registrar erros e avisos críticos
    if (!this.isDevelopment && level !== 'error' && level !== 'warn') {
      return;
    }

    const logMethod = console[level] || console.log;
    const prefix = component ? `[${component}]` : '';
    
    if (data) {
      logMethod(`${prefix} ${message}`, data);
    } else {
      logMethod(`${prefix} ${message}`);
    }
  }
}

export const logger = new ProductionLogger();