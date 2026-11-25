import { sendNotification, setVapidDetails } from 'web-push';
import { env } from '../../config/env.js';
import { PushSubscription } from './pushSubscription.model.js';

const configured = Boolean(env.vapidPublicKey && env.vapidPrivateKey);
if (configured) {
  setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

function safePath(link) {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//')
    ? link
    : '/notifications';
}

export async function sendPushNotification(notification) {
  if (!configured) return;
  try {
    const subscriptions = await PushSubscription.find({ userId: notification.userId }).lean();
    const payload = JSON.stringify({
      id: String(notification._id),
      title: 'ServiceBridge',
      // Keep personal details off a phone lock screen; the user can open the app for details.
      body: 'You have a new notification. Open ServiceBridge to view it.',
      url: safePath(notification.link),
    });

    await Promise.allSettled(subscriptions.map(async (record) => {
      try {
        await sendNotification({
          endpoint: record.endpoint,
          expirationTime: record.expirationTime,
          keys: record.keys,
        }, payload, { TTL: 60 });
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await PushSubscription.deleteOne({ _id: record._id });
        } else {
          console.warn('Push delivery failed:', error.statusCode || 'unknown status');
        }
      }
    }));
  } catch (error) {
    console.warn('Push dispatch failed:', error.name || 'Error');
  }
}
