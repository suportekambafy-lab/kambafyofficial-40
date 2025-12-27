"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, Variants } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { PlayStoreButton } from "@/components/ui/play-store-button";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { 
  Shield, 
  Rocket, 
  TrendingUp, 
  Download, 
  Fingerprint, 
  Compass,
  QrCode,
  Link2,
  Check,
  Smartphone,
  Percent,
  Building,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  BookOpen,
  Users,
  DollarSign,
  CreditCard,
  Video,
  FileText,
  Zap,
  Star,
  Globe,
  MessageCircle,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============= HERO PRINCIPAL =============
const InteractiveHeroFaciPay: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'vendedores' | 'compradores'>('vendedores');

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 10);
  });

  const handleAuthNavigation = (mode: 'login' | 'signup') => {
    navigate(`/auth?mode=${mode}`);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  // Animações
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  // Stats da plataforma
  const stats = [
    { number: "1000+", label: "Criadores Ativos" },
    { number: "15k+", label: "Alunos Satisfeitos" },
    { number: "AOA 50M+", label: "Vendas Processadas" },
    { number: "98%", label: "Satisfação" }
  ];

  // Recursos principais
  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Seguro",
      description: "Proteção avançada para garantir a segurança dos seus dados e transações."
    },
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "Ágil",
      description: "Vendas rápidas e pagamentos instantâneos, sem complicações."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Moderno",
      description: "Constantemente atualizado com novas funcionalidades e melhorias."
    }
  ];

  // Passos de como funciona
  const steps = [
    {
      icon: <Download className="w-8 h-8" />,
      title: "Faça Download e registe-se",
      description: "Baixe o app e crie sua conta em minutos"
    },
    {
      icon: <Fingerprint className="w-8 h-8" />,
      title: "Verifique a sua identidade",
      description: "Processo rápido e seguro de verificação"
    },
    {
      icon: <Compass className="w-8 h-8" />,
      title: "Explore um mundo sem limites",
      description: "Comece a vender ou comprar produtos digitais"
    }
  ];

  // Tipos de produtos
  const productTypes = [
    {
      icon: <Video className="w-8 h-8" />,
      title: "Cursos Online",
      description: "Venda cursos com área de membros completa"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "E-books",
      description: "Distribua e-books automaticamente"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Mentorias",
      description: "Ofereça consultorias e mentorias online"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Templates",
      description: "Venda templates, presets e recursos digitais"
    }
  ];

  // Vantagens
  const advantages = [
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "App Nativo",
      description: "Aplicativo Android e iOS para gerenciar vendas de qualquer lugar."
    },
    {
      icon: <Percent className="w-8 h-8" />,
      title: "Taxas Competitivas",
      description: "Apenas 8% por venda. Sem mensalidades ou custos fixos."
    },
    {
      icon: <Building className="w-8 h-8" />,
      title: "Pagamentos Locais",
      description: "Receba via Multicaixa Express, transferência bancária e muito mais."
    }
  ];

  // FAQs
  const faqs = [
    {
      question: "O que é necessário para criar uma conta Kambafy?",
      answer: "Para criar uma conta Kambafy, você precisa de um e-mail válido, número de telefone angolano e um documento de identificação. O processo é simples e leva apenas alguns minutos."
    },
    {
      question: "Como recebo os pagamentos das minhas vendas?",
      answer: "Você pode receber seus pagamentos via Multicaixa Express, transferência bancária ou através do saldo na plataforma. Os saques estão disponíveis a qualquer momento após a confirmação do pagamento."
    },
    {
      question: "Posso vender produtos para clientes fora de Angola?",
      answer: "Sim! A Kambafy está disponível em toda a lusofonia. Você pode vender para clientes em Angola, Brasil, Portugal e outros países de língua portuguesa."
    },
    {
      question: "Quais tipos de produtos posso vender na Kambafy?",
      answer: "Você pode vender cursos online, e-books, mentorias, templates, presets, consultorias e qualquer tipo de produto ou serviço digital. A plataforma suporta diversos formatos de conteúdo."
    }
  ];

  return (
    <div className="relative bg-gradient-to-b from-[#0a0a12] via-[#0d0d1a] to-[#0a0a12] text-white overflow-x-hidden min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#81e76a]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#81e76a]/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#0a0a12]/95 backdrop-blur-lg border-b border-white/5 shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/kambafy-logo-white.png" 
                alt="Kambafy" 
                className="h-10 lg:h-12 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('recursos')} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Recursos
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Como Funciona
              </button>
              <button onClick={() => scrollToSection('precos')} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Preços
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                FAQ
              </button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <button 
                onClick={() => handleAuthNavigation('login')}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Entrar
              </button>
              <Button
                onClick={() => handleAuthNavigation('signup')}
                className="bg-[#81e76a] hover:bg-[#81e76a]/90 text-[#0a0a12] font-semibold px-6"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#0a0a12]/98 backdrop-blur-lg border-b border-white/5"
            >
              <div className="px-4 py-6 space-y-4">
                <button onClick={() => scrollToSection('recursos')} className="block w-full text-left text-gray-300 hover:text-white py-2">Recursos</button>
                <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left text-gray-300 hover:text-white py-2">Como Funciona</button>
                <button onClick={() => scrollToSection('precos')} className="block w-full text-left text-gray-300 hover:text-white py-2">Preços</button>
                <button onClick={() => scrollToSection('faq')} className="block w-full text-left text-gray-300 hover:text-white py-2">FAQ</button>
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <Button variant="outline" onClick={() => handleAuthNavigation('login')} className="w-full border-white/20 text-white hover:bg-white/10">
                    Entrar
                  </Button>
                  <Button onClick={() => handleAuthNavigation('signup')} className="w-full bg-[#81e76a] hover:bg-[#81e76a]/90 text-[#0a0a12]">
                    Começar Agora
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 lg:pt-40 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Content */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="text-center lg:text-left"
              >
                <motion.div variants={fadeInUp} className="mb-6">
                  <span className="inline-flex items-center gap-2 bg-[#81e76a]/10 border border-[#81e76a]/20 rounded-full px-4 py-2 text-sm text-[#81e76a]">
                    <Star className="w-4 h-4 fill-[#81e76a]" />
                    Plataforma #1 de Infoprodutos em Angola
                  </span>
                </motion.div>

                <motion.h1 
                  variants={fadeInUp}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                >
                  Venda seus produtos digitais,{' '}
                  <span className="text-[#81e76a]">onde e quando quiser</span>
                </motion.h1>

                <motion.p 
                  variants={fadeInUp}
                  className="text-lg sm:text-xl text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0"
                >
                  Crie, gerencie e venda seus cursos, e-books e produtos digitais de forma segura e sem complicações. Acesse todas as suas vendas em qualquer lugar.
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                  <Button
                    onClick={() => handleAuthNavigation('signup')}
                    size="lg"
                    className="bg-[#81e76a] hover:bg-[#81e76a]/90 text-[#0a0a12] font-semibold px-8 py-6 text-lg"
                  >
                    Criar Conta Grátis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={() => scrollToSection('como-funciona')}
                    variant="outline"
                    size="lg"
                    className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg"
                  >
                    Ver Como Funciona
                  </Button>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex flex-row justify-center lg:justify-start gap-3">
                  <PlayStoreButton 
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10"
                  />
                  <AppStoreButton 
                    onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10"
                  />
                </motion.div>
              </motion.div>

              {/* Right Content - Floating Cards */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative hidden lg:block"
              >
                <div className="relative">
                  {/* Main Card */}
                  <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-3xl p-6 border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#81e76a]/20 rounded-full flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-[#81e76a]" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Saldo Disponível</p>
                          <p className="text-xs text-gray-500">Atualizado agora</p>
                        </div>
                      </div>
                      <Bell className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-8">Kz 124.500</p>
                    
                    {/* Mini Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#81e76a]/10 rounded-xl p-4">
                        <p className="text-[#81e76a] text-2xl font-bold">+45</p>
                        <p className="text-gray-400 text-sm">Vendas Hoje</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white text-2xl font-bold">98%</p>
                        <p className="text-gray-400 text-sm">Satisfação</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating Success Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="absolute -right-8 top-8 bg-[#1a1a2e] rounded-2xl p-4 border border-white/10 shadow-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#81e76a] rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-[#0a0a12]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Venda Confirmada</p>
                        <p className="text-[#81e76a] font-bold">+ Kz 5.000</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating User Card */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="absolute -left-8 bottom-8 bg-[#1a1a2e] rounded-2xl p-4 border border-white/10 shadow-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        JD
                      </div>
                      <div>
                        <p className="text-white font-medium">Novo Aluno</p>
                        <p className="text-gray-400 text-sm">Curso de Marketing</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Pills */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="flex items-center gap-4 bg-gradient-to-r from-white/5 to-transparent rounded-2xl p-6 border border-white/5 hover:border-[#81e76a]/30 transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-[#81e76a]/10 rounded-2xl flex items-center justify-center text-[#81e76a] flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                A Liberdade Que Sempre Desejou
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Com a Kambafy na mão, você desfruta de verdadeira liberdade financeira, podendo vender, receber e gerenciar seu negócio de qualquer lugar.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="relative text-center"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#81e76a]/20 to-[#81e76a]/5 rounded-3xl flex items-center justify-center text-[#81e76a] mx-auto mb-6 border border-[#81e76a]/20">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                  
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-[#81e76a]/30 to-transparent" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Product Types */}
        <section id="recursos" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0d0d1a] to-[#0a0a12]">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Venda Qualquer Produto Digital
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                A Kambafy suporta todos os tipos de produtos digitais. Crie e venda o que quiser.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {productTypes.map((type, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-2xl p-6 border border-white/5 hover:border-[#81e76a]/30 transition-all duration-300 group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-[#81e76a]/10 rounded-2xl flex items-center justify-center text-[#81e76a] mb-6 group-hover:bg-[#81e76a]/20 transition-colors">
                    {type.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{type.title}</h3>
                  <p className="text-gray-400">{type.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* QR Code & Link Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
              >
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Crie e Partilhe seus{' '}
                  <span className="text-[#81e76a]">Links de Venda</span>
                </h2>
                <p className="text-xl text-gray-400 mb-8">
                  Crie links ou QR Codes para suas vendas e partilhe facilmente com seu público, simplificando o processo de checkout e aumentando conversões.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-xl p-6 border border-white/5">
                    <QrCode className="w-10 h-10 text-[#81e76a] mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">QR CODE</h3>
                    <p className="text-gray-400 text-sm">Receba vendas por meio de QR Codes personalizados.</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-xl p-6 border border-white/5">
                    <Link2 className="w-10 h-10 text-[#81e76a] mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">Link Público</h3>
                    <p className="text-gray-400 text-sm">Receba vendas a partir de um link público compartilhável.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-3xl p-8 border border-white/10">
                  <div className="bg-white rounded-2xl p-6 mb-6">
                    <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-[#0a0a12]" />
                    </div>
                  </div>
                  <div className="bg-[#81e76a] text-[#0a0a12] rounded-xl p-4 text-center font-semibold">
                    kambafy.com/checkout/seu-produto
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Advantages */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0a12] to-[#0d0d1a]">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                O Produto Ideal para Criadores
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                A Kambafy oferece vantagens que, com certeza, correspondem ao que você procura como criador digital.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {advantages.map((adv, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-2xl p-8 border border-white/5 hover:border-[#81e76a]/30 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-[#81e76a]/10 rounded-2xl flex items-center justify-center text-[#81e76a] mb-6">
                    {adv.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{adv.title}</h3>
                  <p className="text-gray-400">{adv.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#81e76a]">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="text-center"
                >
                  <p className="text-4xl sm:text-5xl font-bold text-[#0a0a12] mb-2">{stat.number}</p>
                  <p className="text-[#0a0a12]/70 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="precos" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Conheça Nosso Tarifário
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Sem mensalidades, sem custos fixos. Você só paga quando vende.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-3xl p-8 lg:p-12 border border-[#81e76a]/20">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-[#81e76a]/10 rounded-full px-4 py-2 text-[#81e76a] text-sm font-medium mb-6">
                    <Star className="w-4 h-4 fill-[#81e76a]" />
                    Mais Popular
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Taxa por Venda</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-bold text-[#81e76a]">8%</span>
                    <span className="text-gray-400">por transação</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    "Checkout personalizado ilimitado",
                    "Área de membros completa",
                    "Pagamentos via Multicaixa, TPA e mais",
                    "Sistema de afiliados integrado",
                    "App para iOS e Android",
                    "Suporte prioritário via WhatsApp"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-[#81e76a] rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-[#0a0a12]" />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleAuthNavigation('signup')}
                  className="w-full bg-[#81e76a] hover:bg-[#81e76a]/90 text-[#0a0a12] font-semibold py-6 text-lg"
                >
                  Começar Agora - Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0d0d1a] to-[#0a0a12]">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-xl text-gray-400">
                Não encontrou sua dúvida? Entre em contato pelo WhatsApp.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-4"
            >
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#16161f] rounded-2xl border border-white/5 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="text-white font-medium pr-4">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: openFaq === index ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6 text-gray-400">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="mt-8 text-center"
            >
              <Button
                onClick={() => window.open('https://wa.me/244923000000', '_blank')}
                variant="outline"
                className="border-[#81e76a]/30 text-[#81e76a] hover:bg-[#81e76a]/10"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar no WhatsApp
              </Button>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-gradient-to-br from-[#81e76a] to-[#6bc955] rounded-3xl p-12 lg:p-16 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-[#0a0a12]/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <Download className="w-10 h-10 text-[#0a0a12]" />
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0a0a12] mb-4">
                  Comece a Vender Hoje
                </h2>
                <p className="text-xl text-[#0a0a12]/70 mb-8 max-w-2xl mx-auto">
                  Junte-se a mais de 1.000 criadores que já transformaram seu conhecimento em renda com a Kambafy.
                </p>
                <Button
                  onClick={() => handleAuthNavigation('signup')}
                  size="lg"
                  className="bg-[#0a0a12] hover:bg-[#0a0a12]/90 text-white font-semibold px-10 py-6 text-lg"
                >
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <img 
                src="/kambafy-logo-white.png" 
                alt="Kambafy" 
                className="h-10 w-auto mb-4"
              />
              <p className="text-gray-400 max-w-sm">
                A Kambafy é a plataforma líder em venda de produtos digitais em Angola e países lusófonos.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('recursos')} className="text-gray-400 hover:text-white transition-colors">Recursos</button></li>
                <li><button onClick={() => scrollToSection('precos')} className="text-gray-400 hover:text-white transition-colors">Preços</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="text-gray-400 hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>suporte@kambafy.com</li>
                <li>+244 923 000 000</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Kambafy. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InteractiveHeroFaciPay;
