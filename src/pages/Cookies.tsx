import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const Cookies = () => {
  return (
    <>
      <SEO 
        title="Política de Cookies | Kambafy"
        description="Entenda como usamos cookies e tecnologias similares na plataforma."
      />
      <PageLayout title="Política de Cookies">
        <div className="prose prose-gray max-w-none space-y-6">
          <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-800">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-xl">
              <Cookie className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Última atualização: Janeiro de 2024</p>
              <p className="text-lg font-medium">
                Saiba como usamos cookies para melhorar sua experiência.
              </p>
            </div>
          </div>

          <section className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              1. O que são Cookies?
            </h2>
            <p className="text-muted-foreground">
              Cookies são pequenos arquivos de texto armazenados em seu dispositivo quando você visita um website. Eles nos ajudam a personalizar sua experiência.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              2. Tipos de Cookies
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg border">
                <h3 className="text-lg font-medium mb-2">Cookies Essenciais</h3>
                <p className="text-sm text-muted-foreground">
                  Necessários para o funcionamento básico: autenticação, segurança, preferências.
                </p>
              </div>
              <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg border">
                <h3 className="text-lg font-medium mb-2">Cookies de Performance</h3>
                <p className="text-sm text-muted-foreground">
                  Analisam o uso da plataforma: páginas visitadas, tempo de uso, detecção de erros.
                </p>
              </div>
              <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg border">
                <h3 className="text-lg font-medium mb-2">Cookies de Funcionalidade</h3>
                <p className="text-sm text-muted-foreground">
                  Personalizam sua experiência: configurações, histórico, conteúdo adaptado.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              3. Gerenciar Cookies
            </h2>
            <p className="text-muted-foreground mb-4">
              Você pode controlar cookies através das configurações do seu navegador:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Chrome: Configurações → Privacidade e segurança</li>
              <li>Firefox: Preferências → Privacidade</li>
              <li>Safari: Preferências → Privacidade</li>
            </ul>
          </section>

          <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border text-center">
            <h3 className="text-lg font-semibold mb-3">Configurar Preferências</h3>
            <p className="text-muted-foreground mb-4">
              Personalize suas preferências de cookies.
            </p>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg">
              Gerenciar Cookies
            </Button>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Cookies;