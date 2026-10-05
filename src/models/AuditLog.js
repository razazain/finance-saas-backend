import mongoose from "mongoose";
const schema=new mongoose.Schema({businessId:{type:mongoose.Schema.Types.ObjectId,ref:"Business",required:true,index:true},userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null,index:true},action:{type:String,required:true,index:true},method:{type:String,required:true},path:{type:String,required:true},statusCode:{type:Number,required:true},resourceType:{type:String,default:null},resourceId:{type:String,default:null},ip:{type:String,default:null},userAgent:{type:String,default:null},metadata:{type:mongoose.Schema.Types.Mixed,default:null}},{timestamps:true});
schema.index({businessId:1,createdAt:-1});
export default mongoose.model("AuditLog",schema);
