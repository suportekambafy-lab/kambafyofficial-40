
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, LogOut, User, Camera } from 'lucide-react';
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* User Info */}
      <div className="text-center py-4">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <Avatar 
            className="w-20 h-20 cursor-pointer hover:opacity-80 transition-opacity border-2 border-primary/20"
            onClick={handleAvatarClick}
          >
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <Camera className="w-6 h-6 text-white animate-pulse" />
            </div>
          ) : (
            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
              <Camera className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      {/* Notifications */}
      <div className="mt-4">
        <h3 className="text-base font-semibold mb-3">Notificações</h3>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-foreground text-sm">Vendas aprovadas</span>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      {/* Logout Button */}
      <Button 
        variant="ghost" 
        className="w-full justify-start mt-6 text-left text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={handleSignOut}
      >
        <LogOut className="h-5 w-5 mr-3" />
        <span className="font-medium">Sair</span>
      </Button>
    </div>
  );
}
