import { Notification } from './notification.model.js';
import { getIO } from '../../sockets/io.js';

// Never throws: a failed notification must not break the booking or payment that triggered it
export async function notify(userId, { type, title, body, link }) {
  try {
    const n = await Notification.create({ userId, type, title, body, link });
    getIO()?.to(`user:${userId}`).emit('notification', n);
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}
