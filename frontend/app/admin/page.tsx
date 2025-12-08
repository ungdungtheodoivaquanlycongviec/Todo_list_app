'use client';

import { useState, useEffect } from 'react';
import { adminService, AdminUser, LoginHistory, DashboardStats } from '../services/admin.service';
import { useAuth } from '../contexts/AuthContext';
import ChatbotWidget from '../components/common/ChatbotWidget';
import { groupService } from '../services/group.service';
import { Group } from '../services/types/group.types';

type Tab = 'dashboard' | 'users' | 'notifications' | 'login-history';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Please login to access admin panel</p>
        </div>
      </div>
    );
  }

  if (!['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <div className="text-sm text-gray-600">
                Logged in as: <span className="font-semibold">{user.name}</span> ({user.role})
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard' as Tab, label: 'Dashboard' },
                { id: 'users' as Tab, label: 'Users' },
                { id: 'notifications' as Tab, label: 'Notifications' },
                { id: 'login-history' as Tab, label: 'Login History' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
            {activeTab === 'users' && <UsersTab isSuperAdmin={user.role === 'super_admin'} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'login-history' && <LoginHistoryTab />}
          </div>
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats }: { stats: DashboardStats | null }) {
  if (!stats) {
    return <div className="text-center py-8">No statistics available</div>;
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'blue' },
    { label: 'Active Users', value: stats.activeUsers, color: 'green' },
    { label: 'Inactive Users', value: stats.inactiveUsers, color: 'red' },
    { label: 'Admins', value: stats.totalAdmins, color: 'purple' },
    { label: 'Groups', value: stats.totalGroups, color: 'indigo' },
    { label: 'Recent Logins (24h)', value: stats.recentLogins, color: 'yellow' },
    { label: 'Recent Actions (24h)', value: stats.recentActions, color: 'pink' }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className={`text-${stat.color}-600 text-sm font-medium mb-2`}>
              {stat.label}
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleLockUnlock(user._id, !user.isActive)}
                        className={`${
                          user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {user.isActive ? 'Lock' : 'Unlock'}
                      </button>
                      {isSuperAdmin && user.role !== 'super_admin' && (
                        <>
                          {user.role !== 'admin' ? (
                            <button
                              onClick={() => handleRoleChange(user._id, 'assign')}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Make Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(user._id, 'remove')}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              Remove Admin
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex justify-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal - Simplified version */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Create User'}
            </h3>
            <p className="text-gray-600 mb-4">
              Create/Edit user functionality requires full form implementation.
            </p>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingUser(null);
              }}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab() {
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

  useEffect(() => {
    const loadOptions = async () => {
      // Load users list
      try {
        setUsersLoading(true);
        const data = await adminService.getUsers({ page: 1, limit: 50 });
        setAvailableUsers(data.users || []);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setUsersLoading(false);
      }

      // Load groups list
      try {
        setGroupsLoading(true);
        const res = await groupService.getAllGroups();
        const allGroups = [...(res.myGroups || []), ...(res.sharedGroups || [])];
        setGroups(allGroups);
      } catch (err) {
        console.error('Failed to load groups', err);
      } finally {
        setGroupsLoading(false);
      }
    };

    loadOptions();
  }, []);

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Send Notification</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Notification message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <select
              value={recipientType}
            onChange={(e) => {
              setRecipientType(e.target.value as any);
              setRecipientIds([]);
            }}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Users</option>
              <option value="users">Specific Users</option>
              <option value="group">Group</option>
            </select>
            {recipientType === 'users' && (
              <div className="mt-3 border border-gray-200 rounded p-3 max-h-64 overflow-y-auto space-y-2">
                {usersLoading ? (
                  <p className="text-sm text-gray-500">Loading users...</p>
                ) : availableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No users found.</p>
                ) : (
                  availableUsers.map(u => (
                    <label key={u._id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={recipientIds.includes(u._id)}
                        onChange={() => handleToggleUser(u._id)}
                        className="rounded border-gray-300"
                      />
                      <span>{u.name} ({u.email})</span>
                    </label>
                  ))
                )}
              </div>
            )}
            {recipientType === 'group' && (
              <div className="mt-3 border border-gray-200 rounded p-3 max-h-64 overflow-y-auto space-y-2">
                {groupsLoading ? (
                  <p className="text-sm text-gray-500">Loading groups...</p>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-gray-500">No groups found.</p>
                ) : (
                  groups.map(g => (
                    <label key={g._id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="radio"
                        name="groupRecipient"
                        checked={recipientIds.includes(g._id)}
                        onChange={() => handleSelectGroup(g._id)}
                        className="rounded border-gray-300"
                      />
                      <span>{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={loading || !title.trim() || !message.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Login History Tab Component
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Login History</h2>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Filter by email..."
            value={filters.email}
            onChange={(e) => {
              setFilters({ ...filters, email: e.target.value });
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => {
              setFilters({ ...filters, startDate: e.target.value });
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => {
              setFilters({ ...filters, endDate: e.target.value });
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="End Date"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading login history...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Login Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.user?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'success' ? 'bg-green-100 text-green-800' :
                        item.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.loginAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex justify-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

