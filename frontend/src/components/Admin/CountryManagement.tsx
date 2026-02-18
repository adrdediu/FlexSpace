import React, { useState, useEffect, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Input,
  Field,
  Spinner,
  Badge,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@fluentui/react-components';
import {
  Add20Regular,
  Edit20Regular,
  Delete20Regular,
  Globe20Regular,
  Search20Regular,
  Dismiss20Regular,
  Checkmark20Regular,
  Warning20Regular,
} from '@fluentui/react-icons';
import {
  createCountriesApi,
  type Country,
  type CountryPayload,
} from '../../services/countriesApi';
import { useAuth } from '../../contexts/AuthContext';

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  searchInput: {
    flex: 1,
    maxWidth: '280px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: tokens.fontSizeBase300,
  },
  thead: {
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  th: {
    textAlign: 'left' as const,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    transition: 'background-color 0.12s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  td: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    verticalAlign: 'middle' as const,
  },
  codeCell: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase300,
    letterSpacing: '0.05em',
  },
  coordCell: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontFamily: 'monospace',
  },
  actionsCell: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    justifyContent: 'flex-end',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: `${tokens.spacingVerticalXXL} 0`,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
  },
  formFull: {
    gridColumn: '1 / -1',
  },
  warningBox: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  locationCount: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  inlineEdit: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
});

// ── Inline-editable cell ─────────────────────────────────────────────────────
interface InlineEditProps {
  value: string;
  onSave: (val: string) => Promise<void>;
  placeholder?: string;
  mono?: boolean;
  width?: string;
}

const InlineEdit: React.FC<InlineEditProps> = ({ value, onSave, placeholder, mono, width }) => {
  const styles = useStyles();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const cancel = () => { setEditing(false); setDraft(value); };

  const commit = async () => {
    if (draft.trim() === value) { cancel(); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className={styles.inlineEdit}>
        <Input
          ref={inputRef}
          size="small"
          value={draft}
          onChange={(_, d) => setDraft(d.value)}
          style={{ width: width ?? '140px', fontFamily: mono ? 'monospace' : undefined }}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          disabled={saving}
        />
        {saving
          ? <Spinner size="tiny" />
          : <>
              <Button appearance="subtle" size="small" icon={<Checkmark20Regular />} onClick={commit} />
              <Button appearance="subtle" size="small" icon={<Dismiss20Regular />} onClick={cancel} />
            </>
        }
      </div>
    );
  }

  return (
    <Tooltip content="Click to edit" relationship="label">
      <span
        style={{
          cursor: 'pointer',
          fontFamily: mono ? 'monospace' : undefined,
          borderBottom: `1px dashed ${tokens.colorNeutralStroke1}`,
          paddingBottom: '1px',
        }}
        onClick={start}
      >
        {value || <span style={{ color: tokens.colorNeutralForeground4 }}>{placeholder ?? '—'}</span>}
      </span>
    </Tooltip>
  );
};

// ── Add Country modal ────────────────────────────────────────────────────────
interface AddModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: CountryPayload) => Promise<void>;
}

const AddCountryModal: React.FC<AddModalProps> = ({ open, onClose, onAdd }) => {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setName(''); setCode(''); setLat(''); setLng(''); setError(null); }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Country name is required.'); return; }
    if (code && !/^[A-Z]{2}$/.test(code.toUpperCase())) {
      setError('Country code must be exactly 2 letters (e.g. US, GB).');
      return;
    }
    const latNum = lat ? parseFloat(lat) : null;
    const lngNum = lng ? parseFloat(lng) : null;
    if (lat && isNaN(latNum!)) { setError('Latitude must be a number.'); return; }
    if (lng && isNaN(lngNum!)) { setError('Longitude must be a number.'); return; }

    setSaving(true);
    setError(null);
    try {
      await onAdd({
        name: name.trim(),
        country_code: code ? code.toUpperCase() : null,
        lat: latNum,
        lng: lngNum,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create country.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface style={{ maxWidth: '460px' }}>
        <DialogBody>
          <DialogTitle>Add Country</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, paddingTop: tokens.spacingVerticalS }}>
              <Field label="Country Name" required>
                <Input
                  value={name}
                  onChange={(_, d) => setName(d.value)}
                  placeholder="e.g. United Kingdom"
                  disabled={saving}
                  autoFocus
                />
              </Field>

              <div className={styles.formGrid}>
                <Field label="ISO Code" hint="2-letter code, e.g. GB">
                  <Input
                    value={code}
                    onChange={(_, d) => setCode(d.value.toUpperCase())}
                    placeholder="GB"
                    maxLength={2}
                    disabled={saving}
                    style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                  />
                </Field>
                <div /> {/* spacer */}
                <Field label="Latitude" hint="For globe display">
                  <Input
                    value={lat}
                    onChange={(_, d) => setLat(d.value)}
                    placeholder="51.5074"
                    type="number"
                    disabled={saving}
                  />
                </Field>
                <Field label="Longitude" hint="For globe display">
                  <Input
                    value={lng}
                    onChange={(_, d) => setLng(d.value)}
                    placeholder="-0.1278"
                    type="number"
                    disabled={saving}
                  />
                </Field>
              </div>

              {error && (
                <Text style={{ color: tokens.colorPaletteRedForeground1, fontSize: tokens.fontSizeBase200 }}>
                  {error}
                </Text>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button appearance="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Adding…' : 'Add Country'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const CountryManagement: React.FC = () => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const api = createCountriesApi(authenticatedFetch);

  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSuperuser = user?.is_superuser;

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getCountries();
      setCountries(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to load countries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: CountryPayload) => {
    const created = await api.createCountry(data);
    setCountries(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handlePatch = async (id: number, data: Partial<CountryPayload>) => {
    const updated = await api.updateCountry(id, data);
    setCountries(prev =>
      prev.map(c => c.id === id ? updated : c).sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleDelete = async (country: Country) => {
    if (!confirm(`Delete "${country.name}"? This will fail if any locations are assigned to it.`)) return;
    setDeletingId(country.id);
    try {
      await api.deleteCountry(country.id);
      setCountries(prev => prev.filter(c => c.id !== country.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete. The country may have locations assigned to it.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = countries.filter(c =>
    !searchQuery.trim() ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.country_code ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          value={searchQuery}
          onChange={(_, d) => setSearchQuery(d.value)}
          placeholder="Search countries…"
          contentBefore={<Search20Regular />}
        />
        <Text size={200} className={styles.locationCount}>
          {filtered.length} {filtered.length === 1 ? 'country' : 'countries'}
        </Text>
        {isSuperuser && (
          <Button
            appearance="primary"
            icon={<Add20Regular />}
            size="small"
            onClick={() => setAddOpen(true)}
          >
            Add Country
          </Button>
        )}
      </div>

      {!isSuperuser && (
        <div className={styles.warningBox} style={{ marginBottom: tokens.spacingVerticalM }}>
          <Warning20Regular style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Only superusers can add or delete countries. You can view the list below.</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>
          <Spinner size="medium" label="Loading countries…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Globe20Regular style={{ fontSize: '40px' }} />
          <Text size={300} weight="semibold">
            {searchQuery ? `No countries match "${searchQuery}"` : 'No countries yet'}
          </Text>
          {!searchQuery && isSuperuser && (
            <Button appearance="primary" icon={<Add20Regular />} onClick={() => setAddOpen(true)}>
              Add First Country
            </Button>
          )}
        </div>
      ) : (
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Country</th>
              <th className={styles.th}>ISO Code</th>
              <th className={styles.th}>Coordinates</th>
              {isSuperuser && <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(country => (
              <tr key={country.id} className={styles.tr}>
                {/* Name */}
                <td className={styles.td}>
                  {isSuperuser ? (
                    <InlineEdit
                      value={country.name}
                      onSave={val => handlePatch(country.id, { name: val })}
                      placeholder="Country name"
                      width="200px"
                    />
                  ) : (
                    <Text weight="semibold">{country.name}</Text>
                  )}
                </td>

                {/* ISO code */}
                <td className={`${styles.td} ${styles.codeCell}`}>
                  {isSuperuser ? (
                    <InlineEdit
                      value={country.country_code ?? ''}
                      onSave={val => handlePatch(country.id, { country_code: val.toUpperCase() || null })}
                      placeholder="XX"
                      mono
                      width="60px"
                    />
                  ) : (
                    country.country_code
                      ? <Badge appearance="outline" size="small">{country.country_code}</Badge>
                      : <span style={{ color: tokens.colorNeutralForeground4 }}>—</span>
                  )}
                </td>

                {/* Coordinates */}
                <td className={`${styles.td} ${styles.coordCell}`}>
                  {isSuperuser ? (
                    <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' }}>
                      <InlineEdit
                        value={country.lat != null ? String(country.lat) : ''}
                        onSave={val => handlePatch(country.id, { lat: val ? parseFloat(val) : null })}
                        placeholder="lat"
                        mono
                        width="80px"
                      />
                      <span style={{ color: tokens.colorNeutralForeground4 }}>/</span>
                      <InlineEdit
                        value={country.lng != null ? String(country.lng) : ''}
                        onSave={val => handlePatch(country.id, { lng: val ? parseFloat(val) : null })}
                        placeholder="lng"
                        mono
                        width="80px"
                      />
                    </div>
                  ) : (
                    country.lat != null && country.lng != null
                      ? `${country.lat}, ${country.lng}`
                      : <span style={{ color: tokens.colorNeutralForeground4 }}>—</span>
                  )}
                </td>

                {/* Actions */}
                {isSuperuser && (
                  <td className={styles.td}>
                    <div className={styles.actionsCell}>
                      {deletingId === country.id
                        ? <Spinner size="tiny" />
                        : (
                          <Tooltip content="Delete country" relationship="label">
                            <Button
                              appearance="subtle"
                              icon={<Delete20Regular />}
                              size="small"
                              onClick={() => handleDelete(country)}
                            />
                          </Tooltip>
                        )
                      }
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AddCountryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
    </>
  );
};

export default CountryManagement;
