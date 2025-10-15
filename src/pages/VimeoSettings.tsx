import { VimeoBatchUpdate } from '@/components/admin/VimeoBatchUpdate';

export default function VimeoSettings() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações do Vimeo</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas configurações de privacidade dos vídeos do Vimeo
        </p>
      </div>
      
      <VimeoBatchUpdate />
    </div>
  );
}
