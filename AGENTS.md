# Agent Guidance: node-red-ecoflow

This repository contains a Node-RED flow for controlling EcoFlow River power stations via REST API endpoints. It follows the same conventions as `node-red-sony-bravia` and is designed to be consumed by `node-red-home-ui`.

## Project structure

| File | Purpose |
|---|---|
| `river-flow.json` | Importable Node-RED flow. This is the main deliverable. |
| `device-manifest.json` | Static device discovery manifest used by `node-red-home-ui`. |
| `scripts/get-credentials.js` | Helper script to extract MQTT credentials from EcoFlow cloud. |
| `README.md` | Human-facing documentation. |
| `AGENTS.md` | This file. |

## Architecture conventions

- All control endpoints live under `/api/v1/home/battery/ecoflow/river/:name/<action>`.
- Device configuration is stored in a global variable `ECOFLOW_CONFIG` set by the **River Config** function node.
- The flow communicates with EcoFlow's cloud MQTT broker (`mqtt.ecoflow.com:8883` or `mqtt-e.ecoflow.com:8883`).
- Commands are JSON payloads sent to `/app/{user_id}/{serial}/thing/property/set`.
- Device state is received on `/app/device/property/#` and stored per serial in `global.get('ecoflow_status_' + serial)`.

## EcoFlow command reference

Commands follow the format used by first-generation River / River Max / River Pro devices:

```json
{
  "from": "Android",
  "operateType": "TCP",
  "id": <timestamp>,
  "lang": "en-us",
  "params": { "id": <param_id>, "enabled": 1 },
  "version": "1.0"
}
```

Known command mappings:

| Action | params.id | params field |
|---|---|---|
| AC on/off | 66 | `enabled: 1` / `enabled: 0` |
| DC/CAR on/off | 34 | `enabled: 1` / `enabled: 0` |
| Beep on/off | 38 | `enabled: 1` / `enabled: 0` |
| X-Boost on/off | 66 | `xboost: 1` / `xboost: 0` |

## Response format

All HTTP responses must follow:

```json
{ "status": "ok|error", "action": "...", "device": "...", "message": "..." }
```

For status:

```json
{ "status": "ok", "action": "status", "device": "...", "state": { ... } }
```

## When modifying the flow

- Keep all endpoints under the `/api/v1/home/battery/ecoflow/river/` prefix.
- If adding new actions, update both `river-flow.json` and `device-manifest.json`.
- Do not add USB/Type-C individual port control unless credible documentation confirms it is supported for the target device.
- Prefer native Node-RED nodes (`http in`, `mqtt in/out`, `function`) over external npm packages.
- Test JSON validity after editing `river-flow.json` or `device-manifest.json`.

## Testing JSON validity

```bash
node -e "JSON.parse(require('fs').readFileSync('river-flow.json')); console.log('OK');"
node -e "JSON.parse(require('fs').readFileSync('device-manifest.json')); console.log('OK');"
```
