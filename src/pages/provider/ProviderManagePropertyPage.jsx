import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ProviderPropertyCard from "../../components/provider/ProviderPropertyCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderDashboard } from "../../services/providerDashboardService";

export default function ProviderManagePropertyPage() {
  const { propertyId } = useParams();
  const dashboard = getProviderDashboard(DEMO_PROVIDER_ID);
  const property = dashboard.properties.find((item) => item.id === propertyId);

  if (!property) {
    return (
      <div className="provider-page provider-placeholder">
        <p className="provider-eyebrow">PROPERTY NOT FOUND</p>
        <h2>This example is not in your workspace.</h2>
        <Link className="provider-primary-button" to="/provider/properties"><ArrowLeft size={16} /> Back to properties</Link>
      </div>
    );
  }

  return (
    <div className="provider-page">
      <Link className="provider-back-link" to="/provider/properties"><ArrowLeft size={15} /> Back to properties</Link>
      <div className="provider-page-intro provider-manage-intro">
        <div>
          <p className="provider-eyebrow">READ-ONLY DEMO DETAILS</p>
          <h2>{property.name}</h2>
          <p><MapPin size={15} /> {property.location}</p>
        </div>
        <Link className="provider-outline-button" to={`/properties/${property.id}`}>
          View listing preview <ExternalLink size={15} />
        </Link>
      </div>
      <div className="provider-demo-banner" role="note">
        <p><strong>Management is read-only in this milestone.</strong> This workspace does not save edits, update availability, or contact a real provider.</p>
      </div>
      <div className="provider-properties-grid provider-detail-card">
        <ProviderPropertyCard property={property} />
      </div>
    </div>
  );
}
