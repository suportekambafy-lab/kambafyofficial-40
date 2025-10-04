
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, DollarSign, LogOut, User, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MobileProfile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && user) {
        await uploadAvatar(file);
      }
    };
    input.click();
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = await base64Promise;

      // Upload to Bunny Storage via edge function
      const { data, error } = await supabase.functions.invoke('bunny-storage-upload', {
        body: {
          fileName: file.name,
          fileType: file.type,
          fileData
        }
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Erro no upload');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.url })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Avatar atualizado com sucesso!",
        description: "Sua foto de perfil foi alterada.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro ao atualizar avatar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-6">
        {/* User Info */}
        <div className="text-center py-6">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <Avatar 
              className="w-20 h-20 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleAvatarClick}
            >
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        {/* Switch Account */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Mudar para painel de cliente</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Notificações</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Vendas aprovadas</span>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Data Preferences */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preferências de dados</h3>
        </div>

        {/* Logout Button - Prominently displayed */}
        <Card className="rounded-2xl border-red-200">
          <CardContent className="p-0">
            <Button 
              variant="ghost" 
              className="w-full justify-start p-4 text-left text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span className="font-medium">Sair</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
