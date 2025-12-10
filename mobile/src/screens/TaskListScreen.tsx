import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { taskService } from '../services/task.service';
import type { Task } from '../types/task.types';

export default function TaskListScreen({ navigation }: any) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await taskService.getAllTasks();
      setTasks(res.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return loading ? (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading…</Text></View>
  ) : (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })} style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontWeight: '600' }}>{item.title}</Text>
          {item.dueDate && <Text style={{ color: '#666' }}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>}
        </TouchableOpacity>
      )}
    />
  );
}
