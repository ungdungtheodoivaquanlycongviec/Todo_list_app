import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Modal,
} from 'react-native';

// --- CONFIG ---
type TimeUnit = 'm' | 'h' | 'd' | 'mo';
const UNIT_ORDER: TimeUnit[] = ['m', 'h', 'd', 'mo'];

// Cấu hình hiển thị text ngắn gọn (Sửa lỗi hiển thị text dài "timePicker...")
const UNIT_LABELS: Record<TimeUnit, string> = {
  'm': 'm',
  'h': 'h',
  'd': 'd',
  'mo': 'mo'
};

const UNIT_CONFIG: Record<TimeUnit, { max: number }> = {
  'm': { max: 60 },
  'h': { max: 24 },
  'd': { max: 30 },
  'mo': { max: 12 },
};

interface EstimatedTimePickerProps {
  visible: boolean;
  value: string;
  onSave: (val: string) => void;
  onClose: () => void;
}

const parseValue = (val: string) => {
  const match = val.match(/^(\d+)\s*(mo|m|h|d)?$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const u = (match[2]?.toLowerCase() as TimeUnit) || 'h';
    return { number: num, unit: u };
  }
  return { number: 1, unit: 'h' as TimeUnit };
};

export default function EstimatedTimePicker({ visible, value, onSave, onClose }: EstimatedTimePickerProps) {
  const parsed = parseValue(value);
  const [number, setNumber] = useState(parsed.number);
  const [unit, setUnit] = useState<TimeUnit>(parsed.unit);

  useEffect(() => {
    if (visible) {
      const p = parseValue(value);
      setNumber(p.number);
      setUnit(p.unit);
    }
  }, [visible, value]);

  const getWrappedNumber = (current: number, offset: number, max: number) => {
    let val = current + offset;
    while (val > max) val -= max;
    while (val < 1) val += max;
    return val;
  };

  const getWrappedUnit = (currentUnit: TimeUnit, offset: number) => {
    const idx = UNIT_ORDER.indexOf(currentUnit);
    let newIdx = idx + offset;
    while (newIdx >= UNIT_ORDER.length) newIdx -= UNIT_ORDER.length;
    while (newIdx < 0) newIdx += UNIT_ORDER.length;
    return UNIT_ORDER[newIdx];
  };

  // --- PanResponder Số ---
  const numPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const step = Math.round(gestureState.dy / 40);
        if (step !== 0) {
          const max = UNIT_CONFIG[unit].max;
          setNumber(prev => getWrappedNumber(prev, -step, max));
        }
      }
    })
  ).current;

  // --- PanResponder Đơn vị ---
  const unitPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const step = Math.round(gestureState.dy / 40);
        if (step !== 0) {
          setUnit(prev => getWrappedUnit(prev, -step));
        }
      }
    })
  ).current;

  const maxNum = UNIT_CONFIG[unit].max;
  
  const displayNumbers = [
    String(getWrappedNumber(number, -1, maxNum)).padStart(2, '0'),
    String(number).padStart(2, '0'),
    String(getWrappedNumber(number, 1, maxNum)).padStart(2, '0'),
  ];

  const displayUnits = [
    getWrappedUnit(unit, -1),
    unit,
    getWrappedUnit(unit, 1),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { onSave(`${number}${unit}`); onClose(); }}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          
          <Text style={styles.headerLabel}>Estimated Time</Text>

          <View style={styles.pickerContainer}>
            {/* CỘT SỐ */}
            <View style={styles.column} {...numPanResponder.panHandlers}>
               <TouchableOpacity onPress={() => setNumber(getWrappedNumber(number, -1, maxNum))}>
                 <Text style={styles.fadedText}>{displayNumbers[0]}</Text>
               </TouchableOpacity>
               
               <View style={styles.selectedBox}>
                 <Text style={styles.selectedText}>{displayNumbers[1]}</Text>
               </View>

               <TouchableOpacity onPress={() => setNumber(getWrappedNumber(number, 1, maxNum))}>
                 <Text style={styles.fadedText}>{displayNumbers[2]}</Text>
               </TouchableOpacity>
            </View>

            <Text style={styles.separator}>:</Text>

            {/* CỘT ĐƠN VỊ */}
            <View style={styles.column} {...unitPanResponder.panHandlers}>
               <TouchableOpacity onPress={() => setUnit(getWrappedUnit(unit, -1))}>
                 <Text style={styles.fadedText}>{UNIT_LABELS[displayUnits[0]]}</Text>
               </TouchableOpacity>

               <View style={styles.selectedBox}>
                 <Text style={styles.selectedText}>{UNIT_LABELS[displayUnits[1]]}</Text>
               </View>

               <TouchableOpacity onPress={() => setUnit(getWrappedUnit(unit, 1))}>
                 <Text style={styles.fadedText}>{UNIT_LABELS[displayUnits[2]]}</Text>
               </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.dragText}>Drag or click to change</Text>

          <TouchableOpacity style={styles.doneBtn} onPress={() => { onSave(`${number}${unit}`); onClose(); }}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    marginBottom: 10,
  },
  column: {
    width: 70,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  separator: {
    fontSize: 20,
    color: '#D1D5DB',
    fontWeight: 'bold',
    marginHorizontal: 5,
    marginTop: -10,
  },
  selectedBox: {
    width: 60,
    height: 50,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  fadedText: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  dragText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});