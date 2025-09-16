import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

const { width } = Dimensions.get('window');

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  style: string;
  mood: string;
}

interface GeneratedContent {
  contentId: string;
  url: string;
  metadata: any;
}

export default function AIContentStudioScreen() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [style, setStyle] = useState('');
  const [mood, setMood] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'thumbnail' | 'music' | 'package'>('video');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get('/ai-content-studio/templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleTemplateSelect = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setPrompt(template.prompt.replace('{topic}', 'your content'));
    setStyle(template.style);
    setMood(template.mood);
  };

  const generateContent = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      let endpoint = '';
      let payload: any = {
        prompt,
        duration,
        style,
        mood,
      };

      switch (activeTab) {
        case 'video':
          endpoint = '/ai-content-studio/generate-video';
          break;
        case 'thumbnail':
          endpoint = '/ai-content-studio/generate-thumbnail';
          delete payload.duration;
          delete payload.mood;
          break;
        case 'music':
          endpoint = '/ai-content-studio/generate-music';
          break;
        case 'package':
          endpoint = '/ai-content-studio/generate-package';
          break;
      }

      const response = await apiClient.post(endpoint, payload);

      if (response.data.success) {
        if (activeTab === 'package') {
          setGeneratedContent({
            contentId: 'package',
            url: '',
            metadata: response.data.data,
          });
        } else {
          setGeneratedContent(response.data.data);
        }
        Alert.alert('Success', 'Content generated successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTabButton = (tab: 'video' | 'thumbnail' | 'music' | 'package', icon: string, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? '#007AFF' : '#666'}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTemplateCard = (template: ContentTemplate) => (
    <TouchableOpacity
      key={template.id}
      style={[
        styles.templateCard,
        selectedTemplate?.id === template.id && styles.selectedTemplateCard,
      ]}
      onPress={() => handleTemplateSelect(template)}
    >
      <Text style={styles.templateName}>{template.name}</Text>
      <Text style={styles.templateDescription}>{template.description}</Text>
    </TouchableOpacity>
  );

  const renderGeneratedContent = () => {
    if (!generatedContent) return null;

    if (activeTab === 'package') {
      return (
        <View style={styles.generatedContentContainer}>
          <Text style={styles.generatedContentTitle}>Generated Package</Text>
          
          {generatedContent.metadata.video?.success && (
            <View style={styles.contentItem}>
              <Text style={styles.contentItemTitle}>Video</Text>
              <Text style={styles.contentItemUrl}>{generatedContent.metadata.video.url}</Text>
            </View>
          )}
          
          {generatedContent.metadata.thumbnail?.success && (
            <View style={styles.contentItem}>
              <Text style={styles.contentItemTitle}>Thumbnail</Text>
              <Image
                source={{ uri: generatedContent.metadata.thumbnail.url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </View>
          )}
          
          {generatedContent.metadata.music?.success && (
            <View style={styles.contentItem}>
              <Text style={styles.contentItemTitle}>Background Music</Text>
              <Text style={styles.contentItemUrl}>{generatedContent.metadata.music.url}</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.generatedContentContainer}>
        <Text style={styles.generatedContentTitle}>Generated Content</Text>
        
        {activeTab === 'thumbnail' && generatedContent.url && (
          <Image
            source={{ uri: generatedContent.url }}
            style={styles.generatedImage}
            resizeMode="cover"
          />
        )}
        
        <Text style={styles.contentId}>Content ID: {generatedContent.contentId}</Text>
        <Text style={styles.contentUrl}>URL: {generatedContent.url}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Content Studio</Text>
        <Text style={styles.subtitle}>Create amazing content with AI</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          {renderTabButton('video', 'videocam', 'Video')}
          {renderTabButton('thumbnail', 'image', 'Thumbnail')}
          {renderTabButton('music', 'musical-notes', 'Music')}
          {renderTabButton('package', 'cube', 'Package')}
        </View>

        {/* Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templatesContainer}>
              {templates.map(renderTemplateCard)}
            </View>
          </ScrollView>
        </View>

        {/* Input Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Prompt</Text>
            <TextInput
              style={styles.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe what you want to create..."
              multiline
              numberOfLines={3}
            />
          </View>

          {activeTab !== 'thumbnail' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duration (seconds)</Text>
              <TextInput
                style={styles.textInput}
                value={duration.toString()}
                onChangeText={(text) => setDuration(parseInt(text) || 30)}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Style</Text>
            <TextInput
              style={styles.textInput}
              value={style}
              onChangeText={setStyle}
              placeholder="e.g., modern, vintage, minimalist"
            />
          </View>

          {activeTab !== 'thumbnail' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mood</Text>
              <TextInput
                style={styles.textInput}
                value={mood}
                onChangeText={setMood}
                placeholder="e.g., energetic, calm, mysterious"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.disabledButton]}
            onPress={generateContent}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Content</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Generated Content */}
        {renderGeneratedContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  templatesContainer: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  templateCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: width * 0.6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTemplateCard: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  generatedContentContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  generatedContentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  generatedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 8,
  },
  contentId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contentUrl: {
    fontSize: 14,
    color: '#007AFF',
  },
  contentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  contentItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  contentItemUrl: {
    fontSize: 14,
    color: '#007AFF',
  },
});
