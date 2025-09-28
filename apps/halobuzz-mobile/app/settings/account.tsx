import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { apiClient } from '@/lib/api';

export default function AccountSettings() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    country: user?.country || '',
    language: user?.language || 'en',
  });

  const handleSave = async () => {
    try {
      const response = await apiClient.put(`/users/${user?.id}`, formData);
      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This will send a password reset link to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Link', onPress: () => {
          // Implement password reset
          Alert.alert('Success', 'Password reset link sent to your email');
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Account Deletion', 'Please contact support to delete your account');
        }},
      ]
    );
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        keyboardType={keyboardType}
        editable={editing}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <Image source={{ uri: user?.avatar }} style={styles.avatar} />
          <TouchableOpacity style={styles.changePhotoButton}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {renderInputField(
            'Display Name',
            formData.displayName,
            (text) => setFormData({ ...formData, displayName: text }),
            'Enter your display name'
          )}
          
          {renderInputField(
            'Username',
            formData.username,
            (text) => setFormData({ ...formData, username: text }),
            'Enter your username'
          )}
          
          {renderInputField(
            'Email',
            formData.email,
            (text) => setFormData({ ...formData, email: text }),
            'Enter your email',
            'email-address'
          )}
          
          {renderInputField(
            'Phone',
            formData.phone,
            (text) => setFormData({ ...formData, phone: text }),
            'Enter your phone number',
            'phone-pad'
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell us about yourself"
              placeholderTextColor="#888"
              multiline
              numberOfLines={4}
              editable={editing}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {editing ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setFormData({
                    displayName: user?.displayName || '',
                    username: user?.username || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                    bio: user?.bio || '',
                    country: user?.country || '',
                    language: user?.language || 'en',
                  });
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handleChangePassword}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Change Password</Text>
                <Text style={styles.settingsSubtitle}>Update your password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Two-Factor Authentication</Text>
                <Text style={styles.settingsSubtitle}>Add extra security</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="download-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Download Data</Text>
                <Text style={styles.settingsSubtitle}>Export your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="eye-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Account Activity</Text>
                <Text style={styles.settingsSubtitle}>View login history</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="trash-outline" size={20} color="#ff0000" />
              </View>
              <View style={styles.settingsText}>
                <Text style={[styles.settingsTitle, { color: '#ff0000' }]}>Delete Account</Text>
                <Text style={styles.settingsSubtitle}>Permanently delete your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  bottomSpacing: {
    height: 100,
  },
});
