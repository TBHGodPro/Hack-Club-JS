# Hack Club Arcade JS

This is a library to access the Hack Club Arcade API in TypeScript/JavaScript.

To get started, simply install the package, make a js/ts file, and create a client:

```typescript
const hackclub = require('hc-arcade-js');
// OR
import * as hackclub from 'hc-arcade-js';

const client = new hackclub.Client({
  slackID: 'Slack User ID',
  APIKey: 'Hack Club API Key',
});
```

And you're set!

# Usage

## Types/Classes

### `ResData`

```typescript
{
    ok: false;
    error: string;
} | {
    ok: true;
    // More Data
}
```

### `SessionData`

```typescript
{
  time: {
    totalMins: number;
    elapsedMins: number;
    remainingMins: number;
    createdAt: Date;
    endAt: Date;
  }
  paused: boolean;
  completed: boolean;
  goal: string | null;
  work: string;
}
```

### `Time`

```typescript
export default class Time {
  constructor(ms: number);
  getMS(): number;
  getSeconds(): number;
  getMinutes(): number;
  getHours(): number;
  getDays(): number;
  getWeeks(): number;
  getMonths(): number;
  getTrueMonths(): number;
  getYears(): number;
}
```

## Methods

### `ping()`

Returns a `Promise` which resolves to the string `"pong"`.

<details>
<summary>Example</summary>

```typescript
const res = await client.ping();
console.log(res);
// pong
```

</details>

### `getStatus()`

Fetches the status of the hack club arcade.

Returns a `Promise` which resolves with the status.

<details open>
<summary>Data</summary>

```typescript
{
  activeSessions: number;
  airtableConnected: boolean;
  slackConnected: boolean;
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const status = await client.getStatus();
console.log(`There are ${status.activeSessions} sessions active!`);
// There are (x) sessions active!
```

</details>

### `getRemainingSessionTime(slackId?: string)` **_(DEPRECATED)_**

Fetches the amount of milliseconds left on the active session of a user, and also indicates if there is a session active. By default fetches the active user's session.

Returns a `Promise` which resolves to a `ResData`.

The data will either have `active` as `false`, or `active` as `true` and `remainingMS` as the amount of milliseconds left.

<details open>
<summary>Data</summary>

```typescript
{
    active: false;
} | {
    active: true;
    remainingMS: number;
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const status = await client.getRemainingSessionTime();

if (!status.ok) throw new Error(status.error);

if (status.active) console.log(`I have ${status.remainingMS / 1000 / 60} minutes left!`);
else console.log('I am not in an active session!');
```

</details>

### `getSessionData()`

Fetches active session data of the current user.

Returns a `Promise` which resolves to a `ResData`.

The data will either have `found` to `false` and `active` to `false` if there is no active or recent session, or `found` will be true and the data will fill in as below.

<details open>
<summary>Data</summary>

```typescript
{
    found: true;
    active: boolean;
    userID: string;
    messageTs: string;
} & SessionData
```

</details>

<details>
<summary>Example</summary>

```typescript
const session = await client.getSessionData();

if (!session.ok) throw new Error(session.error);

if (session.active) console.log(`I have ${session.time.remainingMinsq} minutes left!`);
else console.log('I am not in an active session!');
```

</details>

### `getUserStats()`

Fetches statistics of the current user.

Returns a `Promise` which resolves to a `ResData`.

<details open>
<summary>Data</summary>

```typescript
{
  sessions: number;
  time: Time;
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const stats = await client.getUserStats();

if (!stats.ok) throw new Error(stats.error);

console.log(`I have done ${stats.sessions} sessions and spent ${stats.time.getMinutes()} minutes on the Hack Club Arcade!`);
```

</details>

### `getUserGoals()`

Fetches all goals and their data of the current user.

Returns a `Promise` which resolves to a `ResData`.

<details open>
<summary>Data</summary>

```typescript
{
  goals: Array<{
    name: string;
    time: Time;
  }>;
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const goals = await client.getUserGoals();

if (!goals.ok) throw new Error(goals.error);

console.log(`I have ${goals.length} total goals!`);
```

</details>

### `getSessionHistory()`

Fetches the session history of the user.

Returns a `Promise` which resolves to a `ResData`.

| **NOTE:** This may not retrieve all sessions

<details open>
<summary>Data</summary>

```typescript
{
  sessions: Array<SessionData>;
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const history = await client.getSessionHistory();

if (!history.ok) throw new Error(history.error);

console.log(`I have ${history.length} total sessions!`);
```

</details>

### `start(work: string)`

Start a new session.

Returns a `Promise` which resolves to a `ResData`.

The data will either have `created` set to `false` in the case that there is an already active session, or `created` will be set to `true` and the data will fill in as below.

<details open>
<summary>Data</summary>

```typescript
{
  created: true;
  session: {
    id: string;
    userID: string;
    createdAt: Date;
  }
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const res = await client.start();

if (!res.ok) throw new Error(res.error);

if (res.created) console.log(`Created session ${res.session.id}`);
else console.log('Session already active!');
```

</details>

### `cancel()`

Stops the current session.

Returns a `Promise` which resolves to a `ResData`.

The data will either have `cancelled` set to `false` in the case that there is no active session, or `cancelled` will be set to `true` and the data will fill in as below.

<details open>
<summary>Data</summary>

```typescript
{
  cancelled: true;
  session: {
    id: string;
    userID: string;
    createdAt: Date;
  }
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const res = await client.cancel();

if (!res.ok) throw new Error(res.error);

if (res.cancelled) console.log(`Cancelled session ${res.session.id}`);
else console.log('No active session!');
```

</details>

### `togglePaused()`

Returns a `Promise` which resolves to a `ResData`.

The data will either have `toggled` set to `false` in the case that there is no active session, or `toggled` will be set to `true` and the data will fill in as below.

<details open>
<summary>Data</summary>

```typescript
{
  toggled: true;
  session: {
    id: string;
    userID: string;
    createdAt: Date;
    paused: boolean;
  }
}
```

</details>

<details>
<summary>Example</summary>

```typescript
const res = await client.togglePaused();

if (!res.ok) throw new Error(res.error);

if (res.toggled) console.log(`${res.session.paused ? 'Paused' : 'Unpaused'} the active session!`);
else console.log('No active session!');
```

</details>

## Events

### `ratelimit`

```typescript
ratelimit(type: 'READ' | 'WRITE', info: RateLimitData): void;
```

Emitted whenever new ratelimit data is received, irrespective of if the ratelimit was hit or not.
