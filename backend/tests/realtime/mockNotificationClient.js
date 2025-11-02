#!/usr/bin/env node
/**
 * Simple Socket.IO client for verifying realtime notification payloads.
 *
 * Usage:
 *   ENABLE_REALTIME_NOTIFICATIONS=true node tests/realtime/mockNotificationClient.js \
 *     --url http://localhost:8080 --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDM4NGU0ZTU1OThmMTU5ZGM0ZjFmZiIsImVtYWlsIjoicGhhc2U5LXByaW1hcnktMTc2MTgzODMwOEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzYxODM4MzA4LCJleHAiOjE3NjI0NDMxMDh9.941fdw7NX_gCFulnzs2dV8QoGwz6S0-ZJ0XJ43l64Jw
 *
 * The script connects to the `/ws/app` namespace, listens for events, and logs
 * notifications as they arrive. Use Ctrl+C to exit.
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
  .help()
  .argv;

const { url, token, namespace } = argv;

console.log('Connecting to realtime namespace...');
const socket = io(`${url}${namespace}`, {
  auth: { token },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log(`Connected to ${namespace}. Socket ID: ${socket.id}`);
});

socket.on('notifications:ready', payload => {
  console.log('Realtime channel ready:', payload);
});

socket.on('notifications:new', payload => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Notification received:`);
  console.dir(payload, { depth: null });
});

socket.on('disconnect', reason => {
  console.log(`Disconnected: ${reason}`);
});

socket.on('connect_error', error => {
  console.error('Connection error:', error.message);
});

process.on('SIGINT', () => {
  console.log('\nClosing client...');
  socket.close();
  process.exit(0);
});
