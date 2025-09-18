import Head from 'next/head';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Layout from '../../../components/Layout';
import { ROLES, PERMISSIONS, RBACManager, Role, Permission } from '../../../lib/rbac';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface RoleAssignment {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  lastLogin?: string;
  isActive: boolean;
}

export default function RolesAndPermissions() {
  const [selectedTab, setSelectedTab] = useState<'roles' | 'permissions' | 'assignments'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const { data: assignmentsData } = useSWR('/api/admin/system/role-assignments', fetcher);

  // Mock role assignments data
  const mockAssignments: RoleAssignment[] = [
    {
      userId: 'user-001',
      username: 'admin',
      email: 'admin@halobuzz.com',
      roles: ['super-admin'],
      lastLogin: new Date(Date.now() - 3600000).toISOString(),
      isActive: true
    },
    {
      userId: 'user-002',
      username: 'john_moderator',
      email: 'john@halobuzz.com',
      roles: ['moderator'],
      lastLogin: new Date(Date.now() - 7200000).toISOString(),
      isActive: true
    },
    {
      userId: 'user-003',
      username: 'sarah_support',
      email: 'sarah@halobuzz.com',
      roles: ['support'],
      lastLogin: new Date(Date.now() - 14400000).toISOString(),
      isActive: true
    },
    {
      userId: 'user-004',
      username: 'mike_analyst',
      email: 'mike@halobuzz.com',
      roles: ['viewer'],
      lastLogin: new Date(Date.now() - 28800000).toISOString(),
      isActive: false
    }
  ];

  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: [],
    level: 1
  });

  const handleCreateRole = () => {
    console.log('Creating role:', newRole);
    setIsCreatingRole(false);
    setNewRole({ name: '', description: '', permissions: [], level: 1 });
  };

  const handleDeleteRole = (roleId: string) => {
    if (ROLES[roleId]?.isSystemRole) {
      alert('Cannot delete system roles');
      return;
    }
    console.log('Deleting role:', roleId);
  };

  const togglePermission = (permissionId: string) => {
    const currentPermissions = newRole.permissions || [];
    const hasPermission = currentPermissions.includes(permissionId);

    setNewRole({
      ...newRole,
      permissions: hasPermission
        ? currentPermissions.filter(p => p !== permissionId)
        : [...currentPermissions, permissionId]
    });
  };

  const getRoleLevel = (roleId: string): string => {
    const role = ROLES[roleId];
    if (!role) return 'Unknown';

    if (role.level >= 90) return 'Critical';
    if (role.level >= 70) return 'High';
    if (role.level >= 50) return 'Medium';
    if (role.level >= 30) return 'Low';
    return 'Basic';
  };

  const getRoleLevelColor = (level: string): string => {
    switch (level) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      case 'Basic': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Group permissions by resource
  const groupedPermissions = Object.values(PERMISSIONS).reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Layout title="Roles & Permissions">
      <Head>
        <title>Roles & Permissions - HaloBuzz Admin</title>
      </Head>

      {/* Header */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-600 mt-1">Manage user roles and access control</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setIsCreatingRole(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Role
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'roles', name: 'Roles', icon: ShieldCheckIcon },
              { id: 'permissions', name: 'Permissions', icon: KeyIcon },
              { id: 'assignments', name: 'User Assignments', icon: UserGroupIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Roles Tab */}
      {selectedTab === 'roles' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Roles</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {Object.values(ROLES).map((role) => (
              <div key={role.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{role.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleLevelColor(getRoleLevel(role.id))}`}>
                        {getRoleLevel(role.id)}
                      </span>
                      {role.isSystemRole && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          System Role
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{role.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Level: {role.level}</span>
                      <span>Permissions: {role.permissions.length}</span>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {selectedRole === role.id ? 'Hide' : 'View'} Permissions
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditingRole(true)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {!role.isSystemRole && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permission Details */}
                {selectedRole === role.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Assigned Permissions</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {role.permissions.map((permissionId) => {
                        const permission = PERMISSIONS[permissionId];
                        return permission ? (
                          <div key={permissionId} className="flex items-center space-x-2 text-sm">
                            <CheckIcon className="h-3 w-3 text-green-500" />
                            <span className="text-gray-700">{permission.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {selectedTab === 'permissions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Available Permissions</h3>
          </div>
          <div className="p-6">
            {Object.entries(groupedPermissions).map(([resource, permissions]) => (
              <div key={resource} className="mb-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                  {resource} Permissions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{permission.name}</h5>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {permission.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{permission.description}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Resource: {permission.resource} | Action: {permission.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Assignments Tab */}
      {selectedTab === 'assignments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Role Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockAssignments.map((assignment) => (
                  <tr key={assignment.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{assignment.username}</div>
                        <div className="text-sm text-gray-500">{assignment.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {assignment.roles.map((roleId) => {
                          const role = ROLES[roleId];
                          return role ? (
                            <span
                              key={roleId}
                              className={`px-2 py-1 text-xs rounded-full ${getRoleLevelColor(getRoleLevel(roleId))}`}
                            >
                              {role.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        assignment.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.lastLogin
                        ? new Date(assignment.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        Edit Roles
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Remove Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {isCreatingRole && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Role</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter role name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Level
                  </label>
                  <input
                    type="number"
                    value={newRole.level}
                    onChange={(e) => setNewRole({ ...newRole, level: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Permissions
                </label>
                {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                  <div key={resource} className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                      {resource} Permissions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <label key={permission.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newRole.permissions?.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsCreatingRole(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}