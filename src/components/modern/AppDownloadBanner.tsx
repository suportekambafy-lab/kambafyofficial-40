import { AppStoreButton } from "@/components/ui/app-store-button";
import { PlayStoreButton } from "@/components/ui/play-store-button";
import { Smartphone } from "lucide-react";

export function AppDownloadBanner() {
  return (
    <div className="w-full max-w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-3 sm:p-6 border border-border/50 mb-4 sm:mb-6 overflow-hidden">
      <div className="flex flex-col items-start gap-3 sm:gap-4">
        <div className="flex items-center gap-3 w-full">
          <div className="p-2 sm:p-3 rounded-full bg-primary/10 shrink-0">
            <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
              Baixe nosso App
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Gerencie seu negócio de qualquer lugar
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <PlayStoreButton 
            variant="outline"
            className="w-full text-xs sm:text-sm shrink-0"
            onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
          />
          <AppStoreButton 
            variant="outline"
            className="w-full text-xs sm:text-sm shrink-0"
            onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
          />
        </div>
      </div>
    </div>
  );
}
