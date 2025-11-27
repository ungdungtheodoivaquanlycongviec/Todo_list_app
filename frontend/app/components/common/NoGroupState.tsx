'use client';

import React from 'react';
import { Users, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface NoGroupStateProps {
  title?: string;
  description?: string;
  showGroupSelector?: boolean;
}

export default function NoGroupState({ 
  title,
  description,
  showGroupSelector = true
}: NoGroupStateProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const displayTitle = title || t('groups.joinOrCreate');
  const displayDescription = description || t('groups.joinOrCreateDesc');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{displayTitle}</h2>
          <p className="text-gray-600 mb-6">{displayDescription}</p>
          
          {showGroupSelector && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-left">
                <h3 className="font-medium text-gray-900 mb-2">{t('groups.quickActions')}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Plus className="w-4 h-4 text-green-500" />
                    <span>{t('groups.createToStart')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <span>{t('groups.joinWithCode')}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>{t('groups.onceInGroup')}</p>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• {t('groups.manageTasksBenefit')}</li>
                  <li>• {t('groups.collaborateBenefit')}</li>
                  <li>• {t('groups.trackProgressBenefit')}</li>
                  <li>• {t('groups.shareFilesBenefit')}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
