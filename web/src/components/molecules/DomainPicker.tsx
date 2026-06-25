import { useEffect, useState } from 'react';
import { listDomains, type DomainNode } from '../../services/master.service';

interface DomainPickerProps {
  label: string;
  value: string;
  onChange: (domainCode: string, domain?: DomainNode) => void;
  domainType?: 'LOCATION' | 'ZONE' | 'DEPARTMENT';
  required?: boolean;
  placeholder?: string;
}

export function DomainPicker({
  label,
  value,
  onChange,
  domainType,
  required,
  placeholder = '— Select location —',
}: DomainPickerProps) {
  const [domains, setDomains] = useState<DomainNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDomains(domainType)
      .then(setDomains)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [domainType]);

  return (
    <div className="input-group">
      <label className="input-label">
        {label}
        {required && ' *'}
      </label>
      <select
        className="input-field"
        value={value}
        onChange={(e) => {
          const selected = domains.find((d) => d.domainCode === e.target.value);
          onChange(e.target.value, selected);
        }}
        required={required}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {domains.map((d) => (
          <option key={d.id} value={d.domainCode}>
            {d.domainCode} — {d.name}
          </option>
        ))}
      </select>
    </div>
  );
}
