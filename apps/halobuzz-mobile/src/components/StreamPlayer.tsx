import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Stream } from '@/types/stream';
import { useAuth } from '@/store/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StreamPlayerProps {
  stream: Stream;
  onClose: () => void;
  onLike: (streamId: string) => void;
  onShare: (stream: Stream) => void;
  onFollow: (userId: string) => void;
  onGift: (streamId: string) => void;
  isFullscreen?: boolean;
  autoPlay?: boolean;
}

export default function StreamPlayer({
  stream,
  onClose,
  onLike,
  onShare,
  onFollow,
  onGift,
  isFullscreen = false,
  autoPlay = true,
}: StreamPlayerProps) {
  const { user } = useAuth();
  const player = useVideoPlayer(stream.streamUrl || '', player => {
    player.loop = true;
    player.muted = false;
  });
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const volumeOpacity = useRef(new Animated.Value(0)).current;
  const brightnessOpacity = useRef(new Animated.Value(0)).current;

  const qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: '720p', value: '720p' },
    { label: '1080p', value: '1080p' },
    { label: '4K', value: '4k' },
  ];

  useEffect(() => {
    if (showControls) {
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showControls]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  const handlePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    player.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    player.volume = newVolume;
    setVolume(newVolume);
  };

  const handleSeek = (positionMillis: number) => {
    player.seekTo(positionMillis);
  };

  const handlePlaybackRateChange = (rate: number) => {
    player.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike(stream.id);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow(stream.host.id);
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setShowQualityMenu(false);
    // Implement quality switching logic here
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Video status is now handled by the player
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const onVolumeGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const { translationY } = event.nativeEvent;
      const newVolume = Math.max(0, Math.min(1, volume - translationY / 200));
      handleVolumeChange(newVolume);
      
      Animated.timing(volumeOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(volumeOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  };

  const onBrightnessGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const { translationY } = event.nativeEvent;
      const brightness = Math.max(0, Math.min(1, 1 - translationY / 200));
      // Implement brightness control here
      
      Animated.timing(brightnessOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(brightnessOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading stream...</Text>
          </View>
        )}

        {/* Volume Indicator */}
        <Animated.View style={[styles.volumeIndicator, { opacity: volumeOpacity }]}>
          <Ionicons name="volume-high" size={24} color="#fff" />
          <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
        </Animated.View>

        {/* Brightness Indicator */}
        <Animated.View style={[styles.brightnessIndicator, { opacity: brightnessOpacity }]}>
          <Ionicons name="sunny" size={24} color="#fff" />
          <Text style={styles.brightnessText}>Brightness</Text>
        </Animated.View>

        {/* Gesture Handlers */}
        <PanGestureHandler
          onGestureEvent={onVolumeGesture}
          onHandlerStateChange={onVolumeGesture}
        >
          <View style={styles.leftGestureArea} />
        </PanGestureHandler>

        <PanGestureHandler
          onGestureEvent={onBrightnessGesture}
          onHandlerStateChange={onBrightnessGesture}
        >
          <View style={styles.rightGestureArea} />
        </PanGestureHandler>

        {/* Tap to show/hide controls */}
        <TouchableOpacity
          style={styles.tapArea}
          onPress={() => setShowControls(!showControls)}
          activeOpacity={1}
        />
      </View>

      {/* Controls Overlay */}
      <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.streamInfo}>
            <Text style={styles.streamTitle} numberOfLines={1}>
              {stream.title}
            </Text>
            <Text style={styles.hostName}>@{stream.host.username}</Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={styles.qualityButton}
              onPress={() => setShowQualityMenu(!showQualityMenu)}
            >
              <Text style={styles.qualityText}>{selectedQuality}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quality Menu */}
        {showQualityMenu && (
          <View style={styles.qualityMenu}>
            {qualityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.qualityOption,
                  selectedQuality === option.value && styles.qualityOptionSelected,
                ]}
                onPress={() => handleQualityChange(option.value)}
              >
                <Text style={styles.qualityOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Center Play Button */}
        {!isPlaying && (
          <View style={styles.centerControls}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              <Ionicons name="play" size={50} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: status.isLoaded
                      ? `${(status.positionMillis / (status.durationMillis || 1)) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {status.isLoaded ? formatTime(status.positionMillis) : '0:00'}
              </Text>
              <Text style={styles.timeText}>
                {status.isLoaded ? formatTime(status.durationMillis || 0) : '0:00'}
              </Text>
            </View>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlButtons}>
            <TouchableOpacity style={styles.controlButton} onPress={handlePlayPause}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleMute}>
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handlePlaybackRateChange(playbackRate === 1 ? 1.5 : 1)}
            >
              <Text style={styles.speedText}>{playbackRate}x</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? '#ff4757' : '#fff'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleFollow}>
              <Ionicons
                name={isFollowing ? 'person-remove' : 'person-add'}
                size={24}
                color={isFollowing ? '#ff4757' : '#fff'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => onShare(stream)}>
              <Ionicons name="share" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => onGift(stream.id)}>
              <Ionicons name="gift" size={24} color="#ffd700" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Stream Stats */}
      <View style={styles.streamStats}>
        <View style={styles.statItem}>
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.statText}>{stream.currentViewers}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={16} color="#ff4757" />
          <Text style={styles.statText}>{stream.totalLikes}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="diamond" size={16} color="#ffd700" />
          <Text style={styles.statText}>{stream.totalCoins}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  volumeIndicator: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  brightnessIndicator: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brightnessText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  leftGestureArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.3,
  },
  rightGestureArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.3,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  streamInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hostName: {
    color: '#ccc',
    fontSize: 14,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  qualityText: {
    color: '#fff',
    fontSize: 12,
  },
  qualityMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
  },
  qualityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  qualityOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  qualityOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  centerControls: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    padding: 20,
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff4757',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    padding: 12,
  },
  speedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  streamStats: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
});
