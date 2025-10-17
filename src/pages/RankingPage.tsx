import { useEffect } from 'react';
import { Trophy, TrendingUp, ArrowLeft, Award, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTopSellers } from '@/hooks/useTopSellers';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const getMedalIcon = (position: number) => {
  const icons = {
    0: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/50' },
    1: { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/50' },
    2: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/50' },
  };
  return icons[position as keyof typeof icons] || icons[0];
};

const RankingPage = () => {
  const { data: sellers, isLoading } = useTopSellers();
  const navigate = useNavigate();
  const currentMonth = new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO
        title={`Ranking dos Melhores Vendedores - ${currentMonth}`}
        description={`Conheça os top 3 vendedores do mês na Kambafy. Veja quem está liderando em vendas e receita.`}
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="w-10 h-10 text-yellow-400 animate-pulse" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
                Ranking dos Melhores
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Top 3 Vendedores de {currentMonth}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : !sellers || sellers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-muted/20 rounded-full flex items-center justify-center">
                <Trophy className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">
                Ainda não há vendas este mês
              </h3>
              <p className="text-muted-foreground mb-6">
                Seja o primeiro a conquistar o pódio!
              </p>
              <Button onClick={() => navigate('/vendedor/produtos')}>
                Começar a Vender
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {sellers.map((seller, index) => {
                const medal = getMedalIcon(index);
                const Icon = medal.icon;
                const position = index + 1;

                return (
                  <div
                    key={index}
                    className={`relative transform transition-all duration-300 hover:scale-105 ${
                      index === 0 ? 'md:scale-110 md:-translate-y-4' : ''
                    }`}
                  >
                    <div className={`relative bg-card border-2 ${medal.border} rounded-2xl p-6 shadow-xl`}>
                      {/* Badge de Posição */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className={`${medal.bg} ${medal.border} border-2 rounded-full px-4 py-1 flex items-center gap-2`}>
                          <Icon className={`w-5 h-5 ${medal.color}`} />
                          <span className={`font-bold ${medal.color}`}>{position}º Lugar</span>
                        </div>
                      </div>

                      {/* Avatar e Informações */}
                      <div className="mt-6 text-center">
                        <Avatar className={`w-24 h-24 mx-auto border-4 ${medal.border} mb-4`}>
                          <AvatarImage src={seller.avatar_url || ''} alt={seller.full_name} />
                          <AvatarFallback className={`${medal.bg} ${medal.color} text-2xl font-bold`}>
                            {seller.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>

                        <h3 className="text-xl font-bold mb-1">
                          {seller.full_name}
                        </h3>

                        {/* Estatísticas */}
                        <div className="mt-6 space-y-4">
                          <div className={`${medal.bg} rounded-lg p-4`}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <TrendingUp className={`w-4 h-4 ${medal.color}`} />
                              <p className="text-sm text-muted-foreground">Total de Vendas</p>
                            </div>
                            <p className="text-3xl font-bold">
                              {seller.total_sales}
                            </p>
                          </div>

                          <div className={`${medal.bg} rounded-lg p-4`}>
                            <p className="text-sm text-muted-foreground mb-2">Receita Total</p>
                            <p className={`text-2xl font-bold ${medal.color}`}>
                              {new Intl.NumberFormat('pt-AO', {
                                style: 'currency',
                                currency: 'AOA',
                                minimumFractionDigits: 0,
                              }).format(seller.total_revenue)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Confetti Effect para 1º lugar */}
                      {index === 0 && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                          <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                          <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-100" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              O ranking é atualizado automaticamente com base nas vendas completadas do mês atual.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Última atualização: {new Date().toLocaleString('pt-AO')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RankingPage;
