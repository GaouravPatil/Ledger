import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import request from "supertest";
import app from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Account from "../src/models/Account.js";
import Transaction from "../src/models/Transaction.js";

const TEST_URI =
  process.env.TEST_MONGODB_URI ||
  "mongodb://127.0.0.1:27018/acid_ledger_test?replicaSet=rs0";

const api = request(app);

let accountSequence = 0;

const createAccount = async (overrides = {}) => {
  accountSequence += 1;
  const response = await api
    .post("/api/accounts")
    .send({
      ownerName: `Test Owner ${accountSequence}`,
      email: `owner${accountSequence}-${Date.now()}@example.com`,
      accountType: "checking",
      ...overrides,
    })
    .expect(201);

  return response.body.data;
};

const clearDatabase = async () => {
  await Promise.all([Transaction.deleteMany({}), Account.deleteMany({})]);
};

before(async () => {
  await connectDB(TEST_URI);
  await Promise.all([Account.init(), Transaction.init()]);
  await clearDatabase();
});

beforeEach(clearDatabase);

after(async () => {
  await clearDatabase();
  await disconnectDB();
});

describe("health", () => {
  it("reports that ACID transactions are available", async () => {
    const response = await api.get("/api/health").expect(200);

    assert.equal(response.body.status, "ok");
    assert.equal(response.body.database.transactionSupport, true);
  });
});

describe("account CRUD", () => {
  it("creates, lists, reads, updates, and deletes an account", async () => {
    const created = await createAccount({
      ownerName: "Grace Hopper",
      email: "grace@example.com",
    });

    assert.match(created.accountNumber, /^AC\d{9}$/);
    assert.equal(created.balance, 0);
    assert.equal(created.status, "active");

    const list = await api.get("/api/accounts?search=Grace").expect(200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].email, "grace@example.com");

    const detail = await api
      .get(`/api/accounts/${created.id}`)
      .expect(200);
    assert.equal(detail.body.data.ownerName, "Grace Hopper");

    const updated = await api
      .patch(`/api/accounts/${created.id}`)
      .send({ ownerName: "Grace B. Hopper", accountType: "savings" })
      .expect(200);
    assert.equal(updated.body.data.ownerName, "Grace B. Hopper");
    assert.equal(updated.body.data.accountType, "savings");

    await api.delete(`/api/accounts/${created.id}`).expect(200);
    await api.get(`/api/accounts/${created.id}`).expect(404);
  });

  it("rejects duplicate emails and direct balance edits", async () => {
    const account = await createAccount({ email: "duplicate@example.com" });

    await api
      .post("/api/accounts")
      .send({
        ownerName: "Another Owner",
        email: "duplicate@example.com",
      })
      .expect(409);

    await api
      .patch(`/api/accounts/${account.id}`)
      .send({ balance: 1000 })
      .expect(400);
  });
});

describe("transactional money movement", () => {
  it("creates an opening deposit, deposit, and withdrawal atomically", async () => {
    const account = await createAccount({ initialBalance: "100.25" });

    assert.equal(account.balance, 100.25);

    const deposit = await api
      .post(`/api/accounts/${account.id}/deposit`)
      .send({ amount: "50.25", description: "Paycheck" })
      .expect(201);
    assert.equal(deposit.body.data.account.balance, 150.5);

    const withdrawal = await api
      .post(`/api/accounts/${account.id}/withdraw`)
      .send({ amount: "25.50", description: "Groceries" })
      .expect(201);
    assert.equal(withdrawal.body.data.account.balance, 125);

    const transactions = await api
      .get(`/api/transactions?accountId=${account.id}`)
      .expect(200);

    assert.equal(transactions.body.data.length, 3);
    assert.deepEqual(
      transactions.body.data.map((transaction) => transaction.type).sort(),
      ["deposit", "deposit", "withdrawal"],
    );
  });

  it("rolls back the source debit when a transfer fails", async () => {
    const source = await createAccount({ initialBalance: "200.00" });
    const target = await createAccount({ initialBalance: "20.00" });

    await api
      .patch(`/api/accounts/${target.id}`)
      .send({ status: "frozen" })
      .expect(200);

    await api
      .post("/api/transactions/transfer")
      .send({
        fromAccountId: source.id,
        toAccountId: target.id,
        amount: "50.00",
      })
      .expect(409);

    const unchangedSource = await api
      .get(`/api/accounts/${source.id}`)
      .expect(200);
    assert.equal(unchangedSource.body.data.balance, 200);

    const transfers = await Transaction.countDocuments({ type: "transfer" });
    assert.equal(transfers, 0);
  });

  it("prevents double-spend under concurrent transfers", async () => {
    const source = await createAccount({ initialBalance: "500.00" });
    const target = await createAccount({ initialBalance: "100.00" });

    const payload = {
      fromAccountId: source.id,
      toAccountId: target.id,
      amount: "400.00",
    };

    const [first, second] = await Promise.all([
      api.post("/api/transactions/transfer").send(payload),
      api.post("/api/transactions/transfer").send(payload),
    ]);

    assert.deepEqual(
      [first.status, second.status].sort((a, b) => a - b),
      [201, 409],
    );

    const [sourceAfter, targetAfter] = await Promise.all([
      api.get(`/api/accounts/${source.id}`),
      api.get(`/api/accounts/${target.id}`),
    ]);

    assert.equal(sourceAfter.body.data.balance, 100);
    assert.equal(targetAfter.body.data.balance, 500);
    assert.equal(
      await Transaction.countDocuments({ type: "transfer" }),
      1,
    );
  });

  it("enforces consistency rules for amounts, overdrafts, and deletion", async () => {
    const account = await createAccount({ initialBalance: "30.00" });

    await api
      .post(`/api/accounts/${account.id}/deposit`)
      .send({ amount: "-10" })
      .expect(400);

    await api
      .post(`/api/accounts/${account.id}/withdraw`)
      .send({ amount: "40.00" })
      .expect(409);

    await api.delete(`/api/accounts/${account.id}`).expect(409);

    const detail = await api
      .get(`/api/accounts/${account.id}`)
      .expect(200);
    assert.equal(detail.body.data.balance, 30);
  });
});
