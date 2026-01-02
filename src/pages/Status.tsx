import { PageLayout } from "@/components/PageLayout";
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from "@/contexts/TranslationContext";

const Status = () => {
  const { t } = useTranslation();

  const services = [
    { name: t('status.mainPlatform'), status: "operational", uptime: "99.9%" },
    { name: t('status.paymentSystem'), status: "operational", uptime: "99.8%" },
    { name: t('status.contentUpload'), status: "operational", uptime: "99.7%" },
    { name: t('status.api'), status: "maintenance", uptime: "99.5%" },
    { name: t('status.customerSupport'), status: "operational", uptime: "100%" }
  ];

  const incidents = [
    {
      date: "01 Jul 2025",
      title: t('status.incident1.title'),
      description: t('status.incident1.description'),
      status: t('status.inProgress'),
      severity: "low"
    },
    {
      date: "28 Jun 2025",
      title: t('status.incident2.title'),
      description: t('status.incident2.description'),
      status: t('status.resolved'),
      severity: "medium"
    },
    {
      date: "25 Jun 2025",
      title: t('status.incident3.title'),
      description: t('status.incident3.description'),
      status: t('status.completed'),
      severity: "low"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'maintenance':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'incident':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return t('status.operational');
      case 'maintenance':
        return t('status.maintenance');
      case 'incident':
        return t('status.incident');
      default:
        return t('status.operational');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-green-200 bg-green-50';
    }
  };

  const getIncidentStatusColor = (status: string) => {
    if (status === t('status.resolved')) return 'bg-green-100 text-green-700';
    if (status === t('status.inProgress')) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <PageLayout title={t('status.pageTitle')}>
      <div className="space-y-6 sm:space-y-8 px-4">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 sm:px-4 py-2 rounded-full border border-green-200">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base font-medium">{t('status.allOperational')}</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            {t('status.lastUpdate')} {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">{t('status.servicesTitle')}</h3>
          <div className="space-y-3 sm:space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-background border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h4 className="text-sm sm:text-base font-medium">{service.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {getStatusText(service.status)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-base font-medium text-checkout-green">{service.uptime}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{t('status.uptime30days')}</p>
                  <p className="text-xs text-muted-foreground sm:hidden">{t('status.uptime30daysShort')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">{t('status.incidentHistory')}</h3>
          <div className="space-y-3 sm:space-y-4">
            {incidents.map((incident, index) => (
              <div key={index} className={`p-4 sm:p-6 rounded-lg border ${getSeverityColor(incident.severity)}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
                  <h4 className="text-sm sm:text-base font-medium">{incident.title}</h4>
                  <span className="text-xs text-muted-foreground mt-1 sm:mt-0">{incident.date}</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">{incident.description}</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getIncidentStatusColor(incident.status)}`}>
                  {incident.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold mb-3">{t('status.updatesTitle')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('status.updatesDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="px-4 py-2 bg-checkout-green text-white rounded-lg hover:bg-checkout-green/90">
              {t('status.followTwitter')}
            </button>
            <button className="px-4 py-2 border border-checkout-green text-checkout-green rounded-lg hover:bg-checkout-green/10">
              {t('status.rssFeed')}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Status;
