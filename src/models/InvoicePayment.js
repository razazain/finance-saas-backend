import mongoose from "mongoose";

const invoicePaymentSchema =
  new mongoose.Schema(
    {
      businessId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true
      },

      invoiceId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: true,
        index: true
      },

      customerId: {
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

invoicePaymentSchema.index({
  businessId: 1,
  invoiceId: 1,
  paymentDate: -1
});

invoicePaymentSchema.index({
  businessId: 1,
  customerId: 1,
  paymentDate: -1
});

const InvoicePayment =
  mongoose.model(
    "InvoicePayment",
    invoicePaymentSchema
  );

export default InvoicePayment;