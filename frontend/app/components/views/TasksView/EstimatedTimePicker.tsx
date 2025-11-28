"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';

interface EstimatedTimePickerProps {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

type TimeUnit = 'm' | 'h' | 'd' | 'mo';

const unitConfig: Record<TimeUnit, { max: number; label: string }> = {
  'm': { max: 60, label: 'm' },
  'h': { max: 24, label: 'h' },
  'd': { max: 30, label: 'd' },
  'mo': { max: 12, label: 'mo' },
};

const unitOrder: TimeUnit[] = ['m', 'h', 'd', 'mo'];

function parseEstimatedTime(value: string): { number: number; unit: TimeUnit } {
  if (!value) return { number: 1, unit: 'h' };
  
  const match = value.match(/^(\d+)\s*(mo|m|h|d)?$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    let unit: TimeUnit = 'h';
    if (match[2]) {
      const u = match[2].toLowerCase();
      if (u === 'mo') unit = 'mo';
      else if (u === 'm') unit = 'm';
      else if (u === 'h') unit = 'h';
      else if (u === 'd') unit = 'd';
    }
    return { number: Math.min(num, unitConfig[unit].max) || 1, unit };
  }
  return { number: 1, unit: 'h' };
}

// Helper to get wrapped values for display
function getWrappedValue(current: number, offset: number, max: number): number {
  let val = current + offset;
  while (val > max) val -= max;
  while (val < 1) val += max;
  return val;
}

function getWrappedUnitIndex(currentIndex: number, offset: number): number {
  let idx = currentIndex + offset;
  const len = unitOrder.length;
  while (idx < 0) idx += len;
  while (idx >= len) idx -= len;
  return idx;
}

export default function EstimatedTimePicker({ value, onSave, onClose }: EstimatedTimePickerProps) {
  const { t } = useLanguage();
  const parsed = parseEstimatedTime(value);
  const [number, setNumber] = useState(parsed.number);
  const [unit, setUnit] = useState<TimeUnit>(parsed.unit);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  
  // Drag state
  const [isDraggingNumber, setIsDraggingNumber] = useState(false);
  const [isDraggingUnit, setIsDraggingUnit] = useState(false);
  const dragStartY = useRef(0);
  const dragAccumulator = useRef(0);
  const lastMoveTime = useRef(0);
  const velocity = useRef(0);
  const momentumAnimation = useRef<number | null>(null);
  const activeMomentumField = useRef<'number' | 'unit' | null>(null);

  // Get translated unit labels
  const getUnitLabel = (u: TimeUnit): string => {
    switch (u) {
      case 'm': return t('timePicker.minute') || 'm';
      case 'h': return t('timePicker.hour') || 'h';
      case 'd': return t('timePicker.day') || 'd';
      case 'mo': return t('timePicker.month') || 'mo';
      default: return u;
    }
  };

  const maxNumber = unitConfig[unit].max;

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup momentum animation on unmount
      if (momentumAnimation.current) {
        cancelAnimationFrame(momentumAnimation.current);
      }
    };
  }, []);

  // Calculate position to ensure picker is fully visible
  useEffect(() => {
    if (triggerRef.current && mounted) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      
      const pickerHeight = 200;
      const pickerWidth = 180;
      
      let top = triggerRect.bottom + 4;
      let left = triggerRect.left;
      
      if (triggerRect.bottom + pickerHeight > window.innerHeight) {
        top = triggerRect.top - pickerHeight - 4;
      }
      
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - 8;
      }
      
      if (left < 8) {
        left = 8;
      }
      
      setPosition({ top, left });
    }
  }, [mounted]);

  // Adjust number if it exceeds new max when unit changes
  useEffect(() => {
    if (number > maxNumber) {
      setNumber(maxNumber);
    }
  }, [unit, maxNumber, number]);

  // Handle save
  const handleSave = useCallback(() => {
    const formattedValue = `${number}${unitConfig[unit].label}`;
    onSave(formattedValue);
  }, [number, unit, onSave]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleSave]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter') {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onClose]);

  // Change number with wrap-around
  const changeNumber = useCallback((delta: number) => {
    setNumber(prev => {
      let newVal = prev + delta;
      while (newVal > maxNumber) newVal -= maxNumber;
      while (newVal < 1) newVal += maxNumber;
      return newVal;
    });
  }, [maxNumber]);

  // Change unit with wrap-around
  const changeUnit = useCallback((delta: number) => {
    setUnit(prev => {
      const currentIndex = unitOrder.indexOf(prev);
      let newIndex = currentIndex + delta;
      while (newIndex >= unitOrder.length) newIndex -= unitOrder.length;
      while (newIndex < 0) newIndex += unitOrder.length;
      return unitOrder[newIndex];
    });
  }, []);

  // Momentum animation function
  const runMomentum = useCallback((field: 'number' | 'unit', initialVelocity: number) => {
    const friction = 0.92; // Deceleration factor
    const minVelocity = 0.5; // Stop threshold
    let currentVelocity = initialVelocity;
    let accumulator = 0;
    const threshold = 15; // Pixels per step for momentum

    const animate = () => {
      currentVelocity *= friction;
      
      if (Math.abs(currentVelocity) < minVelocity) {
        momentumAnimation.current = null;
        activeMomentumField.current = null;
        return;
      }

      accumulator += currentVelocity;
      
      if (Math.abs(accumulator) >= threshold) {
        const steps = Math.floor(Math.abs(accumulator) / threshold);
        const direction = accumulator > 0 ? 1 : -1;
        
        if (field === 'number') {
          changeNumber(direction * steps);
        } else {
          changeUnit(direction * steps);
        }
        
        accumulator = accumulator % threshold;
      }

      momentumAnimation.current = requestAnimationFrame(animate);
    };

    activeMomentumField.current = field;
    momentumAnimation.current = requestAnimationFrame(animate);
  }, [changeNumber, changeUnit]);

  // Stop momentum when starting a new drag
  const stopMomentum = useCallback(() => {
    if (momentumAnimation.current) {
      cancelAnimationFrame(momentumAnimation.current);
      momentumAnimation.current = null;
      activeMomentumField.current = null;
    }
  }, []);

  // Drag handlers for number
  const handleNumberMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    stopMomentum();
    setIsDraggingNumber(true);
    dragStartY.current = e.clientY;
    dragAccumulator.current = 0;
    lastMoveTime.current = Date.now();
    velocity.current = 0;
  };

  // Drag handlers for unit
  const handleUnitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    stopMomentum();
    setIsDraggingUnit(true);
    dragStartY.current = e.clientY;
    dragAccumulator.current = 0;
    lastMoveTime.current = Date.now();
    velocity.current = 0;
  };

  // Global mouse move and up handlers with velocity tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingNumber && !isDraggingUnit) return;
      
      const now = Date.now();
      const deltaY = e.clientY - dragStartY.current; // Reversed: drag down = value up
      const deltaTime = now - lastMoveTime.current;
      
      // Calculate velocity (pixels per millisecond, scaled up)
      if (deltaTime > 0) {
        const instantVelocity = deltaY / deltaTime * 16; // Scale to ~60fps
        // Smooth velocity with exponential moving average
        velocity.current = velocity.current * 0.7 + instantVelocity * 0.3;
      }
      
      const threshold = 18; // pixels per step (slightly lower for faster response)
      
      dragAccumulator.current += deltaY;
      dragStartY.current = e.clientY;
      lastMoveTime.current = now;
      
      if (Math.abs(dragAccumulator.current) >= threshold) {
        const steps = Math.floor(Math.abs(dragAccumulator.current) / threshold);
        const direction = dragAccumulator.current > 0 ? 1 : -1;
        
        if (isDraggingNumber) {
          changeNumber(direction * steps);
        } else if (isDraggingUnit) {
          changeUnit(direction * steps);
        }
        
        dragAccumulator.current = dragAccumulator.current % threshold;
      }
    };

    const handleMouseUp = () => {
      const wasDraggingNumber = isDraggingNumber;
      const wasDraggingUnit = isDraggingUnit;
      const finalVelocity = velocity.current;
      
      setIsDraggingNumber(false);
      setIsDraggingUnit(false);
      dragAccumulator.current = 0;
      
      // Start momentum animation if velocity is significant
      if (Math.abs(finalVelocity) > 2) {
        if (wasDraggingNumber) {
          runMomentum('number', finalVelocity);
        } else if (wasDraggingUnit) {
          runMomentum('unit', finalVelocity);
        }
      }
      
      velocity.current = 0;
    };

    if (isDraggingNumber || isDraggingUnit) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingNumber, isDraggingUnit, changeNumber, changeUnit, runMomentum]);

  // Prevent scroll on the picker
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [position]);

  // Get displayed numbers/units (2 above, current, 2 below)
  const currentUnitIndex = unitOrder.indexOf(unit);

  const pickerContent = (
    <div
      ref={containerRef}
      className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl p-4"
      style={{ 
        minWidth: '180px',
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        zIndex: 99999,
        visibility: position ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-center gap-4">
        {/* Number Column - entire column is draggable */}
        <div 
          className={`flex flex-col items-center select-none cursor-ns-resize rounded-lg p-1 transition-all ${
            isDraggingNumber ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onMouseDown={handleNumberMouseDown}
        >
          {/* +2 above */}
          <div 
            className="text-sm text-gray-300 h-6 flex items-center justify-center hover:text-gray-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); changeNumber(2); }}
          >
            {String(getWrappedValue(number, 2, maxNumber)).padStart(2, '0')}
          </div>
          {/* +1 above */}
          <div 
            className="text-base text-gray-400 h-7 flex items-center justify-center hover:text-gray-500 transition-colors"
            onClick={(e) => { e.stopPropagation(); changeNumber(1); }}
          >
            {String(getWrappedValue(number, 1, maxNumber)).padStart(2, '0')}
          </div>
          {/* Current value */}
          <div
            className={`w-14 h-12 flex items-center justify-center bg-blue-50 rounded-lg border-2 border-blue-200 text-2xl font-bold text-blue-600 transition-all ${
              isDraggingNumber ? 'bg-blue-100 border-blue-400 scale-105' : ''
            }`}
          >
            {String(number).padStart(2, '0')}
          </div>
          {/* -1 below */}
          <div 
            className="text-base text-gray-400 h-7 flex items-center justify-center hover:text-gray-500 transition-colors"
            onClick={(e) => { e.stopPropagation(); changeNumber(-1); }}
          >
            {String(getWrappedValue(number, -1, maxNumber)).padStart(2, '0')}
          </div>
          {/* -2 below */}
          <div 
            className="text-sm text-gray-300 h-6 flex items-center justify-center hover:text-gray-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); changeNumber(-2); }}
          >
            {String(getWrappedValue(number, -2, maxNumber)).padStart(2, '0')}
          </div>
        </div>

        {/* Separator */}
        <div className="text-2xl font-bold text-gray-300 self-center">:</div>

        {/* Unit Column - entire column is draggable */}
        <div 
          className={`flex flex-col items-center select-none cursor-ns-resize rounded-lg p-1 transition-all ${
            isDraggingUnit ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onMouseDown={handleUnitMouseDown}
        >
          {/* +2 above */}
          <div 
            className="text-sm text-gray-300 h-6 flex items-center justify-center hover:text-gray-400 transition-colors min-w-[40px]"
            onClick={(e) => { e.stopPropagation(); changeUnit(2); }}
          >
            {getUnitLabel(unitOrder[getWrappedUnitIndex(currentUnitIndex, 2)])}
          </div>
          {/* +1 above */}
          <div 
            className="text-base text-gray-400 h-7 flex items-center justify-center hover:text-gray-500 transition-colors min-w-[40px]"
            onClick={(e) => { e.stopPropagation(); changeUnit(1); }}
          >
            {getUnitLabel(unitOrder[getWrappedUnitIndex(currentUnitIndex, 1)])}
          </div>
          {/* Current value */}
          <div
            className={`w-14 h-12 flex items-center justify-center bg-blue-50 rounded-lg border-2 border-blue-200 text-xl font-bold text-blue-600 transition-all ${
              isDraggingUnit ? 'bg-blue-100 border-blue-400 scale-105' : ''
            }`}
          >
            {getUnitLabel(unit)}
          </div>
          {/* -1 below */}
          <div 
            className="text-base text-gray-400 h-7 flex items-center justify-center hover:text-gray-500 transition-colors min-w-[40px]"
            onClick={(e) => { e.stopPropagation(); changeUnit(-1); }}
          >
            {getUnitLabel(unitOrder[getWrappedUnitIndex(currentUnitIndex, -1)])}
          </div>
          {/* -2 below */}
          <div 
            className="text-sm text-gray-300 h-6 flex items-center justify-center hover:text-gray-400 transition-colors min-w-[40px]"
            onClick={(e) => { e.stopPropagation(); changeUnit(-2); }}
          >
            {getUnitLabel(unitOrder[getWrappedUnitIndex(currentUnitIndex, -2)])}
          </div>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        {t('timePicker.dragToChange') || 'Drag or click to change'}
      </div>
    </div>
  );

  return (
    <>
      {/* Invisible trigger element to measure position */}
      <div ref={triggerRef} className="inline-block" />
      
      {/* Render picker in portal to escape parent overflow constraints */}
      {mounted && createPortal(pickerContent, document.body)}
    </>
  );
}
