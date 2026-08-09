#!/usr/bin/env node

/**
 * EcoFlow MQTT Credential Extractor
 *
 * Usage:
 *   node scripts/get-credentials.js
 *
 * This script logs into the EcoFlow cloud API, requests an MQTT certificate,
 * and prints the connection parameters needed by the Node-RED flow.
 *
 * It tries the European endpoint first, then the Global endpoint, and tells
 * you which region your account belongs to.
 *
 * Your password is only used for the login request and is never stored or
 * sent anywhere other than EcoFlow's official API.
 */

const https = require('https');
const readline = require('readline');

const REGIONS = [
  {
    name: 'EU',
    apiHost: 'api-e.ecoflow.com',
    mqttUrl: 'mqtts://mqtt-e.ecoflow.com:8883',
  },
  {
    name: 'Global',
    apiHost: 'api.ecoflow.com',
    mqttUrl: 'mqtts://mqtt.ecoflow.com:8883',
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function askPassword() {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write('EcoFlow app password: ');
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let password = '';
    stdin.on('data', (ch) => {
      const char = ch.toString();
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\b':
        case '\x7f':
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

function request(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(apiHost, email, password) {
  const payload = JSON.stringify({
    os: 'linux',
    scene: 'IOT_APP',
    appVersion: '1.0.0',
    osVersion: '5.0',
    password: Buffer.from(password).toString('base64'),
    oauth: { bundleId: 'com.ef.EcoFlow' },
    email,
    userType: 'ECOFLOW',
  });

  const result = await request(
    {
      hostname: apiHost,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    payload
  );

  if (result.statusCode !== 200 || !result.body?.data?.token) {
    throw new Error(result.body?.message || `Login failed on ${apiHost}`);
  }

  return {
    token: result.body.data.token,
    userId: String(result.body.data.user?.userId || ''),
  };
}

async function getCertification(apiHost, token) {
  const result = await request({
    hostname: apiHost,
    path: '/iot-auth/app/certification',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.statusCode !== 200 || result.body?.code !== '0') {
    throw new Error(result.body?.message || `Certification failed on ${apiHost}`);
  }

  return result.body.data;
}

async function main() {
  console.log('\nEcoFlow MQTT Credential Extractor\n');

  const email = await ask('EcoFlow app email: ');
  const password = await askPassword();

  let success = null;
  let lastError = null;

  for (const region of REGIONS) {
    try {
      console.log(`\nTrying ${region.name} region (${region.apiHost})...`);
      const { token, userId } = await login(region.apiHost, email, password);
      const cert = await getCertification(region.apiHost, token);

      success = {
        region: region.name,
        apiHost: region.apiHost,
        mqtt_url: region.mqttUrl,
        username: cert.certificateAccount,
        password: cert.certificatePassword,
        user_id: userId,
      };
      break;
    } catch (err) {
      lastError = err;
      console.log(`  ${region.name} failed: ${err.message}`);
    }
  }

  rl.close();

  if (!success) {
    console.error('\nCould not authenticate with any region.');
    console.error(lastError ? `Last error: ${lastError.message}` : '');
    process.exit(1);
  }

  console.log('\n✅ Success! Your account region is:', success.region);
  console.log('\nCopy these values into the Ecoflow River config node in Node-RED:\n');
  console.log(JSON.stringify(success, null, 2));
  console.log('\nKeep these credentials safe — they provide access to your devices.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
