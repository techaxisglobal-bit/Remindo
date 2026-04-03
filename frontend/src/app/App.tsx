import { useState, useEffect } from "react";
import { Toaster } from "@/app/components/ui/sonner";
import { SignIn } from "@/app/components/SignIn";
import { Dashboard } from "@/app/components/Dashboard";
import { Task } from "@/app/types";
import { toast } from "sonner";

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
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
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchTasks(token);
    }
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

  const registerPush = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      let subscription = await registration.pushManager.getSubscription();
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

      // Save to backend
      if (subscription) {
        const token = localStorage.getItem('token');
        await fetch('http://localhost:5001/api/auth/save-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token || ''
          },
          body: JSON.stringify({ subscription })
        });
      }
    } catch (err) {
      console.error('Push registration failed:', err);
    }
  };

  const handleToggleNotifications = async () => {
    const token = localStorage.getItem('token');
    const newVal = !notificationsEnabled;

    try {
      await fetch('http://localhost:5001/api/auth/update-notifications', {
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
      const res = await fetch('http://localhost:5001/api/tasks', {
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

    try {
      const res = await fetch('http://localhost:5001/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:5001/api/tasks/${id}`, {
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
      const res = await fetch(`http://localhost:5001/api/tasks/${id}`, {
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

    try {
      const res = await fetch(`http://localhost:5001/api/tasks/${id}`, {
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
          setTasks(prev => [...prev, savedTask]);
        } else {
          // Standard update for the same task
          setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? savedTask : t));
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (!user) {
    return (
      <>
        <SignIn onSignIn={handleSignIn} />
        <Toaster position="top-center" richColors />
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
      <Toaster position="top-center" richColors />
    </>
  );
}