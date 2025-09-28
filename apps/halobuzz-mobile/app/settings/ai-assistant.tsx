import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/api';

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'content' | 'analytics' | 'automation' | 'personalization';
}

export default function AIAssistantSettings() {
  const [aiFeatures, setAiFeatures] = useState<AIFeature[]>([
    {
      id: 'content-generation',
      title: 'AI Content Generation',
      description: 'Generate titles, descriptions, and hashtags for your content',
      icon: 'create-outline',
      enabled: true,
      category: 'content',
    },
    {
      id: 'smart-editing',
      title: 'Smart Video Editing',
      description: 'AI-powered automatic video editing and enhancement',
      icon: 'videocam-outline',
      enabled: true,
      category: 'content',
    },
    {
      id: 'voice-cloning',
      title: 'Voice Cloning',
      description: 'Create AI voiceovers using your voice',
      icon: 'mic-outline',
      enabled: false,
      category: 'content',
    },
    {
      id: 'trend-analysis',
      title: 'Trend Analysis',
      description: 'Get AI insights on trending topics and optimal posting times',
      icon: 'trending-up-outline',
      enabled: true,
      category: 'analytics',
    },
    {
      id: 'audience-insights',
      title: 'Audience Insights',
      description: 'AI-powered audience analysis and recommendations',
      icon: 'people-outline',
      enabled: true,
      category: 'analytics',
    },
    {
      id: 'content-optimization',
      title: 'Content Optimization',
      description: 'AI suggestions to improve engagement and reach',
      icon: 'bulb-outline',
      enabled: true,
      category: 'analytics',
    },
    {
      id: 'auto-scheduling',
      title: 'Auto Scheduling',
      description: 'Automatically schedule posts at optimal times',
      icon: 'time-outline',
      enabled: false,
      category: 'automation',
    },
    {
      id: 'auto-responses',
      title: 'Auto Responses',
      description: 'AI-generated responses to comments and messages',
      icon: 'chatbubble-outline',
      enabled: false,
      category: 'automation',
    },
    {
      id: 'personalized-feed',
      title: 'Personalized Feed',
      description: 'AI-curated content feed based on your interests',
      icon: 'grid-outline',
      enabled: true,
      category: 'personalization',
    },
    {
      id: 'smart-recommendations',
      title: 'Smart Recommendations',
      description: 'AI-powered content and creator recommendations',
      icon: 'star-outline',
      enabled: true,
      category: 'personalization',
    },
  ]);

  const [aiPersonality, setAiPersonality] = useState('professional');
  const [aiCreativity, setAiCreativity] = useState(70);
  const [aiResponseSpeed, setAiResponseSpeed] = useState('balanced');

  const toggleFeature = async (featureId: string) => {
    try {
      const feature = aiFeatures.find(f => f.id === featureId);
      if (!feature) return;

      const response = await apiClient.put(`/ai/features/${featureId}`, {
        enabled: !feature.enabled,
      });

      if (response.success) {
        setAiFeatures(prev =>
          prev.map(f =>
            f.id === featureId ? { ...f, enabled: !f.enabled } : f
          )
        );
      } else {
        Alert.alert('Error', 'Failed to update AI feature');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update AI feature');
    }
  };

  const updateAIPersonality = async (personality: string) => {
    try {
      const response = await apiClient.put('/ai/personality', { personality });
      if (response.success) {
        setAiPersonality(personality);
      } else {
        Alert.alert('Error', 'Failed to update AI personality');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update AI personality');
    }
  };

  const updateAICreativity = async (creativity: number) => {
    try {
      const response = await apiClient.put('/ai/creativity', { creativity });
      if (response.success) {
        setAiCreativity(creativity);
      } else {
        Alert.alert('Error', 'Failed to update AI creativity');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update AI creativity');
    }
  };

  const renderFeature = (feature: AIFeature) => (
    <View key={feature.id} style={styles.featureItem}>
      <View style={styles.featureLeft}>
        <View style={styles.featureIcon}>
          <Ionicons name={feature.icon as any} size={20} color="#007AFF" />
        </View>
        <View style={styles.featureInfo}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </View>
      <Switch
        value={feature.enabled}
        onValueChange={() => toggleFeature(feature.id)}
        trackColor={{ false: '#333', true: '#007AFF' }}
        thumbColor={feature.enabled ? '#fff' : '#888'}
      />
    </View>
  );

  const renderPersonalityOption = (value: string, label: string, description: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.personalityOption,
        aiPersonality === value && styles.personalityOptionActive,
      ]}
      onPress={() => updateAIPersonality(value)}
    >
      <Text style={[
        styles.personalityLabel,
        aiPersonality === value && styles.personalityLabelActive,
      ]}>
        {label}
      </Text>
      <Text style={[
        styles.personalityDescription,
        aiPersonality === value && styles.personalityDescriptionActive,
      ]}>
        {description}
      </Text>
    </TouchableOpacity>
  );

  const renderCreativityLevel = (value: number, label: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.creativityLevel,
        aiCreativity === value && styles.creativityLevelActive,
      ]}
      onPress={() => updateAICreativity(value)}
    >
      <Text style={[
        styles.creativityLabel,
        aiCreativity === value && styles.creativityLabelActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const categories = {
    content: aiFeatures.filter(f => f.category === 'content'),
    analytics: aiFeatures.filter(f => f.category === 'analytics'),
    automation: aiFeatures.filter(f => f.category === 'automation'),
    personalization: aiFeatures.filter(f => f.category === 'personalization'),
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* AI Overview */}
        <View style={styles.overviewSection}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={32} color="#007AFF" />
          </View>
          <Text style={styles.overviewTitle}>AI Assistant</Text>
          <Text style={styles.overviewDescription}>
            Configure your AI assistant to help you create, analyze, and optimize your content
          </Text>
        </View>

        {/* AI Personality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Personality</Text>
          <Text style={styles.sectionDescription}>
            Choose how your AI assistant communicates and behaves
          </Text>
          
          {renderPersonalityOption(
            'professional',
            'Professional',
            'Formal, business-focused responses'
          )}
          {renderPersonalityOption(
            'friendly',
            'Friendly',
            'Casual, approachable communication'
          )}
          {renderPersonalityOption(
            'creative',
            'Creative',
            'Artistic, innovative suggestions'
          )}
          {renderPersonalityOption(
            'analytical',
            'Analytical',
            'Data-driven, detailed insights'
          )}
        </View>

        {/* AI Creativity Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creativity Level</Text>
          <Text style={styles.sectionDescription}>
            Control how creative and experimental your AI suggestions are
          </Text>
          
          <View style={styles.creativityLevels}>
            {renderCreativityLevel(30, 'Conservative')}
            {renderCreativityLevel(50, 'Balanced')}
            {renderCreativityLevel(70, 'Creative')}
            {renderCreativityLevel(90, 'Experimental')}
          </View>
        </View>

        {/* Content Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Creation</Text>
          <Text style={styles.sectionDescription}>
            AI tools to help you create amazing content
          </Text>
          {categories.content.map(renderFeature)}
        </View>

        {/* Analytics Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics & Insights</Text>
          <Text style={styles.sectionDescription}>
            AI-powered analytics to understand your performance
          </Text>
          {categories.analytics.map(renderFeature)}
        </View>

        {/* Automation Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation</Text>
          <Text style={styles.sectionDescription}>
            Automate repetitive tasks with AI
          </Text>
          {categories.automation.map(renderFeature)}
        </View>

        {/* Personalization Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalization</Text>
          <Text style={styles.sectionDescription}>
            Personalized AI experiences tailored to you
          </Text>
          {categories.personalization.map(renderFeature)}
        </View>

        {/* AI Usage Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>1,247</Text>
              <Text style={styles.statLabel}>AI Requests</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>89%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2.3s</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>Time Saved (hrs)</Text>
            </View>
          </View>
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="key-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>API Keys</Text>
                <Text style={styles.settingsSubtitle}>Manage your AI service keys</Text>
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
                <Text style={styles.settingsTitle}>Data Privacy</Text>
                <Text style={styles.settingsSubtitle}>Control how your data is used</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="refresh-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingsText}>
                <Text style={styles.settingsTitle}>Reset AI Settings</Text>
                <Text style={styles.settingsSubtitle}>Restore default AI configuration</Text>
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
  aiIcon: {
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
  personalityOption: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  personalityOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1a1a2e',
  },
  personalityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  personalityLabelActive: {
    color: '#007AFF',
  },
  personalityDescription: {
    fontSize: 14,
    color: '#888',
  },
  personalityDescriptionActive: {
    color: '#007AFF',
  },
  creativityLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  creativityLevel: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  creativityLevelActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1a1a2e',
  },
  creativityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  creativityLabelActive: {
    color: '#007AFF',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  featureDescription: {
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
