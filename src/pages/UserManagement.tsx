import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  Search,
  Plus,
  ShieldCheck,
  UserPlus,
  Shield,
  Trash2,
  Edit,
  Loader2,
  Key,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import api from '../services/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [userForm, setUserForm] = useState({
    username: '',
    role: 'staff',
    password: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch {
      toast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setUserForm({ username: '', role: 'staff', password: '' });
    setIsDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setUserForm({ username: user.username, role: user.role, password: '' });
    setIsDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      setSaving(true);
      if (editingUser) {
        const payload: { username: string; role: string; password?: string } = {
          username: userForm.username,
          role: userForm.role,
        };
        if (userForm.password) payload.password = userForm.password;
        await api.patch(`/users/${editingUser.id}`, payload);
        toast('User updated', 'success');
      } else {
        await api.post('/auth/register', userForm);
        toast('User created', 'success');
      }
      setIsDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Remove "${user.username}" from the team? They will no longer be able to log in.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast('User removed', 'info');
      fetchUsers();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Could not delete user', 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-9 text-amber-500 animate-spin" />
        <p className="text-zinc-400 dark:text-zinc-500 font-bold text-xs uppercase tracking-wider">Syncing Staff Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-955 shrink-0 shadow-md shadow-amber-500/10">
            <UsersIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">Team Directory</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Add, edit, and remove staff accounts</p>
          </div>
        </div>
        <Button 
          onClick={openCreate}
          className="rounded-xl h-11 px-5 bg-amber-500 text-zinc-950 hover:bg-amber-400 border-none font-bold shadow-sm cursor-pointer transition-all active:scale-[0.98] shrink-0"
        >
          <UserPlus size={18} className="mr-1.5" />
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Administrators</CardTitle>
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/10">
              <ShieldCheck size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Managers</CardTitle>
            <div className="p-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg border border-cyan-500/10">
              <Shield size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {users.filter(u => u.role === 'manager').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 dark:bg-zinc-950 text-white rounded-2xl shadow-sm border border-zinc-850 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Staff</CardTitle>
            <div className="p-2 bg-white/10 text-white rounded-lg border border-white/5">
              <Users size={16} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-amber-500">
              {users.filter(u => u.role === 'staff').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <Input
              placeholder="Search by name..."
              className="pl-9 h-10 bg-zinc-50/50 dark:bg-zinc-955/20 border-zinc-200 dark:border-zinc-800 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="w-fit rounded-lg border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1">
            {filteredUsers.length} members
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-955/20 border-b border-zinc-155 dark:border-zinc-800/50">
                <TableRow className="border-zinc-155 dark:border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="py-4 pl-6 font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">Name</TableHead>
                  <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider text-center">Role</TableHead>
                  <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider text-center hidden md:table-cell">Joined</TableHead>
                  <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 border-zinc-150 dark:border-zinc-800/50 transition-colors">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-955 text-zinc-400 font-bold uppercase text-xs">
                            {user.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        className={cn(
                          'rounded-lg px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border-none shadow-xs',
                          user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                          user.role === 'manager' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' :
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        )}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <span className="font-semibold text-xs text-zinc-500 tracking-tight">
                        {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 cursor-pointer"
                          onClick={() => openEdit(user)}
                          title="Edit user"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl w-full">
          <div className="bg-zinc-900 dark:bg-zinc-950 p-6 text-white relative overflow-hidden border-b border-zinc-800">
             <DialogHeader className="p-0 relative z-10 space-y-1">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3 border border-white/10 text-amber-500">
                  {editingUser ? <Edit size={20} /> : <UserPlus size={20} />}
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {editingUser ? 'Edit Team Member' : 'Add Team Member'}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs font-semibold">
                  {editingUser ? 'Update name, role, or reset password' : 'Create login credentials for a new staff member'}
                </DialogDescription>
              </DialogHeader>
          </div>
          
          <div className="p-6 space-y-5 bg-white dark:bg-zinc-900">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider ml-0.5">Username</label>
                <div className="relative">
                   <UsersIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                   <Input 
                    placeholder="e.g. Alok Sharma" 
                    value={userForm.username} 
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })} 
                    className="h-11 pl-10 font-semibold bg-zinc-50/50 dark:bg-zinc-955/20 rounded-xl" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-555 uppercase tracking-wider ml-0.5">
                  {editingUser ? 'New password (leave blank to keep current)' : 'Password'}
                </label>
                <div className="relative">
                   <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                   <Input 
                    type="password"
                    placeholder="••••••••" 
                    value={userForm.password} 
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })} 
                    className="h-11 pl-10 font-semibold bg-zinc-50/50 dark:bg-zinc-955/20 rounded-xl" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider ml-0.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['admin', 'manager', 'staff'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserForm({ ...userForm, role })}
                      className={cn(
                        "h-10 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer",
                        userForm.role === role 
                        ? 'bg-amber-500 border-amber-500 text-zinc-955 font-black shadow-sm' 
                        : 'bg-zinc-50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300'
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button 
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 h-11 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveUser} 
                disabled={saving || !userForm.username || (!editingUser && !userForm.password)} 
                className="flex-1 h-11 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl border-none cursor-pointer"
              >
                {saving ? <Loader2 className="animate-spin size-4" /> : editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
