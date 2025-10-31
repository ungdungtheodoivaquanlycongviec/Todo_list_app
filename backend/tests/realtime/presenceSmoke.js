#!/usr/bin/env node
/**
 * Presence smoke test utility. Spins up a Socket.IO client, listens to
 * `presence:update` events, and periodically emits manual heartbeats.
 *
 * Usage:
 *   node tests/realtime/presenceSmoke.js \
 *     --url http://localhost:8080 \
 *     --token <access-token>
 */

const { io } = require('socket.io-client');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('url', {
    alias: 'u',
    type: 'string',
    describe: 'Backend origin (protocol + host + port)',
    default: 'http://localhost:8080'
  })
  .option('token', {
    alias: 't',
    type: 'string',
    describe: 'Access token for handshake authentication',
    demandOption: true
  })
  .option('namespace', {
    alias: 'n',
    type: 'string',
    describe: 'Socket.IO namespace to connect to',
    default: '/ws/app'
  })
  .option('heartbeat', {
    alias: 'hb',
    type: 'number',
    describe: 'Manual heartbeat interval in seconds (0 disables manual heartbeats)',
    default: 20
  })
  .help()
  .argv;

const { url, token, namespace, heartbeat } = argv;

console.log(`Connecting to ${namespace} for presence smoke test...`);
const socket = io(`${url}${namespace}`, {
  auth: { token },
  transports: ['websocket']
});

let heartbeatTimer = null;

socket.on('connect', () => {
  console.log(`Connected. Socket ID: ${socket.id}`);

  if (heartbeat > 0) {
    heartbeatTimer = setInterval(() => {
      console.log('Emitting manual presence heartbeat');
      socket.emit('presence:heartbeat');
    }, heartbeat * 1000);
  }
});

socket.on('notifications:ready', payload => {
  console.log('Realtime channel ready:', payload);
});

socket.on('presence:update', payload => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Presence update received:`);
  console.dir(payload, { depth: null });
});

socket.on('disconnect', reason => {
  console.log(`Disconnected: ${reason}`);
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
});

socket.on('connect_error', error => {
  console.error('Connection error:', error.message, error.data || '');
});

socket.on('error', error => {
  console.error('Socket error:', error);
});

process.on('SIGINT', () => {
  console.log('\nClosing presence smoke client...');
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  socket.close();
  process.exit(0);
});
