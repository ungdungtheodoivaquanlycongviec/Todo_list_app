import React, { useMemo, useState } from 'react';
import { X, Users, AlertTriangle } from 'lucide-react';
import { Folder } from '../../services/types/folder.types';
import { GroupMember } from '../../services/types/group.types';
import { getMemberId, requiresFolderAssignment } from '../../utils/groupRoleUtils';
import { getRoleLabel } from '../../constants/groupRoles';
import { useLanguage } from '../../contexts/LanguageContext';

interface BlockedUser {
  userId: string;
  userName: string;
  userEmail: string;
  tasks: Array<{
    taskId: string;
    taskTitle: string;
    taskStatus: string;
  }>;
}

interface FolderAccessModalProps {
  folder: Folder;
  members: GroupMember[];
  onClose: () => void;
  onSave: (memberIds: string[]) => Promise<void>;
  saving: boolean;
  error?: string;
  blockedUsers?: BlockedUser[];
}

export function FolderAccessModal({ folder, members, onClose, onSave, saving, error, blockedUsers }: FolderAccessModalProps) {
  const { t } = useLanguage();

  const eligibleMembers = useMemo(
    () =>
      members.filter(member => {
        const memberId = getMemberId(member);
        return Boolean(memberId);
      }),
    [members]
  );

  const initialSelected = useMemo(() => {
    if (!Array.isArray(folder.memberAccess)) {
      return [];
    }
    return folder.memberAccess.map(access => access.userId);
  }, [folder.memberAccess]);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialSelected);
  const [search, setSearch] = useState('');

  const filteredMembers = eligibleMembers.filter(member => {
    const name = member.name || (typeof member.userId === 'object' ? member.userId?.name : '');
    const email = member.email || (typeof member.userId === 'object' ? member.userId?.email : '');
    const keyword = search.toLowerCase();
    return name?.toLowerCase().includes(keyword) || email?.toLowerCase().includes(keyword);
  });

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    await onSave(selectedMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              {t('folderAccess.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('folderAccess.folderLabel')}: <span className="font-medium text-gray-900 dark:text-white">{folder.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E]"
            aria-label="Close"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('folderAccess.description')}
          </p>
          <div className="relative">
            <input
              type="text"
              placeholder={t('folderAccess.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
            {filteredMembers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('folderAccess.noMatchingMembers')}
              </div>
            ) : (
              filteredMembers.map(member => {
                const memberId = getMemberId(member);
                if (!memberId) return null;
                const isSelected = selectedMembers.includes(memberId);
                const displayName =
                  member.name ||
                  (typeof member.userId === 'object' ? member.userId?.name : '') ||
                  t('folderAccess.member');
                const email =
                  member.email || (typeof member.userId === 'object' ? member.userId?.email : '');

                return (
                  <label
                    key={memberId}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2E2E2E]"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        {getRoleLabel(member.role, t as any)}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMember(memberId)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      disabled={saving}
                    />
                  </label>
                );
              })
            )}
          </div>
          {(error || (blockedUsers && blockedUsers.length > 0)) && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error || t('folderAccess.cannotRemoveWithActiveTasks')}</span>
              </div>
              {blockedUsers && blockedUsers.length > 0 && (
                <div className="mt-2 space-y-2">
                  {blockedUsers.map(user => (
                    <div key={user.userId} className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2">
                      <p className="font-medium">{user.userName} ({user.userEmail})</p>
                      <ul className="ml-4 mt-1 list-disc text-xs">
                        {user.tasks.map(task => (
                          <li key={task.taskId}>
                            {task.taskTitle} - <span className="capitalize">{task.taskStatus.replace('_', ' ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E]"
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? t('folderAccess.saving') : t('folderAccess.savePermissions')}
          </button>
        </div>
      </div>
    </div>
  );
}


