import React, { useEffect, useState, useRef } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../api';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { notificationSocket } from '../services/NotificationSocket';
import { toast } from 'sonner';

interface Notification {
    id: string;
    type: 'Reminder' | 'Invitation' | 'Shared Reminder' | 'System';
    title: string;
    message: string;
    relatedTaskId?: string;
    actionUrl?: string;
    status: 'Unread' | 'Read' | 'Accepted' | 'Declined';
    createdAt: string;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    
    // Allow closing on click outside
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            fetchNotifications(1);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            setPage(1);
            setNotifications([]);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        const unsubscribe = notificationSocket.subscribe((newNotif: Notification) => {
            setNotifications(prev => [newNotif, ...prev]);
            toast.info(newNotif.title, { description: newNotif.message });
        });
        return unsubscribe;
    }, []);

    const fetchJson = async (url: string, options: RequestInit = {}) => {
        const headers = new Headers(options.headers || {});
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        
        const response = await fetchWithAuth(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw { response: { data: errorData } };
        }
        return response.json();
    };

    const fetchNotifications = async (pageNumber: number) => {
        try {
            setIsLoading(true);
            const data = await fetchJson(`/api/notifications?page=${pageNumber}&limit=20`);
            if (pageNumber === 1) {
                setNotifications(data.notifications);
            } else {
                setNotifications(prev => [...prev, ...data.notifications]);
            }
            setHasMore(data.currentPage < data.totalPages);
            setPage(pageNumber);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await fetchJson(`/api/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read' } : n));
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetchJson('/api/notifications/read-all', { method: 'PUT' });
            setNotifications(prev => prev.map(n => n.status === 'Unread' ? { ...n, status: 'Read' } : n));
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await fetchJson(`/api/notifications/${id}`, { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    const handleAccept = async (notification: Notification) => {
        if (!notification.relatedTaskId || !notification.actionUrl) return;
        const tokenMatch = notification.actionUrl.match(/\/invitation\/(.*)/);
        const token = tokenMatch ? tokenMatch[1] : null;
        if (!token) return;

        try {
            await fetchJson('/api/invitations/respond', { 
                method: 'POST', 
                body: JSON.stringify({ token, action: 'accept' }) 
            });
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'Accepted' } : n));
            toast.success('Invitation accepted');
        } catch (error: any) {
            toast.error(error.response?.data?.msg || 'Failed to accept invitation');
        }
    };

    const handleDecline = async (notification: Notification) => {
        if (!notification.relatedTaskId || !notification.actionUrl) return;
        const tokenMatch = notification.actionUrl.match(/\/invitation\/(.*)/);
        const token = tokenMatch ? tokenMatch[1] : null;
        if (!token) return;

        try {
            await fetchJson('/api/invitations/respond', { 
                method: 'POST', 
                body: JSON.stringify({ token, action: 'decline' }) 
            });
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'Declined' } : n));
            toast.success('Invitation declined');
        } catch (error: any) {
            toast.error(error.response?.data?.msg || 'Failed to decline invitation');
        }
    };

    if (!isOpen) return null;

    const groupNotifications = () => {
        const groups: { [key: string]: Notification[] } = { Today: [], Yesterday: [], Earlier: [] };
        notifications.forEach(n => {
            const date = parseISO(n.createdAt);
            if (isToday(date)) groups.Today.push(n);
            else if (isYesterday(date)) groups.Yesterday.push(n);
            else groups.Earlier.push(n);
        });
        return groups;
    };

    const grouped = groupNotifications();

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <div ref={ref} className="w-full max-w-md bg-white dark:bg-[#0a0a0a] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#0a0a0a]">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-5 h-5" /> Notifications
                    </h2>
                    <div className="flex gap-3 items-center">
                        <button onClick={markAllAsRead} className="text-sm font-medium text-[#e0b596] hover:underline">Mark all read</button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-black">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(grouped).map(([label, items]) => {
                        if (items.length === 0) return null;
                        return (
                            <div key={label} className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</h3>
                                <div className="space-y-2">
                                    {items.map(n => (
                                        <div key={n.id} className={`p-4 rounded-xl border transition-all ${n.status === 'Unread' ? 'bg-[#e0b596]/10 border-[#e0b596]/30 shadow-sm' : 'bg-white dark:bg-black border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`font-semibold text-sm ${n.status === 'Unread' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</h4>
                                                <div className="flex gap-2">
                                                    {n.status === 'Unread' && (
                                                        <button onClick={() => markAsRead(n.id)} className="text-[#e0b596] hover:text-[#c49a7c]" title="Mark as read">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteNotification(n.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{n.message}</p>
                                            
                                            <div className="flex justify-between items-center mt-3">
                                                <span className="text-xs text-gray-400">{format(parseISO(n.createdAt), 'h:mm a')}</span>
                                                {n.type === 'Invitation' && n.status === 'Unread' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleDecline(n)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-black rounded-lg transition-colors">Decline</button>
                                                        <button onClick={() => handleAccept(n)} className="px-3 py-1.5 text-xs font-bold text-white bg-[#e0b596] hover:bg-[#c49a7c] rounded-lg shadow-sm transition-colors">Accept</button>
                                                    </div>
                                                )}
                                                {n.type === 'Invitation' && n.status !== 'Unread' && (
                                                    <span className={`text-xs font-bold ${n.status === 'Accepted' ? 'text-green-500' : 'text-red-500'}`}>{n.status}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {notifications.length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                            <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p>You have no notifications.</p>
                        </div>
                    )}
                    {hasMore && (
                        <div className="text-center pt-4">
                            <button onClick={() => fetchNotifications(page + 1)} disabled={isLoading} className="text-sm font-medium text-[#e0b596] hover:underline">
                                {isLoading ? 'Loading...' : 'Load older notifications'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
