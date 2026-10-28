import express from "express";
import {
  createAccount,
  deleteAccount,
  getAccount,
  getStats,
  listAccounts,
  updateAccount,
} from "../controllers/accountController.js";
import {
  deposit,
  withdraw,
} from "../controllers/transactionController.js";

const router = express.Router();

router.get("/stats", getStats);

router
  .route("/")
  .get(listAccounts)
  .post(createAccount);

router
  .route("/:id")
  .get(getAccount)
  .patch(updateAccount)
  .put(updateAccount)
  .delete(deleteAccount);

router.post("/:accountId/deposit", deposit);
router.post("/:accountId/withdraw", withdraw);

export default router;
