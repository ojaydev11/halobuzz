import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-audio';
import { secureLogger } from '../lib/security';

export type Permission = 'camera' | 'microphone' | 'both';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredPermissions: Permission[];
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  showExplanation?: boolean;
}

interface PermissionStatus {
  camera: boolean;
  microphone: boolean;
}

const PERMISSION_EXPLANATIONS = {
  camera: {
    title: 'Camera Access',
    description: 'HaloBuzz needs camera access to enable video streaming. Your camera will only be used when you choose to go live.',
    benefits: [
      'Stream live video to your audience',
      'Switch between front and back cameras',
      'Control when your camera is active'
    ]
  },
  microphone: {
    title: 'Microphone Access',
    description: 'HaloBuzz needs microphone access for live audio streaming. You can mute/unmute at any time during your stream.',
    benefits: [
      'Stream live audio to your audience',
      'Communicate with viewers in real-time',
      'Control when your microphone is active'
    ]
  },
  both: {
    title: 'Camera & Microphone Access',
    description: 'HaloBuzz needs both camera and microphone access for full live streaming functionality.',
    benefits: [
      'Create engaging live video content',
      'Interact with your audience in real-time',
      'Full control over your privacy settings'
    ]
  }
};

export default function PermissionGate({
  children,
  requiredPermissions,
  onPermissionGranted,
  onPermissionDenied,
  showExplanation = true
}: PermissionGateProps) {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    microphone: false
  });
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setIsChecking(true);
      
      const cameraStatus = await Camera.getCameraPermissionsAsync();
      const audioStatus = await Audio.getPermissionsAsync();

      const newPermissions = {
        camera: cameraStatus.status === 'granted',
        microphone: audioStatus.status === 'granted'
      };

      setPermissions(newPermissions);

      const hasRequiredPermissions = checkRequiredPermissions(newPermissions);
      
      if (!hasRequiredPermissions && !hasRequestedPermissions) {
        if (showExplanation) {
          setShowModal(true);
        } else {
          await requestPermissions();
        }
      } else if (hasRequiredPermissions) {
        onPermissionGranted?.();
      }
    } catch (error) {
      secureLogger.error('Failed to check permissions', error);
    } finally {
      setIsChecking(false);
    }
  };

  const checkRequiredPermissions = (currentPermissions: PermissionStatus): boolean => {
    return requiredPermissions.every(permission => {
      switch (permission) {
        case 'camera':
          return currentPermissions.camera;
        case 'microphone':
          return currentPermissions.microphone;
        case 'both':
          return currentPermissions.camera && currentPermissions.microphone;
        default:
          return true;
      }
    });
  };

  const requestPermissions = async () => {
    try {
      setHasRequestedPermissions(true);
      
      const needsCamera = requiredPermissions.includes('camera') || requiredPermissions.includes('both');
      const needsMicrophone = requiredPermissions.includes('microphone') || requiredPermissions.includes('both');

      let cameraGranted = permissions.camera;
      let microphoneGranted = permissions.microphone;

      if (needsCamera && !permissions.camera) {
        secureLogger.log('Requesting camera permission');
        const cameraResult = await Camera.requestCameraPermissionsAsync();
        cameraGranted = cameraResult.status === 'granted';
        
        if (!cameraGranted) {
          secureLogger.warn('Camera permission denied');
        }
      }

      if (needsMicrophone && !permissions.microphone) {
        secureLogger.log('Requesting microphone permission');
        const audioResult = await Audio.requestPermissionsAsync();
        microphoneGranted = audioResult.status === 'granted';
        
        if (!microphoneGranted) {
          secureLogger.warn('Microphone permission denied');
        }
      }

      const newPermissions = {
        camera: cameraGranted,
        microphone: microphoneGranted
      };

      setPermissions(newPermissions);
      setShowModal(false);

      const hasAllRequired = checkRequiredPermissions(newPermissions);
      
      if (hasAllRequired) {
        secureLogger.log('All required permissions granted');
        onPermissionGranted?.();
      } else {
        secureLogger.warn('Some required permissions were denied');
        onPermissionDenied?.();
        showPermissionDeniedAlert();
      }
    } catch (error) {
      secureLogger.error('Failed to request permissions', error);
      onPermissionDenied?.();
    }
  };

  const showPermissionDeniedAlert = () => {
    Alert.alert(
      'Permissions Required',
      'HaloBuzz needs camera and microphone access to enable live streaming. Please enable these permissions in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          // Note: Opening settings requires expo-linking or react-native-settings
          secureLogger.log('User requested to open settings');
        }}
      ]
    );
  };

  const getExplanationContent = () => {
    if (requiredPermissions.length === 1) {
      return PERMISSION_EXPLANATIONS[requiredPermissions[0]];
    } else if (requiredPermissions.includes('both') || 
               (requiredPermissions.includes('camera') && requiredPermissions.includes('microphone'))) {
      return PERMISSION_EXPLANATIONS.both;
    } else {
      return PERMISSION_EXPLANATIONS.camera;
    }
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  const hasRequiredPermissions = checkRequiredPermissions(permissions);

  if (!hasRequiredPermissions) {
    return (
      <>
        <View style={styles.blockedContainer}>
          <Text style={styles.blockedTitle}>Permissions Required</Text>
          <Text style={styles.blockedText}>
            This feature requires {requiredPermissions.join(' and ')} access.
          </Text>
          <TouchableOpacity style={styles.requestButton} onPress={requestPermissions}>
            <Text style={styles.requestButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>
                  {getExplanationContent().title}
                </Text>
                
                <Text style={styles.modalDescription}>
                  {getExplanationContent().description}
                </Text>

                <Text style={styles.benefitsTitle}>What you can do:</Text>
                {getExplanationContent().benefits.map((benefit, index) => (
                  <Text key={index} style={styles.benefitItem}>
                    • {benefit}
                  </Text>
                ))}

                <Text style={styles.privacyNote}>
                  🔒 Your privacy is important to us. You can revoke these permissions at any time in your device settings.
                </Text>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => {
                    setShowModal(false);
                    onPermissionDenied?.();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Not Now</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.grantButton]} 
                  onPress={requestPermissions}
                >
                  <Text style={styles.grantButtonText}>Grant Access</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  requestButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
    paddingLeft: 8,
  },
  privacyNote: {
    fontSize: 14,
    color: '#888',
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 8,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  grantButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});