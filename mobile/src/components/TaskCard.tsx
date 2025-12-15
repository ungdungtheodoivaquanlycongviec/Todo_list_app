import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Task } from '../types/task.types';

interface Props {
  task: Task;
  onPress?: () => void;
}

export default function TaskCard({ task, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.status}>{task.status}</Text>
      </View>
      {task.dueDate && <Text style={styles.due}>📅 {new Date(task.dueDate).toLocaleDateString()}</Text>}
      {task.description && <Text numberOfLines={2} style={styles.desc}>{task.description}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginVertical: 6, padding: 14, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontWeight: '600', fontSize: 16 },
  status: { color: '#2f6feb', fontWeight: '500' },
  desc: { color: '#666', marginTop: 4 },
  due: { color: '#999', marginTop: 4 },
});
