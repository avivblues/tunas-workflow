import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ISPMap'>;

export function LazyISPMapScreen(props: Props) {
  const [Screen, setScreen] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./MapScreen') as typeof import('./MapScreen');
    setScreen(() => mod.ISPMapScreen);
  }, []);

  if (!Screen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Screen {...props} />;
}
