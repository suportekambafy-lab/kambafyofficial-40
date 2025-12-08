import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Camera, Upload, X, Shield, ExternalLink, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { PasswordChange } from "@/components/PasswordChange";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useTranslation } from "@/hooks/useTranslation";
import { IdentityCard } from "@/components/settings/IdentityCard";
import { AddressCard } from "@/components/settings/AddressCard";

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, changeLanguage, currentLanguage } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [, forceUpdate] = useState({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    language: "pt" as "pt" | "en" | "es",
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        const userLanguage = (data as any).language || "pt";
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          language: userLanguage,
        });
        // Sync language with the translation hook
        changeLanguage(userLanguage);
        localStorage.setItem('detectedLanguage', userLanguage);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const updateProfile = async (updatedProfile = profile) => {
    if (!user) return false;

    try {
      setLoading(true);
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let result;
      
      if (existingProfile) {
        result = await supabase
          .from('profiles')
          .update({
            full_name: updatedProfile.full_name,
            bio: updatedProfile.bio,
            avatar_url: updatedProfile.avatar_url,
            language: updatedProfile.language,
          })
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: updatedProfile.full_name,
            bio: updatedProfile.bio,
            avatar_url: updatedProfile.avatar_url,
            language: updatedProfile.language,
          });
      }

      if (result.error) {
        console.error('Error updating profile:', result.error);
        toast({
          title: t('settings.error'),
          description: t('settings.error.message') + ": " + result.error.message,
          variant: "destructive"
        });
        return false;
      } else {
        toast({
          title: t('settings.success'),
          description: t('settings.success.message')
        });
        return true;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar perfil",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);
      console.log('Starting avatar upload for user:', user.id);

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive"
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas imagens",
          variant: "destructive"
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar_${timestamp}.${fileExt}`;

      console.log('Uploading file:', fileName);

      if (profile.avatar_url) {
        try {
          const oldUrlParts = profile.avatar_url.split('/');
          const oldFileName = oldUrlParts[oldUrlParts.length - 1];
          if (oldFileName && oldFileName.includes('avatar_')) {
            await supabase.storage
              .from('avatars')
              .remove([`${user.id}/${oldFileName}`]);
            console.log('Old avatar removed');
          }
        } catch (error) {
          console.log('Could not delete old avatar:', error);
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Erro no Upload",
          description: uploadError.message,
          variant: "destructive"
        });
        return;
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('Public URL:', publicUrl);

      const updatedProfile = {
        ...profile,
        avatar_url: publicUrl
      };
      
      setProfile(updatedProfile);

      const success = await updateProfile(updatedProfile);
      
      if (success) {
        toast({
          title: "Sucesso",
          description: "Foto de perfil atualizada com sucesso!"
        });
      }

    } catch (error) {
      console.error('Unexpected error uploading avatar:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer upload da foto",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const removeAvatar = async () => {
    if (!user || !profile.avatar_url) return;

    try {
      setUploadingAvatar(true);

      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (fileName && fileName.includes('avatar_')) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${fileName}`]);
      }

      const updatedProfile = {
        ...profile,
        avatar_url: ""
      };
      
      setProfile(updatedProfile);

      const success = await updateProfile(updatedProfile);

      if (success) {
        toast({
          title: "Sucesso",
          description: "Foto de perfil removida com sucesso!"
        });
      }

    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover foto",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto overflow-x-hidden">
        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">{t('settings.tab.profile')}</TabsTrigger>
            <TabsTrigger value="account">{t('settings.tab.account')}</TabsTrigger>
            <TabsTrigger value="security">{t('settings.tab.security')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                  {t('settings.profile.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-lg md:text-xl">
                        {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploadingAvatar ? (
                        <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      )}
                    </label>
                    
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      <h3 className="font-medium text-sm md:text-base">{t('settings.profile.photo')}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {t('settings.profile.photo.hint')}
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploadingAvatar}
                        className="text-xs md:text-sm"
                      >
                        <Upload className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        {uploadingAvatar ? t('settings.profile.uploading') : t('settings.profile.upload')}
                      </Button>
                      
                      {profile.avatar_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeAvatar}
                          disabled={uploadingAvatar}
                          className="text-xs md:text-sm"
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                          {t('settings.profile.remove')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm md:text-base">{t('settings.profile.name')}</Label>
                  <Input
                    id="full_name"
                    placeholder={t('settings.profile.name.placeholder')}
                    value={profile.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    className="text-sm md:text-base"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm md:text-base">{t('settings.profile.bio')}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t('settings.profile.bio.placeholder')}
                    value={profile.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    rows={3}
                    className="text-sm md:text-base resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.profile.bio.hint')}
                  </p>
                </div>

                <Button 
                  onClick={() => updateProfile()} 
                  disabled={loading} 
                  className="w-full text-sm md:text-base"
                >
                  {loading ? t('settings.profile.saving') : t('settings.profile.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="account" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Mail className="h-4 w-4 md:h-5 md:w-5" />
                  {t('settings.account.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">{t('settings.account.email')}</Label>
                  <Input 
                    value={user?.email || ""} 
                    disabled 
                    className="text-sm md:text-base bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.account.email.hint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm md:text-base">{t('settings.account.id')}</Label>
                  <Input 
                    value={user?.id || ""} 
                    disabled 
                    className="text-xs md:text-sm bg-muted font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.account.id.hint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm md:text-base">{t('settings.account.member.since')}</Label>
                  <Input 
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : 'pt-BR') : ""} 
                    disabled 
                    className="text-sm md:text-base bg-muted"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Language Selection Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Globe className="h-4 w-4 md:h-5 md:w-5" />
                  {t('settings.language.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.language.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">{t('settings.language.label')}</Label>
                  <Select
                    value={profile.language}
                    onValueChange={async (value: "pt" | "en" | "es") => {
                      const updatedProfile = { ...profile, language: value };
                      setProfile(updatedProfile);
                      changeLanguage(value);
                      localStorage.setItem('detectedLanguage', value);
                      await updateProfile(updatedProfile);
                      // Force re-render to update translations
                      forceUpdate({});
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">
                        <span className="flex items-center gap-2">
                          🇧🇷 Português
                        </span>
                      </SelectItem>
                      <SelectItem value="en">
                        <span className="flex items-center gap-2">
                          🇺🇸 English
                        </span>
                      </SelectItem>
                      <SelectItem value="es">
                        <span className="flex items-center gap-2">
                          🇪🇸 Español
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.language.hint')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <AddressCard />

            {/* Identity Card */}
            <IdentityCard />
          </TabsContent>


          <TabsContent value="security" className="space-y-4 md:space-y-6">
            <TwoFactorSettings />
            <PasswordChange />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
