import { useEffect, useRef, useState } from 'react';
import { Button } from '../atoms/Button';

const MAX_FILES = 5;
const MAX_SIZE_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

interface PhotoUploadProps {
  label?: string;
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function PhotoUpload({
  label = 'Photos',
  files,
  onChange,
  maxFiles = MAX_FILES,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const combined = [...files, ...selected];
    if (combined.length > maxFiles) {
      setError(`Maximum ${maxFiles} photos`);
      return;
    }

    for (const file of selected) {
      if (!ACCEPT.split(',').includes(file.type)) {
        setError('Only JPEG, PNG, WebP, GIF allowed');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Each file max ${MAX_SIZE_MB} MB`);
        return;
      }
    }

    onChange(combined);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem' }}>
        Attach photos of the issue (max {maxFiles} files, {MAX_SIZE_MB} MB each)
      </p>

      {error && <div className="alert alert-error" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {previews.map((src, i) => (
            <div key={src} style={{ position: 'relative' }}>
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                style={{
                  width: 96,
                  height: 96,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  lineHeight: 1,
                }}
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={handleSelect}
            style={{ display: 'none' }}
          />
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            + Add Photo
          </Button>
        </>
      )}
    </div>
  );
}
