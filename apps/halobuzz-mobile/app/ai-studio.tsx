import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'video' | 'image' | 'audio' | 'text' | 'music';
  isPremium: boolean;
  estimatedTime: string;
}

interface GeneratedContent {
  id: string;
  type: string;
  title: string;
  prompt: string;
  thumbnail?: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
  duration?: number;
  size?: string;
}

export default function AIStudioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tools');
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const aiTools: AITool[] = [
    {
      id: 'video-generator',
      name: 'AI Video Generator',
      description: 'Create stunning videos from text prompts',
      icon: 'videocam',
      color: '#ff0000',
      category: 'video',
      isPremium: false,
      estimatedTime: '2-5 min',
    },
    {
      id: 'image-generator',
      name: 'AI Image Creator',
      description: 'Generate beautiful images and artwork',
      icon: 'image',
      color: '#00ff00',
      category: 'image',
      isPremium: false,
      estimatedTime: '30-60 sec',
    },
    {
      id: 'music-generator',
      name: 'AI Music Composer',
      description: 'Create original music and beats',
      icon: 'musical-notes',
      color: '#ff00ff',
      category: 'music',
      isPremium: true,
      estimatedTime: '1-3 min',
    },
    {
      id: 'voice-cloner',
      name: 'Voice Cloning',
      description: 'Clone voices for narration',
      icon: 'mic',
      color: '#007AFF',
      category: 'audio',
      isPremium: true,
      estimatedTime: '2-4 min',
    },
    {
      id: 'script-writer',
      name: 'AI Script Writer',
      description: 'Write engaging scripts and content',
      icon: 'document-text',
      color: '#ffaa00',
      category: 'text',
      isPremium: false,
      estimatedTime: '10-30 sec',
    },
    {
      id: 'thumbnail-generator',
      name: 'Thumbnail Creator',
      description: 'Generate eye-catching thumbnails',
      icon: 'camera',
      color: '#9d4edd',
      category: 'image',
      isPremium: false,
      estimatedTime: '15-45 sec',
    },
  ];

  useEffect(() => {
    startPulseAnimation();
    loadGeneratedContent();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadGeneratedContent = async () => {
    // Mock generated content
    const mockContent: GeneratedContent[] = [
      {
        id: '1',
        type: 'video',
        title: 'Epic Gaming Montage',
        prompt: 'Create an epic gaming montage with intense action',
        status: 'completed',
        createdAt: new Date().toISOString(),
        duration: 30,
        size: '15.2 MB',
      },
      {
        id: '2',
        type: 'image',
        title: 'Cosmic Landscape',
        prompt: 'A beautiful cosmic landscape with stars and galaxies',
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        size: '2.1 MB',
      },
      {
        id: '3',
        type: 'music',
        title: 'Epic Battle Theme',
        prompt: 'Create an epic battle theme for gaming',
        status: 'generating',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        duration: 120,
      },
    ];
    setGeneratedContent(mockContent);
  };

  const handleGenerateContent = async () => {
    if (!selectedTool || !prompt.trim()) {
      Alert.alert('Error', 'Please select a tool and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setShowGenerationModal(false);

    // Add to generated content list
    const newContent: GeneratedContent = {
      id: Date.now().toString(),
      type: selectedTool.category,
      title: prompt.substring(0, 30) + '...',
      prompt: prompt,
      status: 'generating',
      createdAt: new Date().toISOString(),
    };

    setGeneratedContent(prev => [newContent, ...prev]);

    // Mock generation process
    setTimeout(() => {
      setGeneratedContent(prev => 
        prev.map(content => 
          content.id === newContent.id 
            ? { ...content, status: 'completed', size: '5.2 MB' }
            : content
        )
      );
      setIsGenerating(false);
      Alert.alert('Success', 'Content generated successfully!');
    }, 5000);

    setPrompt('');
    setSelectedTool(null);
  };

  const TabButton = ({ id, title, isActive, onPress }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const AIToolCard = ({ tool }: { tool: AITool }) => (
    <TouchableOpacity 
      style={styles.toolCard}
      onPress={() => {
        setSelectedTool(tool);
        setShowGenerationModal(true);
      }}
    >
      <LinearGradient
        colors={[`${tool.color}20`, `${tool.color}10`]}
        style={styles.toolGradient}
      >
        <View style={styles.toolHeader}>
          <View style={[styles.toolIcon, { backgroundColor: `${tool.color}30` }]}>
            <Ionicons name={tool.icon as any} size={24} color={tool.color} />
          </View>
          {tool.isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.toolName}>{tool.name}</Text>
        <Text style={styles.toolDescription}>{tool.description}</Text>
        <View style={styles.toolFooter}>
          <Text style={styles.toolTime}>{tool.estimatedTime}</Text>
          <Ionicons name="arrow-forward" size={16} color={tool.color} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const ContentItem = ({ content }: { content: GeneratedContent }) => (
    <TouchableOpacity style={styles.contentItem}>
      <View style={styles.contentThumbnail}>
        <Ionicons 
          name={content.type === 'video' ? 'videocam' : 
                content.type === 'image' ? 'image' :
                content.type === 'music' ? 'musical-notes' : 'document-text'} 
          size={32} 
          color="#888" 
        />
        {content.status === 'generating' && (
          <View style={styles.generatingOverlay}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </View>
      
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={1}>{content.title}</Text>
        <Text style={styles.contentPrompt} numberOfLines={2}>{content.prompt}</Text>
        <View style={styles.contentMeta}>
          <Text style={styles.contentDate}>
            {new Date(content.createdAt).toLocaleDateString()}
          </Text>
          {content.size && (
            <Text style={styles.contentSize}>{content.size}</Text>
          )}
        </View>
      </View>

      <View style={styles.contentActions}>
        {content.status === 'completed' && (
          <>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="download" size={16} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share" size={16} color="#00ff00" />
            </TouchableOpacity>
          </>
        )}
        {content.status === 'generating' && (
          <View style={styles.generatingBadge}>
            <Text style={styles.generatingText}>Generating...</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Content Studio</Text>
          <Text style={styles.subtitle}>Create amazing content with AI</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/create-content')}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{generatedContent.length}</Text>
          <Text style={styles.statLabel}>Generated</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>AI Tools</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>∞</Text>
          <Text style={styles.statLabel}>Possibilities</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          id="tools"
          title="AI Tools"
          isActive={activeTab === 'tools'}
          onPress={() => setActiveTab('tools')}
        />
        <TabButton
          id="library"
          title="My Library"
          isActive={activeTab === 'library'}
          onPress={() => setActiveTab('library')}
        />
        <TabButton
          id="templates"
          title="Templates"
          isActive={activeTab === 'templates'}
          onPress={() => setActiveTab('templates')}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'tools' && (
          <View style={styles.toolsTab}>
            <Text style={styles.sectionTitle}>AI Creation Tools</Text>
            <View style={styles.toolsGrid}>
              {aiTools.map(tool => (
                <AIToolCard key={tool.id} tool={tool} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'library' && (
          <View style={styles.libraryTab}>
            <View style={styles.libraryHeader}>
              <Text style={styles.sectionTitle}>Generated Content</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter" size={16} color="#007AFF" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>
            {generatedContent.map(content => (
              <ContentItem key={content.id} content={content} />
            ))}
          </View>
        )}

        {activeTab === 'templates' && (
          <View style={styles.templatesTab}>
            <Text style={styles.sectionTitle}>Content Templates</Text>
            <View style={styles.templateGrid}>
              <TouchableOpacity style={styles.templateCard}>
                <Ionicons name="videocam" size={32} color="#ff0000" />
                <Text style={styles.templateTitle}>Gaming Intro</Text>
                <Text style={styles.templateDesc}>Epic gaming intro template</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.templateCard}>
                <Ionicons name="musical-notes" size={32} color="#ff00ff" />
                <Text style={styles.templateTitle}>Background Music</Text>
                <Text style={styles.templateDesc}>Chill background music</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.templateCard}>
                <Ionicons name="image" size={32} color="#00ff00" />
                <Text style={styles.templateTitle}>Thumbnail Style</Text>
                <Text style={styles.templateDesc}>Eye-catching thumbnails</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.templateCard}>
                <Ionicons name="document-text" size={32} color="#ffaa00" />
                <Text style={styles.templateTitle}>Script Template</Text>
                <Text style={styles.templateDesc}>Engaging script format</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Generation Modal */}
      <Modal visible={showGenerationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTool?.name}</Text>
              <TouchableOpacity onPress={() => setShowGenerationModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.toolInfo}>
              <View style={[styles.toolIconLarge, { backgroundColor: `${selectedTool?.color}20` }]}>
                <Ionicons name={selectedTool?.icon as any} size={32} color={selectedTool?.color} />
              </View>
              <Text style={styles.toolDescriptionLarge}>{selectedTool?.description}</Text>
              <Text style={styles.toolTimeLarge}>Estimated time: {selectedTool?.estimatedTime}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Describe what you want to create</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Enter your creative prompt..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={[styles.generateButton, (!prompt.trim() || isGenerating) && styles.generateButtonDisabled]}
              onPress={handleGenerateContent}
              disabled={!prompt.trim() || isGenerating}
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  toolsTab: {
    marginBottom: 20,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: (width - 52) / 2,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toolGradient: {
    flex: 1,
    padding: 16,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff00ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolDescription: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 12,
  },
  toolFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolTime: {
    color: '#888',
    fontSize: 10,
  },
  libraryTab: {
    marginBottom: 20,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentPrompt: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  contentDate: {
    color: '#888',
    fontSize: 10,
  },
  contentSize: {
    color: '#888',
    fontSize: 10,
  },
  contentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingBadge: {
    backgroundColor: '#ffaa00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  generatingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  templatesTab: {
    marginBottom: 20,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  templateTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  templateDesc: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toolInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  toolIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolDescriptionLarge: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  toolTimeLarge: {
    color: '#888',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  promptInput: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
