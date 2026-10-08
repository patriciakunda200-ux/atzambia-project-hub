'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  progress: number;
  dueDate: string | null;
  createdAt: string;
  attachments?: string[];
}

interface Task {
  id: number;
  projectId: number;
  title: string;
  assignee: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  attachment?: string | null;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  capacity: number; // in percentage
}

export interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'pm' | 'member' | 'viewer';
  roleTitle: string;
  avatar: string;
}

export interface WorkspaceConfig {
  name: string;
  slug: string;
  industry: string;
  primaryColor: string;
  onboarded: boolean;
}

export const DEMO_USERS: UserAccount[] = [
  { id: 1, name: 'Jonathan K.', email: 'jonathan@avensus.com', role: 'admin', roleTitle: 'Workspace Admin', avatar: 'JK' },
  { id: 2, name: 'Mangaliso M.', email: 'mangaliso@avensus.com', role: 'pm', roleTitle: 'Project Manager', avatar: 'MM' },
  { id: 3, name: 'Chanda N.', email: 'chanda@avensus.com', role: 'member', roleTitle: 'UI/UX Designer', avatar: 'CN' },
  { id: 4, name: 'Client Guest', email: 'guest@client.com', role: 'viewer', roleTitle: 'Client Viewer', avatar: 'CG' },
];

export interface ActivityLog {
  id: string;
  user: string;
  avatar: string;
  action: string;
  detail: string;
  time: string;
}

export interface AppNotification {
  id: number;
  user_email: string;
  title: string;
  message: string;
  type: 'assignment' | 'status' | 'overdue' | 'system';
  read: number;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assignee: string;
  createdBy: string;
  projectId?: number | null;
  dueDate?: string | null;
  createdAt?: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceConfig>({
    name: 'Avensus Project Hub',
    slug: 'avensus-hub',
    industry: 'Software & Technology',
    primaryColor: '#0d9488',
    onboarded: true,
  });
  const [showWizard, setShowWizard] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [active, setActive] = useState('Overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Advanced Multi-Filter States ---
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [adminTaskFilter, setAdminTaskFilter] = useState<'all' | 'mine'>('all');

  // --- Work Order Tickets State ---
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('Infrastructure');
  const [newTicketPriority, setNewTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTicketAssignee, setNewTicketAssignee] = useState('');
  const [newTicketProjId, setNewTicketProjId] = useState<number | null>(null);
  const [newTicketDueDate, setNewTicketDueDate] = useState('');

  // --- Automated Notifications & Webhooks State ---
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

  // --- Activity Log Audit Stream ---
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    { id: '1', user: 'Mangaliso M.', avatar: 'MM', action: 'completed API integration', detail: 'Fleet Manager v2', time: '18 min ago' },
    { id: '2', user: 'Chanda N.', avatar: 'CN', action: 'added a new UI mock', detail: 'Broadleaf Mobile App', time: '42 min ago' },
    { id: '3', user: 'Brian T.', avatar: 'BT', action: 'moved bug ticket to Review', detail: 'Client Portal Rollout', time: '1 hr ago' },
  ]);

  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  
  // Selected Project for Drill-down View
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // --- Modals State ---
  const [showProjModal, setShowProjModal] = useState(false);
  const [showEditProjModal, setShowEditProjModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);

  // --- Form States: Create ---
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjDueDate, setNewProjDueDate] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProjId, setNewTaskProjId] = useState<number>(0);
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAttachment, setNewTaskAttachment] = useState('');

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('');
  const [newTeamCapacity, setNewTeamCapacity] = useState<number>(100);

  // --- Form States: Edit ---
  const [editProjId, setEditProjId] = useState<number>(0);
  const [editProjName, setEditProjName] = useState('');
  const [editProjClient, setEditProjClient] = useState('');
  const [editProjDueDate, setEditProjDueDate] = useState('');
  const [editProjStatus, setEditProjStatus] = useState('active');

  const [editTaskId, setEditTaskId] = useState<number>(0);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskProjId, setEditTaskProjId] = useState<number>(0);
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('todo');
  const [editTaskAttachment, setEditTaskAttachment] = useState('');

  const [editTeamId, setEditTeamId] = useState<number>(0);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamEmail, setEditTeamEmail] = useState('');
  const [editTeamRole, setEditTeamRole] = useState('');
  const [editTeamCapacity, setEditTeamCapacity] = useState<number>(100);

  // Load persistent user session & workspace config
  useEffect(() => {
    Promise.resolve().then(() => {
      const savedUser = localStorage.getItem('hub_user');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
      const savedWs = localStorage.getItem('hub_workspace');
      if (savedWs) {
        try {
          setWorkspace(JSON.parse(savedWs));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const addActivity = (action: string, detail: string) => {
    const newLog: ActivityLog = {
      id: String(activityLogs.length + 1),
      user: currentUser?.name || 'Workspace User',
      avatar: currentUser?.avatar || 'AU',
      action,
      detail,
      time: 'Just now',
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 15)]);
  };

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('hub_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hub_user');
  };

  const handleCompleteWizard = (newWs: WorkspaceConfig) => {
    setWorkspace(newWs);
    localStorage.setItem('hub_workspace', JSON.stringify(newWs));
    setShowWizard(false);
    addActivity('launched new workspace', newWs.name);
  };

  // Permission helper variables based on role
  const isViewer = currentUser?.role === 'viewer';
  const canCreateProject = currentUser?.role === 'admin' || currentUser?.role === 'pm';
  const canEditProject = currentUser?.role === 'admin' || currentUser?.role === 'pm';
  const canDeleteProject = currentUser?.role === 'admin';
  const canCreateTask = currentUser?.role === 'admin' || currentUser?.role === 'pm' || currentUser?.role === 'member';
  const canEditTask = currentUser?.role === 'admin' || currentUser?.role === 'pm' || currentUser?.role === 'member';
  const canDeleteTask = currentUser?.role === 'admin' || currentUser?.role === 'pm';
  const canManageTeam = currentUser?.role === 'admin';

  // Fetch data
  const loadData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const userEmail = currentUser?.email || 'all';
      const [projRes, taskRes, teamRes, notifRes, ticketRes] = await Promise.all([
        fetch(`/api/projects?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/tasks?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/team-members?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/notifications?email=${encodeURIComponent(userEmail)}&t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/tickets?t=${timestamp}`, { cache: 'no-store' }),
      ]);
      if (projRes.ok && taskRes.ok && teamRes.ok) {
        const projData = (await projRes.json()) as Project[];
        const taskData = (await taskRes.json()) as Task[];
        const teamData = (await teamRes.json()) as TeamMember[];
        
        setProjects(projData);
        setTasks(taskData);
        setTeamMembers(teamData);
        if (notifRes.ok) {
          const notifData = (await notifRes.json()) as AppNotification[];
          setNotifications(notifData);
        }
        if (ticketRes.ok) {
          const ticketData = (await ticketRes.json()) as Ticket[];
          setTickets(ticketData);
        }
      }
    } catch (error) {
      console.error('Error loading Project Hub data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const triggerNotification = useCallback(async (
    title: string,
    message: string,
    targetEmail: string = 'all',
    type: 'assignment' | 'status' | 'overdue' | 'system' = 'assignment'
  ) => {
    try {
      const webhook = typeof window !== 'undefined' ? (localStorage.getItem('hub_webhook_url') || '') : '';
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: targetEmail,
          title,
          message,
          type,
          webhookUrl: webhook,
        }),
      });

      if (res.ok) {
        const notif = (await res.json()) as AppNotification;
        setNotifications(prev => [notif, ...prev]);
        setToastMessage({ title, body: message });
        setTimeout(() => {
          setToastMessage(null);
        }, 4500);
      }
    } catch (err) {
      console.error('Failed to trigger notification:', err);
    }
  }, []);

  const handleMarkAllNotifsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAllRead: true,
          userEmail: currentUser?.email || 'all',
        }),
      });
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleTestWebhook = async (webhookUrl: string) => {
    if (!webhookUrl.trim().startsWith('http')) {
      alert('Please enter a valid Webhook URL starting with http:// or https://');
      return;
    }
    localStorage.setItem('hub_webhook_url', webhookUrl.trim());
    await triggerNotification(
      '🔔 Test Webhook Integration Alert',
      `Slack & Microsoft Teams webhook test dispatch from Avensus Project Hub (${workspace.name}) requested by ${currentUser?.name || 'Admin'}.`,
      'all',
      'system'
    );
    alert('Test notification webhook dispatched successfully! Check your Slack or Microsoft Teams channel.');
  };


  useEffect(() => {
    Promise.resolve().then(() => {
      loadData();
    });
  }, [loadData]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
      const isDark = localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setDarkMode(isDark);
    });
  }, []);

  useEffect(() => {
    if (mounted && logoRef.current && logoRef.current.complete) {
      setLogoLoaded(true);
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, mounted]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (projects.length > 0) {
        if (!projects.some(p => p.id === newTaskProjId)) {
          setNewTaskProjId(projects[0].id);
        }
      } else {
        setNewTaskProjId(0);
      }
    });
  }, [projects, newTaskProjId]);

  // Toggle theme helper
  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // --- CSV Export Function ---
  const handleExportCSV = () => {
    if (projects.length === 0) {
      alert('No projects available to export.');
      return;
    }
    const headers = ['Project Name', 'Client', 'Status', 'Progress (%)', 'Due Date', 'Total Tasks', 'Completed Tasks'];
    const rows = projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const doneCount = pTasks.filter(t => t.status === 'done').length;
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.client.replace(/"/g, '""')}"`,
        p.status,
        `${p.progress}%`,
        p.dueDate || 'N/A',
        pTasks.length,
        doneCount,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${workspace.slug}_portfolio_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addActivity('exported CSV portfolio report', `${projects.length} projects`);
  };

  // --- CRUD Project handlers ---
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateProject) {
      alert('Access Restricted: Only Administrators and Project Managers can create projects.');
      return;
    }
    if (!newProjName.trim() || !newProjClient.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName.trim(),
          client: newProjClient.trim(),
          dueDate: newProjDueDate || null,
        }),
      });

      if (res.ok) {
        addActivity('launched new project', newProjName.trim());
        triggerNotification(
          '🚀 New Project Initialized',
          `${currentUser?.name || 'Workspace Admin'} launched new project portfolio "${newProjName.trim()}" for client ${newProjClient.trim()}.`,
          'all',
          'system'
        );
        setNewProjName('');
        setNewProjClient('');
        setNewProjDueDate('');
        setShowProjModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const openEditProject = (proj: Project) => {
    if (!canEditProject) {
      alert('Access Restricted: Only Administrators and Project Managers can edit project parameters.');
      return;
    }
    setEditProjId(proj.id);
    setEditProjName(proj.name);
    setEditProjClient(proj.client);
    setEditProjDueDate(proj.dueDate ? proj.dueDate.substring(0, 10) : '');
    setEditProjStatus(proj.status);
    setShowEditProjModal(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditProject) return;
    if (!editProjName.trim() || !editProjClient.trim()) return;

    setProjects(prev => prev.map(p => p.id === editProjId ? { ...p, name: editProjName.trim(), client: editProjClient.trim(), dueDate: editProjDueDate || null, status: editProjStatus } : p));
    setShowEditProjModal(false);

    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editProjId,
          name: editProjName.trim(),
          client: editProjClient.trim(),
          dueDate: editProjDueDate || null,
          status: editProjStatus,
        }),
      });

      if (res.ok) {
        addActivity('updated project details', editProjName.trim());
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update project:', err);
      await loadData();
    }
  };

  const handleDeleteProject = async (projId: number) => {
    if (!canDeleteProject) {
      alert('Access Restricted: Only Workspace Administrators can delete projects.');
      return;
    }
    const targetProj = projects.find(p => p.id === projId);
    if (!confirm('Are you sure you want to delete this project? This will permanently delete all associated tasks.')) return;
    
    setProjects(prev => prev.filter(p => p.id !== projId));
    setTasks(prev => prev.filter(t => t.projectId !== projId));
    if (selectedProjectId === projId) {
      setSelectedProjectId(null);
    }

    try {
      const res = await fetch(`/api/projects?id=${projId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addActivity('deleted project portfolio', targetProj?.name || 'Project');
        await loadData();
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      await loadData();
    }
  };

  // --- CRUD Task handlers ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateTask) {
      alert('Access Restricted: Read-only accounts cannot add tasks.');
      return;
    }
    if (!newTaskTitle.trim() || !newTaskProjId) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: Number(newTaskProjId),
          title: newTaskTitle.trim(),
          assignee: newTaskAssignee || null,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || null,
        }),
      });

      if (res.ok) {
        addActivity('created new task card', newTaskTitle.trim());
        const assignedMember = teamMembers.find(m => getInitials(m.name) === newTaskAssignee || m.name === newTaskAssignee);
        triggerNotification(
          `📌 New Task Assigned: ${newTaskTitle.trim()}`,
          `${currentUser?.name || 'Workspace Admin'} assigned task "${newTaskTitle.trim()}" to ${newTaskAssignee || 'Unassigned'}.`,
          assignedMember?.email || 'all',
          'assignment'
        );
        setNewTaskTitle('');
        setNewTaskAssignee('');
        setNewTaskPriority('medium');
        setNewTaskDueDate('');
        setNewTaskAttachment('');
        setShowTaskModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const openEditTask = (task: Task) => {
    if (!canEditTask) {
      alert('Access Restricted: Read-only accounts cannot edit tasks.');
      return;
    }
    setEditTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskProjId(task.projectId);
    setEditTaskAssignee(task.assignee || '');
    setEditTaskPriority(task.priority);
    setEditTaskDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
    setEditTaskStatus(task.status);
    setEditTaskAttachment(task.attachment || '');
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTask) return;
    if (!editTaskTitle.trim() || !editTaskProjId) return;

    setTasks(prev => prev.map(t => t.id === editTaskId ? { ...t, title: editTaskTitle.trim(), projectId: Number(editTaskProjId), assignee: editTaskAssignee || null, priority: editTaskPriority, dueDate: editTaskDueDate || null, status: editTaskStatus, attachment: editTaskAttachment || null } : t));
    setShowEditTaskModal(false);

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTaskId,
          title: editTaskTitle.trim(),
          projectId: Number(editTaskProjId),
          assignee: editTaskAssignee || null,
          priority: editTaskPriority,
          dueDate: editTaskDueDate || null,
          status: editTaskStatus,
        }),
      });

      if (res.ok) {
        addActivity('updated task parameters', editTaskTitle.trim());
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      await loadData();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!canDeleteTask) {
      alert('Access Restricted: Only Administrators and Project Managers can delete tasks.');
      return;
    }
    const targetTask = tasks.find(t => t.id === taskId);
    if (!confirm('Are you sure you want to delete this task card?')) return;

    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addActivity('removed task card', targetTask?.title || 'Task');
        await loadData();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      await loadData();
    }
  };

  const handleToggleTaskStatus = async (taskId: number, currentStatus: string) => {
    if (isViewer) {
      alert('Access Restricted: Client Viewers cannot check off tasks.');
      return;
    }
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    const targetTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      addActivity(newStatus === 'done' ? 'marked task completed ✓' : 'reopened task', targetTask?.title || 'Task');
      await loadData();
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      await loadData();
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    if (isViewer) {
      alert('Access Restricted: Client Viewers cannot modify task status.');
      return;
    }
    const targetTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      addActivity(`moved task to ${newStatus.replace('_', ' ')}`, targetTask?.title || 'Task');
      await loadData();
    } catch (err) {
      console.error('Failed to update task status:', err);
      await loadData();
    }
  };

  const handleUpdateProjectStatus = async (projectId: number, newStatus: string) => {
    if (!canEditProject) {
      alert('Access Restricted: Only Administrators and Project Managers can change project status.');
      return;
    }
    const targetProj = projects.find(p => p.id === projectId);
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));

    try {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, status: newStatus }),
      });
      addActivity(`updated project status to ${newStatus}`, targetProj?.name || 'Project');
      await loadData();
    } catch (err) {
      console.error('Failed to update project status:', err);
      await loadData();
    }
  };

  // --- CRUD Team Member handlers ---
  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam) {
      alert('Access Restricted: Only Workspace Administrators can add team members.');
      return;
    }
    if (!newTeamName.trim() || !newTeamEmail.trim() || !newTeamRole.trim()) return;

    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          email: newTeamEmail.trim(),
          role: newTeamRole.trim(),
          capacity: Number(newTeamCapacity),
        }),
      });

      if (res.ok) {
        addActivity('onboarded new team member', newTeamName.trim());
        setNewTeamName('');
        setNewTeamEmail('');
        setNewTeamRole('');
        setNewTeamCapacity(100);
        setShowTeamModal(false);
        await loadData();
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error || 'Failed to create team member');
      }
    } catch (err) {
      console.error('Failed to create team member:', err);
    }
  };

  const openEditTeamMember = (member: TeamMember) => {
    if (!canManageTeam) {
      alert('Access Restricted: Only Workspace Administrators can edit team members.');
      return;
    }
    setEditTeamId(member.id);
    setEditTeamName(member.name);
    setEditTeamEmail(member.email);
    setEditTeamRole(member.role);
    setEditTeamCapacity(member.capacity);
    setShowEditTeamModal(true);
  };

  const handleUpdateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam) return;
    if (!editTeamName.trim() || !editTeamEmail.trim() || !editTeamRole.trim()) return;

    setTeamMembers(prev => prev.map(m => m.id === editTeamId ? { ...m, name: editTeamName.trim(), email: editTeamEmail.trim(), role: editTeamRole.trim(), capacity: Number(editTeamCapacity) } : m));
    setShowEditTeamModal(false);

    try {
      const res = await fetch('/api/team-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTeamId,
          name: editTeamName.trim(),
          email: editTeamEmail.trim(),
          role: editTeamRole.trim(),
          capacity: Number(editTeamCapacity),
        }),
      });

      if (res.ok) {
        addActivity('updated member capacity', editTeamName.trim());
        await loadData();
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error || 'Failed to update team member');
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update team member:', err);
      await loadData();
    }
  };

  const handleDeleteTeamMember = async (memberId: number) => {
    if (!canManageTeam) {
      alert('Access Restricted: Only Workspace Administrators can remove team members.');
      return;
    }
    const targetMember = teamMembers.find(m => m.id === memberId);
    if (!confirm('Are you sure you want to remove this team member? Tasks assigned to them will become unassigned.')) return;
    
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));

    try {
      const res = await fetch(`/api/team-members?id=${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addActivity('removed team member', targetMember?.name || 'Member');
        await loadData();
      }
    } catch (err) {
      console.error('Failed to delete team member:', err);
      await loadData();
    }
  };

  // --- CRUD Work Order Ticket Handlers ---
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDescription.trim() || !newTicketAssignee.trim()) {
      alert('Please fill out ticket title, description, and assigned team member.');
      return;
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTicketTitle.trim(),
          description: newTicketDescription.trim(),
          category: newTicketCategory,
          priority: newTicketPriority,
          assignee: newTicketAssignee.trim(),
          createdBy: currentUser?.name || 'Workspace Admin',
          projectId: newTicketProjId,
          dueDate: newTicketDueDate || null,
        }),
      });

      if (res.ok) {
        const created = (await res.json()) as Ticket;
        addActivity('issued Work Order ticket', `${created.ticketNumber}: ${created.title}`);
        triggerNotification(
          `🎫 Work Order ${created.ticketNumber} Dispatched`,
          `Work Order ticket "${created.title}" (${created.category}) assigned to ${created.assignee} by ${currentUser?.name || 'Admin'}. SLA Target: ${created.dueDate || 'Standard'}.`,
          created.assignee,
          'assignment'
        );
        setNewTicketTitle('');
        setNewTicketDescription('');
        setNewTicketCategory('Infrastructure');
        setNewTicketPriority('medium');
        setNewTicketAssignee('');
        setNewTicketProjId(null);
        setNewTicketDueDate('');
        setShowTicketModal(false);
        await loadData();
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error || 'Failed to create Work Order ticket');
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    const targetTicket = tickets.find(t => t.id === ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: status as Ticket['status'] } : t));

    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status }),
      });

      if (res.ok) {
        if (targetTicket) {
          addActivity('updated Work Order status', `${targetTicket.ticketNumber} -> ${status.toUpperCase()}`);
          triggerNotification(
            `🔄 Work Order ${targetTicket.ticketNumber} Updated`,
            `Work Order "${targetTicket.title}" status changed to ${status.toUpperCase().replace('_', ' ')}.`,
            targetTicket.assignee,
            'status'
          );
        }
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      await loadData();
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!canDeleteTask) {
      alert('Access Restricted: Only Workspace Administrators and PMs can delete Work Orders.');
      return;
    }
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!confirm(`Are you sure you want to delete Work Order ${targetTicket?.ticketNumber || ''}?`)) return;

    setTickets(prev => prev.filter(t => t.id !== ticketId));

    try {
      const res = await fetch(`/api/tickets?id=${ticketId}`, { method: 'DELETE' });
      if (res.ok) {
        addActivity('deleted Work Order ticket', targetTicket?.ticketNumber || `WO-${ticketId}`);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      await loadData();
    }
  };

  // Dynamic calculations and initials
  const getInitials = (nameStr: string) => {
    return nameStr.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const isTaskAssignedToUser = useCallback((t: Task, u: UserAccount | null): boolean => {
    if (!u || !t.assignee) return false;
    const userInitials = u.avatar || getInitials(u.name);
    const assigneeClean = t.assignee.trim().toLowerCase();
    return (
      assigneeClean === userInitials.toLowerCase() ||
      assigneeClean === u.name.trim().toLowerCase() ||
      assigneeClean === u.email.trim().toLowerCase()
    );
  }, []);

  // --- Advanced Multi-Filtering & Search Logic ---
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredTasks = tasks.filter(t => {
    // If logged in user is a Team Member, restrict to tasks assigned to them
    if (currentUser?.role === 'member' && !isTaskAssignedToUser(t, currentUser)) {
      return false;
    }

    const parentProj = projects.find(p => p.id === t.projectId);
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (parentProj && parentProj.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assignee && t.assignee.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAssignee = filterAssignee === 'all' ? true :
      filterAssignee === 'unassigned' ? !t.assignee :
      t.assignee === filterAssignee;
    
    const matchesPriority = filterPriority === 'all' || t.priority.toLowerCase() === filterPriority.toLowerCase();
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

    return matchesSearch && matchesAssignee && matchesPriority && matchesStatus;
  });

  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'pm';
  const userMyTasksOpenCount = isManagerOrAdmin 
    ? tasks.filter(t => t.status !== 'done').length 
    : tasks.filter(t => t.status !== 'done' && isTaskAssignedToUser(t, currentUser)).length;

  // Calculate dynamic stats
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter(p => p.status === 'active').length;
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;
  const totalTasksCount = tasks.length;
  
  const overdueTasksCount = tasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const taskCompletionRate = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0;

  const teamMemberWorkload = teamMembers.map(member => {
    const memberInitials = getInitials(member.name);
    const count = tasks.filter(t => t.assignee === memberInitials && t.status !== 'done').length;
    return { ...member, assignedTasks: count, avatar: memberInitials };
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'No date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const getBadgeTone = (id: number) => {
    const tones = ['teal', 'gold', 'blue', 'rose'];
    return tones[id % tones.length];
  };

  // Guard against SSR hydration mismatch until client is mounted
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>Loading Avensus Project Hub...</div>
        </div>
      </div>
    );
  }

  // IF NOT AUTHENTICATED: Render Landing Page & Auth Modal
  if (!currentUser) {
    return (
      <LandingPage 
        onLogin={handleLogin}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        logoLoaded={logoLoaded}
        logoRef={logoRef}
        setLogoLoaded={setLogoLoaded}
        teamMembers={teamMembers}
      />
    );
  }

  return (
    <main className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand" onClick={() => { setActive('Overview'); setSelectedProjectId(null); }} style={{ cursor: 'pointer' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            ref={logoRef}
            src="/logo.webp" 
            alt="Avensus Logo"
            onLoad={() => setLogoLoaded(true)}
            onError={(e) => { e.currentTarget.style.display = 'none'; setLogoLoaded(false); }}
            style={{ display: logoLoaded ? 'block' : 'none', width: '38px', height: '38px', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
          />
          {!logoLoaded && <span className="brand-mark">A</span>}
          <span>
            <b>{workspace.name}</b>
            <small>Avensus Project Hub</small>
          </span>
        </div>
        <nav aria-label="Primary navigation">
          <p className="eyebrow">Workspace Navigation</p>
          {[
            { name: 'Overview', icon: '⌂' },
            { name: 'Projects', icon: '◇' },
            { name: 'My tasks', icon: '✓', count: userMyTasksOpenCount },
            { name: 'Work orders', icon: '🎫', count: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length },
            { name: 'Timeline', icon: '□' },
            { name: 'Team', icon: '◎' },
          ].map(item => (
            <button
              key={item.name}
              onClick={() => {
                setActive(item.name);
                setSelectedProjectId(null);
              }}
              className={active === item.name && !selectedProjectId ? 'nav-item active' : 'nav-item'}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
              {item.count !== undefined && item.count > 0 && <em>{item.count}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setShowWizard(true)} style={{ color: 'var(--teal)' }}>
            <span className="nav-icon">🚀</span>
            New Workspace Setup...
          </button>
          <button className="nav-item" onClick={toggleTheme}>
            <span className="nav-icon">{!mounted ? '🌙' : (darkMode ? '☀️' : '🌙')}</span>
            Theme: {!mounted ? 'Dark' : (darkMode ? 'Light' : 'Dark')}
          </button>
          
          <div className="user-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="avatar">{currentUser?.avatar || 'JK'}</span>
              <div>
                <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontSize: '13px' }}>{currentUser?.name || 'Jonathan K.'}</b>
                <small style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>{currentUser?.roleTitle || 'Administrator'}</small>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              title="Sign out of account"
              style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)', cursor: 'pointer', textAlign: 'center', width: '100%' }}
            >
              Sign out ↵
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu">☰</button>
          <div className="search">
            <span>⌕</span>
            <input
              aria-label="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects, tasks, or users..."
            />
            <kbd>⌘ K</kbd>
          </div>

          {/* Role Access Indicator Pill, Notifications Bell & Integrations Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`role-badge-pill ${currentUser?.role || 'admin'}`}>
              {currentUser?.roleTitle || 'Admin'}
            </span>

            <button
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              title="View Automated Notifications"
              style={{
                position: 'relative',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-primary)',
              }}
            >
              🔔 Alerts
              {notifications.filter(n => n.read === 0).length > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '10px',
                }}>
                  {notifications.filter(n => n.read === 0).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowIntegrationModal(true)}
              title="Configure Automated Slack/Teams Webhooks & Email Alerts"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--teal)',
              }}
            >
              ⚡ Integrations
            </button>
          </div>

          {/* Executive Export Actions */}
          <button 
            className="secondary-button" 
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={handleExportCSV}
            title="Download portfolio summary as CSV spreadsheet"
          >
            📊 Export CSV
          </button>

          <button 
            className="secondary-button" 
            style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--teal)', borderColor: 'var(--teal)' }}
            onClick={() => setShowReportModal(true)}
            title="Generate printable PDF summary report for executives"
          >
            🖨️ Executive Report
          </button>

          {canCreateProject && (
            <button className="primary-button" onClick={() => setShowProjModal(true)}>
              ＋ New project
            </button>
          )}

          {canCreateTask && (
            <button className="secondary-button" style={{ marginLeft: '8px' }} onClick={() => setShowTaskModal(true)}>
              ＋ Add task
            </button>
          )}
        </header>

        <div className="content">
          {loading ? (
            <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
              <div style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '18px', marginBottom: '10px' }}>Loading Project Hub...</strong>
                <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          ) : (
            <>
              {/* Guided Onboarding Banner */}
              <GuidedTourBanner 
                projectsCount={projects.length}
                tasksCount={tasks.length}
                teamCount={teamMembers.length}
                onOpenWizard={() => setShowWizard(true)}
                onAddTask={() => setShowTaskModal(true)}
                onAddTeam={() => setShowTeamModal(true)}
              />

              {/* Advanced Multi-Filter Control Bar */}
              <div className="filter-bar">
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>🔍 Filters:</span>
                <select className="filter-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                  <option value="all">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {teamMembers.map(m => {
                    const init = getInitials(m.name);
                    return <option key={m.id} value={init}>{m.name} ({init})</option>;
                  })}
                </select>

                <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active Projects / To Do Tasks</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done / Completed</option>
                </select>

                {(filterAssignee !== 'all' || filterPriority !== 'all' || filterStatus !== 'all') && (
                  <button 
                    onClick={() => { setFilterAssignee('all'); setFilterPriority('all'); setFilterStatus('all'); }}
                    style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Reset Filters ✕
                  </button>
                )}
              </div>

              {/* Drill-down Project View */}
              {selectedProjectId !== null ? (
                <ProjectDetailView 
                  projectId={selectedProjectId}
                  projects={projects}
                  tasks={tasks}
                  onBack={() => setSelectedProjectId(null)}
                  onToggleTask={handleToggleTaskStatus}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onUpdateProjectStatus={handleUpdateProjectStatus}
                  onAddTask={() => {
                    setNewTaskProjId(selectedProjectId);
                    setShowTaskModal(true);
                  }}
                  onEditTask={openEditTask}
                  onDeleteTask={handleDeleteTask}
                  onEditProject={openEditProject}
                  onDeleteProject={handleDeleteProject}
                  formatDate={formatDate}
                  canEditProject={canEditProject}
                  canDeleteProject={canDeleteProject}
                  canCreateTask={canCreateTask}
                  canEditTask={canEditTask}
                  canDeleteTask={canDeleteTask}
                />
              ) : (
                <>
                  {/* Overview View */}
                  {active === 'Overview' && (
                    <div className="view-container">
                      <div className="welcome">
                        <div>
                          <p className="eyebrow">WORKSPACE SUMMARY</p>
                          <h1>Welcome Back, {currentUser?.name.split(' ')[0]}</h1>
                          <p>Here’s the current activity across {workspace.name}.</p>
                        </div>
                      </div>

                      {/* Stat Cards */}
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div>
                            <span className="stat-icon teal">◇</span>
                            <span className="trend">Active</span>
                          </div>
                          <strong>{activeProjectsCount}</strong>
                          <p>Active projects</p>
                          <small>Out of {totalProjectsCount} projects total</small>
                        </div>

                        <div className="stat-card">
                          <div>
                            <span className="stat-icon gold">✓</span>
                            <span className="trend">{taskCompletionRate}%</span>
                          </div>
                          <strong>{completedTasksCount}</strong>
                          <p>Tasks completed</p>
                          <small>Out of {totalTasksCount} tasks assigned</small>
                        </div>

                        <div className="stat-card">
                          <div>
                            <span className="stat-icon rose">!</span>
                            <span className="trend">Attention</span>
                          </div>
                          <strong>{overdueTasksCount}</strong>
                          <p>Overdue tasks</p>
                          <small>Require immediate resolution</small>
                        </div>

                        <div className="stat-card">
                          <div>
                            <span className="stat-icon blue">◎</span>
                            <span className="trend">Stable</span>
                          </div>
                          <strong>84%</strong>
                          <p>Team utilization</p>
                          <small>Healthy workload distribution</small>
                        </div>
                      </div>

                      {/* Main Dashboard Cards */}
                      <div className="dashboard-grid">
                        {/* Project List Column */}
                        <section className="card">
                          <div className="card-head">
                            <div>
                              <h2>Project portfolio</h2>
                              <p>Live progress tracking</p>
                            </div>
                            <button onClick={() => setActive('Projects')}>View all →</button>
                          </div>
                          <div className="project-list">
                            {filteredProjects.slice(0, 5).map(p => {
                              const tone = getBadgeTone(p.id);
                              const pTasks = tasks.filter(t => t.projectId === p.id);
                              const doneTasks = pTasks.filter(t => t.status === 'done');
                              const liveProgress = pTasks.length > 0 ? Math.round((doneTasks.length / pTasks.length) * 100) : p.progress;

                              return (
                                <article className="project-row" key={p.id} onClick={() => setSelectedProjectId(p.id)}>
                                  <span className={`project-badge ${tone}`}>
                                    {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                  <div className="project-info">
                                    <b>{p.name}</b>
                                    <small>{p.client}</small>
                                  </div>
                                  <div className="progress-wrap">
                                    <span>
                                      <small>Progress</small>
                                      <b>{liveProgress}%</b>
                                    </span>
                                    <div className="progress">
                                      <i style={{ width: `${liveProgress}%` }} />
                                    </div>
                                  </div>
                                  <div className="due">
                                    <small>Due date</small>
                                    <b>{formatDate(p.dueDate)}</b>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                    {canEditProject && <button className="more" style={{ color: 'var(--teal)' }} onClick={() => openEditProject(p)} title="Edit Project">✏️</button>}
                                    {canDeleteProject && <button className="more" style={{ color: '#ef4444' }} onClick={() => handleDeleteProject(p.id)} title="Delete Project">🗑️</button>}
                                  </div>
                                </article>
                              );
                            })}
                            {filteredProjects.length === 0 && (
                              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                                No projects found matching filters.
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Workload Donut Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <section className="card">
                            <div className="card-head">
                              <div>
                                <h2>Team workload</h2>
                                <p>Current task capacities</p>
                              </div>
                              <button onClick={() => setActive('Team')}>View team →</button>
                            </div>
                            <div className="donut-wrap">
                              <div className="donut-svg-container">
                                <svg viewBox="0 0 36 36" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--line)" strokeWidth="3" />
                                  <circle 
                                    cx="18" 
                                    cy="18" 
                                    r="15.9155" 
                                    fill="none" 
                                    stroke="var(--teal)" 
                                    strokeWidth="3.2" 
                                    strokeDasharray={`${taskCompletionRate} ${100 - taskCompletionRate}`}
                                    strokeDashoffset="0"
                                    style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
                                  />
                                </svg>
                                <div className="donut-label">
                                  <strong>{taskCompletionRate}%</strong>
                                  <small>Done</small>
                                </div>
                              </div>
                              <div className="legend">
                                <span><i className="l1" />Completed <b>{completedTasksCount}</b></span>
                                <span><i className="l2" />In Progress <b>{tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length}</b></span>
                                <span><i className="l3" />To Do <b>{tasks.filter(t => t.status === 'todo').length}</b></span>
                              </div>
                            </div>
                            <div className="capacity-note">
                              <span>✓</span>
                              <p>
                                <b>Team capacity is healthy</b>
                                <small>Workloads are evenly balanced across active sprints.</small>
                              </p>
                            </div>
                          </section>
                        </div>

                        {/* Priority Tasks List */}
                        <section className="card">
                          <div className="card-head">
                            <div>
                              <h2>My priority tasks</h2>
                              <p>Action items requiring attention</p>
                            </div>
                            <button onClick={() => setActive('My tasks')}>View board →</button>
                          </div>
                          <div className="task-list">
                            {filteredTasks.slice(0, 5).map(t => {
                              const project = projects.find(p => p.id === t.projectId);
                              return (
                                <div className="task-row" key={t.id} style={{ display: 'grid', gridTemplateColumns: '20px minmax(130px, 1fr) 70px 34px 65px 60px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', cursor: isViewer ? 'not-allowed' : 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      disabled={isViewer}
                                      checked={t.status === 'done'} 
                                      onChange={() => handleToggleTaskStatus(t.id, t.status)} 
                                    />
                                    <span className="fake-check" />
                                  </label>
                                  <span className={`task-main ${t.status === 'done' ? 'completed' : ''}`}>
                                    <b>{t.title}</b>
                                    <small>{project ? project.name : 'Unknown Project'}</small>
                                  </span>
                                  <span className={`priority ${t.priority.toLowerCase()}`}>
                                    {t.priority}
                                  </span>
                                  {t.assignee && <span className="avatar" style={{ width: '28px', height: '28px', fontSize: '9px' }}>{t.assignee}</span>}
                                  <span className={t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done' ? 'task-due urgent' : 'task-due'}>
                                    {formatDate(t.dueDate)}
                                  </span>
                                  <div style={{ display: 'flex', gap: '8px', alignSelf: 'center', justifyContent: 'flex-end' }}>
                                    {canEditTask && <button className="more" style={{ color: 'var(--teal)' }} onClick={() => openEditTask(t)}>✏️</button>}
                                    {canDeleteTask && <button className="more" style={{ color: '#ef4444' }} onClick={() => handleDeleteTask(t.id)}>🗑️</button>}
                                  </div>
                                </div>
                              );
                            })}
                            {filteredTasks.length === 0 && (
                              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                                No priority tasks found matching filters.
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Activity Log Stream Card */}
                        <section className="card activity-card">
                          <div className="card-head">
                            <div>
                              <h2>Live Activity Audit Trail</h2>
                              <p>Real-time workspace user logs</p>
                            </div>
                            <button onClick={() => alert('Audit logs are up to date.')}>•••</button>
                          </div>
                          <div className="activity-list">
                            {activityLogs.map(log => (
                              <div className="activity" key={log.id}>
                                <span className="avatar">{log.avatar}</span>
                                <p>
                                  <b>{log.user}</b> {log.action}
                                  <small>{log.detail} · {log.time}</small>
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  )}

                  {/* Projects Grid View */}
                  {active === 'Projects' && (
                    <div className="view-container">
                      <div className="welcome">
                        <div>
                          <p className="eyebrow">CLIENT WORK</p>
                          <h1>All Project Portfolios</h1>
                          <p>Click on any project to drill down, manage tasks, and view schedules.</p>
                        </div>
                        {canCreateProject && (
                          <button className="primary-button" onClick={() => setShowProjModal(true)}>
                            ＋ New project
                          </button>
                        )}
                      </div>

                      <div className="projects-grid">
                        {filteredProjects.map(p => {
                          const tone = getBadgeTone(p.id);
                          const projectTasks = tasks.filter(t => t.projectId === p.id);
                          const finishedTasks = projectTasks.filter(t => t.status === 'done');
                          const liveProgress = projectTasks.length > 0 ? Math.round((finishedTasks.length / projectTasks.length) * 100) : p.progress;

                          return (
                            <article 
                              className="project-card" 
                              key={p.id}
                              onClick={() => setSelectedProjectId(p.id)}
                            >
                              <div className="project-card-header">
                                <div>
                                  <span className={`project-badge ${tone}`} style={{ marginBottom: '12px' }}>
                                    {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                  <h3 className="project-card-title">{p.name}</h3>
                                  <span className="project-card-client">{p.client}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
                                  <select 
                                    disabled={!canEditProject}
                                    value={p.status} 
                                    onChange={(e) => handleUpdateProjectStatus(p.id, e.target.value)}
                                    style={{ fontSize: '11px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                  >
                                    <option value="active">Active</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {canEditProject && <button className="more" style={{ color: 'var(--teal)', fontSize: '12px' }} onClick={() => openEditProject(p)} title="Edit Project">✏️ Edit</button>}
                                    {canDeleteProject && <button className="more" style={{ color: '#ef4444', fontSize: '12px' }} onClick={() => handleDeleteProject(p.id)} title="Delete Project">🗑️ Delete</button>}
                                  </div>
                                </div>
                              </div>

                              <div className="progress-wrap" style={{ marginTop: 'auto' }}>
                                <span>
                                  <small>Overall Progress</small>
                                  <b>{liveProgress}%</b>
                                </span>
                                <div className="progress">
                                  <i style={{ width: `${liveProgress}%` }} />
                                </div>
                              </div>

                              <div className="project-card-meta">
                                <span>
                                  <small>Due Date</small>
                                  <b>{formatDate(p.dueDate)}</b>
                                </span>
                                <span>
                                  <small>Tasks</small>
                                  <b>{finishedTasks.length}/{projectTasks.length} Done</b>
                                </span>
                              </div>
                            </article>
                          );
                        })}
                        {filteredProjects.length === 0 && (
                          <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--muted)', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3>No projects active</h3>
                            <p>Get started by creating a new project tracking workflow.</p>
                            {canCreateProject && (
                              <button className="primary-button" style={{ margin: '10px auto 0' }} onClick={() => setShowProjModal(true)}>
                                ＋ Create project
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Kanban Task Board View */}
                  {active === 'My tasks' && (
                    <div className="view-container">
                      <div className="welcome">
                        <div>
                          <p className="eyebrow">{currentUser?.role === 'member' ? 'MY ASSIGNED TASKS' : 'WORKSPACE KANBAN BOARD'}</p>
                          <h1>{currentUser?.role === 'member' ? `Tasks for ${currentUser.name}` : 'Task Management'}</h1>
                          <p>
                            {currentUser?.role === 'member'
                              ? `Viewing tasks assigned specifically to ${currentUser.name} (${currentUser.avatar}). Update statuses as you complete work.`
                              : 'Full workspace task board. View, assign, and update task statuses across all team members.'
                            }
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isManagerOrAdmin && (
                            <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '3px' }}>
                              <button
                                onClick={() => setAdminTaskFilter('all')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  border: 'none',
                                  background: adminTaskFilter === 'all' ? 'var(--teal)' : 'transparent',
                                  color: adminTaskFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                🌐 All Workspace Tasks ({filteredTasks.length})
                              </button>
                              <button
                                onClick={() => setAdminTaskFilter('mine')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  border: 'none',
                                  background: adminTaskFilter === 'mine' ? 'var(--teal)' : 'transparent',
                                  color: adminTaskFilter === 'mine' ? '#ffffff' : 'var(--text-secondary)',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                👤 Filter to My Tasks ({filteredTasks.filter(t => isTaskAssignedToUser(t, currentUser)).length})
                              </button>
                            </div>
                          )}

                          {canCreateTask && (
                            <button className="primary-button" onClick={() => setShowTaskModal(true)}>
                              ＋ Add task
                            </button>
                          )}
                        </div>
                      </div>

                      {currentUser?.role === 'member' && filteredTasks.filter(t => isTaskAssignedToUser(t, currentUser)).length === 0 && (
                        <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                          <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📋</span>
                          <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>No Tasks Assigned Yet</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '480px', margin: '0 auto' }}>
                            Welcome, <b>{currentUser?.name || 'Team Member'}</b>! There are currently no active tasks assigned to your user account (<b>{currentUser?.avatar || 'AU'}</b>). 
                            When a Project Manager or Admin assigns a task card to you, it will automatically show up here.
                          </p>
                        </div>
                      )}

                      <div className="kanban-board">
                        {[
                          { key: 'todo', label: 'To Do', dot: 'todo-dot' },
                          { key: 'in_progress', label: 'In Progress', dot: 'progress-dot' },
                          { key: 'review', label: 'In Review', dot: 'review-dot' },
                          { key: 'done', label: 'Done', dot: 'done-dot' },
                        ].map(col => {
                          const displayTasks = isManagerOrAdmin
                            ? (adminTaskFilter === 'mine' ? filteredTasks.filter(t => isTaskAssignedToUser(t, currentUser)) : filteredTasks)
                            : filteredTasks.filter(t => isTaskAssignedToUser(t, currentUser));
                          const colTasks = displayTasks.filter(t => t.status === col.key);
                          return (
                            <div className="kanban-col" key={col.key}>
                              <div className="kanban-col-header">
                                <h3>
                                  <i className={col.dot} />
                                  {col.label}
                                </h3>
                                <span className="kanban-count">{colTasks.length}</span>
                              </div>
                              <div className="kanban-list">
                                {colTasks.map(t => {
                                  const project = projects.find(p => p.id === t.projectId);
                                  return (
                                    <div className="kanban-card" key={t.id}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 className="kanban-card-title">{t.title}</h4>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          {canEditTask && <button className="more" style={{ color: 'var(--teal)', fontSize: '10px' }} onClick={() => openEditTask(t)}>✏️</button>}
                                          {canDeleteTask && <button className="more" style={{ color: '#ef4444', fontSize: '10px' }} onClick={() => handleDeleteTask(t.id)}>🗑️</button>}
                                        </div>
                                      </div>
                                      <p className="kanban-card-project">{project ? project.name : 'Unknown Project'}</p>
                                      
                                      {t.attachment && (
                                        <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                                          <span className="attachment-chip">📎 {t.attachment}</span>
                                        </div>
                                      )}

                                      <div className="kanban-card-footer">
                                        <span className={`priority ${t.priority.toLowerCase()}`}>
                                          {t.priority}
                                        </span>
                                        <span className="due-date">🕒 {formatDate(t.dueDate)}</span>
                                      </div>

                                      <div className="kanban-card-actions">
                                        {t.assignee && <span className="avatar" style={{ width: '24px', height: '24px', fontSize: '8px' }}>{t.assignee}</span>}
                                        <select
                                          disabled={isViewer}
                                          value={t.status}
                                          onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                                        >
                                          <option value="todo">To Do</option>
                                          <option value="in_progress">In Progress</option>
                                          <option value="review">Review</option>
                                          <option value="done">Done</option>
                                        </select>
                                      </div>
                                    </div>
                                  );
                                })}
                                {colTasks.length === 0 && (
                                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.01)' }}>
                                    Empty
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gantt Timeline View */}
                  {active === 'Timeline' && (
                    <div className="view-container">
                      <div className="welcome">
                        <div>
                          <p className="eyebrow">ROADMAP</p>
                          <h1>Gantt Schedules & Early Completion Tracker</h1>
                          <p>Visual map of project schedules, task completion timelines, and early delivery tracking.</p>
                        </div>
                      </div>

                      <div className="card" style={{ padding: '24px' }}>
                        <div className="timeline-list">
                          {filteredProjects.map(p => {
                            const projectTasks = tasks.filter(t => t.projectId === p.id);
                            const finishedTasks = projectTasks.filter(t => t.status === 'done');
                            const progress = projectTasks.length > 0 ? Math.round((finishedTasks.length / projectTasks.length) * 100) : p.progress;
                            
                            const isCompleted = progress === 100;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const due = p.dueDate ? new Date(p.dueDate) : null;
                            const isOverdue = !isCompleted && due !== null && due < today;
                            const isEarly = isCompleted && (due === null || today <= due);

                            let barClass = 'timeline-bar';
                            let badgeClass = 'timeline-status-badge on-track';
                            let badgeLabel = 'On Track';
                            let barText = `${progress}% In Progress`;

                            if (isEarly) {
                              barClass = 'timeline-bar completed-early';
                              badgeClass = 'timeline-status-badge early';
                              badgeLabel = '✓ Completed Early';
                              barText = `✓ 100% Completed (Ahead of Schedule)`;
                            } else if (isCompleted) {
                              barClass = 'timeline-bar completed';
                              badgeClass = 'timeline-status-badge completed';
                              badgeLabel = '✓ Completed';
                              barText = `✓ 100% Completed`;
                            } else if (isOverdue) {
                              barClass = 'timeline-bar overdue';
                              badgeClass = 'timeline-status-badge overdue';
                              badgeLabel = '! Overdue';
                              barText = `! ${progress}% (Overdue)`;
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} key={p.id}>
                                <div className="timeline-item">
                                  <div className="timeline-info" onClick={() => setSelectedProjectId(p.id)} style={{ cursor: 'pointer' }}>
                                    <h4>{p.name}</h4>
                                    <p>Client: <b>{p.client}</b></p>
                                  </div>
                                  <div className="timeline-track">
                                    <div 
                                      className={barClass} 
                                      style={{ 
                                        left: '0%', 
                                        width: `${Math.max(progress, 15)}%` 
                                      }}
                                    />
                                    <span className="timeline-bar-text" style={{ left: '12px' }}>
                                      {barText}
                                    </span>
                                  </div>
                                  <div className="timeline-dates">
                                    <b>{formatDate(p.dueDate)}</b>
                                    <span className={badgeClass}>{badgeLabel}</span>
                                    {canEditProject && (
                                      <input 
                                        type="date"
                                        title="Change project target deadline"
                                        value={p.dueDate ? p.dueDate.substring(0, 10) : ''}
                                        onChange={async (e) => {
                                          const newDueDate = e.target.value;
                                          setProjects(prev => prev.map(item => item.id === p.id ? { ...item, dueDate: newDueDate || null } : item));
                                          await fetch('/api/projects', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: p.id, dueDate: newDueDate || null }),
                                          });
                                          await loadData();
                                        }}
                                        style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', marginTop: '4px', display: 'block', marginLeft: 'auto' }}
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Task Breakdown under Project */}
                                {projectTasks.length > 0 && (
                                  <div style={{ marginLeft: '24px', paddingLeft: '16px', borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {projectTasks.map(t => {
                                      const taskDone = t.status === 'done';
                                      const taskDue = t.dueDate ? new Date(t.dueDate) : null;
                                      const taskOverdue = !taskDone && taskDue !== null && taskDue < today;
                                      const taskEarly = taskDone && taskDue !== null && today <= taskDue;

                                      return (
                                        <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(130px, 1.5fr) minmax(120px, 2fr) 130px', gap: '12px', alignItems: 'center', background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                          <label style={{ display: 'flex', alignItems: 'center', cursor: isViewer ? 'not-allowed' : 'pointer' }}>
                                            <input 
                                              type="checkbox" 
                                              disabled={isViewer}
                                              checked={taskDone} 
                                              onChange={() => handleToggleTaskStatus(t.id, t.status)} 
                                            />
                                            <span className="fake-check" />
                                          </label>
                                          <div>
                                            <b style={{ fontSize: '12px', textDecoration: taskDone ? 'line-through' : 'none', opacity: taskDone ? 0.7 : 1 }}>{t.title}</b>
                                            <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>{t.assignee ? `Assigned: ${t.assignee}` : 'Unassigned'}</small>
                                          </div>
                                          <div className="timeline-track" style={{ height: '18px' }}>
                                            <div 
                                              className={`timeline-bar ${taskDone ? (taskEarly ? 'completed-early' : 'completed') : (taskOverdue ? 'overdue' : '')}`}
                                              style={{ left: '0%', width: taskDone ? '100%' : '35%' }}
                                            />
                                            <span className="timeline-bar-text" style={{ fontSize: '9px', left: '8px' }}>
                                              {taskDone ? (taskEarly ? '✓ Completed Early' : '✓ Done') : (taskOverdue ? '! Overdue' : 'In Progress')}
                                            </span>
                                          </div>
                                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span className={`timeline-status-badge ${taskDone ? (taskEarly ? 'early' : 'completed') : (taskOverdue ? 'overdue' : 'on-track')}`}>
                                              {taskDone ? (taskEarly ? 'Completed Early' : 'Done') : (taskOverdue ? 'Overdue' : 'On Track')}
                                            </span>
                                            {canEditTask && (
                                              <input 
                                                type="date"
                                                title="Change task deadline"
                                                value={t.dueDate ? t.dueDate.substring(0, 10) : ''}
                                                onChange={async (e) => {
                                                  const newDueDate = e.target.value;
                                                  setTasks(prev => prev.map(item => item.id === t.id ? { ...item, dueDate: newDueDate || null } : item));
                                                  await fetch('/api/tasks', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ id: t.id, dueDate: newDueDate || null }),
                                                  });
                                                  await loadData();
                                                }}
                                                style={{ fontSize: '10px', padding: '1px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', marginTop: '2px' }}
                                              />
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {filteredProjects.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                              No project roadmaps configured.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team view */}
                  {active === 'Team' && (
                    <div className="view-container">
                      <div className="welcome">
                        <div>
                          <p className="eyebrow">RESOURCES</p>
                          <h1>Team Capacity Workloads</h1>
                          <p>Manage members, operational workloads, and capacities.</p>
                        </div>
                        {canManageTeam && (
                          <button className="primary-button" onClick={() => setShowTeamModal(true)}>
                            ＋ Add Member
                          </button>
                        )}
                      </div>

                      <div className="projects-grid">
                        {teamMemberWorkload.map(member => (
                          <div className="project-card" key={member.id} style={{ cursor: 'default' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <span className="avatar" style={{ width: '48px', height: '48px', fontSize: '14px' }}>{member.avatar}</span>
                              <div style={{ flex: 1 }}>
                                <h3 className="project-card-title">{member.name}</h3>
                                <span className="project-card-client">{member.role}</span>
                                <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{member.email}</small>
                              </div>
                              {canManageTeam && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="more" style={{ color: 'var(--teal)' }} onClick={() => openEditTeamMember(member)}>✏️</button>
                                  <button className="more" style={{ color: '#ef4444' }} onClick={() => handleDeleteTeamMember(member.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                            
                            <div className="progress-wrap" style={{ marginTop: '8px' }}>
                              <span>
                                <small>Workload Capacity</small>
                                <b>{member.assignedTasks * 20}% utilized</b>
                              </span>
                              <div className="progress">
                                <i 
                                  style={{ 
                                    width: `${Math.min(member.assignedTasks * 20, 100)}%`,
                                    backgroundColor: member.assignedTasks * 20 > 80 ? '#ef4444' : member.assignedTasks * 20 > 60 ? 'var(--gold)' : 'var(--teal)' 
                                  }} 
                                />
                              </div>
                            </div>

                            <div className="project-card-meta">
                              <span>
                                <small>Pending Tasks</small>
                                <b>{member.assignedTasks} Active</b>
                              </span>
                              <span>
                                <small>Limit</small>
                                <b>{member.capacity}% Max Capacity</b>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Orders View */}
                  {active === 'Work orders' && (
                    <div className="view-container">
                      <WorkOrdersView
                        tickets={tickets}
                        projects={projects}
                        currentUser={currentUser}
                        onOpenCreateModal={() => setShowTicketModal(true)}
                        onUpdateStatus={handleUpdateTicketStatus}
                        onDeleteTicket={handleDeleteTicket}
                        formatDate={formatDate}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* --- WORKSPACE ONBOARDING SETUP WIZARD --- */}
      {showWizard && (
        <OnboardingWizard 
          workspace={workspace}
          onClose={() => setShowWizard(false)}
          onComplete={handleCompleteWizard}
        />
      )}

      {/* --- EXECUTIVE PRINTABLE REPORT MODAL --- */}
      {showReportModal && (
        <ExecutiveReportModal 
          workspace={workspace}
          projects={projects}
          tasks={tasks}
          teamMembers={teamMembers}
          onClose={() => setShowReportModal(false)}
          formatDate={formatDate}
        />
      )}


      {/* --- DIALOG MODALS --- */}
      {showProjModal && (
        <div className="modal-overlay" onClick={() => setShowProjModal(false)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleCreateProject}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button type="button" className="modal-close" onClick={() => setShowProjModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="proj-name">Project Name</label>
                <input id="proj-name" type="text" required placeholder="e.g. Website Redesign" value={newProjName} onChange={e => setNewProjName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="proj-client">Client / Team</label>
                <input id="proj-client" type="text" required placeholder="e.g. Marketing Dept" value={newProjClient} onChange={e => setNewProjClient(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="proj-due">Target Due Date</label>
                <input id="proj-due" type="date" value={newProjDueDate} onChange={e => setNewProjDueDate(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowProjModal(false)}>Cancel</button>
              <button type="submit" className="primary-button">Launch Project</button>
            </div>
          </form>
        </div>
      )}

      {showEditProjModal && (
        <div className="modal-overlay" onClick={() => setShowEditProjModal(false)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleUpdateProject}>
            <div className="modal-header">
              <h3>Edit Project Details</h3>
              <button type="button" className="modal-close" onClick={() => setShowEditProjModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-proj-name">Project Name</label>
                <input id="edit-proj-name" type="text" required value={editProjName} onChange={e => setEditProjName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-proj-client">Client / Team</label>
                <input id="edit-proj-client" type="text" required value={editProjClient} onChange={e => setEditProjClient(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-proj-due">Due Date</label>
                <input id="edit-proj-due" type="date" value={editProjDueDate} onChange={e => setEditProjDueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-proj-status">Project Status</label>
                <select id="edit-proj-status" value={editProjStatus} onChange={e => setEditProjStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowEditProjModal(false)}>Cancel</button>
              <button type="submit" className="primary-button">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleCreateTask}>
            <div className="modal-header">
              <h3>Add Task Card</h3>
              <button type="button" className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
                  <p style={{ fontWeight: '600', marginBottom: '14px' }}>⚠️ No Projects Available</p>
                  <p style={{ fontSize: '13px' }}>You must create at least one project first before you can add tasks.</p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="task-title">Task Title</label>
                    <input id="task-title" type="text" required placeholder="e.g. Design authentication pages" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-project">Associated Project</label>
                    <select id="task-project" value={newTaskProjId} onChange={e => setNewTaskProjId(Number(e.target.value))}>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-assignee">Assignee</label>
                    <select id="task-assignee" value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}>
                      <option value="">Unassigned</option>
                      {teamMembers.map(m => {
                        const init = getInitials(m.name);
                        return (
                          <option key={m.id} value={init}>{m.name} ({init})</option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-priority">Priority Level</label>
                    <select id="task-priority" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-due">Due Date</label>
                    <input id="task-due" type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-attachment">Attachment Reference (File / Link)</label>
                    <input id="task-attachment" type="text" placeholder="e.g. Figma_Mockup_v2.png or Spec.pdf" value={newTaskAttachment} onChange={e => setNewTaskAttachment(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowTaskModal(false)}>Cancel</button>
              {projects.length > 0 && <button type="submit" className="primary-button">Create Task</button>}
            </div>
          </form>
        </div>
      )}

      {showEditTaskModal && (
        <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleUpdateTask}>
            <div className="modal-header">
              <h3>Edit Task Card</h3>
              <button type="button" className="modal-close" onClick={() => setShowEditTaskModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-task-title">Task Title</label>
                <input id="edit-task-title" type="text" required value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-task-project">Move to Project</label>
                <select id="edit-task-project" value={editTaskProjId} onChange={e => setEditTaskProjId(Number(e.target.value))}>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-task-assignee">Assignee</label>
                <select id="edit-task-assignee" value={editTaskAssignee} onChange={e => setEditTaskAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => {
                    const init = getInitials(m.name);
                    return (
                      <option key={m.id} value={init}>{m.name} ({init})</option>
                    );
                  })}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-task-priority">Priority</label>
                <select id="edit-task-priority" value={editTaskPriority} onChange={e => setEditTaskPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-task-due">Due Date</label>
                <input id="edit-task-due" type="date" value={editTaskDueDate} onChange={e => setEditTaskDueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-task-status">Task Progress Status</label>
                <select id="edit-task-status" value={editTaskStatus} onChange={e => setEditTaskStatus(e.target.value)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-task-attachment">Attachment Reference (File / Link)</label>
                <input id="edit-task-attachment" type="text" placeholder="e.g. Spec_Doc_v1.pdf" value={editTaskAttachment} onChange={e => setEditTaskAttachment(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowEditTaskModal(false)}>Cancel</button>
              <button type="submit" className="primary-button">Save Task</button>
            </div>
          </form>
        </div>
      )}

      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleCreateTeamMember}>
            <div className="modal-header">
              <h3>Add New Team Member</h3>
              <button type="button" className="modal-close" onClick={() => setShowTeamModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="team-name">Full Name</label>
                <input id="team-name" type="text" required placeholder="e.g. Sarah Jenkins" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="team-email">Email Address</label>
                <input id="team-email" type="email" required placeholder="e.g. sarah@avensus.com" value={newTeamEmail} onChange={e => setNewTeamEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="team-role">Role Description</label>
                <input id="team-role" type="text" required placeholder="e.g. Front-End Engineer" value={newTeamRole} onChange={e => setNewTeamRole(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="team-capacity">Weekly Workload Capacity (%)</label>
                <input id="team-capacity" type="number" min="0" max="100" required value={newTeamCapacity} onChange={e => setNewTeamCapacity(Number(e.target.value))} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowTeamModal(false)}>Cancel</button>
              <button type="submit" className="primary-button">Add Member</button>
            </div>
          </form>
        </div>
      )}

      {showEditTeamModal && (
        <div className="modal-overlay" onClick={() => setShowEditTeamModal(false)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleUpdateTeamMember}>
            <div className="modal-header">
              <h3>Edit Team Member Details</h3>
              <button type="button" className="modal-close" onClick={() => setShowEditTeamModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-team-name">Full Name</label>
                <input id="edit-team-name" type="text" required value={editTeamName} onChange={e => setEditTeamName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-team-email">Email Address</label>
                <input id="edit-team-email" type="email" required value={editTeamEmail} onChange={e => setEditTeamEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-team-role">Role Description</label>
                <input id="edit-team-role" type="text" required value={editTeamRole} onChange={e => setEditTeamRole(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-team-capacity">Weekly Workload Capacity (%)</label>
                <input id="edit-team-capacity" type="number" min="0" max="100" required value={editTeamCapacity} onChange={e => setEditTeamCapacity(Number(e.target.value))} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowEditTeamModal(false)}>Cancel</button>
              <button type="submit" className="primary-button">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {showTicketModal && (
        <WorkOrderModal
          projects={projects}
          teamMembers={teamMembers}
          onClose={() => setShowTicketModal(false)}
          onSubmit={handleCreateTicket}
          title={newTicketTitle}
          setTitle={setNewTicketTitle}
          description={newTicketDescription}
          setDescription={setNewTicketDescription}
          category={newTicketCategory}
          setCategory={setNewTicketCategory}
          priority={newTicketPriority}
          setPriority={setNewTicketPriority}
          assignee={newTicketAssignee}
          setAssignee={setNewTicketAssignee}
          projectId={newTicketProjId}
          setProjectId={setNewTicketProjId}
          dueDate={newTicketDueDate}
          setDueDate={setNewTicketDueDate}
        />
      )}

      {showNotifDrawer && (
        <NotificationDrawer 
          notifications={notifications} 
          onClose={() => setShowNotifDrawer(false)} 
          onMarkAllRead={handleMarkAllNotifsRead} 
          onOpenIntegrations={() => { setShowNotifDrawer(false); setShowIntegrationModal(true); }} 
        />
      )}

      {showIntegrationModal && (
        <IntegrationSettingsModal 
          onClose={() => setShowIntegrationModal(false)} 
          onTestWebhook={handleTestWebhook} 
        />
      )}

      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--card-bg)',
            border: '2px solid var(--teal)',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 2000,
            maxWidth: '360px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px' }}>🔔</span>
            <b style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{toastMessage.title}</b>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{toastMessage.body}</p>
        </div>
      )}
    </main>
  );
}

// --- GUIDED TOUR BANNER COMPONENT ---
interface GuidedTourProps {
  projectsCount: number;
  tasksCount: number;
  teamCount: number;
  onOpenWizard: () => void;
  onAddTask: () => void;
  onAddTeam: () => void;
}

function GuidedTourBanner({ projectsCount, tasksCount, teamCount, onOpenWizard, onAddTask, onAddTeam }: GuidedTourProps) {
  const [dismissed, setDismissed] = useState(false);

  const isWsConfigured = projectsCount > 0;
  const isTeamInvited = teamCount > 0;
  const isTasksCreated = tasksCount > 0;
  const isComplete = isWsConfigured && isTeamInvited && isTasksCreated;

  let completedCount = 1; // Default 1 for initialization
  if (isTeamInvited) completedCount++;
  if (isTasksCreated) completedCount++;

  const pct = Math.round((completedCount / 3) * 100);

  if (dismissed) return null;

  return (
    <div className="guided-tour-banner">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--teal)' }}>🚀 GETTING STARTED TOUR ({pct}% COMPLETE)</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '16px', fontFamily: 'Outfit, sans-serif' }}>
            {isComplete ? '🎉 Workspace Setup Complete!' : 'Welcome to your Workspace Setup Guide'}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="secondary-button" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={onOpenWizard}>
            Re-run Setup Wizard
          </button>
          <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '16px' }}>
            ×
          </button>
        </div>
      </div>

      <div className="tour-steps-grid">
        <div className="tour-step-card completed">
          <span style={{ fontSize: '16px' }}>✓</span>
          <div>
            <b>Workspace Setup</b>
            <small style={{ display: 'block', color: 'var(--muted)' }}>Configured</small>
          </div>
        </div>

        <div className={`tour-step-card ${isTeamInvited ? 'completed' : ''}`} onClick={onAddTeam}>
          <span style={{ fontSize: '16px' }}>{isTeamInvited ? '✓' : '👥'}</span>
          <div>
            <b>Invite Team</b>
            <small style={{ display: 'block', color: 'var(--muted)' }}>{isTeamInvited ? `${teamCount} Members` : 'Click to Add'}</small>
          </div>
        </div>

        <div className={`tour-step-card ${isTasksCreated ? 'completed' : ''}`} onClick={onAddTask}>
          <span style={{ fontSize: '16px' }}>{isTasksCreated ? '✓' : '＋'}</span>
          <div>
            <b>Create Tasks</b>
            <small style={{ display: 'block', color: 'var(--muted)' }}>{isTasksCreated ? `${tasksCount} Tasks` : 'Click to Add'}</small>
          </div>
        </div>

        <div className="tour-step-card completed">
          <span style={{ fontSize: '16px' }}>⏱️</span>
          <div>
            <b>Gantt Timeline</b>
            <small style={{ display: 'block', color: 'var(--muted)' }}>Live Tracking</small>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- WORKSPACE ONBOARDING WIZARD COMPONENT ---
interface WizardProps {
  workspace: WorkspaceConfig;
  onClose: () => void;
  onComplete: (ws: WorkspaceConfig) => void;
}

function OnboardingWizard({ workspace, onClose, onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const [wsName, setWsName] = useState(workspace.name);
  const [wsSlug, setWsSlug] = useState(workspace.slug);
  const [wsIndustry, setWsIndustry] = useState(workspace.industry);
  const [teamRole, setTeamRole] = useState('Workspace Admin');
  const [memberEmail, setMemberEmail] = useState('');
  const [firstProject, setFirstProject] = useState('Q4 Client Deliverables');

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete({
        name: wsName.trim() || 'Avensus Workspace',
        slug: wsSlug.trim() || 'avensus-hub',
        industry: wsIndustry,
        primaryColor: '#0d9488',
        onboarded: true,
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">STEP {step} OF 4</span>
            <h3 style={{ margin: 0 }}>Workspace Setup Wizard</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ minHeight: '260px' }}>
          {step === 1 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>1. Workspace Identity & Branding</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Customize your team workspace name and industry focus.</p>
              
              <div className="form-group">
                <label htmlFor="ws-name">Workspace Name</label>
                <input id="ws-name" type="text" value={wsName} onChange={e => { setWsName(e.target.value); setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')); }} />
              </div>

              <div className="form-group">
                <label htmlFor="ws-slug">URL Subdomain Slug</label>
                <input id="ws-slug" type="text" value={wsSlug} onChange={e => setWsSlug(e.target.value)} />
              </div>

              <div className="form-group">
                <label htmlFor="ws-industry">Industry Category</label>
                <select id="ws-industry" value={wsIndustry} onChange={e => setWsIndustry(e.target.value)}>
                  <option value="Software & Technology">Software & Technology</option>
                  <option value="Marketing & Design">Marketing & Design Agency</option>
                  <option value="Financial Services">Financial & Enterprise</option>
                  <option value="Healthcare & Science">Healthcare & Bio</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>2. Role & Initial Teammate Invites</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Set your leadership role and invite colleagues.</p>

              <div className="form-group">
                <label htmlFor="user-role">Your Role</label>
                <select id="user-role" value={teamRole} onChange={e => setTeamRole(e.target.value)}>
                  <option value="Workspace Admin">Workspace Director / Admin</option>
                  <option value="Project Manager">Lead Project Manager</option>
                  <option value="Senior Developer">Senior Technical Specialist</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="member-email">Invite Team Member (Email)</label>
                <input id="member-email" type="email" placeholder="e.g. colleague@avensus.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>3. Initial Project Portfolio</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Configure your first project portfolio for tracking.</p>

              <div className="form-group">
                <label htmlFor="first-proj">First Project Portfolio Name</label>
                <input id="first-proj" type="text" value={firstProject} onChange={e => setFirstProject(e.target.value)} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', margin: '0 0 8px' }}>Workspace is Ready!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto' }}>
                Your custom workspace <b>{wsName}</b> has been initialized with role permissions and Gantt tracking.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button className="secondary-button" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          ) : <div />}

          <button className="primary-button" onClick={handleNext}>
            {step === 4 ? 'Launch Workspace 🚀' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- EXECUTIVE PRINTABLE REPORT MODAL ---
interface ReportProps {
  workspace: WorkspaceConfig;
  projects: Project[];
  tasks: Task[];
  teamMembers: TeamMember[];
  onClose: () => void;
  formatDate: (d: string | null) => string;
}

function ExecutiveReportModal({ workspace, projects, tasks, teamMembers, onClose, formatDate }: ReportProps) {
  const finishedTasks = tasks.filter(t => t.status === 'done').length;
  const pct = tasks.length > 0 ? Math.round((finishedTasks / tasks.length) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div className="report-modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--teal)' }}>CONFIDENTIAL EXECUTIVE BRIEFING</span>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', margin: '4px 0 0' }}>{workspace.name} · Portfolio Status Report</h1>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary-button" onClick={() => window.print()} style={{ fontSize: '12px' }}>
              Print / Save PDF 🖨️
            </button>
            <button className="secondary-button" onClick={onClose} style={{ fontSize: '12px' }}>
              Close
            </button>
          </div>
        </div>

        {/* Executive Overview KPI Grid */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
          <div className="stat-card" style={{ padding: '14px' }}>
            <small>Active Portfolios</small>
            <strong style={{ fontSize: '22px' }}>{projects.length}</strong>
          </div>
          <div className="stat-card" style={{ padding: '14px' }}>
            <small>Total Task Items</small>
            <strong style={{ fontSize: '22px' }}>{tasks.length}</strong>
          </div>
          <div className="stat-card" style={{ padding: '14px' }}>
            <small>Completion Rate</small>
            <strong style={{ fontSize: '22px', color: 'var(--teal)' }}>{pct}%</strong>
          </div>
          <div className="stat-card" style={{ padding: '14px' }}>
            <small>Active Roster</small>
            <strong style={{ fontSize: '22px' }}>{teamMembers.length}</strong>
          </div>
        </div>

        {/* Project Breakdown Table */}
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', marginBottom: '10px' }}>1. Project Deliverable Status</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: 'var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Project Name</th>
              <th style={{ padding: '8px 12px' }}>Client</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Progress</th>
              <th style={{ padding: '8px 12px' }}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 12px' }}><b>{p.name}</b></td>
                <td style={{ padding: '10px 12px' }}>{p.client}</td>
                <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{p.status}</td>
                <td style={{ padding: '10px 12px', color: 'var(--teal)', fontWeight: '700' }}>{p.progress}%</td>
                <td style={{ padding: '10px 12px' }}>{formatDate(p.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Team Workload Table */}
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', marginBottom: '10px' }}>2. Resource Capacity & Allocation</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Member Name</th>
              <th style={{ padding: '8px 12px' }}>Role</th>
              <th style={{ padding: '8px 12px' }}>Capacity Limit</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 12px' }}><b>{m.name}</b></td>
                <td style={{ padding: '10px 12px' }}>{m.role}</td>
                <td style={{ padding: '10px 12px' }}>{m.capacity}% Max Weekly</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- LandingPage Component ---
interface LandingPageProps {
  onLogin: (user: UserAccount) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  logoLoaded: boolean;
  logoRef: React.RefObject<HTMLImageElement | null>;
  setLogoLoaded: (val: boolean) => void;
  teamMembers: TeamMember[];
}

function LandingPage({ onLogin, darkMode, onToggleTheme, logoLoaded, logoRef, setLogoLoaded, teamMembers }: LandingPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'pm' | 'member' | 'viewer'>('pm');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [localAccounts, setLocalAccounts] = useState<UserAccount[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('hub_registered_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getRoleDetails = (roleStr: string): { role: 'admin' | 'pm' | 'member' | 'viewer'; roleTitle: string } => {
    const lower = roleStr.toLowerCase();
    if (lower.includes('admin')) return { role: 'admin', roleTitle: 'Workspace Admin' };
    if (lower.includes('manager') || lower.includes('pm')) return { role: 'pm', roleTitle: 'Project Manager' };
    if (lower.includes('viewer') || lower.includes('guest') || lower.includes('client')) return { role: 'viewer', roleTitle: 'Client Viewer' };
    return { role: 'member', roleTitle: roleStr || 'Team Member' };
  };

  const allAccountsMap = new Map<string, UserAccount>();

  DEMO_USERS.forEach(acc => {
    allAccountsMap.set(acc.email.toLowerCase(), acc);
  });

  teamMembers.forEach(m => {
    const details = getRoleDetails(m.role);
    const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    allAccountsMap.set(m.email.toLowerCase(), {
      id: m.id,
      name: m.name,
      email: m.email,
      role: details.role,
      roleTitle: details.roleTitle,
      avatar: initials,
    });
  });

  localAccounts.forEach(acc => {
    allAccountsMap.set(acc.email.toLowerCase(), acc);
  });

  const systemAccounts = Array.from(allAccountsMap.values());

  const passLength = passwordInput.length;
  const isLengthValid = passLength >= 4 && passLength <= 8;
  const isTooShort = passLength > 0 && passLength < 4;
  const isTooLong = passLength > 8;

  const passHasUpper = /[A-Z]/.test(passwordInput);
  const passHasLower = /[a-z]/.test(passwordInput);
  const passHasNumber = /[0-9]/.test(passwordInput);
  const passHasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordInput);

  const categoriesPresent = [passHasUpper, passHasLower, passHasNumber, passHasSymbol].filter(Boolean).length;
  const hasMinCategories = categoriesPresent >= 2;

  const isPasswordValid = isLengthValid && hasMinCategories;
  const isPasswordError = passLength > 0 && (!isLengthValid || !hasMinCategories);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!emailInput.trim()) {
      setAuthError('Please enter your email address.');
      return;
    }

    if (!passwordInput.trim()) {
      setAuthError('Please enter your password.');
      return;
    }

    if (isSignUp) {
      if (!nameInput.trim()) {
        setAuthError('Please enter your full name to create an account.');
        return;
      }
      if (!isPasswordValid) {
        if (isTooShort) {
          setAuthError('Password Security Error: Password is too short! Must be between 4 and 8 characters.');
        } else if (isTooLong) {
          setAuthError('Password Security Error: Password is too long! Maximum length is 8 characters.');
        } else if (!hasMinCategories) {
          setAuthError('Password Security Error: Password must contain a mixture of at least 2 character types (e.g., numbers, symbols, uppercase, lowercase).');
        } else {
          setAuthError('Password Security Error: Password must be 4–8 characters long with at least 2 character types.');
        }
        return;
      }
    } else {
      if (!isPasswordValid) {
        if (isTooShort) {
          setAuthError('Invalid Password: Password is too short! Minimum 4 characters required.');
        } else if (isTooLong) {
          setAuthError('Invalid Password: Password exceeds maximum 8 character limit.');
        } else if (!hasMinCategories) {
          setAuthError('Invalid Password: Password must contain at least 2 character types (e.g., numbers, symbols, letters).');
        }
        return;
      }
    }

    const emailClean = emailInput.trim().toLowerCase();
    const matched = systemAccounts.find(u => u.email.toLowerCase() === emailClean);

    if (matched) {
      onLogin(matched);
      return;
    }

    if (!isSignUp) {
      setAuthError(`No account found for "${emailClean}". Please check your email or click "Create Account" to register.`);
      return;
    }

    const userName = nameInput.trim() || emailClean.split('@')[0] || 'Workspace User';
    const roleTitleMap = {
      admin: 'Workspace Admin',
      pm: 'Project Manager',
      member: 'Team Member',
      viewer: 'Client Viewer',
    };

    const newUser: UserAccount = {
      id: systemAccounts.length + 100,
      name: userName,
      email: emailClean,
      role: roleInput,
      roleTitle: roleTitleMap[roleInput],
      avatar: userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    };

    try {
      const updatedLocal = [...localAccounts, newUser];
      setLocalAccounts(updatedLocal);
      localStorage.setItem('hub_registered_accounts', JSON.stringify(updatedLocal));
    } catch {
      // ignore
    }

    fetch('/api/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userName,
        email: emailClean,
        role: roleTitleMap[roleInput],
        capacity: 100,
      }),
    }).catch(err => console.error('Failed to save user account to database:', err));

    onLogin(newUser);
  };

  const handleSelectAccount = (acc: UserAccount) => {
    setEmailInput(acc.email);
    setPasswordInput('••••••••');
    onLogin(acc);
  };

  return (
    <div className="landing-shell">
      <div className="landing-glow-bg" />

      {/* Navigation Header */}
      <header className="landing-header">
        <div className="brand" style={{ gap: '12px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            ref={logoRef}
            src="/logo.webp" 
            alt="Avensus Logo"
            onLoad={() => setLogoLoaded(true)}
            onError={(e) => { e.currentTarget.style.display = 'none'; setLogoLoaded(false); }}
            style={{ display: logoLoaded ? 'block' : 'none', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
          />
          {!logoLoaded && <span className="brand-mark">A</span>}
          <span>
            <b>Avensus</b>
            <small>Project Hub</small>
          </span>
        </div>

        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#roles">Team Accounts</a>
          <button className="nav-item" onClick={onToggleTheme} style={{ padding: '6px 12px', fontSize: '12px' }}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </nav>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="landing-content">
        <section className="landing-hero">
          {/* Left Column: Enterprise Workspace Overview & Registered Team Accounts */}
          <div className="landing-hero-copy">
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: '8px' }}>ENTERPRISE WORKSPACE PORTAL</span>
            <h1>Manage Projects & Teams with Unmatched Speed.</h1>
            <p>
              Avensus Project Hub unifies relational database tracking, dynamic Kanban boards, 
              Gantt timelines, and team capacity monitoring into a single, high-speed platform.
            </p>

            <div id="roles" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '13px' }}>🏢 Active Workspace Team Members</strong>
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Click to select account</small>
              </div>
              <div className="demo-role-grid">
                {systemAccounts.map(user => (
                  <button 
                    key={user.id}
                    className="role-pill"
                    onClick={() => handleSelectAccount(user)}
                    style={{ textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <b>{user.name}</b>
                      <span className={`role-badge-pill ${user.role}`}>{user.role}</span>
                    </div>
                    <small>{user.email} • {user.roleTitle}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Secure Authentication Card */}
          <div className="landing-card" id="auth">
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <button
                onClick={() => { setIsSignUp(false); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: 'none',
                  background: !isSignUp ? 'var(--teal)' : 'transparent',
                  color: !isSignUp ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsSignUp(true); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: 'none',
                  background: isSignUp ? 'var(--teal)' : 'transparent',
                  color: isSignUp ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Create Account
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span className="eyebrow">{isSignUp ? 'NEW ACCOUNT SETUP' : 'SECURE SIGN IN'}</span>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', margin: '4px 0 0' }}>
                {isSignUp ? 'Create Workspace Account' : 'Sign In to Dashboard'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {isSignUp ? 'Register your account to access Avensus Project Hub' : 'Enter your email and password to access your dashboard'}
              </p>
            </div>

            {authError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isSignUp && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="signup-name">Full Name</label>
                  <input 
                    id="signup-name"
                    type="text"
                    placeholder="e.g. Patricia Banda"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="login-email">Email Address</label>
                <input 
                  id="login-email"
                  type="email"
                  placeholder="e.g. user@avensus.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label htmlFor="login-password" style={{ margin: 0 }}>Password (4–8 Characters)</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--teal)',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? '🙈 Hide Password' : '👁️ View Password'}
                  </button>
                </div>

                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    maxLength={8}
                    placeholder="e.g. Ab1#"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: '8px',
                      border: isPasswordError ? '2px solid #ef4444' : (isPasswordValid ? '2px solid #10b981' : '1px solid var(--border-color)'),
                      background: isPasswordError ? 'rgba(239, 68, 68, 0.08)' : (isPasswordValid ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-color)'),
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'View password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px',
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {passLength > 0 && (
                <div style={{
                  background: isPasswordError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  border: `1px solid ${isPasswordError ? '#ef4444' : '#10b981'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '11px',
                  marginTop: '-4px',
                }}>
                  <div style={{ fontWeight: '700', color: isPasswordError ? '#ef4444' : '#10b981', marginBottom: '4px' }}>
                    {isPasswordError ? '❌ Password Requirements Not Met (Highlighted in Red)' : '✓ Valid Password'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <span style={{ color: isLengthValid ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {isLengthValid ? '✓' : '❌'} Length: 4–8 Chars ({passLength}/8)
                    </span>
                    <span style={{ color: hasMinCategories ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {hasMinCategories ? '✓' : '❌'} Mixture: {categoriesPresent}/2 Types
                    </span>
                  </div>

                  {isTooShort && (
                    <div style={{ color: '#ef4444', marginTop: '6px', fontWeight: '700', fontSize: '11px' }}>
                      ⚠️ Password is too short! Must be at least 4 characters.
                    </div>
                  )}
                  {isTooLong && (
                    <div style={{ color: '#ef4444', marginTop: '6px', fontWeight: '700', fontSize: '11px' }}>
                      ⚠️ Password limit exceeded! Maximum 8 characters allowed.
                    </div>
                  )}
                  {!hasMinCategories && passLength >= 4 && (
                    <div style={{ color: '#ef4444', marginTop: '6px', fontWeight: '700', fontSize: '11px' }}>
                      ⚠️ Must include a mixture of at least 2 required character types (e.g. letters, numbers, or symbols).
                    </div>
                  )}
                </div>
              )}

              {isSignUp && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="signup-role">Workspace Role</label>
                  <select
                    id="signup-role"
                    value={roleInput}
                    onChange={e => setRoleInput(e.target.value as 'admin' | 'pm' | 'member' | 'viewer')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                  >
                    <option value="admin">👑 Workspace Admin (Full Control)</option>
                    <option value="pm">💼 Project Manager (Project & Task CRUD)</option>
                    <option value="member">🎨 Team Member (Task Progress & Status)</option>
                    <option value="viewer">👁️ Client Viewer (Read-only)</option>
                  </select>
                </div>
              )}

              <button type="submit" className="primary-button" style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '14px', fontWeight: '700' }}>
                {isSignUp ? 'Complete Account Registration →' : 'Sign In to Workspace →'}
              </button>
            </form>

            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
              <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                🔒 256-bit Encrypted Session • Avensus Technologies Zambia
              </small>
            </div>
          </div>
        </section>

        {/* Feature Showcase Grid */}
        <section id="features" style={{ marginTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span className="eyebrow">PLATFORM CAPABILITIES</span>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', margin: '6px 0' }}>Built for High-Performing Teams</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Everything you need to deliver client portfolios ahead of schedule.</p>
          </div>

          <div className="landing-features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(13, 148, 136, 0.15)', color: 'var(--teal)' }}>◇</div>
              <h3>Portfolio Progress</h3>
              <p>Relational SQLite D1 database engine tracking overall client progress percentage in real-time.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(217, 119, 6, 0.15)', color: 'var(--gold)' }}>✓</div>
              <h3>Kanban Sprints</h3>
              <p>Interactive task board with To Do, In Progress, Review, and Done column state movements.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>⏱️</div>
              <h3>Early Completion</h3>
              <p>Gantt schedule timelines with dynamic status badges for tasks delivered ahead of deadlines.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>◎</div>
              <h3>Resource Workload</h3>
              <p>Dynamic capacity distribution and workload limit tracking across all active team members.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '24px 40px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
        <p>© 2026 Avensus Project Hub. Built with React Server Components & Cloudflare D1.</p>
      </footer>
    </div>
  );
}

// --- ProjectDetailView Component ---
interface ProjectDetailProps {
  projectId: number;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  onToggleTask: (id: number, status: string) => void;
  onUpdateTaskStatus: (id: number, status: string) => void;
  onUpdateProjectStatus: (id: number, status: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: number) => void;
  onEditProject: (proj: Project) => void;
  onDeleteProject: (id: number) => void;
  formatDate: (d: string | null) => string;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
}

function ProjectDetailView({
  projectId,
  projects,
  tasks,
  onBack,
  onToggleTask,
  onUpdateTaskStatus,
  onUpdateProjectStatus,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditProject,
  onDeleteProject,
  formatDate,
  canEditProject,
  canDeleteProject,
  canCreateTask,
  canEditTask,
  canDeleteTask,
}: ProjectDetailProps) {
  const project = projects.find(p => p.id === projectId);
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  
  if (!project) {
    return (
      <div style={{ padding: '24px' }}>
        <button className="secondary-button" onClick={onBack}>← Back to Projects</button>
        <p style={{ marginTop: '20px' }}>Project not found.</p>
      </div>
    );
  }

  const finishedCount = projectTasks.filter(t => t.status === 'done').length;
  
  return (
    <div className="view-container">
      <div className="welcome" style={{ marginBottom: '20px' }}>
        <div>
          <button className="secondary-button" onClick={onBack} style={{ marginBottom: '14px', padding: '6px 12px' }}>
            ← Back to Portfolio
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="project-badge teal">
              {project.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px' }}>{project.name}</h1>
              <p style={{ margin: '4px 0 0' }}>Client: <b>{project.client}</b></p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            disabled={!canEditProject}
            value={project.status} 
            onChange={(e) => onUpdateProjectStatus(project.id, e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
          {canEditProject && (
            <button className="secondary-button" style={{ color: 'var(--teal)' }} onClick={() => onEditProject(project)}>
              ✏️ Edit
            </button>
          )}
          {canDeleteProject && (
            <button className="secondary-button" style={{ color: '#ef4444' }} onClick={() => onDeleteProject(project.id)}>
              🗑️ Delete
            </button>
          )}
          {canCreateTask && (
            <button className="primary-button" onClick={onAddTask}>
              ＋ Add task
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="stat-card">
          <p>Task Completion</p>
          <strong>{project.progress}%</strong>
          <small>{finishedCount} of {projectTasks.length} tasks completed</small>
        </div>
        <div className="stat-card">
          <p>Deadline</p>
          <strong>{formatDate(project.dueDate)}</strong>
          <small>Project Target Delivery Date</small>
        </div>
        <div className="stat-card">
          <p>Task Backlog</p>
          <strong>{projectTasks.filter(t => t.status !== 'done').length}</strong>
          <small>Open items requiring action</small>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Project Backlog & Task checklist</h2>
          <p>Check off tasks to dynamically increase project completion rate</p>
        </div>
        <div className="task-list">
          {projectTasks.map(t => (
            <div className="task-row" key={t.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(130px, 1fr) 70px 60px 100px 60px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={t.status === 'done'} 
                  onChange={() => onToggleTask(t.id, t.status)} 
                />
                <span className="fake-check" />
              </label>
              <span className={`task-main ${t.status === 'done' ? 'completed' : ''}`}>
                <b>{t.title}</b>
                <small>Assigned to: {t.assignee || 'Unassigned'}</small>
                {t.attachment && <small style={{ color: 'var(--teal)', display: 'block', marginTop: '2px' }}>📎 {t.attachment}</small>}
              </span>
              <span className={`priority ${t.priority.toLowerCase()}`}>
                {t.priority}
              </span>
              <span className="due-date">🕒 {formatDate(t.dueDate)}</span>
              <select
                value={t.status}
                onChange={(e) => onUpdateTaskStatus(t.id, e.target.value)}
                style={{ fontSize: '11px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', alignSelf: 'center', justifyContent: 'flex-end' }}>
                {canEditTask && <button className="more" style={{ color: 'var(--teal)' }} onClick={() => onEditTask(t)}>✏️</button>}
                {canDeleteTask && <button className="more" style={{ color: '#ef4444' }} onClick={() => onDeleteTask(t.id)}>🗑️</button>}
              </div>
            </div>
          ))}
          {projectTasks.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
              <h3>No tasks in this project yet</h3>
              <p>Add a task to begin tracking work items.</p>
              {canCreateTask && (
                <button className="secondary-button" style={{ marginTop: '10px' }} onClick={onAddTask}>
                  ＋ Add task card
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AUTOMATED NOTIFICATIONS DRAWER COMPONENT ---
interface NotificationDrawerProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpenIntegrations: () => void;
}

function NotificationDrawer({ notifications, onClose, onMarkAllRead, onOpenIntegrations }: NotificationDrawerProps) {
  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '60px',
          right: '24px',
          width: '380px',
          maxHeight: '80vh',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
          <div>
            <span className="eyebrow">AUTOMATED ALERTS</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'Outfit, sans-serif' }}>Notification Center</h3>
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>

        <div style={{ padding: '8px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
          <button className="secondary-button" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={onMarkAllRead}>
            ✓ Mark All Read
          </button>
          <button className="secondary-button" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--teal)' }} onClick={onOpenIntegrations}>
            ⚡ Webhook Settings
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {notifications.map(n => {
            const isUnread = n.read === 0;
            const notifIcon = n.type === 'assignment' ? '📌' : (n.type === 'status' ? '🔄' : (n.type === 'overdue' ? '🚨' : '🚀'));
            return (
              <div 
                key={n.id} 
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  marginBottom: '8px',
                  background: isUnread ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                  border: isUnread ? '1px solid rgba(13, 148, 136, 0.25)' : '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '18px' }}>{notifIcon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <b style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{n.title}</b>
                    {isUnread && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--teal)' }} />}
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</p>
                </div>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
              No notifications yet. Alerts will appear here automatically when tasks are assigned or updated.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- INTEGRATION SETTINGS MODAL COMPONENT ---
interface IntegrationModalProps {
  onClose: () => void;
  onTestWebhook: (url: string) => void;
}

function IntegrationSettingsModal({ onClose, onTestWebhook }: IntegrationModalProps) {
  const [webhookUrl, setWebhookUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('hub_webhook_url') || '';
  });
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableSlack, setEnableSlack] = useState(true);

  const handleSave = () => {
    localStorage.setItem('hub_webhook_url', webhookUrl.trim());
    localStorage.setItem('hub_email_notifs', enableEmail ? 'true' : 'false');
    localStorage.setItem('hub_slack_notifs', enableSlack ? 'true' : 'false');
    alert('Automated Notification Integration Settings saved!');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">AUTOMATION & INTEGRATIONS</span>
            <h3 style={{ margin: 0 }}>Notification Integration Settings</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px' }}>
            ⚡ <b>Real-time Dispatch Integration</b><br />
            Automatically post real-time alerts when tasks are assigned, statuses change, or milestones are reached.
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="webhook-url">Slack / Microsoft Teams Webhook URL</label>
            <input 
              id="webhook-url" 
              type="text" 
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            />
            <small style={{ color: 'var(--muted)', marginTop: '4px', display: 'block', fontSize: '11px' }}>
              Paste your Slack Webhook or Microsoft Teams Connector URL to receive channel alerts.
            </small>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={enableSlack} onChange={e => setEnableSlack(e.target.checked)} />
              <span>Enable Slack / Teams Real-time Channel Webhooks</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={enableEmail} onChange={e => setEnableEmail(e.target.checked)} />
              <span>Enable Email Task Assignment & Overdue Digest Alerts</span>
            </label>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="secondary-button" onClick={() => onTestWebhook(webhookUrl)}>
            🧪 Test Webhook Payload
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save Integration Settings →
          </button>
        </div>
      </div>
    </div>
  );
}

// --- WORK ORDERS & TICKETS DASHBOARD COMPONENT ---
interface WorkOrdersViewProps {
  tickets: Ticket[];
  projects: Project[];
  currentUser: UserAccount | null;
  onOpenCreateModal: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  onDeleteTicket: (id: number) => void;
  formatDate: (d: string | null | undefined) => string;
}

function WorkOrdersView({
  tickets,
  projects,
  currentUser,
  onOpenCreateModal,
  onUpdateStatus,
  onDeleteTicket,
  formatDate,
}: WorkOrdersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = tickets.filter(t => {
    if (currentUser?.role === 'member') {
      const uName = currentUser.name.toLowerCase();
      const uEmail = currentUser.email.toLowerCase();
      const assigneeLower = t.assignee.toLowerCase();
      const createdByLower = t.createdBy.toLowerCase();
      if (!assigneeLower.includes(uName) && !assigneeLower.includes(uEmail) && !createdByLower.includes(uName)) {
        return false;
      }
    }

    const matchesSearch = t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="welcome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">OPERATIONAL TICKETING SYSTEM</p>
          <h1 style={{ margin: 0 }}>Work Orders & Technical Tickets</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '13px' }}>
            Dispatch, assign, and track technical work orders and client support tickets across team members.
          </p>
        </div>
        <button className="primary-button" onClick={onOpenCreateModal}>
          ＋ New Work Order Ticket
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <div className="stat-card">
          <p>Total Work Orders</p>
          <strong>{tickets.length}</strong>
          <small>Total tickets issued</small>
        </div>
        <div className="stat-card">
          <p>Open Tickets</p>
          <strong style={{ color: '#ef4444' }}>{openCount}</strong>
          <small>Awaiting action</small>
        </div>
        <div className="stat-card">
          <p>In Progress</p>
          <strong style={{ color: 'var(--copper)' }}>{inProgressCount}</strong>
          <small>Active technical work</small>
        </div>
        <div className="stat-card">
          <p>Resolved / Closed</p>
          <strong style={{ color: 'var(--teal)' }}>{resolvedCount}</strong>
          <small>Completed work orders</small>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Work Order Dispatch Board</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>Filter work orders by ticket number, category, or status</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="text"
              placeholder="Search WO#, title, or assignee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', width: '220px' }}
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Categories</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Network">Network</option>
              <option value="Software">Software</option>
              <option value="Database">Database</option>
              <option value="Hardware">Hardware</option>
              <option value="Maintenance">Maintenance</option>
              <option value="General">General</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending SLA</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          {filtered.map(t => {
            const linkedProj = projects.find(p => p.id === t.projectId);
            const isUrgent = t.priority === 'urgent' || t.priority === 'high';
            return (
              <div 
                key={t.id}
                style={{
                  background: 'var(--bg-color)',
                  border: isUrgent ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', background: 'rgba(30, 90, 99, 0.15)', color: 'var(--teal)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>
                      {t.ticketNumber}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>{t.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      📂 {t.category}
                    </span>
                    <span className={`priority ${t.priority.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                      {t.priority}
                    </span>
                    <select
                      value={t.status}
                      onChange={e => onUpdateStatus(t.id, e.target.value)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        border: '1px solid var(--border-color)',
                        background: t.status === 'resolved' || t.status === 'closed' ? 'rgba(13, 148, 136, 0.15)' : (t.status === 'in_progress' ? 'rgba(234, 106, 41, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                        color: t.status === 'resolved' || t.status === 'closed' ? 'var(--teal)' : (t.status === 'in_progress' ? 'var(--copper)' : '#ef4444'),
                        cursor: 'pointer',
                      }}
                    >
                      <option value="open">🔴 Open</option>
                      <option value="in_progress">🟠 In Progress</option>
                      <option value="pending">🟡 Pending SLA</option>
                      <option value="resolved">🟢 Resolved</option>
                      <option value="closed">⚪ Closed</option>
                    </select>
                    <button 
                      onClick={() => onDeleteTicket(t.id)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                      title="Delete Work Order"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {t.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span>👤 Assigned to: <b style={{ color: 'var(--text-primary)' }}>{t.assignee}</b></span>
                    <span>📝 Issued by: <b>{t.createdBy}</b></span>
                    {linkedProj && <span>📁 Linked Project: <b style={{ color: 'var(--teal)' }}>{linkedProj.name}</b></span>}
                  </div>
                  <div>
                    <span>🕒 SLA Due Target: <b style={{ color: t.dueDate ? 'var(--text-primary)' : 'var(--muted)' }}>{formatDate(t.dueDate)}</b></span>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎫</div>
              <h3>No work orders match your search or filters</h3>
              <p style={{ fontSize: '12px' }}>Click &quot;New Work Order Ticket&quot; above to issue a new technical support order.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- WORK ORDER MODAL COMPONENT ---
interface WorkOrderModalProps {
  projects: Project[];
  teamMembers: TeamMember[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  setPriority: (v: 'low' | 'medium' | 'high' | 'urgent') => void;
  assignee: string;
  setAssignee: (v: string) => void;
  projectId: number | null;
  setProjectId: (v: number | null) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
}

function WorkOrderModal({
  projects,
  teamMembers,
  onClose,
  onSubmit,
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  priority,
  setPriority,
  assignee,
  setAssignee,
  projectId,
  setProjectId,
  dueDate,
  setDueDate,
}: WorkOrderModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">WORK ORDER DISPATCH</span>
            <h3 style={{ margin: 0 }}>Issue New Technical Work Order</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label htmlFor="wo-title">Work Order Title *</label>
            <input 
              id="wo-title"
              type="text"
              required
              placeholder="e.g. Core Switch Firmware Upgrade & VLAN Audit"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="wo-category">Technical Category</label>
              <select id="wo-category" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Network">Network</option>
                <option value="Software">Software</option>
                <option value="Database">Database</option>
                <option value="Hardware">Hardware</option>
                <option value="Maintenance">Maintenance</option>
                <option value="General">General</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="wo-priority">Work Order Priority</label>
              <select id="wo-priority" value={priority} onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent / Emergency</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="wo-assignee">Assigned Team Member *</label>
              <select id="wo-assignee" required value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">Select Assignee...</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="wo-project">Linked Project Portfolio (Optional)</label>
              <select 
                id="wo-project" 
                value={projectId || ''} 
                onChange={e => setProjectId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">None (Independent Work Order)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="wo-duedate">SLA Target Completion Date</label>
            <input 
              id="wo-duedate"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="wo-desc">Work Order Instructions / Description *</label>
            <textarea
              id="wo-desc"
              required
              rows={4}
              placeholder="Provide clear technical instructions, diagnostic requirements, or resolution criteria..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">Issue Work Order →</button>
        </div>
      </form>
    </div>
  );
}


