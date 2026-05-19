import { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/app/api";
import { Toaster } from "@/app/components/ui/sonner";
import { SignIn } from "@/app/components/SignIn";
import { Dashboard } from "@/app/components/Dashboard";
import { Task } from "@/app/types";
import { toast } from "sonner";
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
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

    // Auto-login if token exists (optional, but good for persistence)
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        fetchTasks(token);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (notificationsEnabled && user) {
      registerPush();
    }
  }, [notificationsEnabled, user]);

  /**
   * Helper to fetch with a simple retry mechanism
   * Useful for Railway cold starts (server sleep)
   */
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      if (retries > 0 && err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        console.warn(`Fetch failed, retrying... (${retries} attempts left)`);
        // Wait 1.5 seconds before retrying
        await new Promise(res => setTimeout(res, 1500));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  };

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
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetchWithRetry(`${API_BASE_URL}/api/auth/save-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
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
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permissions denied by user');
          toast.warning('Push notification permissions are required.');
          return;
        }

        await PushNotifications.register();

        // Instantly synchronize if we already have a cached token in localStorage!
        const cachedToken = localStorage.getItem('fcmToken');
        if (cachedToken) {
          console.log('Syncing cached native FCM Token:', cachedToken);
          await saveFCMTokenToBackend(cachedToken);
        }

        await PushNotifications.addListener('registration', async (token) => {
          console.log('Native FCM Token received:', token.value);
          localStorage.setItem('fcmToken', token.value);
          await saveFCMTokenToBackend(token.value);
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Capacitor registration error:', error);
          toast.error('Failed to register device for push notifications');
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Foreground push notification received:', notification);
          toast.info(`${notification.title}: ${notification.body || ''}`);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification click action performed:', action);
        });

      } catch (err) {
        console.error('Native push registration failed:', err);
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
          const token = localStorage.getItem('token');
          const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/save-subscription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token || ''
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
    const token = localStorage.getItem('token');
    const newVal = !notificationsEnabled;

    try {
      await fetchWithRetry(`${API_BASE_URL}/api/auth/update-notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
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

  const fetchTasks = async (token: string) => {
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/tasks`, {
        headers: { 'x-auth-token': token }
      });
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
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchTasks(token);
    }
  };

  const handleUpdateUser = (newName: string) => {
    if (user) {
      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const handleAddTask = async (task: Task) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Optimistic UI: Add task to state immediately with temporary ID
    const tempId = task.id || `temp-${Date.now()}`;
    const taskWithId = { ...task, id: tempId };
    setTasks(prev => [...prev, taskWithId]);

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const newTask = await res.json();
        // Replace the temporary task with the real one from the server
        setTasks(prev => prev.map(t => (t.id === tempId || (t as any)._id === tempId) ? newTask : t));
      } else {
        // Rollback on failure
        setTasks(prev => prev.filter(t => t.id !== tempId && (t as any)._id !== tempId));
        toast.error('Failed to save task');
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      // Rollback on error
      setTasks(prev => prev.filter(t => t.id !== tempId && (t as any)._id !== tempId));
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Optimistic UI: Remove task from state immediately
    const deletedTask = tasks.find(t => (t as any)._id === id || t.id === id);
    setTasks(prev => prev.filter(task => (task as any)._id !== id && task.id !== id));

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        setTasks(prev => prev.filter(task => (task as any)._id !== id && task.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const taskToToggle = tasks.find(t => (t as any)._id === id || t.id === id);
    if (!taskToToggle) return;

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ completed: !taskToToggle.completed })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? updatedTask : t));
        toast.success(updatedTask.completed ? "Task completed! 🎉" : "Task marked as pending");
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const token = localStorage.getItem('token');
    const id = (updatedTask as any)._id || updatedTask.id;
    if (!token || !id) return;

    // Optimistic UI: Update state immediately
    const originalTask = tasks.find(t => ((t as any)._id === id || t.id === id));
    setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? updatedTask : t));

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
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
        } else {
          // Sync with server version
          setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? savedTask : t));
        }
      } else {
        // Rollback on failure
        if (originalTask) {
          setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? originalTask : t));
        }
        toast.error('Failed to update task');
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      if (originalTask) {
        setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? originalTask : t));
      }
      toast.error('Failed to update task');
    }
  };

  if (!user) {
    return (
      <>
        <SignIn onSignIn={handleSignIn} />
        <Toaster position="top-center" richColors duration={2000} />
      </>
    );
  }

  return (
    <>
      <Dashboard
        userEmail={user.email}
        userName={user.name}
        tasks={tasks}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onToggleComplete={handleToggleComplete}
        onUpdateTask={handleUpdateTask}
        onUpdateUser={handleUpdateUser}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
      />
      <Toaster position="top-center" richColors duration={2000} />
    </>
  );
}