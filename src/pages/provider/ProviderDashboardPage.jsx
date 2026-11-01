import { ArrowRight, Building2, ClipboardList, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ProviderMetricCard from "../../components/provider/ProviderMetricCard";
import ProviderPropertyCard from "../../components/provider/ProviderPropertyCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderDashboard } from "../../services/providerDashboardService";

const iconByMetric = {
  properties: Building2,
  active: Sparkles,
  pending: ClipboardList,
  enquiries: MessageSquareText,
};

export default function ProviderDashboardPage() {
  const dashboard = getProviderDashboard(DEMO_PROVIDER_ID);
  const metrics = [
    { key: "properties", label: "Total properties", value: dashboard.summary.totalProperties, detail: "Managed in this demo" },
    { key: "active", label: "Active listings", value: dashboard.summary.activeListings, detail: "Published in this demo" },
    { key: "pending", label: "Pending listings", value: dashboard.summary.pendingListings, detail: "Awaiting review" },
    { key: "enquiries", label: "Total enquiries", value: dashboard.summary.totalEnquiries, detail: "Illustrative demo count" },
  ];

  return (
    <div className="provider-page">
      <div className="provider-welcome-row">
        <div>
          <p className="provider-eyebrow">YOUR SPACE, AT A GLANCE</p>
          <h2>Welcome to your workspace.</h2>
          <p>Manage example accommodation listings around Koforidua.</p>
        </div>
        <Link className="provider-primary-button" to="/provider/properties/new">
          <Plus size={17} /> Add property
        </Link>
      </div>

      <div className="provider-demo-banner" role="note">
        <span className="provider-demo-banner-icon"><Sparkles size={16} /></span>
        <p><strong>Demonstration workspace.</strong> Names, images, prices, listing statuses and enquiry totals are illustrative only. No property is verified or live.</p>
      </div>

      <section className="provider-metrics-grid" aria-label="Demo workspace summary">
        {metrics.map((metric) => (
          <ProviderMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={iconByMetric[metric.key]}
          />
        ))}
      </section>

      <section className="provider-section">
        <div className="provider-section-heading">
          <div>
            <p className="provider-eyebrow">RECENTLY MANAGED</p>
            <h2>Properties in your workspace</h2>
          </div>
          <Link className="provider-subtle-link" to="/provider/properties">
            Manage all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="provider-properties-grid">
          {dashboard.properties.slice(0, 3).map((property) => (
            <ProviderPropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      <section className="provider-quick-actions" aria-labelledby="provider-quick-actions-title">
        <div className="provider-section-heading">
          <div>
            <p className="provider-eyebrow">KEEP THINGS MOVING</p>
            <h2 id="provider-quick-actions-title">Quick actions</h2>
          </div>
        </div>
        <div className="provider-quick-action-grid">
          <Link to="/provider/properties/new">
            <span className="provider-action-icon"><Plus size={18} /></span>
            <span><strong>Add a property</strong><small>Property creation is a demo placeholder</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/provider/properties">
            <span className="provider-action-icon"><Building2 size={18} /></span>
            <span><strong>Manage properties</strong><small>Review your example listings</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/provider/enquiries">
            <span className="provider-action-icon"><MessageSquareText size={18} /></span>
            <span><strong>View enquiries</strong><small>Open the demo inbox placeholder</small></span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
