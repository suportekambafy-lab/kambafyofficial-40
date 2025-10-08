import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <>
      <SEO 
        title="Política de Privacidade | Kambafy"
        description="Leia nossa política de privacidade e saiba como protegemos seus dados."
      />
      <PageLayout title="Política de Privacidade">
        <div className="prose prose-gray max-w-none">
          <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Última atualização: Janeiro de 2024</p>
              <p className="text-lg font-medium">
                Protegemos suas informações com o máximo de segurança e transparência.
              </p>
            </div>
          </div>

          <section className="mt-8 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              1. Informações que Coletamos
            </h2>
            <p className="text-muted-foreground">
              Coletamos informações que você nos fornece diretamente, como nome, email, telefone e informações de pagamento quando você cria uma conta ou realiza uma compra.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              2. Como Usamos suas Informações
            </h2>
            <p className="text-muted-foreground">
              Usamos as informações coletadas para processar transações, melhorar nossos serviços, comunicar com você e garantir a segurança da plataforma.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              3. Compartilhamento de Dados
            </h2>
            <p className="text-muted-foreground">
              Não vendemos suas informações pessoais. Compartilhamos dados apenas com parceiros essenciais para operação da plataforma (processadores de pagamento, serviços de hospedagem).
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              4. Segurança
            </h2>
            <p className="text-muted-foreground">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração ou destruição.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              5. Seus Direitos
            </h2>
            <p className="text-muted-foreground">
              Você tem direito de acessar, corrigir ou excluir suas informações pessoais. Entre em contato conosco para exercer esses direitos.
            </p>
          </section>

          <section className="mt-6 p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border">
            <h2 className="text-xl font-semibold mb-4">6. Contato</h2>
            <p className="text-muted-foreground">
              Para questões sobre privacidade, entre em contato: <span className="text-purple-600 dark:text-purple-400 font-semibold">privacidade@kambafy.com</span>
            </p>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Privacy;