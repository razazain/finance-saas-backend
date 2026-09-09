import mongoose from "mongoose";

const billPaymentSchema =
  new mongoose.Schema(
    {
      businessId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true
      },

      billId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Bill",
        required: true,
        index: true
      },

      vendorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Party",
        required: true,
        index: true
      },

      accountId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true,
        index: true
      },

      categoryId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
      },

      amount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      currency: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 3
      },

      paymentDate: {
        type: Date,
        required: true,
        index: true
      },

      reference: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null
      },

      /*
       * Every bill payment creates
       * exactly one expense transaction.
       */
      transactionId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        required: true,
        unique: true
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    },
    {
      timestamps: true
    }
  );

billPaymentSchema.index({
  businessId: 1,
  billId: 1,
  paymentDate: -1
});

billPaymentSchema.index({
  businessId: 1,
  vendorId: 1,
  paymentDate: -1
});

const BillPayment =
  mongoose.model(
    "BillPayment",
    billPaymentSchema
  );

export default BillPayment;