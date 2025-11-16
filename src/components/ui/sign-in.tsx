import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  loading?: boolean;
  error?: string;
  showUserTypeSelection?: boolean;
  onUserTypeSelect?: (type: 'customer' | 'seller') => void;
  selectedUserType?: 'customer' | 'seller' | null;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Bem-vindo!</span>,
  description = "Acesse sua conta e continue sua jornada conosco",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onResetPassword,
  onCreateAccount,
  loading = false,
  error,
  showUserTypeSelection = false,
  onUserTypeSelect,
  selectedUserType,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    console.log('🎨 SignInPage - Current theme:', theme);
    console.log('🎨 SignInPage - HTML classes:', document.documentElement.classList.toString());
  }, [theme]);

  // Sempre mostrar as opções de seleção se não foi selecionado um tipo
  if (!selectedUserType) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row font-geist w-full overflow-x-hidden">
        {/* Left column: user type selection */}
        <section className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-4 md:gap-6">
              <h1 className="animate-element animate-delay-100 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                <span className="font-light text-foreground tracking-tighter">Bem-vindo ao Kambafy!</span>
              </h1>
              <p className="animate-element animate-delay-200 text-sm md:text-base text-muted-foreground">
                Escolha como deseja acessar sua conta
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => onUserTypeSelect?.('customer')}
                  className="animate-element animate-delay-300 w-full p-6 rounded-2xl border-2 border-border hover:border-primary/50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <span className="text-xl md:text-2xl">🛒</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg">Área do Cliente</h3>
                      <p className="text-sm text-muted-foreground">Ver meus cursos e produtos com acesso</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onUserTypeSelect?.('seller')}
                  className="animate-element animate-delay-400 w-full p-6 rounded-2xl border-2 border-border hover:border-primary/50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <span className="text-2xl">💼</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Gerenciar Meus Negócios</h3>
                      <p className="text-sm text-muted-foreground">Gerenciar produtos e vendas</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right column: hero image + testimonials */}
        {heroImageSrc && (
          <section className="hidden md:block flex-1 relative p-4">
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
            {testimonials.length > 0 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
                <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
                {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="animate-element animate-delay-50 flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <button
                onClick={() => onUserTypeSelect?.(null)}
                className="text-primary hover:underline"
              >
                ← Alterar tipo de acesso
              </button>
              <span>•</span>
              <span>
                {selectedUserType === 'customer' ? 'Acesso de Cliente' : 'Acesso de Vendedor'}
              </span>
            </div>
            
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

              {error && (
                <div className="animate-element animate-delay-250 p-3 md:p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs md:text-sm">
                  {error}
                </div>
              )}

              <form className="space-y-4 md:space-y-5" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Endereço de Email</label>
                <GlassInputWrapper>
                  <input 
                    name="email" 
                    type="email" 
                    placeholder="Digite seu endereço de email" 
                    className="auth-input w-full bg-transparent p-4 rounded-2xl focus:outline-none"
                    style={{ fontSize: '16px' }}
                    disabled={loading}
                    required 
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Senha</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Digite sua senha" 
                      className="auth-input w-full bg-transparent p-4 pr-12 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={loading}
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute inset-y-0 right-3 flex items-center"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" disabled={loading} />
                  <span className="text-foreground/90">Manter-me conectado</span>
                </label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} 
                  className="hover:underline text-violet-400 transition-colors"
                >
                  Esqueci a senha
                </a>
              </div>

              <button 
                type="submit" 
                className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="animate-element animate-delay-700 text-center text-sm text-muted-foreground">
              Novo na plataforma? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-violet-400 hover:underline transition-colors">Criar Conta</a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
