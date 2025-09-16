import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchScreen from '@/components/SearchScreen';

export default function SearchTab() {
  const [isSearchVisible, setIsSearchVisible] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <SearchScreen onClose={() => setIsSearchVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
