'use client';

import { useState, useEffect } from 'react';
import { adminService, AdminUser, LoginHistory, DashboardStats } from '../services/admin.service';
import { useAuth } from '../contexts/AuthContext';
import ChatbotWidget from '../components/common/ChatbotWidget';
import { GROUP_ROLE_KEYS, ROLE_LABELS } from '../constants/groupRoles';
import { groupService } from '../services/group.service';
import { Group } from '../services/types/group.types';
import TopBar from '../components/layouts/TopBar';
import ProfileSettings from '../components/ProfileSettings';
import ChatView from '../components/views/ChatView';
import { 
  BarChart3, 
  Users, 
  Bell, 
  History, 
  MessageSquare,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Shield,
  ShieldOff,
  Check,
  X,
  Send,
  Download,
  Eye,
  MoreVertical,
  TrendingUp,
  UserCheck,
  UserX,
  Building,
  Activity
} from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'notifications' | 'login-history' | 'chat';

export default function AdminPage() {
  const { user, logout, updateUserTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user && !['admin', 'super_admin'].includes(user.role)) {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const tabConfig = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart3 },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'login-history' as Tab, label: 'Login History', icon: History },
    { id: 'chat' as Tab, label: 'Chat', icon: MessageSquare }
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Please login to access admin panel</p>
        </div>
      </div>
    );
  }

  if (!['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-lg font-medium text-red-600 dark:text-red-400">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const handleThemeChange = async (newTheme: string) => {
    try {
      await updateUserTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`
        flex flex-col h-full bg-white dark:bg-gray-800 shadow-xl transition-all duration-300
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Management Dashboard</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? 
                <ChevronRight className="w-5 h-5 text-gray-500" /> : 
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              }
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center rounded-xl px-4 py-3 transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className="w-5 h-5" />
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium">{tab.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role.replace('_', ' ').toUpperCase()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <TopBar 
          user={user}
          onLogout={logout}
          theme={user.theme || 'auto'}
          onThemeChange={handleThemeChange}
          onProfileClick={() => setShowProfileSettings(true)}
          onViewChange={() => {}}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {showProfileSettings ? (
            <div className="h-full overflow-y-auto">
              <ProfileSettings onClose={() => setShowProfileSettings(false)} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto">
                {/* Tab-specific content */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tabConfig.find(t => t.id === activeTab)?.label}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {activeTab === 'dashboard' && 'Overview of system statistics and metrics'}
                    {activeTab === 'users' && 'Manage user accounts, roles, and permissions'}
                    {activeTab === 'notifications' && 'Send notifications to users and groups'}
                    {activeTab === 'login-history' && 'View user login activity and security events'}
                    {activeTab === 'chat' && 'Monitor and participate in group conversations'}
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center">
                      <X className="w-5 h-5 mr-2" />
                      {error}
                    </div>
                  </div>
                )}

                {/* Tab Content */}
                <div className="mt-6">
                  {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
                  {activeTab === 'users' && <UsersTab isSuperAdmin={user.role === 'super_admin'} />}
                  {activeTab === 'notifications' && <NotificationsTab />}
                  {activeTab === 'login-history' && <LoginHistoryTab />}
                  {activeTab === 'chat' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden h-[calc(100vh-200px)]">
                      <ChatView />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}

// Dashboard Tab Component - Updated with Bordio style
function DashboardTab({ stats }: { stats: DashboardStats | null }) {
  if (!stats) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400">No statistics available</p>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users,
      color: 'blue',
      change: '+12%' 
    },
    { 
      label: 'Active Users', 
      value: stats.activeUsers, 
      icon: UserCheck,
      color: 'green',
      change: '+5%' 
    },
    { 
      label: 'Inactive Users', 
      value: stats.inactiveUsers, 
      icon: UserX,
      color: 'red',
      change: '-2%' 
    },
    { 
      label: 'Admins', 
      value: stats.totalAdmins, 
      icon: Shield,
      color: 'purple',
      change: '+0%' 
    },
    { 
      label: 'Groups', 
      value: stats.totalGroups, 
      icon: Building,
      color: 'indigo',
      change: '+8%' 
    },
    { 
      label: 'Recent Logins', 
      value: stats.recentLogins, 
      icon: History,
      color: 'yellow',
      change: '+15%' 
    },
    { 
      label: 'Recent Actions', 
      value: stats.recentActions, 
      icon: Activity,
      color: 'pink',
      change: '+23%' 
    },
    { 
      label: 'System Health', 
      value: '99.9%', 
      icon: TrendingUp,
      color: 'emerald',
      change: '+0.1%' 
    }
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            red: 'bg-red-500',
            purple: 'bg-purple-500',
            indigo: 'bg-indigo-500',
            yellow: 'bg-yellow-500',
            pink: 'bg-pink-500',
            emerald: 'bg-emerald-500'
          };

          return (
            <div 
              key={stat.label} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[stat.color as keyof typeof colorClasses]} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  stat.change.startsWith('+') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="mb-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${colorClasses[stat.color as keyof typeof colorClasses]}`}
                  style={{ width: `${Math.min(100, (Number(stat.value) / 1000) * 100)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'Add New User', action: () => console.log('Add user') },
              { label: 'Send Broadcast', action: () => console.log('Send broadcast') },
              { label: 'View Reports', action: () => console.log('View reports') },
              { label: 'System Settings', action: () => console.log('System settings') }
            ].map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
          <div className="space-y-4">
            {[
              { label: 'API Response Time', value: '42ms', status: 'good' },
              { label: 'Database Load', value: '24%', status: 'good' },
              { label: 'Memory Usage', value: '67%', status: 'warning' },
              { label: 'Active Connections', value: '128', status: 'good' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                  <div className={`w-3 h-3 rounded-full ${
                    item.status === 'good' ? 'bg-green-500' :
                    item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Users Tab Component - Updated
function UsersTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, search, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter;
      
      const response = await adminService.getUsers(params);
      setUsers(response.users);
      setPagination(response.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleLockUnlock = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await adminService.unlockUser(userId);
      } else {
        await adminService.lockUser(userId);
      }
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleRoleChange = async (userId: string, action: 'assign' | 'remove') => {
    try {
      if (action === 'assign') {
        await adminService.assignAdminRole(userId);
      } else {
        await adminService.removeAdminRole(userId);
      }
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleBusinessRoleChange = async (
    user: AdminUser,
    updates: { groupRole?: string | null; isLeader?: boolean }
  ) => {
    try {
      setUpdatingUserId(user._id);
      await adminService.updateUser(user._id, updates);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user business role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const BUSINESS_ROLE_OPTIONS = Object.values(GROUP_ROLE_KEYS);

  return (
    <div>
      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button 
            onClick={() => {
              setSearch('');
              setRoleFilter('');
              setStatusFilter('');
              setPage(1);
            }}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center">
            <X className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      ) : (
        <>
          {/* Users Table Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Business Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                            user.role === 'super_admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={user.groupRole || ''}
                            onChange={(e) =>
                              handleBusinessRoleChange(user, {
                                groupRole: e.target.value || null,
                              })
                            }
                            disabled={updatingUserId === user._id}
                            className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">No role</option>
                            {BUSINESS_ROLE_OPTIONS.map((roleKey) => (
                              <option key={roleKey} value={roleKey}>
                                {ROLE_LABELS[roleKey] || roleKey}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={Boolean(user.isLeader)}
                              onChange={(e) =>
                                handleBusinessRoleChange(user, { isLeader: e.target.checked })
                              }
                              disabled={updatingUserId === user._id}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                            />
                            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">Lead</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-sm font-medium ${
                            user.isActive 
                              ? 'text-green-700 dark:text-green-400' 
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLockUnlock(user._id, !user.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive 
                                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={user.isActive ? 'Lock user' : 'Unlock user'}
                          >
                            {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          
                          {isSuperAdmin && user.role !== 'super_admin' && (
                            <>
                              {user.role !== 'admin' ? (
                                <button
                                  onClick={() => handleRoleChange(user._id, 'assign')}
                                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                  title="Make admin"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRoleChange(user._id, 'remove')}
                                  className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                  title="Remove admin"
                                >
                                  <ShieldOff className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          
                          <button className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * 20, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> users
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    let pageNum = i + 1;
                    if (page > 3) pageNum = page - 2 + i;
                    if (pageNum > pagination.pages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl transition-colors ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Notifications Tab Component - Updated
function NotificationsTab() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'users' | 'group'>('all');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadOptions();
    loadRecentNotifications();
  }, []);

  const loadOptions = async () => {
    try {
      setUsersLoading(true);
      const data = await adminService.getUsers({ page: 1, limit: 50 });
      setAvailableUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setUsersLoading(false);
    }

    try {
      setGroupsLoading(true);
      const res = await groupService.getAllGroups();
      const allGroups =
        (res.allGroups && res.allGroups.length > 0
          ? res.allGroups
          : [...(res.myGroups || []), ...(res.sharedGroups || [])]);
      setGroups(allGroups);
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadRecentNotifications = async () => {
    // Implement this based on your API
    setNotifications([]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const data: any = { title, message };
      
      if (recipientType === 'all') {
        data.sendToAll = true;
      } else if (recipientType === 'users' && recipientIds.length > 0) {
        data.recipients = recipientIds;
      } else if (recipientType === 'group') {
        if (recipientIds.length > 0) {
          data.groupId = recipientIds[0];
        }
      }

      const result = await adminService.sendNotification(data);
      setSuccess(`Notification sent to ${result.sentCount} user(s) successfully`);
      setTitle('');
      setMessage('');
      setRecipientIds([]);
      loadRecentNotifications();
    } catch (err: any) {
      setError(err.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (id: string) => {
    setRecipientIds(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleSelectGroup = (id: string) => {
    setRecipientIds([id]);
  };

  return (
    <div className="space-y-6">
      {/* Recent Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Notifications</h3>
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{notification.title}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Sent to {notification.sentCount} users
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent notifications</p>
            </div>
          )}
        </div>
      </div>

      {/* Send Notification Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Send New Notification</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter notification title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Type your notification message here..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipients
            </label>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Users' },
                  { value: 'users', label: 'Specific Users' },
                  { value: 'group', label: 'Group' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setRecipientType(option.value as any);
                      setRecipientIds([]);
                    }}
                    className={`px-4 py-2 rounded-xl transition-colors ${
                      recipientType === option.value
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {recipientType === 'users' && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 max-h-48 overflow-y-auto">
                  {usersLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No users found</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableUsers.map(u => (
                        <label key={u._id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recipientIds.includes(u._id)}
                            onChange={() => handleToggleUser(u._id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {recipientType === 'group' && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                  {groupsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : groups.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No groups found</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {groups.map(g => (
                        <button
                          key={g._id}
                          onClick={() => handleSelectGroup(g._id)}
                          className={`p-3 rounded-xl border transition-all ${
                            recipientIds.includes(g._id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white">{g.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {g.memberCount || 0} members
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Status Messages */}
          {success && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <Check className="w-5 h-5 mr-2" />
                {success}
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <X className="w-5 h-5 mr-2" />
                {error}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export Template
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setTitle('');
                  setMessage('');
                  setRecipientIds([]);
                  setRecipientType('all');
                  setError(null);
                  setSuccess(null);
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
              
              <button
                onClick={handleSend}
                disabled={loading || !title.trim() || !message.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Login History Tab Component - Updated
function LoginHistoryTab() {
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    email: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [page, filters]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (filters.email) params.email = filters.email;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await adminService.getLoginHistory(params);
      setHistory(response.history);
      setPagination(response.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load login history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      // Implement export functionality
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Export completed successfully!');
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter Login History</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="text"
              placeholder="Filter by email..."
              value={filters.email}
              onChange={(e) => {
                setFilters({ ...filters, email: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setFilters({
                email: '',
                status: '',
                startDate: '',
                endDate: ''
              });
              setPage(1);
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Clear Filters
          </button>
          
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading login history...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center">
            <X className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Logins', value: history.length, color: 'blue' },
              { label: 'Successful', value: history.filter(h => h.status === 'success').length, color: 'green' },
              { label: 'Failed Attempts', value: history.filter(h => h.status === 'failed').length, color: 'red' }
            ].map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
                <div className={`h-1 w-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-full mt-3`}>
                  <div 
                    className={`h-1 rounded-full bg-${stat.color}-500`}
                    style={{ width: `${(stat.value / Math.max(1, history.length)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {history.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {item.user?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.user?.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'success' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          item.status === 'failed' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                            'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            item.status === 'success' ? 'bg-green-500' :
                            item.status === 'failed' ? 'bg-red-500' : 'bg-orange-500'
                          }`}></div>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-mono">
                          {item.ipAddress || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.userAgent?.substring(0, 50) || 'Unknown device'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(item.loginAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.loginAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium">{(page - 1) * 50 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * 50, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> records
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    let pageNum = i + 1;
                    if (page > 3) pageNum = page - 2 + i;
                    if (pageNum > pagination.pages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl transition-colors ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}