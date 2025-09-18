import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRBAC, RBACManager } from '../lib/rbac';
import { useAuth } from '../context/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  CpuChipIcon,
  ChartBarIcon,
  BellIcon,
  CogIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ShieldCheckIcon,
  GiftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  CommandLineIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: number | string;
  children?: NavigationItem[];
  requiredPermission?: string;
  requiredRole?: string;
  minLevel?: number;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, requiredPermission: 'admin.view' },
  {
    name: 'User Management',
    href: '/dashboard/users',
    icon: UsersIcon,
    requiredPermission: 'users.view',
    children: [
      { name: 'All Users', href: '/dashboard/users', icon: UsersIcon, requiredPermission: 'users.view' },
      { name: 'Moderators', href: '/dashboard/users/moderators', icon: ShieldCheckIcon, requiredPermission: 'admin.manage' },
      { name: 'Banned Users', href: '/dashboard/users/banned', icon: ExclamationTriangleIcon, requiredPermission: 'users.ban' },
      { name: 'KYC Pending', href: '/dashboard/users/kyc-pending', icon: DocumentChartBarIcon, badge: 'NEW', requiredPermission: 'users.view' },
    ]
  },
  {
    name: 'Content & Streams',
    href: '/dashboard/content',
    icon: EyeIcon,
    requiredPermission: 'content.view',
    children: [
      { name: 'Live Streams', href: '/dashboard/content/streams', icon: EyeIcon, requiredPermission: 'content.view' },
      { name: 'Reports & Violations', href: '/dashboard/content/reports', icon: ExclamationTriangleIcon, badge: 5, requiredPermission: 'content.moderate' },
      { name: 'Content Moderation', href: '/dashboard/content/moderation', icon: ShieldCheckIcon, requiredPermission: 'content.moderate' },
    ]
  },
  {
    name: 'Promotions & Marketing',
    href: '/dashboard/promotions',
    icon: MegaphoneIcon,
    requiredPermission: 'promotions.view',
    children: [
      { name: 'Active Campaigns', href: '/dashboard/promotions/campaigns', icon: MegaphoneIcon, requiredPermission: 'promotions.view' },
      { name: 'Festivals', href: '/dashboard/festivals', icon: CalendarIcon, requiredPermission: 'promotions.manage' },
      { name: 'Gift Management', href: '/dashboard/gifts', icon: GiftIcon, requiredPermission: 'promotions.manage' },
      { name: 'Pricing & Coins', href: '/dashboard/pricing', icon: CurrencyDollarIcon, requiredPermission: 'financial.view' },
    ]
  },
  {
    name: 'Analytics & Insights',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    requiredPermission: 'analytics.view',
    children: [
      { name: 'User Behavior', href: '/dashboard/analytics/behavior', icon: ChartBarIcon, requiredPermission: 'analytics.view' },
      { name: 'Performance Metrics', href: '/dashboard/analytics/performance', icon: DocumentChartBarIcon, requiredPermission: 'analytics.view' },
      { name: 'Revenue Analytics', href: '/dashboard/analytics/revenue', icon: CurrencyDollarIcon, requiredPermission: 'financial.view' },
      { name: 'Heatmaps', href: '/dashboard/analytics/heatmaps', icon: EyeIcon, requiredPermission: 'analytics.view' },
    ]
  },
  {
    name: 'AI Intelligence',
    href: '/dashboard/unified-intelligence',
    icon: CpuChipIcon,
    requiredPermission: 'ai.view',
    children: [
      { name: 'AI Dashboard', href: '/dashboard/unified-intelligence', icon: CpuChipIcon, requiredPermission: 'ai.view' },
      { name: 'AI Performance', href: '/dashboard/ai/performance', icon: ChartBarIcon, requiredPermission: 'ai.view' },
      { name: 'Knowledge Base', href: '/dashboard/ai/knowledge', icon: DocumentChartBarIcon, requiredPermission: 'ai.view' },
      { name: 'AI Logs', href: '/dashboard/ai/logs', icon: CommandLineIcon, requiredPermission: 'ai.configure' },
    ]
  },
  {
    name: 'System Health',
    href: '/dashboard/system',
    icon: BellIcon,
    requiredPermission: 'system.view',
    children: [
      { name: 'Alerts & Monitoring', href: '/dashboard/system/alerts', icon: BellIcon, badge: 2, requiredPermission: 'system.view' },
      { name: 'System Status', href: '/dashboard/system/status', icon: CogIcon, requiredPermission: 'system.view' },
      { name: 'Problem Detection', href: '/dashboard/system/problems', icon: ExclamationTriangleIcon, requiredPermission: 'system.view' },
      { name: 'Roles & Permissions', href: '/dashboard/system/roles', icon: KeyIcon, requiredPermission: 'admin.manage' },
    ]
  },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CurrencyDollarIcon, requiredPermission: 'financial.view' },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon, minLevel: 50 },
];

export default function Layout({ children, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  // Get user roles and RBAC
  const userRoles = user?.roles || [];
  const rbac = useRBAC(userRoles);

  // Filter navigation based on user permissions
  const filteredNavigation = RBACManager.filterMenuItems(navigation, userRoles);

  // Show loading if auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isCurrentPath = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <Sidebar navigation={filteredNavigation} expandedItems={expandedItems} toggleExpanded={toggleExpanded} isCurrentPath={isCurrentPath} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <Sidebar navigation={filteredNavigation} expandedItems={expandedItems} toggleExpanded={toggleExpanded} isCurrentPath={isCurrentPath} />
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {title || 'HaloBuzz Admin'}
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>

              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

              <div className="flex items-center gap-x-4">
                <span className="text-sm font-semibold leading-6 text-gray-900">
                  {userRoles.includes('super-admin') ? 'Super Admin' :
                   userRoles.includes('admin') ? 'Admin' :
                   userRoles.includes('moderator') ? 'Moderator' :
                   userRoles.includes('support') ? 'Support Agent' : 'User'}
                </span>
                <div className="text-xs text-gray-500">
                  Level {rbac.userLevel}
                </div>
                <form method="post" action="/api/logout">
                  <button className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ navigation, expandedItems, toggleExpanded, isCurrentPath }: {
  navigation: NavigationItem[];
  expandedItems: string[];
  toggleExpanded: (itemName: string) => void;
  isCurrentPath: (href: string) => boolean;
}) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-xl font-bold text-white">HaloBuzz Admin</h1>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  {!item.children ? (
                    <Link
                      href={item.href}
                      className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                        isCurrentPath(item.href)
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-red-600 px-2.5 py-0.5 text-center text-xs font-medium text-white ring-1 ring-inset ring-red-500">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`group flex w-full gap-x-3 rounded-md p-2 text-left text-sm leading-6 font-semibold ${
                          isCurrentPath(item.href)
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                        {item.badge && (
                          <span className="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-red-600 px-2.5 py-0.5 text-center text-xs font-medium text-white ring-1 ring-inset ring-red-500">
                            {item.badge}
                          </span>
                        )}
                      </button>
                      {expandedItems.includes(item.name) && (
                        <ul className="mt-1 px-2">
                          {item.children.map((subItem) => (
                            <li key={subItem.name}>
                              <Link
                                href={subItem.href}
                                className={`group flex gap-x-3 rounded-md py-2 pl-8 pr-2 text-sm leading-6 ${
                                  isCurrentPath(subItem.href)
                                    ? 'bg-gray-800 text-white font-semibold'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                              >
                                <subItem.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {subItem.name}
                                {subItem.badge && (
                                  <span className="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-red-600 px-2.5 py-0.5 text-center text-xs font-medium text-white ring-1 ring-inset ring-red-500">
                                    {subItem.badge}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
}