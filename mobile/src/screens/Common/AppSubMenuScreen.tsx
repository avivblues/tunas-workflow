import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { navigateMenuItem } from '../../navigation/menu-navigation';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AppSubMenu'>;

export function AppSubMenuScreen({ navigation, route }: Props) {
  const { appCode, appName, items } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{appName}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigateMenuItem(navigation, appCode, item)}
          >
            <Text style={styles.icon}>{item.icon ?? '📋'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.path}>{item.path}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  subtitle: { color: '#64748b', marginBottom: 12 },
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  icon: { fontSize: 24, marginRight: 14 },
  label: { fontSize: 16, fontWeight: '600' },
  path: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  chevron: { fontSize: 24, color: '#94a3b8' },
});
