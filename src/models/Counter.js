import mongoose from "mongoose";

const counterSchema =
  new mongoose.Schema(
    {
      businessId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true
      },

      key: {
        type: String,
        required: true,
        trim: true
      },

      sequence: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      }
    },
    {
      timestamps: true
    }
  );

counterSchema.index(
  {
    businessId: 1,
    key: 1
  },
  {
    unique: true
  }
);

const Counter =
  mongoose.model(
    "Counter",
    counterSchema
  );

export default Counter;