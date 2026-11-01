/**
 * A compact dashboard summary with an icon and explanatory label.
 *
 * @param {{ label: string, value: number, detail: string, icon: import("react").ComponentType }} props
 */
export default function ProviderMetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="provider-metric-card">
      <div className="provider-metric-top">
        <span>{label}</span>
        <span className="provider-metric-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
