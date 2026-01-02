import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Mail, Lock, User, MapPin, Briefcase, BookOpen, Video, Package, Sparkles, Check } from 'lucide-react';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import KambafyLogoGreen from '@/assets/kambafy-logo-green.png';
interface SignUpWizardProps {
  onComplete: (data: SignUpData) => void;
  onBack: () => void;
  loading?: boolean;
  error?: string;
}
export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  country: string;
  alreadySells: boolean;
  productTypes: string[];
}
const COUNTRIES = [{
  code: 'AO',
  name: 'Angola',
  flag: '🇦🇴',
  currency: 'KZ'
}, {
  code: 'MZ',
  name: 'Moçambique',
  flag: '🇲🇿',
  currency: 'MZN'
}, {
  code: 'PT',
  name: 'Portugal',
  flag: '🇵🇹',
  currency: 'EUR'
}, {
  code: 'ES',
  name: 'Espanha',
  flag: '🇪🇸',
  currency: 'EUR'
}, {
  code: 'BR',
  name: 'Brasil',
  flag: '🇧🇷',
  currency: 'BRL'
}, {
  code: 'GB',
  name: 'Reino Unido',
  flag: '🇬🇧',
  currency: 'GBP'
}, {
  code: 'US',
  name: 'Estados Unidos',
  flag: '🇺🇸',
  currency: 'USD'
}];
const PRODUCT_TYPES = [{
  id: 'ebook',
  label: 'E-books',
  icon: BookOpen,
  description: 'PDFs, guias, manuais'
}, {
  id: 'curso',
  label: 'Cursos Online',
  icon: Video,
  description: 'Videoaulas, formações'
}, {
  id: 'mentoria',
  label: 'Mentorias',
  icon: User,
  description: 'Acompanhamento 1:1'
}, {
  id: 'template',
  label: 'Templates',
  icon: Package,
  description: 'Modelos prontos'
}, {
  id: 'outro',
  label: 'Outros',
  icon: Sparkles,
  description: 'Serviços, físicos'
}];
export const SignUpWizard: React.FC<SignUpWizardProps> = ({
  onComplete,
  onBack,
  loading = false,
  error
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Dados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('AO');
  const [alreadySells, setAlreadySells] = useState<boolean | null>(null);
  const [productTypes, setProductTypes] = useState<string[]>([]);

  // Erros locais
  const [localError, setLocalError] = useState('');

  // Detecção de país por IP
  const {
    userCountry,
    loading: geoLoading
  } = useGeoLocation();

  // Atualizar país detectado
  useEffect(() => {
    if (userCountry?.code && !geoLoading) {
      const supportedCountry = COUNTRIES.find(c => c.code === userCountry.code);
      if (supportedCountry) {
        setCountry(userCountry.code);
      }
    }
  }, [userCountry, geoLoading]);
  const validateStep = (currentStep: number): boolean => {
    setLocalError('');
    switch (currentStep) {
      case 1:
        if (!email.trim()) {
          setLocalError('Por favor, insira seu email');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setLocalError('Por favor, insira um email válido');
          return false;
        }
        if (!password) {
          setLocalError('Por favor, crie uma senha');
          return false;
        }
        if (password.length < 6) {
          setLocalError('A senha deve ter pelo menos 6 caracteres');
          return false;
        }
        if (password !== confirmPassword) {
          setLocalError('As senhas não coincidem');
          return false;
        }
        return true;
      case 2:
        if (!fullName.trim()) {
          setLocalError('Por favor, insira seu nome completo');
          return false;
        }
        if (fullName.trim().split(' ').length < 2) {
          setLocalError('Por favor, insira nome e sobrenome');
          return false;
        }
        return true;
      case 3:
        if (!country) {
          setLocalError('Por favor, selecione seu país');
          return false;
        }
        return true;
      case 4:
        if (alreadySells === null) {
          setLocalError('Por favor, selecione uma opção');
          return false;
        }
        if (productTypes.length === 0) {
          setLocalError('Por favor, selecione pelo menos um tipo de produto');
          return false;
        }
        return true;
      default:
        return true;
    }
  };
  const handleNext = () => {
    if (validateStep(step)) {
      if (step === totalSteps) {
        handleSubmit();
      } else {
        setStep(step + 1);
      }
    }
  };
  const handleBack = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep(step - 1);
      setLocalError('');
    }
  };
  const handleSubmit = () => {
    onComplete({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      country,
      alreadySells: alreadySells || false,
      productTypes
    });
  };
  const toggleProductType = (typeId: string) => {
    setProductTypes(prev => prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]);
  };
  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };
  return <div className="w-full max-w-md mx-auto">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="bg-card rounded-3xl border border-border shadow-xl p-6 md:p-8">
        {/* Logo */}
        <motion.div className="flex justify-center mb-6" initial={{
        scale: 0.8,
        opacity: 0
      }} animate={{
        scale: 1,
        opacity: 1
      }} transition={{
        delay: 0.1
      }}>
          <img src={KambafyLogoGreen} alt="Kambafy" className="h-10 object-contain" />
        </motion.div>
        
        {/* Barra de progresso */}
        <div className="flex gap-2 mb-6">
          {Array.from({
          length: totalSteps
        }).map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-primary' : i === step - 1 ? 'bg-primary' : 'bg-muted'}`} />)}
        </div>
        
        {/* Indicador de step */}
        <p className="text-xs text-muted-foreground text-center mb-4">
          Passo {step} de {totalSteps}
        </p>
        
        {/* Conteúdo do step */}
        <AnimatePresence mode="wait" custom={step}>
          <motion.div key={step} custom={step} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{
          duration: 0.3,
          ease: 'easeInOut'
        }}>
            {/* Step 1: Email e Senha */}
            {step === 1 && <div className="space-y-4">
                <div className="text-center mb-6">
                  
                  <h2 className="text-xl font-semibold text-foreground">Vamos começar!</h2>
                  <p className="text-sm text-muted-foreground mt-1">Crie suas credenciais de acesso</p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-foreground/5 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-colors" style={{
                  fontSize: '16px'
                }} autoComplete="email" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Senha</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full bg-foreground/5 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-colors" style={{
                  fontSize: '16px'
                }} autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck="false" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Confirmar Senha</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className="w-full bg-foreground/5 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-colors" style={{
                  fontSize: '16px'
                }} autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck="false" />
                  </div>
                </div>
              </div>}
            
            {/* Step 2: Nome Completo */}
            {step === 2 && <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Como podemos te chamar?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Seu nome aparecerá para seus clientes</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Nome Completo</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome e sobrenome" className="w-full bg-foreground/5 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-colors" style={{
                fontSize: '16px'
              }} autoComplete="name" />
                </div>
              </div>}
            
            {/* Step 3: País */}
            {step === 3 && <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">De onde você é?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Isso define a moeda da sua conta</p>
                </div>
                
                {geoLoading && <div className="text-center text-sm text-muted-foreground py-2">
                    <span className="animate-pulse">Detectando sua localização...</span>
                  </div>}
                
                <div className="grid grid-cols-1 gap-2">
                  {COUNTRIES.map(c => <button key={c.code} type="button" onClick={() => setCountry(c.code)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${country === c.code ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-foreground/5 text-muted-foreground hover:border-muted-foreground'}`}>
                      <span className="text-2xl">{c.flag}</span>
                      <div className="flex-1 text-left">
                        <span className="font-medium">{c.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.currency}</span>
                      {country === c.code && <Check className="w-5 h-5 text-primary" />}
                    </button>)}
                </div>
              </div>}
            
            {/* Step 4: O que vende */}
            {step === 4 && <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Sobre o seu negócio</h2>
                  <p className="text-sm text-muted-foreground mt-1">Queremos te conhecer melhor</p>
                </div>
                
                {/* Já vende online? */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Você já vende produtos digitais?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setAlreadySells(true)} className={`p-3 rounded-xl border transition-all ${alreadySells === true ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-foreground/5 text-muted-foreground hover:border-muted-foreground'}`}>
                      <span className="font-medium">Sim, já vendo</span>
                    </button>
                    <button type="button" onClick={() => setAlreadySells(false)} className={`p-3 rounded-xl border transition-all ${alreadySells === false ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-foreground/5 text-muted-foreground hover:border-muted-foreground'}`}>
                      <span className="font-medium">Ainda não</span>
                    </button>
                  </div>
                </div>
                
                {/* Tipos de produto */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    {alreadySells ? 'O que você vende?' : 'O que pretende vender?'}
                    <span className="text-xs ml-1">(selecione um ou mais)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {PRODUCT_TYPES.map(type => {
                  const Icon = type.icon;
                  const isSelected = productTypes.includes(type.id);
                  return <button key={type.id} type="button" onClick={() => toggleProductType(type.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-foreground/5 text-muted-foreground hover:border-muted-foreground'}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 text-left">
                            <span className="font-medium text-sm">{type.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{type.description}</span>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-primary" />}
                        </button>;
                })}
                  </div>
                </div>
              </div>}
          </motion.div>
        </AnimatePresence>
        
        {/* Erros */}
        {(localError || error) && <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {localError || error}
          </motion.div>}
        
        {/* Botões de navegação */}
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={handleBack} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-50">
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Voltar' : 'Anterior'}</span>
          </button>
          
          <button type="button" onClick={handleNext} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            <span>{step === totalSteps ? loading ? 'Criando...' : 'Criar Conta' : 'Continuar'}</span>
            {step < totalSteps && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Link para login */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Já tem uma conta?{' '}
          <button onClick={onBack} className="text-primary hover:underline">
            Fazer Login
          </button>
        </p>
      </motion.div>
    </div>;
};