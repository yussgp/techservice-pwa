export function StatCard({ icon: Icon, label, value, hint, tone = 'blue', loading = false }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
      {loading ? (
        <span className="skeleton skeleton--value" aria-label="Cargando" />
      ) : (
        <strong className="stat-card__value">{value}</strong>
      )}
      <span className="stat-card__hint">{hint}</span>
    </article>
  );
}
