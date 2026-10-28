import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: [true, "Owner name is required."],
      trim: true,
      minlength: [2, "Owner name must be at least 2 characters."],
      maxlength: [80, "Owner name cannot exceed 80 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    accountType: {
      type: String,
      enum: {
        values: ["checking", "savings"],
        message: "Account type must be checking or savings.",
      },
      default: "checking",
    },
    balanceCents: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Balance cannot be negative."],
      validate: {
        validator: Number.isInteger,
        message: "Balance must be stored as an integer number of cents.",
      },
    },
    currency: {
      type: String,
      enum: {
        values: ["USD"],
        message: "Only USD accounts are supported in this demo.",
      },
      default: "USD",
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "frozen"],
        message: "Status must be active or frozen.",
      },
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

accountSchema.virtual("balance").get(function balance() {
  return this.balanceCents / 100;
});

accountSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;

    if (Number.isFinite(ret.balance)) {
      ret.balance = Math.round(ret.balance * 100) / 100;
    } else {
      delete ret.balance;
    }

    delete ret.balanceCents;
    return ret;
  },
});

const Account = mongoose.model("Account", accountSchema);

export default Account;
