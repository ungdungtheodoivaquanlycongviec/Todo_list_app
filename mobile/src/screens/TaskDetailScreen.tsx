import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { taskService } from '../services/task.service';
import type { Task } from '../types/task.types';

export default function TaskDetailScreen({ route }: any) {
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await taskService.getTaskById(taskId);
      setTask(res);
    } catch {
      Alert.alert('Error', 'Unable to load task');
    }
  };

  useEffect(() => { load(); }, [taskId]);

  const save = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await taskService.updateTask(task._id, task);
      Alert.alert('Saved', 'Task updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally { setSaving(false); }
  };

  if (!task) return <View style={styles.center}><Text>Loading…</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Edit Task</Text>
      <TextInput value={task.title} onChangeText={(t) => setTask({ ...task, title: t })} style={styles.input} />
      <TextInput
        value={task.description ?? ''}
        onChangeText={(d) => setTask({ ...task, description: d })}
        style={[styles.input, { height: 100 }]}
        multiline
      />
      <Button title={saving ? 'Saving…' : 'Save'} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
});
