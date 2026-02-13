import React from 'react';
import {
  makeStyles,
  tokens,
  Avatar,
  Text,
  Button,
  Badge,
  Divider,
} from '@fluentui/react-components';
import {
  Mail20Regular,
  Building20Regular,
  People20Regular,
  Calendar20Regular,
  Location20Regular,
  Edit20Regular,
  Shield20Regular,
} from '@fluentui/react-icons';
import { Modal } from './Modal';
import { useAuth } from '../../contexts/AuthContext';

const useStyles = makeStyles({
  profileContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  profileHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  avatarContainer: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
  },
  userName: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    textAlign: 'center',
  },
  userRole: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  roleBadges: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalXS,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  infoIcon: {
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  infoContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  infoLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  infoValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    gap: tokens.spacingVerticalXS,
  },
  statValue: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  statLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  bio: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.5',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  emptyBio: {
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground4,
  },
});

export interface ProfileDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;
  
  /**
   * Close handler
   */
  onClose: () => void;
  
  /**
   * Optional: View another user's profile (defaults to current user)
   */
  userId?: number;
  
  /**
   * Optional: Callback when edit is clicked
   */
  onEdit?: () => void;
}

/**
 * ProfileDialog - User profile view modal
 * 
 * Displays comprehensive user information including profile details,
 * role badges, contact information, and booking statistics.
 */
export const ProfileDialog: React.FC<ProfileDialogProps> = ({
  open,
  onClose,
  userId,
  onEdit,
}) => {
  const styles = useStyles();
  const { user } = useAuth();
  
  // In a real app, fetch user data based on userId
  // For now, we'll use the current user
  const profileUser = user;

  const getFullName = () => {
    if (!profileUser) return 'User';
    if (profileUser.first_name || profileUser.last_name) {
      return `${profileUser.first_name} ${profileUser.last_name}`.trim();
    }
    return profileUser.username;
  };

  const getUserRole = () => {
    if (!profileUser) return 'User';
    if (profileUser.is_superuser) return 'Super Administrator';
    if (profileUser.is_staff) return 'Staff Member';
    if (profileUser.role) return profileUser.role;
    return 'Team Member';
  };

  const getInitials = () => {
    if (!profileUser) return 'U';
    if (profileUser.first_name && profileUser.last_name) {
      return `${profileUser.first_name[0]}${profileUser.last_name[0]}`.toUpperCase();
    }
    return profileUser.username.substring(0, 2).toUpperCase();
  };

  // Mock data - in real app, fetch from API
  const mockStats = {
    totalBookings: 47,
    upcomingBookings: 3,
    favoriteLocation: 'San Francisco Office',
  };

  const mockBio = "Passionate about creating efficient workspaces and fostering collaboration. Love working from different locations to stay inspired!";

  const isOwnProfile = !userId || userId === profileUser?.id;

  const actions = isOwnProfile && onEdit ? [
    {
      label: 'Edit Profile',
      onClick: onEdit,
      appearance: 'primary' as const,
      icon: <Edit20Regular />,
    },
  ] : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile"
      size="medium"
      actions={actions}
    >
      <div className={styles.profileContent}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <Avatar
              name={getFullName()}
              initials={getInitials()}
              size={96}
              color="brand"
              badge={{
                status: 'available',
                'aria-label': 'available',
              }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className={styles.userName}>{getFullName()}</div>
            <div className={styles.userRole}>{getUserRole()}</div>
          </div>

          {/* Role Badges */}
          <div className={styles.roleBadges}>
            {profileUser?.is_superuser && (
              <Badge
                appearance="filled"
                color="danger"
                icon={<Shield20Regular />}
              >
                Super Admin
              </Badge>
            )}
            {profileUser?.is_staff && !profileUser?.is_superuser && (
              <Badge
                appearance="filled"
                color="important"
                icon={<Shield20Regular />}
              >
                Staff
              </Badge>
            )}
            {profileUser?.groups && profileUser.groups.length > 0 && (
              <Badge appearance="filled" color="brand">
                {profileUser.groups.length} {profileUser.groups.length === 1 ? 'Group' : 'Groups'}
              </Badge>
            )}
          </div>
        </div>

        {/* Bio Section */}
        {mockBio && (
          <div className={styles.infoSection}>
            <div className={styles.sectionTitle}>About</div>
            <div className={styles.bio}>
              {mockBio || <span className={styles.emptyBio}>No bio added yet</span>}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className={styles.infoSection}>
          <div className={styles.sectionTitle}>Contact Information</div>
          
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Mail20Regular />
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Email</div>
              <div className={styles.infoValue}>{profileUser?.email || 'Not provided'}</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Building20Regular />
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Username</div>
              <div className={styles.infoValue}>@{profileUser?.username}</div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Additional Information */}
        <div className={styles.infoSection}>
          <div className={styles.sectionTitle}>Additional Information</div>
          
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Building20Regular />
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Department</div>
              <div className={styles.infoValue}>Engineering</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <People20Regular />
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Team</div>
              <div className={styles.infoValue}>Product Development</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Location20Regular />
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Preferred Location</div>
              <div className={styles.infoValue}>{mockStats.favoriteLocation}</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Calendar20Regular />
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Member Since</div>
              <div className={styles.infoValue}>January 2024</div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Statistics */}
        <div className={styles.infoSection}>
          <div className={styles.sectionTitle}>Booking Statistics</div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{mockStats.totalBookings}</div>
              <div className={styles.statLabel}>Total Bookings</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{mockStats.upcomingBookings}</div>
              <div className={styles.statLabel}>Upcoming</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>8</div>
              <div className={styles.statLabel}>This Month</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileDialog;