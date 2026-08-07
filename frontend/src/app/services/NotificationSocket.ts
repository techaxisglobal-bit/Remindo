import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';

class NotificationSocketService {
    private socket: Socket | null = null;
    private listeners: ((notification: any) => void)[] = [];

    connect(token: string) {
        if (this.socket) {
            this.socket.disconnect();
        }

        const socketUrl = API_URL.replace('/api', '');

        this.socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Connected to notification socket');
        });

        this.socket.on('new_notification', (notification) => {
            this.listeners.forEach(listener => listener(notification));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from notification socket');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    subscribe(callback: (notification: any) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }
}

export const notificationSocket = new NotificationSocketService();
