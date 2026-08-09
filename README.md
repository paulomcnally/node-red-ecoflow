# EcoFlow River Control - Node-RED Flow

Control one or more EcoFlow River power stations via HTTP endpoints using Node-RED. Supports AC, DC/CAR, beeper and X-Boost control via EcoFlow's MQTT cloud.

Part of the **Home Control API** (`/api/v1/home/`).

## Supported devices

This flow is designed for the **EcoFlow River 600** and first-generation River models (River Max / River Pro). It uses EcoFlow's cloud MQTT broker, so the device must be connected to Wi-Fi and linked to your EcoFlow app account.

> **Note:** USB and Type-C ports cannot be switched individually through the EcoFlow API. Only the AC output block and the DC/CAR port can be turned on/off.

## Prerequisites

- Node-RED installed and running
- An EcoFlow River connected to Wi-Fi and registered in the EcoFlow app
- Your EcoFlow app email and password
- MQTT credentials obtained from EcoFlow (see below)

## Getting MQTT credentials

Run the included script on your laptop:

```bash
node scripts/get-credentials.js
```

You will be prompted for:

- EcoFlow app email
- EcoFlow app password

The script tries the EU and Global regions automatically and prints your MQTT credentials:

```json
{
  "region": "Global",
  "apiHost": "api.ecoflow.com",
  "mqtt_url": "mqtts://mqtt.ecoflow.com:8883",
  "username": "app-xxxxxxxx",
  "password": "xxxxxxxx",
  "user_id": "1234567890123456789"
}
```

Keep these credentials safe — they provide access to your devices.

## Quick Start

1. Open the Node-RED editor in your browser (default: `http://localhost:1880`).
2. Click the **hamburger menu** (top-right) > **Import**.
3. Select the **Clipboard** tab.
4. Copy the entire contents of `river-flow.json`.
5. Paste it into the text area and click **Import**.
6. Configure the **EcoFlow MQTT** broker (see [MQTT broker configuration](#mqtt-broker-configuration) below).
7. Double-click the **River Config** node and edit `ECOFLOW_CONFIG` with your device name, serial number and user ID.
8. Click **Deploy** to activate the flow.

## Configuring your devices

Double-click the **River Config** node in Node-RED:

```javascript
const ECOFLOW_CONFIG = {
    "living_room": {
        "serial": "R600XXXXXXXX",
        "user_id": "1234567890123456789"
    }
};
```

Replace:

- `R600XXXXXXXX` with your River's serial number (found in the EcoFlow app).
- `1234567890123456789` with your `user_id` from the credential script.

### Adding a new device

Add a new entry to the `ECOFLOW_CONFIG` object:

```javascript
const ECOFLOW_CONFIG = {
    "living_room": {
        "serial": "R600XXXXXXXX",
        "user_id": "1234567890123456789"
    },
    "bedroom": {
        "serial": "R600YYYYYYYY",
        "user_id": "1234567890123456789"
    }
};
```

### MQTT broker configuration

The MQTT broker is a **configuration node**, so it does not appear as a big block on the canvas. You can find it in one of two ways:

#### Option 1: From an MQTT node in the flow

1. In the imported flow, find the node named **EcoFlow Status** (or **Send Command**).
2. **Double-click** it.
3. Look at the **Server** field. It shows `EcoFlow MQTT` with a pencil icon ✏️ next to it.
4. **Double-click** `EcoFlow MQTT` or the pencil icon to open the broker settings.

#### Option 2: From the Configuration Nodes panel

1. Click the **hamburger menu** (top-right) > **Configuration nodes**.
2. Find **EcoFlow MQTT** in the list.
3. **Double-click** it to edit.

#### Settings

Once the broker editor is open, set:

- **Server**: `mqtt.ecoflow.com` for Global, `mqtt-e.ecoflow.com` for EU
- **Port**: `8883`
- **TLS**: enabled
- **Username**: `app-...` from the credential script
- **Password**: from the credential script

## Available endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/v1/home/battery/ecoflow/river/:name/ac/on` | AC ON | Turns AC output on |
| `GET /api/v1/home/battery/ecoflow/river/:name/ac/off` | AC OFF | Turns AC output off |
| `GET /api/v1/home/battery/ecoflow/river/:name/dc/on` | DC ON | Turns DC/CAR output on |
| `GET /api/v1/home/battery/ecoflow/river/:name/dc/off` | DC OFF | Turns DC/CAR output off |
| `GET /api/v1/home/battery/ecoflow/river/:name/beep/on` | Beep ON | Enables beeper |
| `GET /api/v1/home/battery/ecoflow/river/:name/beep/off` | Beep OFF | Disables beeper |
| `GET /api/v1/home/battery/ecoflow/river/:name/xboost/on` | X-Boost ON | Enables X-Boost |
| `GET /api/v1/home/battery/ecoflow/river/:name/xboost/off` | X-Boost OFF | Disables X-Boost |
| `GET /api/v1/home/battery/ecoflow/river/:name/status` | Status | Returns last known device state |
| `GET /api/v1/home/battery/ecoflow/river/:name/actions` | Actions | Returns device discovery manifest |

Replace `:name` with the device name from your configuration (e.g. `living_room`).

### Examples

```bash
# Turn AC on
curl http://localhost:1880/api/v1/home/battery/ecoflow/river/living_room/ac/on

# Turn AC off
curl http://localhost:1880/api/v1/home/battery/ecoflow/river/living_room/ac/off

# Turn DC/CAR on
curl http://localhost:1880/api/v1/home/battery/ecoflow/river/living_room/dc/on

# Check status
curl http://localhost:1880/api/v1/home/battery/ecoflow/river/living_room/status
```

### Device Discovery Manifest

This flow exposes a discovery endpoint that returns a standardized manifest of all supported actions. It is consumed by the [`node-red-home-ui`](https://github.com/paulomcnally/node-red-home-ui) project to render device controls dynamically.

```bash
GET /api/v1/home/battery/ecoflow/river/living_room/actions
```

A static copy of this manifest is also available in [`device-manifest.json`](device-manifest.json).

### Response format

**Success:**

```json
{
    "status": "ok",
    "action": "ac_on",
    "device": "living_room",
    "message": "Command sent to living_room"
}
```

**Status success:**

```json
{
    "status": "ok",
    "action": "status",
    "device": "living_room",
    "state": {
        "pd": { "soc": 87, "wattsOutSum": 12 },
        "inv": { "outputWatts": 0 }
    }
}
```

**Error:**

```json
{
    "status": "error",
    "message": "Device \"kitchen\" not found in configuration. Available: living_room"
}
```

## Flow overview

```
[GET /api/v1/home/battery/ecoflow/river/:name/:action1/:action2]
                                      │
                                      ▼
                          [Build Command] ──► [Send Command] ──► MQTT
                                      │
                                      ▼
                              [HTTP Response]
```

## Smart Home API URL convention

This flow follows the standardized URL structure:

```
/api/v1/home/<device_type>/<brand>/<model>/:name/<action>
```

Example:

```
GET /api/v1/home/battery/ecoflow/river/living_room/ac/on
```

## Limitations

- USB and Type-C ports cannot be controlled individually.
- Commands are sent via EcoFlow's cloud MQTT broker. The device must have internet access.
- Status is updated when the device publishes to the MQTT topic. Until the first message arrives, `status` returns `state: null`.

## License

MIT
