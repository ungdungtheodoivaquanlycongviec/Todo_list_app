export const GROUP_ROLE_KEYS = {
  PRODUCT_OWNER: 'product_owner',
  SALE: 'sale',
  QA: 'qa',
  DEV_MANAGER: 'developer_manager',
  PM: 'pm',
  BA: 'ba',
  BOT_BUILDER: 'bot_builder',
  QC: 'qc',
  DEVOPS: 'devops',
  CLOUD_INFRA: 'cloud_infra',
  SECURITY: 'security',
  CHATBOT: 'chatbot',
  VOICEBOT: 'voicebot',
  DEVELOPER: 'developer'
} as const;

export type GroupRoleKey = (typeof GROUP_ROLE_KEYS)[keyof typeof GROUP_ROLE_KEYS];

// Translation key mapping for role labels
export const ROLE_LABEL_KEYS: Record<GroupRoleKey, string> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: 'roles.productOwner',
  [GROUP_ROLE_KEYS.SALE]: 'roles.sale',
  [GROUP_ROLE_KEYS.QA]: 'roles.qa',
  [GROUP_ROLE_KEYS.DEV_MANAGER]: 'roles.devManager',
  [GROUP_ROLE_KEYS.PM]: 'roles.pm',
  [GROUP_ROLE_KEYS.BA]: 'roles.ba',
  [GROUP_ROLE_KEYS.BOT_BUILDER]: 'roles.botBuilder',
  [GROUP_ROLE_KEYS.QC]: 'roles.qc',
  [GROUP_ROLE_KEYS.DEVOPS]: 'roles.devops',
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: 'roles.cloudInfra',
  [GROUP_ROLE_KEYS.SECURITY]: 'roles.security',
  [GROUP_ROLE_KEYS.CHATBOT]: 'roles.chatbot',
  [GROUP_ROLE_KEYS.VOICEBOT]: 'roles.voicebot',
  [GROUP_ROLE_KEYS.DEVELOPER]: 'roles.developer'
};

// Static role labels for fallback (used in contexts without translation)
export const ROLE_LABELS: Record<GroupRoleKey, string> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: 'Product Owner',
  [GROUP_ROLE_KEYS.SALE]: 'Sale / Account',
  [GROUP_ROLE_KEYS.QA]: 'Quality Assurance',
  [GROUP_ROLE_KEYS.DEV_MANAGER]: 'Developer Manager',
  [GROUP_ROLE_KEYS.PM]: 'Project Manager (PM)',
  [GROUP_ROLE_KEYS.BA]: 'Business Analyst (BA)',
  [GROUP_ROLE_KEYS.BOT_BUILDER]: 'Bot Builder',
  [GROUP_ROLE_KEYS.QC]: 'Quality Control (QC)',
  [GROUP_ROLE_KEYS.DEVOPS]: 'DevOps',
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: 'Cloud Infra',
  [GROUP_ROLE_KEYS.SECURITY]: 'Security',
  [GROUP_ROLE_KEYS.CHATBOT]: 'Chatbot Team',
  [GROUP_ROLE_KEYS.VOICEBOT]: 'Voicebot Team',
  [GROUP_ROLE_KEYS.DEVELOPER]: 'Developer'
};

export const READ_ONLY_ROLES: GroupRoleKey[] = [
  GROUP_ROLE_KEYS.SALE,
  GROUP_ROLE_KEYS.QA,
  GROUP_ROLE_KEYS.DEV_MANAGER
];

export const FOLDER_SCOPED_ROLES: GroupRoleKey[] = [
  GROUP_ROLE_KEYS.BA,
  GROUP_ROLE_KEYS.BOT_BUILDER,
  GROUP_ROLE_KEYS.QC,
  GROUP_ROLE_KEYS.DEVOPS,
  GROUP_ROLE_KEYS.CLOUD_INFRA,
  GROUP_ROLE_KEYS.SECURITY,
  GROUP_ROLE_KEYS.CHATBOT,
  GROUP_ROLE_KEYS.VOICEBOT,
  GROUP_ROLE_KEYS.DEVELOPER
];

// Translation key mapping for role summaries
export const ROLE_SUMMARY_KEYS: Record<GroupRoleKey, { summaryKey: string; capabilitiesKey: string }> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: { summaryKey: 'roles.summary.productOwner', capabilitiesKey: 'roles.capabilities.productOwner' },
  [GROUP_ROLE_KEYS.PM]: { summaryKey: 'roles.summary.pm', capabilitiesKey: 'roles.capabilities.pm' },
  [GROUP_ROLE_KEYS.SALE]: { summaryKey: 'roles.summary.sale', capabilitiesKey: 'roles.capabilities.sale' },
  [GROUP_ROLE_KEYS.QA]: { summaryKey: 'roles.summary.qa', capabilitiesKey: 'roles.capabilities.qa' },
  [GROUP_ROLE_KEYS.DEV_MANAGER]: { summaryKey: 'roles.summary.devManager', capabilitiesKey: 'roles.capabilities.devManager' },
  [GROUP_ROLE_KEYS.BA]: { summaryKey: 'roles.summary.ba', capabilitiesKey: 'roles.capabilities.ba' },
  [GROUP_ROLE_KEYS.BOT_BUILDER]: { summaryKey: 'roles.summary.botBuilder', capabilitiesKey: 'roles.capabilities.botBuilder' },
  [GROUP_ROLE_KEYS.QC]: { summaryKey: 'roles.summary.qc', capabilitiesKey: 'roles.capabilities.qc' },
  [GROUP_ROLE_KEYS.DEVOPS]: { summaryKey: 'roles.summary.devops', capabilitiesKey: 'roles.capabilities.devops' },
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: { summaryKey: 'roles.summary.cloudInfra', capabilitiesKey: 'roles.capabilities.cloudInfra' },
  [GROUP_ROLE_KEYS.SECURITY]: { summaryKey: 'roles.summary.security', capabilitiesKey: 'roles.capabilities.security' },
  [GROUP_ROLE_KEYS.CHATBOT]: { summaryKey: 'roles.summary.chatbot', capabilitiesKey: 'roles.capabilities.chatbot' },
  [GROUP_ROLE_KEYS.VOICEBOT]: { summaryKey: 'roles.summary.voicebot', capabilitiesKey: 'roles.capabilities.voicebot' },
  [GROUP_ROLE_KEYS.DEVELOPER]: { summaryKey: 'roles.summary.developer', capabilitiesKey: 'roles.capabilities.developer' }
};

// Badge colors for roles
export const ROLE_BADGE_COLORS: Record<GroupRoleKey, string> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: 'from-amber-500 to-amber-600',
  [GROUP_ROLE_KEYS.PM]: 'from-blue-500 to-blue-600',
  [GROUP_ROLE_KEYS.SALE]: 'from-slate-500 to-slate-600',
  [GROUP_ROLE_KEYS.QA]: 'from-slate-500 to-slate-600',
  [GROUP_ROLE_KEYS.DEV_MANAGER]: 'from-slate-500 to-slate-600',
  [GROUP_ROLE_KEYS.BA]: 'from-emerald-500 to-emerald-600',
  [GROUP_ROLE_KEYS.BOT_BUILDER]: 'from-emerald-500 to-emerald-600',
  [GROUP_ROLE_KEYS.QC]: 'from-emerald-500 to-emerald-600',
  [GROUP_ROLE_KEYS.DEVOPS]: 'from-purple-500 to-purple-600',
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: 'from-purple-500 to-purple-600',
  [GROUP_ROLE_KEYS.SECURITY]: 'from-purple-500 to-purple-600',
  [GROUP_ROLE_KEYS.CHATBOT]: 'from-teal-500 to-teal-600',
  [GROUP_ROLE_KEYS.VOICEBOT]: 'from-teal-500 to-teal-600',
  [GROUP_ROLE_KEYS.DEVELOPER]: 'from-teal-500 to-teal-600'
};

// Role scopes
export const ROLE_SCOPES: Record<GroupRoleKey, 'full' | 'read_only' | 'folder_scoped'> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: 'full',
  [GROUP_ROLE_KEYS.PM]: 'full',
  [GROUP_ROLE_KEYS.SALE]: 'read_only',
  [GROUP_ROLE_KEYS.QA]: 'read_only',
  [GROUP_ROLE_KEYS.DEV_MANAGER]: 'read_only',
  [GROUP_ROLE_KEYS.BA]: 'folder_scoped',
  [GROUP_ROLE_KEYS.BOT_BUILDER]: 'folder_scoped',
  [GROUP_ROLE_KEYS.QC]: 'folder_scoped',
  [GROUP_ROLE_KEYS.DEVOPS]: 'folder_scoped',
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: 'folder_scoped',
  [GROUP_ROLE_KEYS.SECURITY]: 'folder_scoped',
  [GROUP_ROLE_KEYS.CHATBOT]: 'folder_scoped',
  [GROUP_ROLE_KEYS.VOICEBOT]: 'folder_scoped',
  [GROUP_ROLE_KEYS.DEVELOPER]: 'folder_scoped'
};

// Function to get translated ROLE_SUMMARIES
export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

export const getRoleSummaries = (t: TranslateFunction): Record<GroupRoleKey, { scope: 'full' | 'read_only' | 'folder_scoped'; summary: string; capabilities: string; badgeColor: string }> => {
  const summaries: Record<GroupRoleKey, { scope: 'full' | 'read_only' | 'folder_scoped'; summary: string; capabilities: string; badgeColor: string }> = {} as any;

  for (const role of Object.values(GROUP_ROLE_KEYS)) {
    const keys = ROLE_SUMMARY_KEYS[role];
    summaries[role] = {
      scope: ROLE_SCOPES[role],
      summary: t(keys.summaryKey as any),
      capabilities: t(keys.capabilitiesKey as any),
      badgeColor: ROLE_BADGE_COLORS[role]
    };
  }

  return summaries;
};

// Legacy ROLE_SUMMARIES for backward compatibility (static, Vietnamese)
export const ROLE_SUMMARIES: Record<
  GroupRoleKey,
  {
    scope: 'full' | 'read_only' | 'folder_scoped';
    summary: string;
    capabilities: string;
    badgeColor: string;
  }
> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: {
    scope: 'full',
    summary: 'Toàn quyền quản trị dự án',
    capabilities: 'Tạo/chỉnh sửa mọi nội dung, phân quyền, gán folder',
    badgeColor: 'from-amber-500 to-amber-600'
  },
  [GROUP_ROLE_KEYS.PM]: {
    scope: 'full',
    summary: 'Quản lý dự án, cấp thư mục',
    capabilities: 'Tạo/chỉnh sửa task/note/folder, gán folder cho thành viên',
    badgeColor: 'from-blue-500 to-blue-600'
  },
  [GROUP_ROLE_KEYS.SALE]: {
    scope: 'read_only',
    summary: 'Chỉ xem tiến độ',
    capabilities: 'Xem tất cả task/note/folder, không thể chỉnh sửa',
    badgeColor: 'from-slate-500 to-slate-600'
  },
  [GROUP_ROLE_KEYS.QA]: {
    scope: 'read_only',
    summary: 'Giám sát chất lượng',
    capabilities: 'Xem tất cả folder trong group, CRUD task trong folder được PM/PO/Leader gán',
    badgeColor: 'from-slate-500 to-slate-600'
  },
  [GROUP_ROLE_KEYS.DEV_MANAGER]: {
    scope: 'read_only',
    summary: 'Theo dõi đội phát triển',
    capabilities: 'Quyền xem toàn bộ, không tạo/chỉnh sửa',
    badgeColor: 'from-slate-500 to-slate-600'
  },
  [GROUP_ROLE_KEYS.BA]: {
    scope: 'folder_scoped',
    summary: 'Làm việc trong folder được gán',
    capabilities: 'Tạo/chỉnh sửa task/note trong folder được PM gán',
    badgeColor: 'from-emerald-500 to-emerald-600'
  },
  [GROUP_ROLE_KEYS.BOT_BUILDER]: {
    scope: 'folder_scoped',
    summary: 'Thực hiện bot theo folder được gán',
    capabilities: 'Toàn quyền trong folder được gán',
    badgeColor: 'from-emerald-500 to-emerald-600'
  },
  [GROUP_ROLE_KEYS.QC]: {
    scope: 'folder_scoped',
    summary: 'Kiểm thử trong folder được giao',
    capabilities: 'Tạo/chỉnh sửa/xóa trong folder đã được gán',
    badgeColor: 'from-emerald-500 to-emerald-600'
  },
  [GROUP_ROLE_KEYS.DEVOPS]: {
    scope: 'folder_scoped',
    summary: 'Vận hành hạ tầng theo folder',
    capabilities: 'Chỉnh sửa nội dung trong folder được giao',
    badgeColor: 'from-purple-500 to-purple-600'
  },
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: {
    scope: 'folder_scoped',
    summary: 'Quản lý cloud/infra',
    capabilities: 'Quyền thực thi trong folder được gán',
    badgeColor: 'from-purple-500 to-purple-600'
  },
  [GROUP_ROLE_KEYS.SECURITY]: {
    scope: 'folder_scoped',
    summary: 'Đảm bảo bảo mật trong folder được phân',
    capabilities: 'Chỉnh sửa nội dung folder được gán',
    badgeColor: 'from-purple-500 to-purple-600'
  },
  [GROUP_ROLE_KEYS.CHATBOT]: {
    scope: 'folder_scoped',
    summary: 'Team sản phẩm Chatbot',
    capabilities: 'Thực hiện task/note trong folder được gán',
    badgeColor: 'from-teal-500 to-teal-600'
  },
  [GROUP_ROLE_KEYS.VOICEBOT]: {
    scope: 'folder_scoped',
    summary: 'Team sản phẩm Voicebot',
    capabilities: 'Thực hiện task/note trong folder được gán',
    badgeColor: 'from-teal-500 to-teal-600'
  },
  [GROUP_ROLE_KEYS.DEVELOPER]: {
    scope: 'folder_scoped',
    summary: 'Dev thực thi trong folder được gán',
    capabilities: 'Toàn quyền trong folder đã được gán',
    badgeColor: 'from-teal-500 to-teal-600'
  }
};

// Section keys for translation
export const ROLE_SECTION_KEYS = [
  { titleKey: 'roles.sections.monitoring', roles: [GROUP_ROLE_KEYS.SALE, GROUP_ROLE_KEYS.QA, GROUP_ROLE_KEYS.DEV_MANAGER] },
  { titleKey: 'roles.sections.management', roles: [GROUP_ROLE_KEYS.PM, GROUP_ROLE_KEYS.BA, GROUP_ROLE_KEYS.BOT_BUILDER, GROUP_ROLE_KEYS.QC] },
  { titleKey: 'roles.sections.infrastructure', roles: [GROUP_ROLE_KEYS.DEVOPS, GROUP_ROLE_KEYS.CLOUD_INFRA, GROUP_ROLE_KEYS.SECURITY] },
  { titleKey: 'roles.sections.productTeam', roles: [GROUP_ROLE_KEYS.CHATBOT, GROUP_ROLE_KEYS.VOICEBOT, GROUP_ROLE_KEYS.DEVELOPER] }
];

// Function to get translated role sections
export const getRoleSections = (t: TranslateFunction) => {
  return ROLE_SECTION_KEYS.map(section => ({
    title: t(section.titleKey as any),
    roles: section.roles.map(role => ({
      value: role,
      label: t(ROLE_LABEL_KEYS[role] as any)
    }))
  }));
};

// Legacy ROLE_SECTIONS for backward compatibility (static)
export const ROLE_SECTIONS = [
  {
    title: 'Giám sát dự án',
    roles: [
      { value: GROUP_ROLE_KEYS.SALE, label: ROLE_LABELS[GROUP_ROLE_KEYS.SALE] },
      { value: GROUP_ROLE_KEYS.QA, label: ROLE_LABELS[GROUP_ROLE_KEYS.QA] },
      { value: GROUP_ROLE_KEYS.DEV_MANAGER, label: ROLE_LABELS[GROUP_ROLE_KEYS.DEV_MANAGER] }
    ]
  },
  {
    title: 'Quản lý dự án',
    roles: [
      { value: GROUP_ROLE_KEYS.PM, label: ROLE_LABELS[GROUP_ROLE_KEYS.PM] },
      { value: GROUP_ROLE_KEYS.BA, label: ROLE_LABELS[GROUP_ROLE_KEYS.BA] },
      { value: GROUP_ROLE_KEYS.BOT_BUILDER, label: ROLE_LABELS[GROUP_ROLE_KEYS.BOT_BUILDER] },
      { value: GROUP_ROLE_KEYS.QC, label: ROLE_LABELS[GROUP_ROLE_KEYS.QC] }
    ]
  },
  {
    title: 'Hạ tầng (Infra)',
    roles: [
      { value: GROUP_ROLE_KEYS.DEVOPS, label: ROLE_LABELS[GROUP_ROLE_KEYS.DEVOPS] },
      { value: GROUP_ROLE_KEYS.CLOUD_INFRA, label: ROLE_LABELS[GROUP_ROLE_KEYS.CLOUD_INFRA] },
      { value: GROUP_ROLE_KEYS.SECURITY, label: ROLE_LABELS[GROUP_ROLE_KEYS.SECURITY] }
    ]
  },
  {
    title: 'Team sản phẩm',
    roles: [
      { value: GROUP_ROLE_KEYS.CHATBOT, label: ROLE_LABELS[GROUP_ROLE_KEYS.CHATBOT] },
      { value: GROUP_ROLE_KEYS.VOICEBOT, label: ROLE_LABELS[GROUP_ROLE_KEYS.VOICEBOT] },
      { value: GROUP_ROLE_KEYS.DEVELOPER, label: ROLE_LABELS[GROUP_ROLE_KEYS.DEVELOPER] }
    ]
  }
];

export const INVITABLE_ROLES = ROLE_SECTIONS.flatMap(section => section.roles as Array<{ value: GroupRoleKey; label: string }>);
// Function to get translated role label
export const getRoleLabel = (role?: string | null, t?: TranslateFunction) => {
  if (!role) return t ? t('roles.unknown' as any) : 'Unknown role';
  if (t) {
    const key = ROLE_LABEL_KEYS[role as GroupRoleKey];
    if (key) return t(key as any);
  }
  return ROLE_LABELS[role as GroupRoleKey] || role;
};

export const isReadOnlyRole = (role?: string | null): boolean => {
  if (!role) return false;
  return READ_ONLY_ROLES.includes(role as GroupRoleKey);
};

export const requiresFolderAssignment = (role?: string | null): boolean => {
  if (!role) return false;
  return FOLDER_SCOPED_ROLES.includes(role as GroupRoleKey);
};
