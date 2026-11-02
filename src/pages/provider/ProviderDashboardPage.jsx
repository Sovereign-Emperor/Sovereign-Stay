import { ArrowRight, BedDouble, Building2, ClipboardList, FileText, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ProviderMetricCard from "../../components/provider/ProviderMetricCard";
import ProviderPropertyCard from "../../components/provider/ProviderPropertyCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderDashboard } from "../../services/providerDashboardService";

const iconByMetric = {
  properties: Building2,
  active: Sparkles,
  drafts: ClipboardList,
  listings: FileText,
  rooms: BedDouble,
  enquiries: MessageSquareText,
};

export default function ProviderDashboardPage() {
  let dashboard;
  let dashboardError = "";
  try {
    dashboard = getProviderDashboard(DEMO_PROVIDER_ID);
  } catch (error) {
    dashboardError = error.message;
  }

  if (dashboardError) {
    return (
      <div className="provider-page provider-empty-state" role="alert">
        <h2>Provider data could not be loaded</h2>
        <p>{dashboardError}</p>
        <p>Check this browser&apos;s available storage, then reload the page.</p>
      </div>
    );
  }
  const metrics = [
    { key: "properties", label: "Total properties", value: dashboard.summary.totalProperties, detail: "Managed in this demo" },
    { key: "listings", label: "Total listings", value: dashboard.summary.totalListings, detail: "Property advertisements" },
    { key: "active", label: "Published listings", value: dashboard.summary.publishedListings, detail: "Visible in this local demo" },
    { key: "drafts", label: "Draft listings", value: dashboard.summary.draftListings, detail: "Private to this workspace" },
    { key: "rooms", label: "Available room offers", value: dashboard.summary.availableRoomOffers, detail: "Provider-reported only" },
    { key: "enquiries", label: "New enquiries", value: dashboard.summary.newEnquiries, detail: "Saved in this browser" },
  ];
  const recentProperties = dashboard.properties
    .slice()
    .sort((first, second) => {
      const firstCreatedAt = first.createdAt ? Date.parse(first.createdAt) : 0;
      const secondCreatedAt = second.createdAt ? Date.parse(second.createdAt) : 0;
      return secondCreatedAt - firstCreatedAt;
    })
    .slice(0, 3);

  return (
    <div className="provider-page">
      <div className="provider-welcome-row">
        <div>
          <p className="provider-eyebrow">YOUR SPACE, AT A GLANCE</p>
          <h2>Welcome to your workspace.</h2>
          <p>Manage properties, advertisements, room offers, and student enquiries.</p>
        </div>
        <Link className="provider-primary-button" to="/provider/properties/new">
          <Plus size={17} /> Add property
        </Link>
      </div>

      <div className="provider-demo-banner" role="note">
        <span className="provider-demo-banner-icon"><Sparkles size={16} /></span>
        <p><strong>Demonstration workspace.</strong> Property and listing records stay in this browser. Publishing changes visibility in the local student marketplace only; nothing is publicly live or verified.</p>
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
          {recentProperties.map((property) => (
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
            <span>
              <strong>Add a property</strong>
              <small>Save a property in this browser&apos;s demo workspace</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/provider/properties">
            <span className="provider-action-icon"><Building2 size={18} /></span>
            <span><strong>Manage properties</strong><small>Review your example listings</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/provider/listings/new">
            <span className="provider-action-icon"><FileText size={18} /></span>
            <span><strong>Create a listing</strong><small>Advertise one of your properties</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/provider/enquiries">
            <span className="provider-action-icon"><MessageSquareText size={18} /></span>
            <span><strong>View enquiries</strong><small>Review local student messages</small></span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      {dashboard.summary.recentActivity.length > 0 && (
        <section className="provider-section" aria-labelledby="provider-activity-title">
          <div className="provider-section-heading"><div><p className="provider-eyebrow">LOCAL WORKSPACE ACTIVITY</p><h2 id="provider-activity-title">Recently updated</h2></div></div>
          <ul className="provider-activity-list">{dashboard.summary.recentActivity.map((activity) => <li key={activity.id}><span>{activity.label}</span><time>{activity.date ? new Date(activity.date).toLocaleDateString() : "Fixture data"}</time></li>)}</ul>
        </section>
      )}
    </div>
  );
}
