import { Check } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
}

export default function PricingCard({ name, price, period, features, featured }: PricingCardProps) {
  return (
    <div className={`mkt-price-card ${featured ? 'featured' : ''}`}>
      {featured && <span className="mkt-price-badge">Most schools choose this</span>}
      <h3>{name}</h3>
      <div className="mkt-price-amount">
        <span className="mkt-price-value">{price}</span>
        <span className="mkt-price-period">/ {period}</span>
      </div>
      <ul className="mkt-price-features">
        {features.map((f) => (
          <li key={f}>
            <Check size={16} strokeWidth={2.5} />
            <span dangerouslySetInnerHTML={{ __html: f }} />
          </li>
        ))}
      </ul>
      <a href="https://wa.me/923404242604" className={`mkt-btn ${featured ? 'mkt-btn-primary' : 'mkt-btn-secondary'} mkt-btn-block`}>
        Choose {name}
      </a>
    </div>
  );
}
