import { AppStoreButton } from "@/components/ui/app-store-button";
import { PlayStoreButton } from "@/components/ui/play-store-button";
import { Smartphone } from "lucide-react";

export function AppDownloadBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border border-border/50 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Baixe nosso App
            </h3>
            <p className="text-sm text-muted-foreground">
              Gerencie seu negócio de qualquer lugar
            </p>
          </div>
        </div>
        
        <div className="flex flex-row gap-2 sm:gap-3 w-full">
          <PlayStoreButton 
            variant="outline"
            className="flex-1 text-xs sm:text-sm"
            onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
          />
          <AppStoreButton 
            variant="outline"
            className="flex-1 text-xs sm:text-sm"
            onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
          />
        </div>
      </div>
    </div>
  );
}
