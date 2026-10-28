# Acid Ledger

A complete MERN banking ledger that demonstrates the ACID properties with real MongoDB transactions. It includes account CRUD, deposits, withdrawals, transfers, live balances, aggregate statistics, and an append-only transaction audit trail.

The app is built around a single-node MongoDB replica set so transactions work locally. In production, use a three-member replica set or a sharded cluster.

## Stack

- **Frontend:** React 18, Vite, lucide-react, custom CSS
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB 7 with replica set `rs0`
- **Tests:** Node test runner, Supertest

## Features

- Create, read, update, and delete accounts
- Search accounts by owner, email, or account number
- Freeze and unfreeze accounts
- Atomic deposits, withdrawals, and transfers
- Live ledger statistics and transaction history
- Account deletion guard for non-zero balances
- Concurrent transfer protection against double-spending
- Docker Compose or local `mongod` setup
- Production build served by Express
- Integration tests that verify CRUD and ACID behavior

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start MongoDB as a replica set

Use Docker:

```bash
docker compose up -d
```

Or use a local MongoDB installation:

```bash
npm run mongo:start
```

Both options expose MongoDB on `mongodb://127.0.0.1:27018` with replica set `rs0`. The local command stores data in `.data/mongo` and can be stopped with `npm run mongo:stop`.

### 3. Seed demo accounts

```bash
npm run seed
```

This resets the `acid_ledger` database and creates three accounts with opening deposits.

### 4. Run the app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`

### Production build

```bash
npm run build
npm start
```

Express serves the built React app from `client/dist` at `http://localhost:5000`.

## Configuration

The defaults work without an `.env` file. To customize, copy the example:

```bash
cp server/.env.example server/.env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27018/acid_ledger?replicaSet=rs0` | MongoDB connection |
| `CLIENT_ORIGIN` | all origins | Comma-separated allowed CORS origins |
| `VITE_API_URL` | `/api` | Optional frontend API base URL |

If you use Docker and port `27018` is occupied, change both the Compose port mapping and `MONGODB_URI`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run API and Vite frontend together |
| `npm run dev:server` | Run only the API with nodemon |
| `npm run dev:client` | Run only the Vite frontend |
| `npm run mongo:start` | Start a local replica set on port 27018 |
| `npm run mongo:stop` | Stop the project MongoDB process |
| `npm run seed` | Reset and seed demo data |
| `npm test` | Run API and ACID integration tests |
| `npm run build` | Build the React app |
| `npm start` | Run the API and serve the production frontend |

## How ACID Is Implemented

### Atomicity

All money movement runs inside `session.withTransaction()` in `server/src/utils/transaction.js`. A deposit, withdrawal, or transfer updates account balances and inserts the ledger entry in the same MongoDB session. Any validation failure or database error aborts the whole unit.

Creating an account with an opening balance is also atomic: the account document and opening deposit transaction are committed together.

The test `rolls back the source debit when a transfer fails` freezes a destination account, attempts a transfer, and verifies that the source balance is unchanged and no transfer record exists.

### Consistency

The database enforces:

- Required owner, email, account number, account type, status, and currency
- Unique email and account number
- USD-only accounts for this demo
- Non-negative integer balances
- Integer transaction amounts
- Active accounts only for money movement
- Distinct source and destination accounts
- Deletion only when the balance is zero
- No direct balance changes through the account update endpoint

Money is stored as integer cents (`balanceCents`, `amountCents`) to avoid floating-point rounding errors. API responses expose decimal `balance` and `amount` values.

The frontend never submits an arbitrary balance. It calls a deposit, withdrawal, or transfer operation, and the server decides the new balance.

### Isolation

Every transaction uses:

```js
readConcern: { level: "snapshot" },
writeConcern: { w: "majority", j: true }
```

Balance changes use conditional atomic updates. A withdrawal or transfer only decrements a source account when `balanceCents >= amountCents`. If two transfers race, MongoDB reports a write conflict, the driver retries the transaction, and the retried operation sees the committed balance. The result is that only one transfer can spend the same funds.

The test `prevents double-spend under concurrent transfers` starts with `$500`, sends two concurrent `$400` transfers, and asserts that exactly one succeeds, one returns `409`, the final source balance is `$100`, and only one transfer record exists.

### Durability

Committed transactions use majority write concern with journaling (`j: true`). Once the API reports success, the write has been acknowledged by the majority of the replica set and persisted to the journal.

The local setup is a single-node replica set. The same write concern applies, but a production deployment should use at least three data-bearing replica set members for real fault tolerance.

## API

Base URL: `http://localhost:5000/api`

### Accounts

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/accounts` | List accounts. Supports `?search=` and `?status=` |
| `GET` | `/accounts/stats` | Ledger totals and counts |
| `POST` | `/accounts` | Create an account |
| `GET` | `/accounts/:id` | Get one account |
| `PATCH` / `PUT` | `/accounts/:id` | Update owner, email, type, or status |
| `DELETE` | `/accounts/:id` | Delete a zero-balance account |
| `POST` | `/accounts/:id/deposit` | Deposit funds |
| `POST` | `/accounts/:id/withdraw` | Withdraw funds |

### Transactions

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/transactions` | List latest transactions. Supports `?accountId=`, `?type=`, `?limit=` |
| `POST` | `/transactions/transfer` | Transfer funds between two accounts |

### Example requests

Create an account:

```bash
curl -X POST http://localhost:5000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "ownerName": "Ada Lovelace",
    "email": "ada@example.com",
    "accountType": "checking",
    "initialBalance": "250.00"
  }'
```

Deposit:

```bash
curl -X POST http://localhost:5000/api/accounts/ACCOUNT_ID/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": "100.50", "description": "Paycheck"}'
```

Transfer:

```bash
curl -X POST http://localhost:5000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "SOURCE_ACCOUNT_ID",
    "toAccountId": "DESTINATION_ACCOUNT_ID",
    "amount": "75.00",
    "description": "Dinner split"
  }'
```

Errors return:

```json
{
  "message": "Insufficient funds for this transfer."
}
```

Validation errors may also include a `details` array.

## Data Model

### Account

| Field | Type | Notes |
| --- | --- | --- |
| `ownerName` | String | 2-80 characters |
| `email` | String | Unique, lowercased |
| `accountNumber` | String | Unique, immutable, generated by the server |
| `accountType` | String | `checking` or `savings` |
| `balanceCents` | Number | Integer cents, minimum 0 |
| `currency` | String | `USD` |
| `status` | String | `active` or `frozen` |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### Transaction

| Field | Type | Notes |
| --- | --- | --- |
| `reference` | String | Unique, immutable |
| `type` | String | `deposit`, `withdrawal`, or `transfer` |
| `amountCents` | Number | Integer cents |
| `fromAccount` | ObjectId | Null for deposits |
| `toAccount` | ObjectId | Null for withdrawals |
| `status` | String | `completed` |
| `description` | String | Optional, up to 180 characters |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

## Tests

Start the replica set first, then run:

```bash
npm test
```

The integration suite uses `acid_ledger_test` and covers:

- Health and replica-set detection
- Account create, list, read, update, delete
- Duplicate email and direct balance-edit rejection
- Opening deposit, deposit, and withdrawal
- Atomic rollback when a transfer fails
- Concurrent double-spend prevention
- Amount, overdraft, and deletion consistency rules

## Project Structure

```text
.
├── client
│   ├── src
│   │   ├── components
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── format.js
│   │   └── styles.css
│   └── vite.config.js
├── scripts
│   ├── start-mongo.sh
│   └── stop-mongo.sh
├── server
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── middleware
│   │   ├── models
│   │   ├── routes
│   │   ├── utils
│   │   ├── app.js
│   │   ├── seed.js
│   │   └── server.js
│   └── tests
├── docker-compose.yml
├── package.json
└── README.md
```

## Notes and Limitations

- This is a single-user demo. There is no authentication or authorization.
- Only USD accounts are supported.
- The transaction collection is append-only; there are no reversal endpoints.
- Deleting an account keeps its historical transaction records, and the UI shows deleted accounts as `Deleted account`.
- Transactions require a MongoDB replica set. A standalone `mongod` cannot execute multi-document transactions.
- The app intentionally rejects direct balance edits to keep all balance changes inside audited transactions.
