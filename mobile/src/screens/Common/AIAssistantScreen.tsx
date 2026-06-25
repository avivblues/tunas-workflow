import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { getAiStatus, sendAiChat, type ChatMessage } from '../../services/ai.service';

type Props = NativeStackScreenProps<RootStackParamList, 'AIAssistant'>;

const SUGGESTIONS = [
  'Riwayat maintenance minggu ini',
  'Tiket open dengan SLA breach',
  'Ringkasan work order engineering',
];

export function AIAssistantScreen(_props: Props) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (!token) return;
    getAiStatus(token)
      .then((s) => {
        setStatusText(
          s.llmConfigured ? `AI ready · ${s.model ?? 'default model'}` : 'Smart Analytics mode (no LLM key)',
        );
      })
      .catch(() => setStatusText('AI status unavailable'));
  }, [token]);

  async function sendMessage(text: string) {
    if (!token || !text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const res = await sendAiChat(token, { message: text.trim(), history: messages });
      setMessages([...history, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages([
        ...history,
        { role: 'assistant', content: err instanceof Error ? err.message : 'AI request failed' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{statusText}</Text>

      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.chat}
        ListEmptyComponent={
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => sendMessage(s)}>
                <Text>{s}</Text>
              </Pressable>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={item.role === 'user' ? styles.userText : undefined}>{item.content}</Text>
          </View>
        )}
      />

      {loading && <ActivityIndicator style={{ marginVertical: 8 }} />}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about maintenance, tickets, reports..."
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable style={styles.send} onPress={() => sendMessage(input)} disabled={loading}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 12 },
  status: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  chat: { paddingBottom: 12, gap: 8 },
  suggestions: { gap: 8, marginTop: 16 },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  bubble: { borderRadius: 12, padding: 12, maxWidth: '90%' },
  userBubble: { backgroundColor: '#1d4ed8', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignSelf: 'flex-start' },
  userText: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  send: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  sendText: { color: '#fff', fontWeight: '600' },
});
