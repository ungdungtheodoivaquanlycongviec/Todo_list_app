'use client';

import { X, Pin, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegional } from '../../contexts/RegionalContext';

interface PinnedMessage {
    _id: string;
    content?: string;
    senderId: {
        _id: string;
        name: string;
        avatar?: string;
    };
    pinnedBy?: {
        name: string;
    };
    pinnedAt?: string;
    createdAt: string;
    attachments?: Array<{
        type: string;
        filename: string;
        url: string;
    }>;
}

interface PinnedMessagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: PinnedMessage[];
    onUnpin: (messageId: string) => void;
    onScrollToMessage?: (messageId: string, createdAt: string) => void;
}

export default function PinnedMessagesModal({
    isOpen,
    onClose,
    messages,
    onUnpin,
    onScrollToMessage
}: PinnedMessagesModalProps) {
    const { t } = useLanguage();
    const { formatTime } = useRegional();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Pin className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('chat.pinnedMessages') || 'Pinned Messages'}
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({messages.length})
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Pin className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">
                                {t('chat.noPinnedMessages') || 'No pinned messages yet'}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                {t('chat.pinMessagesHint') || 'Pin important messages to find them quickly'}
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message._id}
                                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                {/* Sender info */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                                        {message.senderId.avatar ? (
                                            <img
                                                src={message.senderId.avatar}
                                                alt={message.senderId.name}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            message.senderId.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {message.senderId.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatTime(message.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                {/* Message content */}
                                {message.content && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">
                                        {message.content}
                                    </p>
                                )}

                                {/* Attachments indicator */}
                                {message.attachments && message.attachments.length > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        📎 {message.attachments.length} {message.attachments.length === 1 ? 'attachment' : 'attachments'}
                                    </p>
                                )}

                                {/* Pinned by info */}
                                {message.pinnedBy && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                                        📌 {t('chat.pinnedBy') || 'Pinned by'} {message.pinnedBy.name}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    {onScrollToMessage && (
                                        <button
                                            onClick={() => {
                                                onScrollToMessage(message._id, message.createdAt);
                                                onClose();
                                            }}
                                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            {t('chat.jumpToMessage') || 'Jump to message'}
                                        </button>
                                    )}
                                    <div className="flex-1" />
                                    <button
                                        onClick={() => onUnpin(message._id)}
                                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        <Pin className="w-3 h-3" />
                                        {t('chat.unpin') || 'Unpin'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
