import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const mockResults = {
    users: [
      { id: '1', name: 'GamerPro', followers: '125K', verified: true },
      { id: '2', name: 'MusicLover', followers: '89K', verified: false },
      { id: '3', name: 'Artist123', followers: '45K', verified: true },
    ],
    streams: [
      { id: '1', title: 'Epic Gaming Session!', host: 'GamerPro', viewers: 1250 },
      { id: '2', title: 'Music Live Stream', host: 'MusicLover', viewers: 890 },
      { id: '3', title: 'Art Creation Time', host: 'Artist123', viewers: 456 },
    ],
    hashtags: [
      { id: '1', tag: '#gaming', posts: '125K' },
      { id: '2', tag: '#music', posts: '89K' },
      { id: '3', tag: '#art', posts: '45K' },
    ],
  };

  const trendingTopics = [
    { id: '1', topic: 'New Game Release', posts: '50K' },
    { id: '2', topic: 'Music Festival', posts: '30K' },
    { id: '3', topic: 'Art Exhibition', posts: '20K' },
  ];

  const UserCard = ({ user }) => (
    <TouchableOpacity style={styles.resultCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {user.name} {user.verified && '✓'}
        </Text>
        <Text style={styles.userFollowers}>{user.followers} followers</Text>
      </View>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const StreamCard = ({ stream }) => (
    <TouchableOpacity style={styles.resultCard}>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <Text style={styles.streamHost}>by {stream.host}</Text>
        <Text style={styles.streamViewers}>{stream.viewers} viewers</Text>
      </View>
      <Text style={styles.liveBadge}>🔴 LIVE</Text>
    </TouchableOpacity>
  );

  const HashtagCard = ({ hashtag }) => (
    <TouchableOpacity style={styles.resultCard}>
      <View style={styles.hashtagInfo}>
        <Text style={styles.hashtagTag}>{hashtag.tag}</Text>
        <Text style={styles.hashtagPosts}>{hashtag.posts} posts</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users, streams, hashtags..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Search Tabs */}
        <View style={styles.tabsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'users' && styles.activeTab]} 
              onPress={() => setActiveTab('users')}
            >
              <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'streams' && styles.activeTab]} 
              onPress={() => setActiveTab('streams')}
            >
              <Text style={[styles.tabText, activeTab === 'streams' && styles.activeTabText]}>Streams</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'hashtags' && styles.activeTab]} 
              onPress={() => setActiveTab('hashtags')}
            >
              <Text style={[styles.tabText, activeTab === 'hashtags' && styles.activeTabText]}>Hashtags</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Search Results */}
        <View style={styles.resultsSection}>
          {searchQuery ? (
            <>
              {activeTab === 'all' && (
                <>
                  <Text style={styles.sectionTitle}>Users</Text>
                  {mockResults.users.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                  <Text style={styles.sectionTitle}>Streams</Text>
                  {mockResults.streams.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                  <Text style={styles.sectionTitle}>Hashtags</Text>
                  {mockResults.hashtags.map((hashtag) => (
                    <HashtagCard key={hashtag.id} hashtag={hashtag} />
                  ))}
                </>
              )}
              {activeTab === 'users' && mockResults.users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
              {activeTab === 'streams' && mockResults.streams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
              {activeTab === 'hashtags' && mockResults.hashtags.map((hashtag) => (
                <HashtagCard key={hashtag.id} hashtag={hashtag} />
              ))}
            </>
          ) : (
            <>
              {/* Trending Topics */}
              <Text style={styles.sectionTitle}>Trending Topics</Text>
              {trendingTopics.map((topic) => (
                <TouchableOpacity key={topic.id} style={styles.trendingCard}>
                  <Text style={styles.trendingTopic}>{topic.topic}</Text>
                  <Text style={styles.trendingPosts}>{topic.posts} posts</Text>
                </TouchableOpacity>
              ))}

              {/* Quick Search Suggestions */}
              <Text style={styles.sectionTitle}>Quick Search</Text>
              <View style={styles.suggestionsGrid}>
                <TouchableOpacity style={styles.suggestionButton}>
                  <Text style={styles.suggestionText}>#gaming</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionButton}>
                  <Text style={styles.suggestionText}>#music</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionButton}>
                  <Text style={styles.suggestionText}>#art</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionButton}>
                  <Text style={styles.suggestionText}>#live</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    color: '#fff',
    fontSize: 16,
  },
  tabsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#111',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 10,
  },
  resultCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userFollowers: {
    color: '#888',
    fontSize: 14,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streamInfo: {
    flex: 1,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  streamHost: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  streamViewers: {
    color: '#007AFF',
    fontSize: 12,
  },
  liveBadge: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagTag: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  hashtagPosts: {
    color: '#888',
    fontSize: 14,
  },
  trendingCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingTopic: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trendingPosts: {
    color: '#888',
    fontSize: 14,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  suggestionButton: {
    backgroundColor: '#111',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  suggestionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});