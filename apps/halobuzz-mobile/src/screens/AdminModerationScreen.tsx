import React, { useState, useEffect } from 'react';
import { ScrollView, SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';

interface ModerationFlag {
  _id: string;
  reporterId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  reportedUserId?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  type: 'user' | 'stream' | 'message' | 'content';
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  metadata?: any;
  assignedModerator?: {
    _id: string;
    username: string;
  };
}

interface ModerationStats {
  pending: number;
  resolved: number;
  dismissed: number;
  totalToday: number;
  averageResponseTime: string;
}

export default function AdminModerationScreen() {
  const router = useRouter();
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pending: 0,
    resolved: 0,
    dismissed: 0,
    totalToday: 0,
    averageResponseTime: '0h 0m'
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<ModerationFlag | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'warn' | 'ban' | 'delete' | 'blur' | 'none'>('warn');
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState('24');
  const [autoModerationEnabled, setAutoModerationEnabled] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'user' | 'stream' | 'message' | 'content'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');

  useEffect(() => {
    loadModerationData();
  }, [filterType, filterPriority]);

  const loadModerationData = async () => {
    try {
      setLoading(true);

      // Load moderation flags
      const flagsResponse = await apiClient.get('/admin/moderation/flags', {
        type: filterType === 'all' ? undefined : filterType,
        priority: filterPriority === 'all' ? undefined : filterPriority,
        status: 'pending',
        limit: 50
      });

      if (flagsResponse.success) {
        setFlags(flagsResponse.data || []);
      }

      // Load moderation stats
      const statsResponse = await apiClient.get('/admin/moderation/stats');
      if (statsResponse.success) {
        setStats(statsResponse.data || stats);
      }
    } catch (error) {
      console.error('Failed to load moderation data:', error);
      Alert.alert('Error', 'Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadModerationData();
    setRefreshing(false);
  };

  const handleFlagAction = (flag: ModerationFlag) => {
    setSelectedFlag(flag);
    setActionModalVisible(true);
    setActionReason('');
    setBanDuration('24');
  };

  const submitModerationAction = async () => {
    if (!selectedFlag) return;

    try {
      const actionData = {
        flagId: selectedFlag._id,
        action: selectedAction,
        reason: actionReason,
        duration: selectedAction === 'ban' ? parseInt(banDuration) : undefined
      };

      const response = await apiClient.post('/admin/moderation/process-flag', actionData);

      if (response.success) {
        Alert.alert('Success', `${selectedAction} action applied successfully`);
        setActionModalVisible(false);
        await loadModerationData();
      } else {
        Alert.alert('Error', 'Failed to process moderation action');
      }
    } catch (error) {
      console.error('Failed to submit moderation action:', error);
      Alert.alert('Error', 'Failed to process moderation action');
    }
  };

  const assignToSelf = async (flag: ModerationFlag) => {
    try {
      const response = await apiClient.post(`/admin/moderation/assign/${flag._id}`, {
        moderatorId: 'current-user' // This would be the current admin's ID
      });

      if (response.success) {
        Alert.alert('Success', 'Flag assigned to you');
        await loadModerationData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign flag');
    }
  };

  const toggleAutoModeration = async () => {
    try {
      const response = await apiClient.put('/admin/settings/auto-moderation', {
        enabled: !autoModerationEnabled
      });

      if (response.success) {
        setAutoModerationEnabled(!autoModerationEnabled);
        Alert.alert('Success', `Auto-moderation ${!autoModerationEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-moderation setting');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      case 'low': return '#00ff00';
      default: return '#888';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return 'person-outline';
      case 'stream': return 'videocam-outline';
      case 'message': return 'chatbubble-outline';
      case 'content': return 'document-outline';
      default: return 'flag-outline';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Moderation</Text>
        <TouchableOpacity onPress={() => router.push('/admin/settings')}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>📊 Moderation Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#ff000020' }]}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#00ff0020' }]}>
              <Text style={styles.statNumber}>{stats.resolved}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#0088ff20' }]}>
              <Text style={styles.statNumber}>{stats.totalToday}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ffaa0020' }]}>
              <Text style={styles.statNumber}>{stats.averageResponseTime}</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
          </View>
        </View>

        {/* Auto-Moderation Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Auto-Moderation</Text>
          <View style={styles.autoModerationCard}>
            <View style={styles.autoModerationHeader}>
              <Text style={styles.autoModerationTitle}>AI Content Filtering</Text>
              <Switch
                value={autoModerationEnabled}
                onValueChange={toggleAutoModeration}
                trackColor={{ false: '#333', true: '#007AFF' }}
                thumbColor={autoModerationEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.autoModerationDescription}>
              Automatically flags inappropriate content using AI analysis
            </Text>
            <View style={styles.autoModerationStats}>
              <Text style={styles.autoModerationStat}>🎯 98.7% accuracy</Text>
              <Text style={styles.autoModerationStat}>⚡ 1.2s avg processing</Text>
              <Text style={styles.autoModerationStat}>🛡️ 2,847 blocked today</Text>
            </View>
          </View>
        </View>

        {/* Filter Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Filters</Text>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'user', 'stream', 'message', 'content'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    filterType === type && styles.filterChipActive
                  ]}
                  onPress={() => setFilterType(type as any)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterType === type && styles.filterChipTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'urgent', 'high', 'medium', 'low'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.filterChip,
                    filterPriority === priority && styles.filterChipActive,
                    priority !== 'all' && { borderColor: getPriorityColor(priority) }
                  ]}
                  onPress={() => setFilterPriority(priority as any)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterPriority === priority && styles.filterChipTextActive
                  ]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Moderation Queue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Pending Reports ({flags.length})</Text>
          {flags.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#00ff00" />
              <Text style={styles.emptyStateText}>No pending reports!</Text>
              <Text style={styles.emptyStateSubtext}>All content is properly moderated</Text>
            </View>
          ) : (
            flags.map((flag) => (
              <View key={flag._id} style={styles.flagCard}>
                <View style={styles.flagHeader}>
                  <View style={styles.flagInfo}>
                    <Ionicons
                      name={getTypeIcon(flag.type) as any}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.flagType}>{flag.type.toUpperCase()}</Text>
                    <View style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(flag.priority) }
                    ]}>
                      <Text style={styles.priorityText}>{flag.priority}</Text>
                    </View>
                  </View>
                  <Text style={styles.flagTime}>{formatTimeAgo(flag.createdAt)}</Text>
                </View>

                <View style={styles.flagContent}>
                  <Text style={styles.flagReason}>{flag.reason}</Text>
                  <Text style={styles.flagDescription}>{flag.description}</Text>

                  <View style={styles.flagUsers}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userLabel}>Reporter:</Text>
                      <Text style={styles.userName}>{flag.reporterId.username}</Text>
                    </View>
                    {flag.reportedUserId && (
                      <View style={styles.userInfo}>
                        <Text style={styles.userLabel}>Reported:</Text>
                        <Text style={styles.userName}>{flag.reportedUserId.username}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.flagActions}>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => assignToSelf(flag)}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#007AFF" />
                    <Text style={styles.assignButtonText}>Assign to Me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleFlagAction(flag)}
                  >
                    <Ionicons name="hammer-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Take Action</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="analytics-outline" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="people-outline" size={24} color="#ff6600" />
              <Text style={styles.quickActionText}>Banned Users</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#00ff00" />
              <Text style={styles.quickActionText}>Audit Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Moderation Action Modal */}
      <Modal
        visible={actionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Take Moderation Action</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Report: {selectedFlag?.reason}
            </Text>

            {/* Action Selection */}
            <View style={styles.actionSelection}>
              <Text style={styles.inputLabel}>Select Action:</Text>
              {[
                { id: 'none', label: 'No Action', icon: 'checkmark-outline', color: '#00ff00' },
                { id: 'warn', label: 'Send Warning', icon: 'warning-outline', color: '#ffaa00' },
                { id: 'blur', label: 'Blur Content', icon: 'eye-off-outline', color: '#007AFF' },
                { id: 'delete', label: 'Delete Content', icon: 'trash-outline', color: '#ff6600' },
                { id: 'ban', label: 'Ban User', icon: 'ban-outline', color: '#ff0000' }
              ].map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionOption,
                    selectedAction === action.id && styles.actionOptionActive
                  ]}
                  onPress={() => setSelectedAction(action.id as any)}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={selectedAction === action.id ? '#fff' : action.color}
                  />
                  <Text style={[
                    styles.actionOptionText,
                    selectedAction === action.id && styles.actionOptionTextActive
                  ]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ban Duration */}
            {selectedAction === 'ban' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ban Duration (hours):</Text>
                <TextInput
                  style={styles.input}
                  value={banDuration}
                  onChangeText={setBanDuration}
                  keyboardType="numeric"
                  placeholder="24"
                  placeholderTextColor="#888"
                />
              </View>
            )}

            {/* Reason */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason (required):</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={actionReason}
                onChangeText={setActionReason}
                placeholder="Enter reason for this action..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !actionReason && styles.submitButtonDisabled
              ]}
              onPress={submitModerationAction}
              disabled={!actionReason}
            >
              <Text style={styles.submitButtonText}>Apply Action</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },

  // Stats
  statsContainer: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },

  // Auto-moderation
  section: { marginBottom: 24 },
  autoModerationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  autoModerationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoModerationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  autoModerationDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  autoModerationStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  autoModerationStat: {
    fontSize: 10,
    color: '#00ff00',
    backgroundColor: '#00ff0020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Filters
  filterRow: { marginBottom: 8 },
  filterChip: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Flag cards
  flagCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  flagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  flagTime: {
    fontSize: 10,
    color: '#888',
  },
  flagContent: { marginBottom: 12 },
  flagReason: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  flagDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  flagUsers: {
    flexDirection: 'row',
    gap: 16,
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontSize: 10,
    color: '#888',
  },
  userName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  flagActions: {
    flexDirection: 'row',
    gap: 12,
  },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  assignButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  quickActionText: {
    fontSize: 10,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },

  // Modal
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },

  // Action selection
  actionSelection: { marginBottom: 20 },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    gap: 12,
  },
  actionOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  actionOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  actionOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#555',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Submit
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});