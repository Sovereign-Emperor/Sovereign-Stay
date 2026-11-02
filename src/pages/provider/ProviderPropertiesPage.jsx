import { useState } from "react";
import { ArrowLeft, Building2, FileText, ListChecks, Plus, Search, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import ProviderMetricCard from "../../components/provider/ProviderMetricCard";
import ProviderPropertyCard from "../../components/provider/ProviderPropertyCard";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { listingStatuses } from "../../data/properties";
import {
  filterProviderProperties,
  getProviderDashboard,
} from "../../services/providerDashboardService";

const listingStatusLabels = {
  draft: "Draft",
  pending_approval: "Pending review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

const propertyMetrics = [
  { key: "total", label: "Total properties", summaryKey: "totalProperties", icon: Building2 },
  {
    key: "active",
    label: "With active listings",
    summaryKey: "propertiesWithActiveListings",
    icon: ListChecks,
  },
  {
    key: "draft",
    label: "With draft listings",
    summaryKey: "propertiesWithDraftListings",
    icon: FileText,
  },
];

export default function ProviderPropertiesPage() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
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
        <h2>Properties could not be loaded</h2>
        <p>{dashboardError}</p>
        <p>Check this browser&apos;s available storage, then reload the page.</p>
      </div>
    );
  }

  const properties = filterProviderProperties(dashboard.properties, { query, status });
  const hasFilters = Boolean(query.trim() || status);

  function clearFilters() {
    setQuery("");
    setStatus("");
  }

  return (
    <div className="provider-page">
      <div className="provider-page-intro">
        <div>
          <p className="provider-eyebrow">PROPERTY MANAGEMENT</p>
          <h2>Manage your properties</h2>
          <p>Search physical properties and review the listings associated with each one.</p>
        </div>
        <Link className="provider-primary-button" to="/provider/properties/new">
          <Plus size={17} /> Add property
        </Link>
      </div>

      <Link className="provider-back-link" to="/provider">
        <ArrowLeft size={15} /> Back to overview
      </Link>

      {location.state?.notice && (
        <div className="provider-form-success" role="status">
          <p>{location.state.notice}</p>
          {location.state.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}

      <section className="provider-management-metrics" aria-label="Property summary">
        {propertyMetrics.map(({ key, label, summaryKey, icon }) => (
          <ProviderMetricCard
            key={key}
            label={label}
            value={dashboard.summary[summaryKey]}
            detail="Based on example listing statuses"
            icon={icon}
          />
        ))}
      </section>

      <section className="provider-property-management" aria-labelledby="managed-properties-title">
        <div className="provider-property-filters">
          <div className="provider-property-search">
            <label htmlFor="provider-property-search">Search properties</label>
            <div className="provider-property-search-input">
              <Search size={17} aria-hidden="true" />
              <input
                id="provider-property-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by property name"
              />
            </div>
          </div>
          <div className="provider-property-status-filter">
            <label htmlFor="provider-listing-status-filter">Listing status</label>
            <select
              id="provider-listing-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All listing statuses</option>
              {listingStatuses.map((listingStatus) => (
                <option key={listingStatus} value={listingStatus}>
                  {listingStatusLabels[listingStatus]}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button className="provider-clear-filters" type="button" onClick={clearFilters}>
              <X size={15} /> Clear filters
            </button>
          )}
        </div>

        <div className="provider-section-heading">
          <div>
            <p className="provider-eyebrow">YOUR DEMO WORKSPACE</p>
            <h2 id="managed-properties-title">Properties</h2>
          </div>
          <p className="provider-property-result-count" aria-live="polite">
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>

        {properties.length > 0 ? (
          <div className="provider-properties-grid provider-properties-grid-all">
            {properties.map((property) => (
              <ProviderPropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : dashboard.properties.length === 0 ? (
          <div className="provider-empty-state">
            <Building2 size={24} aria-hidden="true" />
            <h3>No properties in this demo workspace</h3>
            <p>Add a property to keep its details in this browser&apos;s demo workspace.</p>
          </div>
        ) : (
          <div className="provider-empty-state">
            <Search size={24} aria-hidden="true" />
            <h3>No properties match these filters</h3>
            <p>Try a different name or listing status.</p>
            <button className="provider-outline-button" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <p className="provider-page-disclaimer">
        Fixture listings are illustrative. Properties you add are saved only in this browser and
        are not real offers or live availability.
      </p>
    </div>
  );
}
