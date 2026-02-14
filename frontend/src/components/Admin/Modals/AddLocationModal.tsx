import React, { useState, useEffect } from 'react';
import {
  Field,
  Input,
  Select,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { Modal } from '../../Common/Modal';
import { createCountriesApi, type Country } from '../../../services/countriesApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  formFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXL,
  },
});

export interface AddLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    country: number;
    lat?: number;
    lng?: number;
    country_code?: string;
  }) => Promise<void>;
}

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [name, setName] = useState('');
  const [country, setCountry] = useState<number>(0);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const countriesApi = createCountriesApi(authenticatedFetch);

  useEffect(() => {
    if (open) {
      fetchCountries();
    }
  }, [open]);

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const data = await countriesApi.getCountries();
      setCountries(data);
    } catch (err: any) {
      console.error('Error fetching countries:', err);
      alert('Failed to load countries');
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !country) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        country,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        country_code: countryCode || undefined,
      });

      // Reset form
      setName('');
      setCountry(0);
      setLat('');
      setLng('');
      setCountryCode('');
      onClose();
    } catch (error) {
      console.error('Error creating location:', error);
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setCountry(0);
      setLat('');
      setLng('');
      setCountryCode('');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add New Location"
      subtitle="Create a new office location"
      size="medium"
      actions={[
        {
          label: 'Cancel',
          onClick: handleClose,
          appearance: 'secondary',
          disabled: submitting,
        },
        {
          label: 'Create Location',
          onClick: handleSubmit,
          appearance: 'primary',
          loading: submitting,
          disabled: !name.trim() || !country || loadingCountries,
        },
      ]}
    >
      {loadingCountries ? (
        <div className={styles.loadingContainer}>
          <Spinner label="Loading countries..." />
        </div>
      ) : (
        <div className={styles.formFields}>
          <Field label="Location Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., San Francisco Office"
              disabled={submitting}
            />
          </Field>

          <Field label="Country" required>
            <Select
              value={String(country)}
              onChange={(e) => setCountry(Number(e.target.value))}
              disabled={submitting}
            >
              <option value="0">Select a country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Country Code" hint="Optional, e.g., US, UK, JP">
            <Input
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder="US"
              maxLength={2}
              disabled={submitting}
            />
          </Field>

          <Field label="Latitude" hint="Optional">
            <Input
              type="number"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.7749"
              step="0.000001"
              disabled={submitting}
            />
          </Field>

          <Field label="Longitude" hint="Optional">
            <Input
              type="number"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-122.4194"
              step="0.000001"
              disabled={submitting}
            />
          </Field>
        </div>
      )}
    </Modal>
  );
};

export default AddLocationModal;