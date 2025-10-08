import { SEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, Activity } from "lucide-react";

const Status = () => {
  return (
    <>
      <SEO 
        title="Status da Plataforma | Kambafy"
        description="Acompanhe o status dos serviços da Kambafy em tempo real."
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <SubdomainLink to="/" className="flex items-center">
                <img 
                  src="/kambafy-logo-white.png" 
                  alt="Kambafy" 
                  className="h-8"
                />
              </SubdomainLink>
              <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SubdomainLink to="/">
                  Voltar ao Início
                </SubdomainLink>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center">
                <Activity className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Status da Plataforma
            </h1>
            <div className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-full px-6 py-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Todos os sistemas operacionais</span>
            </div>
          </div>
        </section>

        {/* Services Status */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold text-white mb-8">Status dos Serviços</h2>
            <div className="space-y-4">
              {[
                { name: "Plataforma Principal", status: "operational", uptime: "99.9%" },
                { name: "Sistema de Pagamentos", status: "operational", uptime: "99.8%" },
                { name: "Upload de Conteúdo", status: "operational", uptime: "99.7%" },
                { name: "API", status: "maintenance", uptime: "99.5%" },
                { name: "Suporte ao Cliente", status: "operational", uptime: "100%" }
              ].map((service, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {service.status === "operational" ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : service.status === "maintenance" ? (
                        <Clock className="w-6 h-6 text-orange-400" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      )}
                      <div>
                        <h3 className="font-semibold text-white">{service.name}</h3>
                        <p className="text-sm text-gray-400">
                          {service.status === "operational" ? "Operacional" : "Manutenção"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-400">{service.uptime}</p>
                      <p className="text-sm text-gray-400">Uptime 30 dias</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Incidents History */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold text-white mb-8">Histórico de Incidentes</h2>
            <div className="space-y-4">
              {[
                {
                  date: "01 Jan 2024",
                  title: "Manutenção Programada da API",
                  description: "Manutenção de rotina para melhorar a performance da API.",
                  status: "Em andamento",
                  severity: "low"
                },
                {
                  date: "28 Dez 2023",
                  title: "Problema Resolvido - Lentidão nos Uploads",
                  description: "Identificamos e corrigimos um problema que causava lentidão no upload de vídeos.",
                  status: "Resolvido",
                  severity: "medium"
                }
              ].map((incident, index) => (
                <div key={index} className={`bg-white/5 backdrop-blur-sm border rounded-xl p-6 ${
                  incident.severity === "high" ? "border-red-500/30 bg-red-500/5" :
                  incident.severity === "medium" ? "border-orange-500/30 bg-orange-500/5" :
                  "border-blue-500/30 bg-blue-500/5"
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-white">{incident.title}</h3>
                    <span className="text-sm text-gray-400">{incident.date}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{incident.description}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    incident.status === "Resolvido" ? "bg-green-500/20 text-green-400" :
                    "bg-orange-500/20 text-orange-400"
                  }`}>
                    {incident.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 mt-20">
          <div className="mx-auto max-w-7xl px-6 text-center text-gray-500">
            <p>© 2024 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Status;