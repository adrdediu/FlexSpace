import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Image20Regular, Delete20Regular, ArrowUpload20Regular } from '@fluentui/react-icons';
import { type RoomWithDesks } from '../../../services/roomApi';

const useStyles = makeStyles({
  currentMap: {
    marginTop: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
  },
  mapImage: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  fileInput: {
    display: 'none',
  },
  iconContainer: {
    fontSize: '48px',
    margin: '0 auto',
    color: tokens.colorNeutralForeground3,
  },
  selectedFile: {
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
});

interface UploadRoomMapModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomWithDesks | null;
  onUploadMap: (roomId: number, file: File) => Promise<void>;
  onDeleteMap: (roomId: number) => Promise<void>;
}

/**
 * UploadRoomMapModal - Manage room map images
 * 
 * Features:
 * - View current room map
 * - Upload new map image
 * - Replace existing map
 * - Delete map
 * - File validation (image types only)
 */
export const UploadRoomMapModal: React.FC<UploadRoomMapModalProps> = ({
  open,
  onClose,
  room,
  onUploadMap,
  onDeleteMap,
}) => {
  const styles = useStyles();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Clean up old preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Create new preview URL
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!room || !selectedFile) return;

    try {
      setLoading(true);
      await onUploadMap(room.id, selectedFile);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    } catch (err) {
      console.error('Failed to upload map:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!room) return;

    if (!confirm('Are you sure you want to delete the room map?')) {
      return;
    }

    try {
      setLoading(true);
      await onDeleteMap(room.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete map:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Manage Room Map - {room?.name}</DialogTitle>
          <DialogContent>
            {room?.map_image && (
              <div className={styles.currentMap}>
                <Text size={300} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                  Current Map
                </Text>
                <img
                  src={room.map_image}
                  alt="Room map"
                  className={styles.mapImage}
                />
                <Button
                  appearance="subtle"
                  icon={<Delete20Regular />}
                  onClick={handleDelete}
                  disabled={loading}
                  style={{ marginTop: tokens.spacingVerticalS }}
                >
                  Delete Current Map
                </Button>
              </div>
            )}

            <div className={styles.uploadSection}>
              <div className={styles.iconContainer}>
                {selectedFile ? <ArrowUpload20Regular /> : <Image20Regular />}
              </div>
              <Text size={300} weight="semibold">
                {room?.map_image ? 'Replace Map' : 'Upload Map'}
              </Text>
              <Text size={200}>
                Upload an image of the room layout to help users find desks
              </Text>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />
              
              {!selectedFile ? (
                <Button
                  appearance="primary"
                  icon={<Image20Regular />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  Choose File
                </Button>
              ) : (
                <>
                  <div className={styles.selectedFile}>
                    <Text size={200} weight="semibold">Selected File:</Text>
                    <Text size={200} style={{ display: 'block', marginTop: tokens.spacingVerticalXXS }}>
                      {selectedFile.name}
                    </Text>
                    <Text size={100} style={{ display: 'block', marginTop: tokens.spacingVerticalXXS }}>
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </Text>
                  </div>
                  
                  {previewUrl && (
                    <div style={{ marginTop: tokens.spacingVerticalM }}>
                      <Text size={200} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                        Preview:
                      </Text>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className={styles.mapImage}
                      />
                    </div>
                  )}
                  
                  <Button
                    appearance="secondary"
                    onClick={() => {
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={loading}
                  >
                    Choose Different File
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            {selectedFile && (
              <Button 
                appearance="primary" 
                icon={<ArrowUpload20Regular />}
                onClick={handleUpload} 
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};