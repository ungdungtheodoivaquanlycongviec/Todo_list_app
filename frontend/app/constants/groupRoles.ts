export const GROUP_ROLE_KEYS = {
  PRODUCT_OWNER: 'product_owner',
  SALE: 'sale',
  QA: 'qa',
  DEV_MANAGER: 'developer_manager',
  PM: 'pm',
  BA: 'ba',
  TECH_LEAD: 'tech',
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

export const ROLE_LABELS: Record<GroupRoleKey, string> = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: 'Product Owner',
  [GROUP_ROLE_KEYS.SALE]: 'Sale / Account',
  [GROUP_ROLE_KEYS.QA]: 'Quality Assurance',
  [GROUP_ROLE_KEYS.DEV_MANAGER]: 'Developer Manager',
  [GROUP_ROLE_KEYS.PM]: 'Project Manager (PM)',
  [GROUP_ROLE_KEYS.BA]: 'Business Analyst (BA)',
  [GROUP_ROLE_KEYS.TECH_LEAD]: 'Tech Lead',
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
  GROUP_ROLE_KEYS.TECH_LEAD,
  GROUP_ROLE_KEYS.BOT_BUILDER,
  GROUP_ROLE_KEYS.QC,
  GROUP_ROLE_KEYS.DEVOPS,
  GROUP_ROLE_KEYS.CLOUD_INFRA,
  GROUP_ROLE_KEYS.SECURITY,
  GROUP_ROLE_KEYS.CHATBOT,
  GROUP_ROLE_KEYS.VOICEBOT,
  GROUP_ROLE_KEYS.DEVELOPER
];

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
    capabilities: 'Xem toàn bộ nội dung, không được chỉnh sửa',
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
  [GROUP_ROLE_KEYS.TECH_LEAD]: {
    scope: 'folder_scoped',
    summary: 'Dẫn dắt kỹ thuật trong folder được giao',
    capabilities: 'Quyền CRUD trong folder đã được gán',
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
      { value: GROUP_ROLE_KEYS.TECH_LEAD, label: ROLE_LABELS[GROUP_ROLE_KEYS.TECH_LEAD] },
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
export const DEFAULT_INVITE_ROLE = GROUP_ROLE_KEYS.PM;

export const getRoleLabel = (role?: string | null) => {
  if (!role) return 'Unknown role';
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

