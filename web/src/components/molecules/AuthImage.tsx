import { useEffect, useState } from 'react';
import { getAuthToken } from '../../services/api-client';
import { resolveAttachmentUrl } from '../../services/attachment.service';

interface AuthImageProps {
  url: string;
  alt: string;
  style?: React.CSSProperties;
}

export function AuthImage({ url, alt, style }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const token = getAuthToken();
    const fullUrl = resolveAttachmentUrl(url);

    fetch(fullUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load image');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) {
    return (
      <div
        style={{
          ...style,
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '0.75rem',
        }}
      >
        Loading...
      </div>
    );
  }

  return <img src={src} alt={alt} style={style} />;
}
