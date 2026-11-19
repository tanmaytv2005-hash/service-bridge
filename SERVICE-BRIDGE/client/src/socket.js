import { io } from 'socket.io-client';

// Same server as the API (strip the trailing /api); the login cookie authenticates the connection
export const socket = io(import.meta.env.VITE_API_URL.replace(/\/api\/?$/, ''), { withCredentials: true, autoConnect: false });
