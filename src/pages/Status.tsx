import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { CheckCircle, AlertCircle, Clock, Activity } from "lucide-react";

const Status = () => {
  const services = [
    { name: "Plataforma Principal", status: "operational", uptime: "99.9%" },
    { name: "Sistema de Pagamentos", status: "operational", uptime: "99.8%" },
    { name: "Upload de Conteúdo", status: "operational", uptime: "99.7%" },
    { name: "API", status: "maintenance", uptime: "99.5%" },
    { name: "Suporte ao Cliente", status: "operational", uptime: "100%" }
  ];

  const incidents = [
    {
      date: "01 Jan 2024",
      title: "Manutenção Programada da API",
      description: "Manutenção de rotina para melhorar a performance.",
      status: "Em andamento",
      severity: "low"
    },
    {
      date: "28 Dez 2023",
      title: "Problema Resolvido - Lentidão nos Uploads",
      description: "Identificamos e corrigimos lentidão no upload de vídeos.",
      status: "Resolvido",
      severity: "medium"
    }
  ];

  return (
    <>
      <SEO 
        title="Status da Plataforma | Kambafy"
        description="Acompanhe o status dos serviços da Kambafy em tempo real."
      />
      <PageLayout title="Status da Plataforma">
        <div className="space-y-8">
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Todos os sistemas operacionais</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Status dos Serviços
            </h3>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border rounded-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    {service.status === "operational" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : service.status === "maintenance" ? (
                      <Clock className="w-5 h-5 text-orange-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {service.status === "operational" ? "Operacional" : "Manutenção"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600 dark:text-green-400">{service.uptime}</p>
                    <p className="text-xs text-muted-foreground">30 dias</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Histórico de Incidentes
            </h3>
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <div key={index} className={`p-6 rounded-xl border ${
                  incident.severity === "high" ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800" :
                  incident.severity === "medium" ? "bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200 dark:border-orange-800" :
                  "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800"
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{incident.title}</h4>
                    <span className="text-sm text-muted-foreground">{incident.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{incident.description}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    incident.status === "Resolvido" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                    "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                  }`}>
                    {incident.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Status;