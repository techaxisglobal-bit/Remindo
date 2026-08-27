import { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/app/api";
import { Toaster } from "@/app/components/ui/sonner";
import { SignIn } from "@/app/components/SignIn";
import { Dashboard } from "@/app/components/Dashboard";
import InvitationHandler from "@/app/components/InvitationHandler";
import { Task, User } from "@/app/types";
import { toast } from "sonner";
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { tokenManager } from '../utils/tokenManager';
import { fetchWithAuth } from '../utils/apiClient';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Store tasks with pre-parsed metadata and dates for performance
  const processedTasks = useMemo(() => {
    return tasks.map(t => {
      let isSpecial = (t as any).isSpecial;
      let meta = (t as any).metadata || {};

      if (!isSpecial && t.description?.includes('<!-- metadata:')) {
        const match = t.description.match(/<!-- metadata: (.+) -->/);
        if (match) {
          try {
            const parsedMeta = JSON.parse(match[1]);
            if (parsedMeta.isSpecial) isSpecial = true;
            meta = parsedMeta;
          } catch (e) { }
        }
      }
      return { ...t, isSpecial, metadata: meta };
    });
  }, [tasks]);

  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  });

  useEffect(() => {
    // Load theme - default to light mode
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedUser = localStorage.getItem('user');
    const initializeUser = async () => {
      const token = await tokenManager.getAccessToken();
      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          fetchTasks();
        } catch (e) {
          await tokenManager.clearTokens();
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeUser();

    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem('user');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (notificationsEnabled && user) {
      registerPush();
    }
  }, [notificationsEnabled, user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const saveFCMTokenToBackend = async (fcmToken: string) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetchWithAuth(`/api/auth/save-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fcmToken, timezone })
      });
      console.log('FCM token and timezone synchronized with backend successfully');
    } catch (err) {
      console.error('Failed to save FCM token to backend:', err);
    }
  };

  const registerPush = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Forcefully request permissions without checking first, as checkPermissions can sometimes hang or fail on clean installs
        let permStatus = await FirebaseMessaging.requestPermissions();

        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permissions denied by user');
          toast.warning(`Push permissions are: ${permStatus.receive}`);
          return;
        }

        // Instantly synchronize if we already have a cached token in localStorage!
        const cachedToken = localStorage.getItem('fcmToken');
        if (cachedToken) {
          console.log('Syncing cached native FCM Token:', cachedToken);
          await saveFCMTokenToBackend(cachedToken);
        }

        await FirebaseMessaging.addListener('tokenReceived', async (event) => {
          console.log('Native FCM Token received:', event.token);
          localStorage.setItem('fcmToken', event.token);
          await saveFCMTokenToBackend(event.token);
        });

        const { token } = await FirebaseMessaging.getToken();
        if (token) {
          console.log('Got FCM token from getToken():', token);
          localStorage.setItem('fcmToken', token);
          await saveFCMTokenToBackend(token);
        }

        await FirebaseMessaging.addListener('notificationReceived', (event) => {
          console.log('Foreground push notification received:', event.notification);
          toast.info(`${event.notification.title}: ${event.notification.body || ''}`);
        });

        await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
          console.log('Push notification click action performed:', event.notification);
        });

        await LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Local notification fired:', notification);
        });

        await LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          console.log('Local notification action performed:', notificationAction);
        });

      } catch (err: any) {
        console.error('Failed to register for push notifications:', err);
        toast.error(`Push Setup Failed: ${err?.message || err}`);
      }
    } else {
      if (!('serviceWorker' in navigator)) return;

      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js');
        }

        let subscription = await registration.pushManager.getSubscription();

        // Force unsubscribe from stale/cached tokens to guarantee fresh VAPID keys and user alignment!
        if (subscription) {
          try {
            await subscription.unsubscribe();
          } catch (e) {
            console.warn('Failed to unsubscribe stale push token:', e);
          }
          subscription = null;
        }

        if (!subscription) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            toast.warning('Push notification permissions are required.');
            return;
          }

          const publicVapidKey = 'BDap98w3jlmZUFtlSo9rvFaMxjIUnipFKkCTAdJaE_KI_MIYPQJlHPBuUwEtqNN8gS-kNNdpUaMPnAj4DXk8OsY';
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });
        }

        if (subscription) {
          const res = await fetchWithAuth(`/api/auth/save-subscription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.msg || errData.error || `HTTP error ${res.status}`);
          }

          console.log('Web VAPID subscription synchronized successfully');
          toast.success('Notification keys synchronized successfully! Ready to test!');
        }
      } catch (err: any) {
        console.error('Web VAPID push registration failed:', err);
        toast.error(`Push registration failed: ${err.message || err}`);
      }
    }
  };

  const handleToggleNotifications = async () => {
    const newVal = !notificationsEnabled;

    try {
      await fetchWithAuth(`/api/auth/update-notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: newVal })
      });

      setNotificationsEnabled(newVal);
      localStorage.setItem('notificationsEnabled', String(newVal));

      if (newVal) {
        toast.success('Notifications enabled');
        registerPush();
      } else {
        toast.info('Notifications disabled');
      }
    } catch (err) {
      console.error('Failed to update notification settings:', err);
      toast.error('Failed to update settings');
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetchWithAuth(`/api/tasks`);
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched tasks:', data); // Added logging
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const handleSignIn = (email: string) => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchTasks();
    }
  };

  const handleUpdateUser = (updatedUserData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updatedUserData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const generateNotificationId = (taskId: string, offset: number) => {
    let hash = 0;
    const str = `${taskId}-${offset}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const scheduleLocalNotifications = async (task: Task) => {
    if (!Capacitor.isNativePlatform() || !notificationsEnabled) return;
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const reqStatus = await LocalNotifications.requestPermissions();
        if (reqStatus.display !== 'granted') return;
      }
      
      if (!task.date || !task.time) return;
      
      const taskDate = new Date(`${task.date}T${task.time}:00`);
      
      const notificationsToSchedule = [];
      const cancelIds = [];
      
      const taskId = String(task.id || (task as any)._id);
      cancelIds.push({ id: generateNotificationId(taskId, 0) });
      [5, 10, 15, 30, 60, 1440].forEach(m => {
         cancelIds.push({ id: generateNotificationId(taskId, m) });
      });
      await LocalNotifications.cancel({ notifications: cancelIds });
      
      if (task.completed) {
         console.log(`Task completed, cancelled notifications for ${taskId}`);
         return;
      }
      
      if (taskDate.getTime() > Date.now()) {
        notificationsToSchedule.push({
          id: generateNotificationId(taskId, 0),
          title: task.title,
          body: 'This task is starting now!',
          schedule: { at: taskDate },
          sound: 'default',
          extra: { taskId }
        });
      }
      
      if (task.notifyBefore) {
        const minutesList = String(task.notifyBefore)
            .split(',')
            .map(m => parseInt(m.trim(), 10))
            .filter(m => !isNaN(m) && m > 0);
            
        for (const minute of minutesList) {
          const notifyDate = new Date(taskDate.getTime() - minute * 60000);
          if (notifyDate.getTime() > Date.now()) {
             notificationsToSchedule.push({
                id: generateNotificationId(taskId, minute),
                title: task.title,
                body: `Starting in ${minute} minutes`,
                schedule: { at: notifyDate },
                sound: 'default',
                extra: { taskId }
             });
          }
        }
      }
      
      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`Scheduled ${notificationsToSchedule.length} local notifications for task ${taskId}:`, notificationsToSchedule.map(n => n.schedule?.at));
      }
    } catch (err) {
      console.error('Failed to schedule local notifications:', err);
    }
  };

  const cancelLocalNotifications = async (taskId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const cancelIds = [];
      cancelIds.push({ id: generateNotificationId(taskId, 0) });
      [5, 10, 15, 30, 60, 1440].forEach(m => {
         cancelIds.push({ id: generateNotificationId(taskId, m) });
      });
      await LocalNotifications.cancel({ notifications: cancelIds });
      console.log(`Cancelled local notifications for task ${taskId}`);
    } catch (err) {
      console.error('Failed to cancel local notifications:', err);
    }
  };

  const handleAddTask = async (task: Task): Promise<boolean> => {
    // Optimistic UI: Add task to state immediately with temporary ID
    const tempId = task.id || `temp-${Date.now()}`;
    const taskWithId = { ...task, id: tempId };
    setTasks(prev => [...prev, taskWithId]);

    try {
      const res = await fetchWithAuth(`/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const newTask = await res.json();
        // Replace the temporary task with the real one from the server
        setTasks(prev => prev.map(t => (t.id === tempId || (t as any)._id === tempId) ? newTask : t));
        scheduleLocalNotifications(newTask);
        return true;
      } else {
        // Rollback on failure
        setTasks(prev => prev.filter(t => t.id !== tempId && (t as any)._id !== tempId));
        toast.error('Failed to save task');
        return false;
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      // Rollback on error
      setTasks(prev => prev.filter(t => t.id !== tempId && (t as any)._id !== tempId));
      toast.error('Failed to save task');
      return false;
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Optimistic UI: Remove task from state immediately
    const deletedTask = tasks.find(t => (t as any)._id === id || t.id === id);
    setTasks(prev => prev.filter(task => (task as any)._id !== id && task.id !== id));

    try {
      const res = await fetchWithAuth(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTasks(prev => prev.filter(task => (task as any)._id !== id && task.id !== id));
        cancelLocalNotifications(id);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const taskToToggle = tasks.find(t => (t as any)._id === id || t.id === id);
    if (!taskToToggle) return;

    try {
      const res = await fetchWithAuth(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: !taskToToggle.completed })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? updatedTask : t));
        toast.success(updatedTask.completed ? "Task completed! 🎉" : "Task marked as pending");
        if (updatedTask.completed) {
           cancelLocalNotifications(id);
        } else {
           scheduleLocalNotifications(updatedTask);
        }
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleUpdateTask = async (updatedTask: Task): Promise<boolean> => {
    const id = (updatedTask as any)._id || updatedTask.id;
    if (!id) return false;

    // Optimistic UI: Update state immediately
    const originalTask = tasks.find(t => ((t as any)._id === id || t.id === id));
    setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? updatedTask : t));

    try {
      const res = await fetchWithAuth(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTask)
      });
      if (res.ok) {
        const savedTask = await res.json();
        const savedId = (savedTask as any)._id || savedTask.id;

        if (savedId !== id) {
          // If the ID is different, it means a new task was created (e.g. date change duplication)
          // We should remove the optimistic update of the original task and add the new one
          setTasks(prev => {
            const filtered = prev.filter(t => (t as any)._id !== id && t.id !== id);
            return [...filtered, savedTask];
          });
          cancelLocalNotifications(id);
          scheduleLocalNotifications(savedTask);
        } else {
          // Sync with server version
          setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? savedTask : t));
          scheduleLocalNotifications(savedTask);
        }
        return true;
      } else {
        // Rollback on failure
        if (originalTask) {
          setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? originalTask : t));
        }
        toast.error('Failed to update task');
        return false;
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      if (originalTask) {
        setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? originalTask : t));
      }
      toast.error('Failed to update task');
      return false;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-black"></div>;
  }

  // Handle invitation route
  if (window.location.pathname === '/invite') {
    return (
      <>
        <InvitationHandler onNavigate={(path) => window.location.href = path} />
        <Toaster position="top-center" duration={3000} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SignIn onSignIn={handleSignIn} />
        <Toaster position="top-center" duration={3000} />
      </>
    );
  }

  return (
    <>
      <Dashboard
        user={user}
        tasks={tasks}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onToggleComplete={handleToggleComplete}
        onUpdateTask={handleUpdateTask}
        onUpdateUser={handleUpdateUser}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
      />
      <Toaster position="top-center" duration={3000} />
    </>
  );
}