'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, type User } from '@/lib/api/services';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Ban, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersAPI.getAll({ page, limit: 20, search }).then(res => res.data),
  });

  const getKYCBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const getTrustBadge = (level: string) => {
    switch (level) {
      case 'verified':
        return <Badge variant="success">{level}</Badge>;
      case 'high':
        return <Badge className="bg-blue-500 text-white">{level}</Badge>;
      case 'medium':
        return <Badge variant="warning">{level}</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users & Creators</h1>
        <p className="text-muted-foreground">Manage user accounts and creators</p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Trust</TableHead>
              <TableHead>Coins</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Loading users...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data && data.data.length > 0 ? (
              data.data.map((user: User) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{user.username}</div>
                        {user.displayName && (
                          <div className="text-xs text-muted-foreground">
                            {user.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.country}</Badge>
                  </TableCell>
                  <TableCell>{getKYCBadge(user.kycStatus)}</TableCell>
                  <TableCell>{getTrustBadge(user.trust.level)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {user.coins.balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.followers.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {user.isBanned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : user.isVerified ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!user.isBanned && (
                        <Button size="sm" variant="outline">
                          <Ban className="h-3 w-3 mr-1" />
                          Ban
                        </Button>
                      )}
                      {user.kycStatus === 'pending' && (
                        <>
                          <Button size="sm" variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Page {data.page} of {data.pages} • {data.total} total users
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
        <p className="font-medium">Connected to Backend API</p>
        <p className="text-muted-foreground">
          Fetching real user data from {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}
        </p>
      </div>
    </div>
  );
}
