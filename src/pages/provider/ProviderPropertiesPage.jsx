import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import ProviderPropertyCard from "../../components/provider/ProviderPropertyCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderDashboard } from "../../services/providerDashboardService";

export default function ProviderPropertiesPage() {
  const dashboard = getProviderDashboard(DEMO_PROVIDER_ID);

  return (
    <div className="provider-page">
      <div className="provider-page-intro">
        <div>
          <p className="provider-eyebrow">PROPERTY MANAGEMENT</p>
          <h2>All properties</h2>
          <p>Example listings associated with this demo provider.</p>
        </div>
        <Link className="provider-primary-button" to="/provider/properties/new">
          <Plus size={17} /> Add property
        </Link>
      </div>
      <Link className="provider-back-link" to="/provider"><ArrowLeft size={15} /> Back to overview</Link>
      <div className="provider-properties-grid provider-properties-grid-all">
        {dashboard.properties.map((property) => (
          <ProviderPropertyCard key={property.id} property={property} />
        ))}
      </div>
      <p className="provider-page-disclaimer">Demo listings are not real offers, verified properties, or live availability.</p>
    </div>
  );
}
