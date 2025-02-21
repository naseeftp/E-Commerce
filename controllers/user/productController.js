const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const User=require("../../models/userSchema");



const productDetails=async(req,res)=>{
  try {


    
    const userId=req.session.user;
    const userData=await User.findById(userId);
    const  productId=req.query.id;

    // console.log('product id: ', productId);
    
    const product = await Product.findById(productId).populate('category');
    // const category = await Category.find()
    const findCategory=Product.category;
    const  categoryOffer=findCategory?.categoryoffer||0;
    const productOffer=product.productOffer||0;
    const totalOffer=categoryOffer+productOffer;
    res.render("productdetails",{
    user:userData,
    product:product,
    quantity:product.quantity,
    totalOffer:totalOffer,
    category:findCategory,


    })




  } catch (error) {
    console.log('error for fetching data', error);
    res.redirect('/pageNotFound')
  }

}


module.exports={
productDetails,



}