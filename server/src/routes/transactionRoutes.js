import express from "express";
import {
  listTransactions,
  transfer,
} from "../controllers/transactionController.js";

const router = express.Router();

router.get("/", listTransactions);
router.post("/transfer", transfer);

export default router;
