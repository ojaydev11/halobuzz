import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { setLocale, getLocale } from '@/lib/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const [locale, setLoc] = useState(getLocale());

  const apply = (lc: 'en'|'ne') => {
    setLocale(lc);
    setLoc(lc);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        {(['en','ne'] as const).map(lc => (
          <TouchableOpacity key={lc} style={[styles.row, locale===lc && styles.active]} onPress={() => apply(lc)}>
            <Text style={styles.text}>{lc === 'en' ? 'English' : 'नेपाली'}</Text>
            {locale===lc && <Ionicons name="checkmark" size={20} color="#00ff00" />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  row: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  active: { borderWidth: 1, borderColor: '#00ff00' },
  text: { color: '#fff', fontSize: 16 },
});

