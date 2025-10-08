import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <>
      <SEO 
        title="Termos de Uso | Kambafy"
        description="Leia nossos termos de uso e entenda as regras de utilização da plataforma."
      />
      <PageLayout title="Termos de Uso">
        <div className="prose prose-gray max-w-none">
          <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Última atualização: Janeiro de 2024</p>
              <p className="text-lg font-medium">
                Entenda os termos e condições de uso da plataforma Kambafy.
              </p>
            </div>
          </div>

          <section className="mt-8 p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              1. Aceitação dos Termos
            </h2>
            <p className="text-muted-foreground">
              Ao acessar e usar a plataforma Kambafy, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              2. Uso da Plataforma
            </h2>
            <p className="text-muted-foreground">
              A Kambafy fornece uma plataforma para criação e gestão de lojas online. Você é responsável por manter a confidencialidade de sua conta e senha.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              3. Contas de Usuário
            </h2>
            <p className="text-muted-foreground">
              Para usar determinados recursos da plataforma, você precisará criar uma conta. Você deve fornecer informações precisas e completas.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              4. Pagamentos e Taxas
            </h2>
            <p className="text-muted-foreground">
              Alguns recursos da plataforma podem estar sujeitos a taxas. Você concorda em pagar todas as taxas aplicáveis conforme descrito em nossos planos de preços.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              5. Conteúdo do Usuário
            </h2>
            <p className="text-muted-foreground">
              Você mantém todos os direitos sobre o conteúdo que você carrega ou compartilha através da plataforma.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border">
            <h2 className="text-xl font-semibold mb-4">6. Contato</h2>
            <p className="text-muted-foreground">
              Para questões sobre estes termos, entre em contato: <span className="text-blue-600 dark:text-blue-400 font-semibold">legal@kambafy.com</span>
            </p>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Terms;