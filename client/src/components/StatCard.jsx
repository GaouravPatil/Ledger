export default function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
  loading = false,
}) {
  return (
    <article className={`stat-card${accent ? " stat-card-accent" : ""}`}>
      <div className="stat-card-top">
        <span className="stat-icon">
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <strong className="stat-value">{loading ? "—" : value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}
