'use client';

import React, { useState, useMemo } from 'react';
import { X, Lock, Users, UserCheck, Search } from 'lucide-react';
import { Note } from '../../services/notes.service';
import { Folder } from '../../services/types/folder.types';
import { GroupMember } from '../../services/types/group.types';
import { useLanguage } from '../../contexts/LanguageContext';

interface ShareNoteModalProps {
    note: Note;
    folder: Folder | null;
    members: GroupMember[];
    onClose: () => void;
    onSave: (visibility: 'private' | 'folder' | 'specific', sharedWith: string[]) => Promise<void>;
    saving: boolean;
}

export function ShareNoteModal({ note, folder, members, onClose, onSave, saving }: ShareNoteModalProps) {
    const { t } = useLanguage();
    const [visibility, setVisibility] = useState<'private' | 'folder' | 'specific'>(note.visibility || 'private');
    const [selectedUsers, setSelectedUsers] = useState<string[]>(note.sharedWith || []);
    const [search, setSearch] = useState('');

    // Filter members who have access to the folder
    const folderMembers = useMemo(() => {
        if (!folder?.memberAccess) return members;
        const accessUserIds = new Set(folder.memberAccess.map(a => a.userId));
        return members.filter(m => {
            const memberId = typeof m.userId === 'object' ? m.userId._id : m.userId;
            return accessUserIds.has(memberId);
        });
    }, [folder, members]);

    // Filter by search
    const filteredMembers = folderMembers.filter(member => {
        const name = member.name || (typeof member.userId === 'object' ? member.userId?.name : '');
        const email = member.email || (typeof member.userId === 'object' ? member.userId?.email : '');
        const keyword = search.toLowerCase();
        return name?.toLowerCase().includes(keyword) || email?.toLowerCase().includes(keyword);
    });

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSave = async () => {
        await onSave(visibility, visibility === 'specific' ? selectedUsers : []);
    };

    const getMemberId = (member: GroupMember): string => {
        return typeof member.userId === 'object' ? member.userId._id : member.userId;
    };

    const getMemberName = (member: GroupMember): string => {
        return member.name || (typeof member.userId === 'object' ? member.userId?.name : '') || t('notes.member');
    };

    const getMemberEmail = (member: GroupMember): string => {
        return member.email || (typeof member.userId === 'object' ? member.userId?.email : '') || '';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('notes.shareNote')}
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Note title display */}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('notes.sharingFor')}: <span className="font-medium text-gray-900 dark:text-white">{note.title || t('notes.untitled')}</span>
                    </div>

                    {/* Visibility Options */}
                    <div className="space-y-3">
                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${visibility === 'private'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
                            }`}>
                            <input
                                type="radio"
                                name="visibility"
                                value="private"
                                checked={visibility === 'private'}
                                onChange={() => setVisibility('private')}
                                className="w-4 h-4 text-blue-600"
                                disabled={saving}
                            />
                            <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-blue-500' : 'text-gray-500'}`} />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{t('notes.visibilityPrivate')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notes.visibilityPrivateDesc')}</p>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${visibility === 'folder'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
                            }`}>
                            <input
                                type="radio"
                                name="visibility"
                                value="folder"
                                checked={visibility === 'folder'}
                                onChange={() => setVisibility('folder')}
                                className="w-4 h-4 text-blue-600"
                                disabled={saving}
                            />
                            <Users className={`w-5 h-5 ${visibility === 'folder' ? 'text-blue-500' : 'text-gray-500'}`} />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{t('notes.visibilityFolder')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notes.visibilityFolderDesc')}</p>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${visibility === 'specific'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
                            }`}>
                            <input
                                type="radio"
                                name="visibility"
                                value="specific"
                                checked={visibility === 'specific'}
                                onChange={() => setVisibility('specific')}
                                className="w-4 h-4 text-blue-600"
                                disabled={saving}
                            />
                            <UserCheck className={`w-5 h-5 ${visibility === 'specific' ? 'text-green-500' : 'text-gray-500'}`} />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{t('notes.visibilitySpecific')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notes.visibilitySpecificDesc')}</p>
                            </div>
                        </label>
                    </div>

                    {/* People Selector (only show when "specific" is selected) */}
                    {visibility === 'specific' && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('notes.searchMembers')}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={saving}
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredMembers.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {t('notes.noMembersFound')}
                                    </div>
                                ) : (
                                    filteredMembers.map(member => {
                                        const memberId = getMemberId(member);
                                        const displayName = getMemberName(member);
                                        const email = getMemberEmail(member);
                                        const isSelected = selectedUsers.includes(memberId);

                                        return (
                                            <label
                                                key={memberId}
                                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                                        : 'hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                                                    {email && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleUser(memberId)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 ml-3"
                                                    disabled={saving}
                                                />
                                            </label>
                                        );
                                    })
                                )}
                            </div>

                            {selectedUsers.length > 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('notes.selectedCount', { count: selectedUsers.length })}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
                        disabled={saving}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        disabled={saving}
                    >
                        {saving ? t('common.saving') : t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
