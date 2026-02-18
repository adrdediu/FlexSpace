import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Switch,
  Spinner,
  Badge,
  Card,
  Divider,
} from '@fluentui/react-components';
import {
  BuildingRegular,
  PeopleTeamRegular,
  ShieldPersonRegular,
  InfoRegular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
} from '@fluentui/react-icons';
import { Section } from '../Layout';
import { createLocationApi, type Location } from '../../services/locationApi';
import { useAuth } from '../../contexts/AuthContext';
import { CountryManagement } from './CountryManagement';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXL,
  },
  locationCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  locationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  locationIcon: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  locationMeta: {
    flex: 1,
    minWidth: 0,
  },
  settingRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    padding: `${tokens.spacingVerticalM} 0`,
  },
  settingInfo: {
    flex: 1,
    minWidth: 0,
  },
  settingLabel: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  settingDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: '3px',
    lineHeight: tokens.lineHeightBase300,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
  },
  statusOn: {
    color: tokens.colorPaletteGreenForeground1,
  },
  statusOff: {
    color: tokens.colorNeutralForeground3,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  infoCard: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
  },
  infoIcon: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    marginTop: '1px',
  },
  superuserBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorPalettePurpleBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPalettePurpleBorder1}`,
    color: tokens.colorPalettePurpleForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalM,
  },
  savingIndicator: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
});

export const AdminSettings: React.FC = () => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const locationApi = createLocationApi(authenticatedFetch);

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which locations are currently being saved
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      // Load full location details (with allow_room_managers_to_add_group_members)
      const list = await locationApi.getLocations();
      // Fetch full detail for each to get the toggle field
      const detailed = await Promise.all(list.map(l => locationApi.getLocation(l.id)));
      setLocations(detailed);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoomManagerPermission = async (
    location: Location,
    newValue: boolean
  ) => {
    setSavingIds(prev => new Set(prev).add(location.id));
    try {
      const updated = await locationApi.toggleRoomManagerPermissions(location.id, newValue);
      setLocations(prev =>
        prev.map(l => l.id === updated.id ? updated : l)
      );
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      alert(err.message || 'Failed to save setting');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(location.id);
        return next;
      });
    }
  };

  const isSuperuser = user?.is_superuser;

  return (
    <div className={styles.page}>

      {/* Location Permissions */}
      <Section
        title="Location Permissions"
        description="Configure access control settings for each location you manage"
      >
        {isSuperuser && (
          <div className={styles.superuserBanner}>
            <ShieldPersonRegular />
            <span>Superuser — you can manage settings for all locations</span>
          </div>
        )}

        <div className={styles.infoCard} style={{ marginBottom: tokens.spacingVerticalL }}>
          <InfoRegular className={styles.infoIcon} />
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            These settings control what room managers can do within each location.
            Changes take effect immediately.
          </Text>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <Spinner size="medium" label="Loading locations…" />
          </div>
        ) : locations.length === 0 ? (
          <div className={styles.emptyState}>
            <BuildingRegular style={{ fontSize: '40px' }} />
            <Text size={300} weight="semibold">No locations found</Text>
            <Text size={200}>You are not a manager of any location.</Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
            {locations.map(location => {
              const isSaving = savingIds.has(location.id);
              const isAllowed = location.allow_room_managers_to_add_group_members;

              return (
                <Card key={location.id}>
                  <div className={styles.locationCard}>
                    {/* Location header */}
                    <div className={styles.locationHeader}>
                      <div className={styles.locationIcon}>
                        <BuildingRegular style={{ fontSize: '18px' }} />
                      </div>
                      <div className={styles.locationMeta}>
                        <Text weight="semibold" size={400}>{location.name}</Text>
                        <br />
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                          {location.country_name}
                          {' · '}
                          {location.floor_count} {location.floor_count === 1 ? 'floor' : 'floors'}
                          {' · '}
                          {location.room_count} {location.room_count === 1 ? 'room' : 'rooms'}
                          {' · '}
                          {location.user_group_count} {location.user_group_count === 1 ? 'group' : 'groups'}
                        </Text>
                      </div>
                      {isSaving && (
                        <Spinner size="tiny" />
                      )}
                    </div>

                    <Divider />

                    {/* Setting: allow room managers to add group members */}
                    <div className={styles.settingRow}>
                      <div className={styles.settingInfo}>
                        <div className={styles.settingLabel}>
                          <PeopleTeamRegular style={{ fontSize: '16px' }} />
                          Room managers can add group members
                        </div>
                        <div className={styles.settingDescription}>
                          When enabled, room managers in this location can add users to
                          user groups — not just location managers. Useful for delegating
                          day-to-day group maintenance.
                        </div>
                        <div
                          className={`${styles.statusBadge} ${isAllowed ? styles.statusOn : styles.statusOff}`}
                          style={{ marginTop: tokens.spacingVerticalXS }}
                        >
                          {isAllowed
                            ? <><CheckmarkCircle20Regular />Enabled</>
                            : <><DismissCircle20Regular />Disabled — only location managers can manage groups</>
                          }
                        </div>
                      </div>
                      <Switch
                        checked={isAllowed}
                        disabled={isSaving}
                        onChange={(_, d) =>
                          handleToggleRoomManagerPermission(location, d.checked)
                        }
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {/* Countries */}
      <Section
        title="Countries"
        description={isSuperuser
          ? 'Add, edit, and delete countries. Countries are required before creating locations.'
          : 'Countries available in the platform.'}
      >
        <CountryManagement />
      </Section>

      {/* Superuser-only: System info */}
      {isSuperuser && (
        <Section
          title="System"
          description="Platform-level information visible to superusers only"
        >
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
              <div className={styles.settingRow} style={{ paddingTop: 0 }}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Total locations</div>
                  <div className={styles.settingDescription}>All locations across the platform</div>
                </div>
                <Badge appearance="filled" color="brand" size="large">
                  {locations.length}
                </Badge>
              </div>

              <Divider />

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Total floors</div>
                  <div className={styles.settingDescription}>Across all locations</div>
                </div>
                <Badge appearance="filled" color="brand" size="large">
                  {locations.reduce((sum, l) => sum + l.floor_count, 0)}
                </Badge>
              </div>

              <Divider />

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Total rooms</div>
                  <div className={styles.settingDescription}>Across all locations</div>
                </div>
                <Badge appearance="filled" color="brand" size="large">
                  {locations.reduce((sum, l) => sum + l.room_count, 0)}
                </Badge>
              </div>

              <Divider />

              <div className={styles.settingRow} style={{ paddingBottom: 0 }}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Total user groups</div>
                  <div className={styles.settingDescription}>Across all locations</div>
                </div>
                <Badge appearance="filled" color="brand" size="large">
                  {locations.reduce((sum, l) => sum + l.user_group_count, 0)}
                </Badge>
              </div>
            </div>
          </Card>
        </Section>
      )}

    </div>
  );
};

export default AdminSettings;
