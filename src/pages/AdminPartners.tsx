import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Search, Eye, Calendar, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminNotificationCenter } from "@/components/AdminNotificationCenter";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface Partner {
  id: string;
  company_name: string;
  contact_email: string;
  contact_name: string;
  phone?: string;
  website?: string;
  status: string;
  api_key?: string;
  commission_rate: number;
  monthly_transaction_limit: number;
  current_month_transactions: number;
  total_transactions: number;
  total_revenue: number;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar parceiros",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (partnerId: string) => {
    setProcessing(partnerId);
    try {
      const { error } = await supabase.rpc("approve_partner", {
        partner_id: partnerId
      });

      if (error) throw error;

      toast({
        title: "Parceiro aprovado!",
        description: "API key gerada e enviada por email.",
      });

      fetchPartners();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar parceiro",
        description: error.message,
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (partnerId: string) => {
    setProcessing(partnerId);
    try {
      const { error } = await supabase
        .from("partners")
        .update({ status: "rejected" })
        .eq("id", partnerId);

      if (error) throw error;

      toast({
        title: "Parceiro rejeitado",
        description: "Status atualizado com sucesso.",
      });

      fetchPartners();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao rejeitar parceiro",
        description: error.message,
      });
    } finally {
      setProcessing(null);
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "suspended": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "Aprovado";
      case "pending": return "Pendente";
      case "rejected": return "Rejeitado";
      case "suspended": return "Suspenso";
      default: return status;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Gestão de Parceiros" description="Gerir aplicações e parceiros da API KambaPay">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando parceiros...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Parceiros" description="Gerir aplicações e parceiros da API KambaPay">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-end">
          <AdminNotificationCenter />
        </div>

      {/* Stats - Responsivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Parceiros</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{partners.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {partners.filter(p => p.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Aprovados</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {partners.filter(p => p.status === "approved").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Receita Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              {partners.reduce((sum, p) => sum + (p.total_revenue || 0), 0).toLocaleString()} KZ
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search - Responsivo */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por empresa ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 text-sm"
        />
      </div>

      {/* Partners List - Responsivo */}
      <div className="space-y-4">
        {filteredPartners.map((partner) => (
          <Card key={partner.id}>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className="bg-primary/10 rounded-lg p-2 sm:p-3 flex-shrink-0">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{partner.company_name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm truncate">
                      {partner.contact_name} • {partner.contact_email}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getStatusColor(partner.status)}>
                    {getStatusLabel(partner.status)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPartner(partner)}
                  >
                    <Eye className="w-3 w-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Detalhes</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Transações</div>
                  <div className="text-sm sm:text-base font-semibold">{partner.total_transactions || 0}</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Receita Total</div>
                  <div className="text-sm sm:text-base font-semibold">{(partner.total_revenue || 0).toLocaleString()} KZ</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Comissão</div>
                  <div className="text-sm sm:text-base font-semibold">{partner.commission_rate}%</div>
                </div>
              </div>

              {partner.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleApprove(partner.id)}
                    disabled={processing === partner.id}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => handleReject(partner.id)}
                    disabled={processing === partner.id}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partner Details Modal - Responsivo */}
      <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{selectedPartner?.company_name}</DialogTitle>
            <DialogDescription className="text-sm">Detalhes completos do parceiro</DialogDescription>
          </DialogHeader>
          
          {selectedPartner && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Contacto</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div><strong>Nome:</strong> {selectedPartner.contact_name}</div>
                    <div className="break-all"><strong>Email:</strong> {selectedPartner.contact_email}</div>
                    {selectedPartner.phone && (
                      <div><strong>Telefone:</strong> {selectedPartner.phone}</div>
                    )}
                    {selectedPartner.website && (
                      <div className="break-all"><strong>Website:</strong> 
                        <a href={selectedPartner.website} target="_blank" rel="noopener noreferrer" 
                           className="text-primary hover:underline ml-1">
                          {selectedPartner.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Configurações</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div><strong>Comissão:</strong> {selectedPartner.commission_rate}%</div>
                    <div><strong>Limite:</strong> {selectedPartner.monthly_transaction_limit.toLocaleString()} KZ</div>
                    <div><strong>Uso:</strong> {selectedPartner.current_month_transactions.toLocaleString()} KZ</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Estatísticas</h4>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Card>
                    <CardContent className="pt-3 sm:pt-4 p-3 sm:p-4">
                      <div className="text-xl sm:text-2xl font-bold">{selectedPartner.total_transactions}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Transações</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 sm:pt-4 p-3 sm:p-4">
                      <div className="text-lg sm:text-2xl font-bold">{selectedPartner.total_revenue.toLocaleString()} KZ</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Receita</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {selectedPartner.api_key && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">API Key</h4>
                  <div className="bg-muted p-3 rounded font-mono text-xs sm:text-sm break-all">
                    {selectedPartner.api_key}
                  </div>
                </div>
              )}

              <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <Calendar className="w-3 w-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="break-words">Aplicação em {new Date(selectedPartner.created_at).toLocaleDateString('pt-PT')}
                {selectedPartner.approved_at && (
                  <span className="ml-2 sm:ml-4">
                    • Aprovado em {new Date(selectedPartner.approved_at).toLocaleDateString('pt-PT')}
                  </span>
                )}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}