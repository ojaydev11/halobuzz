import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Slider,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/api';

interface CreatorTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'streaming' | 'content' | 'monetization' | 'analytics';
  premium?: boolean;
}

export default function CreatorToolsSettings() {
  const [creatorTools, setCreatorTools] = useState<CreatorTool[]>([
    {
      id: 'stream-quality',
      title: 'Auto Quality Adjustment',
      description: 'Automatically adjust stream quality based on connection',
      icon: 'videocam-outline',
      enabled: true,
      category: 'streaming',
    },
    {
      id: 'noise-cancellation',
      title: 'AI Noise Cancellation',
      description: 'Remove background noise from your audio',
      icon: 'mic-outline',
      enabled: true,
      category: 'streaming',
    },
    {
      id: 'auto-thumbnails',
      title: 'Auto Thumbnail Generation',
      description: 'Generate eye-catching thumbnails automatically',
      icon: 'image-outline',
      enabled: true,
      category: 'content',
    },
    {
      id: 'content-scheduling',
      title: 'Content Scheduling',
      description: 'Schedule posts and streams in advance',
      icon: 'time-outline',
      enabled: false,
      category: 'content',
    },
    {
      id: 'monetization-tools',
      title: 'Monetization Tools',
      description: 'Access to donations, subscriptions, and tips',
      icon: 'diamond-outline',
      enabled: true,
      category: 'monetization',
    },
    {
      id: 'analytics-dashboard',
      title: 'Advanced Analytics',
      description: 'Detailed insights into your content performance',
      icon: 'analytics-outline',
      enabled: true,
      category: 'analytics',
    },
    {
      id: 'collaboration-tools',
      title: 'Collaboration Tools',
      description: 'Tools for working with other creators',
      icon: 'people-outline',
      enabled: false,
      category: 'content',
      premium: true,
    },
    {
      id: 'ai-content-optimization',
      title: 'AI Content Optimization',
      description: 'AI-powered content improvement suggestions',
      icon: 'bulb-outline',
      enabled: true,
      category: 'analytics',
      premium: true,
    },
  ]);

  const [streamSettings, setStreamSettings] = useState({
    maxBitrate: 6000,
    resolution: '1080p',
    framerate: 60,
    audioQuality: 'high',
  });

  const [monetizationSettings, setMonetizationSettings] = useState({
    donationGoal: 100,
    subscriptionPrice: 4.99,
    tipMinimum: 1.00,
    autoThankYou: true,
  });

  const toggleTool = async (toolId: string) => {
    try {
      const tool = creatorTools.find(t => t.id === toolId);
      if (!tool) return;

      if (tool.premium) {
        Alert.alert(
          'Premium Feature',
          'This feature requires a premium subscription. Would you like to upgrade?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {
              // Navigate to subscription page
              Alert.alert('Upgrade', 'Redirecting to subscription page...');
            }},
          ]
        );
        return;
      }

      const response = await apiClient.put(`/creator/tools/${toolId}`, {
        enabled: !tool.enabled,
      });

      if (response.success) {
        setCreatorTools(prev =>
          prev.map(t =>
            t.id === toolId ? { ...t, enabled: !t.enabled } : t
          )
        );
      } else {
        Alert.alert('Error', 'Failed to update creator tool');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update creator tool');
    }
  };

  const updateStreamSettings = async (setting: string, value: any) => {
    try {
      const response = await apiClient.put('/creator/stream-settings', {
        [setting]: value,
      });

      if (response.success) {
        setStreamSettings(prev => ({ ...prev, [setting]: value }));
      } else {
        Alert.alert('Error', 'Failed to update stream settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update stream settings');
    }
  };

  const updateMonetizationSettings = async (setting: string, value: any) => {
    try {
      const response = await apiClient.put('/creator/monetization-settings', {
        [setting]: value,
      });

      if (response.success) {
        setMonetizationSettings(prev => ({ ...prev, [setting]: value }));
      } else {
        Alert.alert('Error', 'Failed to update monetization settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update monetization settings');
    }
  };

  const renderTool = (tool: CreatorTool) => (
    <View key={tool.id} style={styles.toolItem}>
      <View style={styles.toolLeft}>
        <View style={styles.toolIcon}>
          <Ionicons name={tool.icon as any} size={20} color="#007AFF" />
        </View>
        <View style={styles.toolInfo}>
          <View style={styles.toolTitleRow}>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            {tool.premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.toolDescription}>{tool.description}</Text>
        </View>
      </View>
      <Switch
        value={tool.enabled}
        onValueChange={() => toggleTool(tool.id)}
        trackColor={{ false: '#333', true: '#007AFF' }}
        thumbColor={tool.enabled ? '#fff' : '#888'}
        disabled={tool.premium && !tool.enabled}
      />
    </View>
  );

  const renderResolutionOption = (value: string, label: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.resolutionOption,
        streamSettings.resolution === value && styles.resolutionOptionActive,
      ]}
      onPress={() => updateStreamSettings('resolution', value)}
    >
      <Text style={[
        styles.resolutionLabel,
        streamSettings.resolution === value && styles.resolutionLabelActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const categories = {
    streaming: creatorTools.filter(t => t.category === 'streaming'),
    content: creatorTools.filter(t => t.category === 'content'),
    monetization: creatorTools.filter(t => t.category === 'monetization'),
    analytics: creatorTools.filter(t => t.category === 'analytics'),
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Creator Overview */}
        <View style={styles.overviewSection}>
          <View style={styles.creatorIcon}>
            <Ionicons name="construct-outline" size={32} color="#007AFF" />
          </View>
          <Text style={styles.overviewTitle}>Creator Tools</Text>
          <Text style={styles.overviewDescription}>
            Professional tools to enhance your content creation and monetization
          </Text>
        </View>

        {/* Streaming Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Tools</Text>
          <Text style={styles.sectionDescription}>
            Optimize your live streaming experience
          </Text>
          {categories.streaming.map(renderTool)}
        </View>

        {/* Stream Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stream Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Max Bitrate: {streamSettings.maxBitrate} kbps</Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={10000}
              value={streamSettings.maxBitrate}
              onValueChange={(value) => updateStreamSettings('maxBitrate', Math.round(value))}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Resolution</Text>
            <View style={styles.resolutionOptions}>
              {renderResolutionOption('720p', '720p')}
              {renderResolutionOption('1080p', '1080p')}
              {renderResolutionOption('1440p', '1440p')}
              {renderResolutionOption('4k', '4K')}
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Frame Rate: {streamSettings.framerate} fps</Text>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={120}
              value={streamSettings.framerate}
              onValueChange={(value) => updateStreamSettings('framerate', Math.round(value))}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>
        </View>

        {/* Content Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Creation</Text>
          <Text style={styles.sectionDescription}>
            Tools to enhance your content quality
          </Text>
          {categories.content.map(renderTool)}
        </View>

        {/* Monetization Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monetization</Text>
          <Text style={styles.sectionDescription}>
            Tools to monetize your content and engage with supporters
          </Text>
          {categories.monetization.map(renderTool)}
        </View>

        {/* Monetization Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monetization Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Donation Goal: ${monetizationSettings.donationGoal}</Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={1000}
              value={monetizationSettings.donationGoal}
              onValueChange={(value) => updateMonetizationSettings('donationGoal', Math.round(value))}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Subscription Price: ${monetizationSettings.subscriptionPrice}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1.99}
              maximumValue={99.99}
              value={monetizationSettings.subscriptionPrice}
              onValueChange={(value) => updateMonetizationSettings('subscriptionPrice', Math.round(value * 100) / 100)}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Minimum Tip: ${monetizationSettings.tipMinimum}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.50}
              maximumValue={50.00}
              value={monetizationSettings.tipMinimum}
              onValueChange={(value) => updateMonetizationSettings('tipMinimum', Math.round(value * 100) / 100)}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>Auto Thank You Messages</Text>
              <Text style={styles.switchDescription}>Automatically thank supporters</Text>
            </View>
            <Switch
              value={monetizationSettings.autoThankYou}
              onValueChange={(value) => updateMonetizationSettings('autoThankYou', value)}
              trackColor={{ false: '#333', true: '#007AFF' }}
              thumbColor={monetizationSettings.autoThankYou ? '#fff' : '#888'}
            />
          </View>
        </View>

        {/* Analytics Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics & Insights</Text>
          <Text style={styles.sectionDescription}>
            Understand your audience and optimize performance
          </Text>
          {categories.analytics.map(renderTool)}
        </View>

        {/* Creator Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>45</Text>
              <Text style={styles.statLabel}>Total Streams</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>125K</Text>
              <Text style={styles.statLabel}>Total Views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>$2,450</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12.5K</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          </View>
        </View>

        {/* Advanced Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Tools</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="code-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>API Access</Text>
                <Text style={styles.settingsSubtitle}>Access creator tools via API</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="cloud-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Cloud Storage</Text>
                <Text style={styles.settingsSubtitle}>Store your content in the cloud</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="shield-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Content Protection</Text>
                <Text style={styles.settingsSubtitle}>Protect your content from theft</Text>
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
  overviewSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  creatorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  overviewDescription: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  toolDescription: {
    fontSize: 14,
    color: '#888',
  },
  settingItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  resolutionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  resolutionOption: {
    flex: 1,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  resolutionOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1a1a2e',
  },
  resolutionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  resolutionLabelActive: {
    color: '#007AFF',
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  switchLeft: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    color: '#888',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
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
