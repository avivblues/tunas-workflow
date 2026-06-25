import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AIAssistantScreen } from '../screens/Common/AIAssistantScreen';
import { AppDashboardScreen } from '../screens/Common/AppDashboardScreen';
import { AppMenuScreen } from '../screens/Common/AppMenuScreen';
import { AppSubMenuScreen } from '../screens/Common/AppSubMenuScreen';
import { ApprovalScreen } from '../screens/Common/ApprovalScreen';
import { CreateTransactionScreen } from '../screens/Common/CreateTransactionScreen';
import { LoginScreen } from '../screens/Common/LoginScreen';
import { TransactionDetailScreen } from '../screens/Common/TransactionDetailScreen';
import { TransactionListScreen } from '../screens/Common/TransactionListScreen';
import { WorkExecutionScreen } from '../screens/Common/WorkExecutionScreen';
import { LazyISPMapScreen } from '../screens/ISP/LazyISPMapScreen';
import { VehicleCalendarScreen } from '../screens/Vehicle/VehicleCalendarScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!token ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Menu"
              component={AppMenuScreen}
              options={{ title: 'Tunas Workflow' }}
            />
            <Stack.Screen
              name="AppSubMenu"
              component={AppSubMenuScreen}
              options={({ route }) => ({ title: route.params.appName })}
            />
            <Stack.Screen
              name="TransactionList"
              component={TransactionListScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ title: 'Transaction' }}
            />
            <Stack.Screen
              name="CreateTransaction"
              component={CreateTransactionScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
            <Stack.Screen
              name="WorkExecution"
              component={WorkExecutionScreen}
              options={{ title: 'Work Execution' }}
            />
            <Stack.Screen
              name="Approvals"
              component={ApprovalScreen}
              options={{ title: 'Pending Approvals' }}
            />
            <Stack.Screen
              name="AIAssistant"
              component={AIAssistantScreen}
              options={{ title: 'AI Assistant' }}
            />
            <Stack.Screen
              name="AppDashboard"
              component={AppDashboardScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
            <Stack.Screen
              name="VehicleCalendar"
              component={VehicleCalendarScreen}
              options={{ title: 'Vehicle Calendar' }}
            />
            <Stack.Screen
              name="ISPMap"
              component={LazyISPMapScreen}
              options={{ title: 'ISP Ticket Map' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
