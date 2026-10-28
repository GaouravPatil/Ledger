import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    type: {
      type: String,
      enum: {
        values: ["deposit", "withdrawal", "transfer"],
        message: "Transaction type must be deposit, withdrawal, or transfer.",
      },
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: [1, "Transaction amount must be greater than zero."],
      validate: {
        validator: Number.isInteger,
        message: "Amount must be stored as an integer number of cents.",
      },
    },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    status: {
      type: String,
      enum: ["completed"],
      default: "completed",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [180, "Description cannot exceed 180 characters."],
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

transactionSchema.virtual("amount").get(function amount() {
  return this.amountCents / 100;
});

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });

transactionSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;

    if (Number.isFinite(ret.amount)) {
      ret.amount = Math.round(ret.amount * 100) / 100;
    }

    delete ret.amountCents;
    return ret;
  },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
