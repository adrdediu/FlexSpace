import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Textarea,
  Field,
  Text,
  Select,
  Spinner,
} from '@fluentui/react-components';
import { Modal } from '../../Common/Modal';
import { type UserGroupDetail, type UserGroupList } from '../../../services/userGroupApi';
import { type LocationListItem } from '../../../services/locationApi';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

interface CreateEditGroupModalProps {
  open: boolean;
  onClose: () => void;
  group?: UserGroupList | null; // if set → edit mode
  locations: LocationListItem[];
  defaultLocationId?: number;
  onSave: (data: { name: string; description: string; location: number }) => Promise<void>;
}

export const CreateEditGroupModal: React.FC<CreateEditGroupModalProps> = ({
  open,
  onClose,
  group,
  locations,
  defaultLocationId,
  onSave,
}) => {
  const styles = useStyles();
  const isEdit = !!group;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when opening
  useEffect(() => {
    if (open) {
      setName(group?.name ?? '');
      setDescription(group?.description ?? '');
      setLocationId(group?.location ?? defaultLocationId ?? locations[0]?.id ?? 0);
      setError(null);
    }
  }, [open, group]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    if (!locationId) {
      setError('Please select a location.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim(), location: locationId });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Group' : 'Create Group'}
      subtitle={isEdit ? group!.location_name : undefined}
      size="small"
      actions={[
        { label: 'Cancel', onClick: onClose, appearance: 'secondary' },
        {
          label: saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group',
          onClick: handleSave,
          appearance: 'primary',
          disabled: saving,
        },
      ]}
    >
      <div className={styles.form}>
        {!isEdit && (
          <Field label="Location" required>
            <Select
              value={String(locationId)}
              onChange={(_, d) => setLocationId(Number(d.value))}
              disabled={saving}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Group Name" required>
          <Input
            value={name}
            onChange={(_, d) => setName(d.value)}
            placeholder="e.g. Engineering Team"
            disabled={saving}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(_, d) => setDescription(d.value)}
            placeholder="Optional description of this group's purpose"
            resize="vertical"
            disabled={saving}
            rows={3}
          />
        </Field>

        {error && <Text className={styles.errorText}>{error}</Text>}
      </div>
    </Modal>
  );
};

export default CreateEditGroupModal;
