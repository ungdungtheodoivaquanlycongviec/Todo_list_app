"use client";

import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { MeetingConfig } from '../../services/meeting.service';

interface IncomingCallNotificationProps {
  meetingId: string;
  type: 'group' | 'direct';
  callerName: string;
  groupName?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallNotification({
  meetingId,
  type,
  callerName,
  groupName,
  onAccept,
  onDecline
}: IncomingCallNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[320px] max-w-[400px] animate-in slide-in-from-top-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
          {callerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {callerName}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {type === 'group' 
              ? `Incoming call in ${groupName || 'group'}`
              : 'Incoming call'
            }
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <PhoneOff className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
        <button
          onClick={onDecline}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

