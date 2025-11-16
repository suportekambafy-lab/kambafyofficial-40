import { AppStoreButton } from "@/components/ui/app-store-button";
import { PlayStoreButton } from "@/components/ui/play-store-button";
import { Smartphone } from "lucide-react";

export function AppDownloadBanner() {
  return (
    <div className="w-full max-w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-2.5 sm:p-4 border border-border/50 mb-3 sm:mb-4 overflow-hidden">
      <div className="flex flex-col items-start gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          <div className="p-1.5 sm:p-2.5 rounded-full bg-primary/10 shrink-0">
            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
              Baixe nosso App
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Gerencie seu negócio de qualquer lugar
            </p>
          </div>
        </div>
        
        <div className="flex flex-row gap-2 w-full">
          <PlayStoreButton 
            variant="outline"
            className="flex-1 text-xs sm:text-sm py-2 shrink-0"
            onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
          />
          <AppStoreButton 
            variant="outline"
            className="flex-1 text-xs sm:text-sm py-2 shrink-0"
            onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
          />
        </div>
      </div>
    </div>
  );
}
