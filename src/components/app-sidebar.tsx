import * as React from "react"
import {
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  Utensils,
  Receipt,
  Zap,
  BarChart3,
  Users,
  Monitor,
  ChefHat,
  LayoutGrid,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "staff"] },
  { title: "Take Order", url: "/pos", icon: Monitor, roles: ["admin", "manager", "staff"] },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat, roles: ["admin", "manager", "staff"] },
  { title: "Menu", url: "/menu-management", icon: MenuIcon, roles: ["admin", "manager"] },
  { title: "Stock", url: "/inventory", icon: Package, roles: ["admin", "manager"] },
  { title: "Offers", url: "/offers", icon: Zap, roles: ["admin", "manager"] },
  { title: "Tables", url: "/tables", icon: LayoutGrid, roles: ["admin", "manager"] },
  { title: "Sales", url: "/transactions", icon: Receipt, roles: ["admin", "manager"] },
  { title: "Staff", url: "/users", icon: Users, roles: ["admin"] },
  { title: "Reports", url: "/analytics", icon: BarChart3, roles: ["admin", "manager"] },
]

function getUserRole(): string {
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return "staff"
    return JSON.parse(raw).role || "staff"
  } catch {
    return "staff"
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const role = getUserRole()
  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar/50 backdrop-blur-xl" {...props}>
      <SidebarHeader className="h-16 border-b flex items-center bg-background/50">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
            <Utensils className="size-5" />
          </div>
          <div className="flex flex-col gap-0 overflow-hidden group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 transition-all">
            <span className="font-extrabold text-sm tracking-tight truncate">Cafe POS</span>
            <span className="text-[10px] text-muted-foreground font-medium">Easy Billing System</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4 px-2">
        <SidebarMenu className="gap-1">
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={location.pathname === item.url}
                className={cn(
                  "h-11 px-3 rounded-xl",
                  location.pathname === item.url
                    ? "bg-amber-600 text-white hover:bg-amber-600 hover:text-white shadow-md"
                    : "hover:bg-amber-500/10 dark:hover:bg-zinc-850/50 text-muted-foreground hover:text-foreground dark:hover:text-zinc-200"
                )}
              >
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className="size-5" />
                  <span className="font-semibold text-sm">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
