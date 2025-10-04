import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Plus, Trash2, Edit, Shield, Check } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import CustomBanner from './CustomBanner';
import CountdownTimer from './CountdownTimer';
import FakeReviews from './FakeReviews';
import SocialProof from './SocialProof';
import SpotsCounter from './SpotsCounter';
import { useCheckoutCustomization } from '@/hooks/useCheckoutCustomization';

interface CheckoutCustomizerProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function CheckoutCustomizer({ productId, onSaveSuccess }: CheckoutCustomizerProps) {
  const { settings, setSettings, saveSettings, loading, saving } = useCheckoutCustomization(productId);
  const [editingReview, setEditingReview] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Carregando configurações..." />
      </div>
    );
  }

  const handleSave = async () => {
    await saveSettings(settings);
    onSaveSuccess();
  };

  const updateBannerSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      banner: { ...prev.banner, [key]: value }
    }));
  };

  const updateCountdownSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      countdown: { ...prev.countdown, [key]: value }
    }));
  };

  const updateReviewsSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      reviews: { ...prev.reviews, [key]: value }
    }));
  };

  const updateSocialProofSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      socialProof: { ...prev.socialProof, [key]: value }
    }));
  };

  const updateSpotsCounterSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      spotsCounter: { ...prev.spotsCounter, [key]: value }
    }));
  };


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        updateBannerSetting('bannerImage', imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReviewAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>, reviewId: string) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const updatedReviews = settings.reviews.reviews.map(review => 
          review.id === reviewId ? { ...review, avatar: imageUrl } : review
        );
        updateReviewsSetting('reviews', updatedReviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const addNewReview = () => {
    const newReview = {
      id: Date.now().toString(),
      name: 'Novo Cliente',
      rating: 5,
      comment: 'Escreva aqui o comentário...',
      timeAgo: 'há 1 hora',
      verified: true,
      avatar: ''
    };
    const updatedReviews = [...settings.reviews.reviews, newReview];
    updateReviewsSetting('reviews', updatedReviews);
    setEditingReview(newReview.id);
  };

  const deleteReview = (reviewId: string) => {
    const updatedReviews = settings.reviews.reviews.filter(review => review.id !== reviewId);
    updateReviewsSetting('reviews', updatedReviews);
  };

  const updateReview = (reviewId: string, field: string, value: any) => {
    const updatedReviews = settings.reviews.reviews.map(review => 
      review.id === reviewId ? { ...review, [field]: value } : review
    );
    updateReviewsSetting('reviews', updatedReviews);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Checkout Personalizado</h2>
        <p className="text-muted-foreground">
          Configure elementos visuais para aumentar conversões no seu checkout
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Configurações */}
        <div className="space-y-6">
          <Tabs defaultValue="countdown" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="countdown">Timer</TabsTrigger>
              <TabsTrigger value="banner">Banner</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="spots">Vagas</TabsTrigger>
            </TabsList>

            <TabsContent value="countdown" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Countdown Timer</CardTitle>
                    <Switch
                      checked={settings.countdown.enabled}
                      onCheckedChange={(checked) => updateCountdownSetting('enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Duração (minutos)</Label>
                    <Input
                      type="number"
                      value={settings.countdown.minutes}
                      onChange={(e) => updateCountdownSetting('minutes', parseInt(e.target.value))}
                      min="1"
                      max="1440"
                    />
                  </div>
                  <div>
                    <Label>Texto do Timer</Label>
                    <Input
                      value={settings.countdown.title}
                      onChange={(e) => updateCountdownSetting('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Cor de Fundo</Label>
                    <Input
                      type="color"
                      value={settings.countdown.backgroundColor}
                      onChange={(e) => updateCountdownSetting('backgroundColor', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banner" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Banner Personalizado</CardTitle>
                    <Switch
                      checked={settings.banner.enabled}
                      onCheckedChange={(checked) => updateBannerSetting('enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Upload de Imagem do Banner</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="banner-upload"
                      />
                      <label
                        htmlFor="banner-upload"
                        className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-sm">
                          {settings.banner.bannerImage ? 'Alterar imagem' : 'Clique para fazer upload da imagem'}
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: 1000x300 pixels. A imagem será automaticamente redimensionada.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Avaliações Personalizadas</CardTitle>
                    <Switch
                      checked={settings.reviews.enabled}
                      onCheckedChange={(checked) => updateReviewsSetting('enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Título da Seção</Label>
                    <Input
                      value={settings.reviews.title}
                      onChange={(e) => updateReviewsSetting('title', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Avaliações</Label>
                      <Button
                        type="button"
                        onClick={addNewReview}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {settings.reviews.reviews.map((review) => (
                        <div key={review.id} className="border rounded-lg p-3">
                          {editingReview === review.id ? (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs">Nome</Label>
                                  <Input
                                    value={review.name}
                                    onChange={(e) => updateReview(review.id, 'name', e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                <div className="w-20">
                                  <Label className="text-xs">Nota</Label>
                                  <Select
                                    value={review.rating.toString()}
                                    onValueChange={(value) => updateReview(review.id, 'rating', parseInt(value))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[1,2,3,4,5].map(num => (
                                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs">Comentário</Label>
                                <Textarea
                                  value={review.comment}
                                  onChange={(e) => updateReview(review.id, 'comment', e.target.value)}
                                  className="min-h-[60px]"
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs">Tempo</Label>
                                  <Input
                                    value={review.timeAgo}
                                    onChange={(e) => updateReview(review.id, 'timeAgo', e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                <div className="w-32">
                                  <Label className="text-xs">Avatar</Label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleReviewAvatarUpload(e, review.id)}
                                    className="hidden"
                                    id={`avatar-${review.id}`}
                                  />
                                  <label
                                    htmlFor={`avatar-${review.id}`}
                                    className="flex items-center justify-center h-8 text-xs border rounded cursor-pointer hover:bg-gray-50"
                                  >
                                    Escolher
                                  </label>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={() => setEditingReview(null)}
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{review.name}</div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {'★'.repeat(review.rating)} {review.timeAgo}
                                </div>
                                <div className="text-sm text-gray-700">{review.comment}</div>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <Button
                                  type="button"
                                  onClick={() => setEditingReview(review.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => deleteReview(review.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Prova Social</CardTitle>
                    <Switch
                      checked={settings.socialProof.enabled}
                      onCheckedChange={(checked) => updateSocialProofSetting('enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Posição das Notificações</Label>
                    <Select 
                      value={settings.socialProof.position || 'bottom-right'} 
                      onValueChange={(value) => updateSocialProofSetting('position', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha a posição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Superior Esquerda</SelectItem>
                        <SelectItem value="top-right">Superior Direita</SelectItem>
                        <SelectItem value="bottom-left">Inferior Esquerda</SelectItem>
                        <SelectItem value="bottom-right">Inferior Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Total de Vendas</Label>
                    <Input
                      type="number"
                      value={settings.socialProof.totalSales}
                      onChange={(e) => updateSocialProofSetting('totalSales', parseInt(e.target.value))}
                      min="100"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spots" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Contador de Vagas</CardTitle>
                    <Switch
                      checked={settings.spotsCounter.enabled}
                      onCheckedChange={(checked) => updateSpotsCounterSetting('enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Modo de Contagem</Label>
                    <Select 
                      value={settings.spotsCounter.mode} 
                      onValueChange={(value) => updateSpotsCounterSetting('mode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatic">Automático por Venda (diminui a cada venda)</SelectItem>
                        <SelectItem value="time-based">Automático por Tempo (diminui a cada X segundos)</SelectItem>
                        <SelectItem value="manual">Manual (atualização manual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {settings.spotsCounter.mode === 'automatic' && (
                    <div>
                      <Label>Número Inicial de Vagas</Label>
                      <Input
                        type="number"
                        value={settings.spotsCounter.initialCount}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value);
                          updateSpotsCounterSetting('initialCount', newValue);
                          updateSpotsCounterSetting('currentCount', newValue);
                        }}
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        O contador começará neste número e diminuirá automaticamente a cada venda
                      </p>
                    </div>
                  )}
                  
                  {settings.spotsCounter.mode === 'time-based' && (
                    <>
                      <div>
                        <Label>Número Inicial de Vagas</Label>
                        <Input
                          type="number"
                          value={settings.spotsCounter.initialCount}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value);
                            updateSpotsCounterSetting('initialCount', newValue);
                            updateSpotsCounterSetting('currentCount', newValue);
                          }}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Intervalo de Decremento (segundos)</Label>
                        <Input
                          type="number"
                          value={settings.spotsCounter.decrementInterval || 60}
                          onChange={(e) => updateSpotsCounterSetting('decrementInterval', parseInt(e.target.value))}
                          min="1"
                          max="3600"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          O contador diminuirá 1 vaga a cada {settings.spotsCounter.decrementInterval || 60} segundos
                        </p>
                      </div>
                    </>
                  )}
                  
                  {settings.spotsCounter.mode === 'manual' && (
                    <div>
                      <Label>Número Atual de Vagas</Label>
                      <Input
                        type="number"
                        value={settings.spotsCounter.currentCount}
                        onChange={(e) => updateSpotsCounterSetting('currentCount', parseInt(e.target.value))}
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Você precisará atualizar este número manualmente sempre que desejar
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label>Texto do Contador</Label>
                    <Input
                      value={settings.spotsCounter.title}
                      onChange={(e) => updateSpotsCounterSetting('title', e.target.value)}
                      placeholder="VAGAS RESTANTES"
                    />
                  </div>
                  
                  <div>
                    <Label>Cor de Fundo</Label>
                    <Input
                      type="color"
                      value={settings.spotsCounter.backgroundColor}
                      onChange={(e) => updateSpotsCounterSetting('backgroundColor', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Cor do Texto</Label>
                    <Input
                      type="color"
                      value={settings.spotsCounter.textColor}
                      onChange={(e) => updateSpotsCounterSetting('textColor', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          <Button 
            onClick={handleSave} 
            className="w-full"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>

        {/* Preview na ordem correta */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Preview</h3>
          
          {/* 1. Timer no topo */}
          {settings.countdown.enabled && (
            <CountdownTimer
              minutes={settings.countdown.minutes}
              title={settings.countdown.title}
              backgroundColor={settings.countdown.backgroundColor}
              textColor={settings.countdown.textColor}
            />
          )}

          {/* 2. Banner depois do timer */}
          {settings.banner.enabled && settings.banner.bannerImage && (
            <CustomBanner
              bannerImage={settings.banner.bannerImage}
            />
          )}

          {/* 3. Contador de Vagas */}
          {settings.spotsCounter.enabled && (
            <SpotsCounter
              count={settings.spotsCounter.currentCount}
              title={settings.spotsCounter.title}
              backgroundColor={settings.spotsCounter.backgroundColor}
              textColor={settings.spotsCounter.textColor}
              mode={settings.spotsCounter.mode}
              decrementInterval={settings.spotsCounter.decrementInterval}
            />
          )}

          {/* 4. Compra Segura (será adicionado no checkout) */}
          <div className="text-white py-3 px-4 text-center" style={{ backgroundColor: '#1b2f1a' }}>
            <span className="font-semibold flex items-center justify-center gap-2">
              <div className="relative inline-flex items-center justify-center">
                <Shield className="h-5 w-5" />
                <Check className="h-2.5 w-2.5 absolute inset-0 m-auto text-white" />
              </div>
              COMPRA 100% SEGURA
            </span>
          </div>

          {/* 5. Prova Social */}
          {settings.socialProof.enabled && (
            <SocialProof
              totalSales={settings.socialProof.totalSales}
              position={settings.socialProof.position}
              enabled={settings.socialProof.enabled}
            />
          )}

          {/* 6. Avaliações por último */}
          {settings.reviews.enabled && (
            <FakeReviews
              reviews={settings.reviews.reviews}
              title={settings.reviews.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
