import { Server } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { setIO } from './io.js';
import { User } from '../modules/users/user.model.js';
import { Professional } from '../modules/professionals/professional.model.js';
import { VideoVerification } from '../modules/videoVerification/videoVerification.model.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });
  setIO(io);

  // Same JWT cookie as the REST API
  io.use(async (socket, next) => {
    try {
      const token = cookie.parse(socket.handshake.headers.cookie || '').token;
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.id);
      if (!user || user.status !== 'active') throw new Error('inactive');
      socket.data.user = user;
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user._id}`);

    // WebRTC signalling for live video verification: only the assigned admin and the professional may join
    socket.on('vv:join', async (sessionId, ack) => {
      try {
        const s = await VideoVerification.findById(sessionId);
        if (!s || s.status !== 'LIVE') throw new Error('The session is not live');
        let ok = user.role === 'admin' && String(s.adminId) === String(user._id);
        if (!ok && user.role === 'professional') {
          const pro = await Professional.findOne({ userId: user._id });
          ok = !!pro && String(pro._id) === String(s.professionalId);
        }
        if (!ok) throw new Error('You cannot join this session');
        const room = `vv:${s._id}`;
        const peers = await io.in(room).fetchSockets();
        if (peers.length >= 2) throw new Error('The room is full');
        socket.join(room);
        socket.data.room = room;
        if (peers.length === 1) peers[0].emit('vv:ready'); // the one already waiting sends the offer
        ack?.({ ok: true });
      } catch (e) { ack?.({ ok: false, message: e.message }); }
    });
    socket.on('vv:signal', (data) => { if (socket.data.room) socket.to(socket.data.room).emit('vv:signal', data); });
    socket.on('disconnect', () => { if (socket.data.room) socket.to(socket.data.room).emit('vv:left'); });
  });
  return io;
}
