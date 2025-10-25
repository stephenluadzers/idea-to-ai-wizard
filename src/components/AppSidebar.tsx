import { NavLink } from "react-router-dom";
import { 
  BookOpen, 
  Library, 
  LayoutTemplate, 
  BarChart3, 
  Database, 
  GitBranch, 
  TestTube, 
  Sparkles,
  MessageSquare 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";

const navItems = [
  { title: "Prompt Designer", url: "/", icon: Sparkles },
  { title: "Master Prompts", url: "/master-prompts", icon: BookOpen },
  { title: "Library", url: "/library", icon: Library },
  { title: "Chat History", url: "/history", icon: MessageSquare },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Knowledge Base", url: "/knowledge", icon: Database },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
  { title: "Testing Sandbox", url: "/sandbox", icon: TestTube },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <BookOpen className="h-4 w-4" />
            {!isCollapsed && <span>Prompt Engineering</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
