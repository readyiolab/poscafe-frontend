import React, { useState, useEffect, Suspense } from 'react';
import {
  Bell,
  LogOut,
  User,
  Circle,
} from 'lucide-react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import PageLoader from '@/components/PageLoader';
import api from '@/services/api';
import { cn } from '@/lib/utils';


function getDisplayName(user: { username?: string; name?: string } | null) {
  if (!user) return 'Staff';
  return user.username || user.name || 'Staff';
}

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-end mr-2 bg-muted/30 px-3 py-1 rounded-lg border border-border/50">
      <span className="text-[13px] font-bold tracking-tight tabular-nums">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </span>
      <span className="text-[9px] font-medium text-muted-foreground uppercase">
        {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
    </div>
  );
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Take Order',
  '/menu-management': 'Menu',
  '/inventory': 'Stock',
  '/offers': 'Offers',
  '/tables': 'Tables',
  '/kitchen': 'Kitchen',
  '/transactions': 'Sales',
  '/analytics': 'Reports',
  '/users': 'Staff',
};

const DashboardLayout = () => {
  const [user, setUser] = useState<{ username?: string; name?: string; role?: string } | null>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isPOS = location.pathname === '/pos';
  const displayName = getDisplayName(user);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await api.get('/inventory/low-stock');
        setLowStockItems(res.data.data || []);
      } catch {
        /* ignore */
      }
    };
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background font-sans antialiased">
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <header
            className={cn(
              'flex h-14 shrink-0 items-center justify-between border-b px-4 bg-background/95 backdrop-blur-xl sticky top-0 z-20',
              isPOS && 'md:h-12'
            )}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-amber-500/10 hover:text-amber-600 dark:hover:bg-zinc-800 dark:hover:text-amber-500" />
              <div className="h-5 w-px bg-border/60 hidden sm:block" />
              <div>
                <h1 className="text-sm font-bold text-foreground">
                  {PAGE_TITLES[location.pathname] || 'Cafe POS'}
                </h1>
                {!isPOS && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    Cafe POS <Circle className="size-1 fill-muted-foreground/30 text-transparent" /> {displayName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LiveClock />

              {!isPOS && lowStockItems.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-10 w-10 rounded-xl"
                  onClick={() => navigate('/inventory')}
                  title="Low stock alert"
                >
                  <Bell className="size-5" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {lowStockItems.length}
                  </span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 px-2 rounded-xl">
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-xs font-bold leading-tight">{displayName}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{user?.role || 'staff'}</span>
                    </div>
                    <Avatar className="h-8 w-8 rounded-lg border-2 border-amber-200">
                      <AvatarFallback className="bg-amber-600 text-white text-[11px] font-bold rounded-lg uppercase">
                        {displayName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-2xl p-2" align="end">
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <p className="text-sm font-bold">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role} account</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main
            className={cn(
              'flex-1 overflow-y-auto',
              isPOS
                ? 'bg-zinc-50 dark:bg-zinc-950 p-0'
                : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/20 via-background to-background'
            )}
          >
            <div
              className={cn(
                'mx-auto w-full animate-in fade-in duration-300',
                isPOS ? 'max-w-none h-full' : 'max-w-[1800px] p-4 sm:p-5 md:p-6 lg:p-8'
              )}
            >
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
