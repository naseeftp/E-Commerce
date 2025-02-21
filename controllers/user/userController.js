//requiring schema

const User=require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const Product=require("../../models/productSchema");
const Brand=require("../../models/brandSchema");
const Banner=require("../../models/bannerSchema");
const env=require("dotenv").config();
const nodemailer=require("nodemailer")
const bcrypt=require("bcrypt")


const pageNotFound=async(req,res)=>{
try {
  res.render("page-404")
} catch (error) {
  res.redirect("/pageNotFound")
}

}

//rendering home

const loadHomepage=async(req,res)=>{
try{
  const user=req.session.user
  // console.log(user)
  let userData = null
  if(user){
    userData=await User.findById(user).lean()
  }
  res.render("home",{user:userData})
}catch(error){
    console.log("home page is not found")
    res.status(500).send("server error")
}
}

//rendering signup page
const loadSignup=async(req,res)=>{
try{
return res.render("signup")
}
catch(error){
console.log("signup page is not found",error)
res.status(500).send("server error")
}
}

function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString();
}
async function sendVerificationEmail(email,otp){
    try{
       const transporter  =nodemailer.createTransport({
       service:'gmail',
       port:587,
       secure:false,
       requireTLS:true,
       auth:{

        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD
       }
    })
      const info=await transporter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:"verify your account",
        text:`your otp is ${otp}`,
        html:`<b>your OTP:${otp}</b>`,

      })
      return info.accepted.length>0

    }
    catch(error){
      console.error("error sending email",error)
      return false;
    }
}


const signup=async(req,res)=>{
  try{
        const {name,phone,email,password,Confirm}=req.body;
        // const user = req.body
        if(password!==Confirm){
              
              console.log('password:', password);
          
              return res.render("signup",{message:"password do not match"});
        }

        if (password.charAt(0) !== password.charAt(0).toUpperCase()) {
          return res.render("signup", { message: "Password must start with a capital letter" });
        }
        const findUser=await User.findOne({email})
        if(findUser){
            console.log('Finded user: ', findUser);
            
              return res.render("signup",{message:"user with this email allredy exist"})
            
        }

     
        
        const otp=generateOtp();
        const emailSent=await sendVerificationEmail(email,otp);
        console.log(2);
        
        if(!emailSent){

            console.log('Email is not sended', emailSent);
          
             return res.json("email-error")
          
        }
        req.session.userOtp=otp;
        req.session.userData={phone,name,email,password};

        res.render("verify_otp");
        console.log("OTP sent",otp)
   

        
    }

    catch(error){
    console.error("signup error",error);
    res.redirect("/pageNotFound")
    }

}

const securepassword=async (password)=>{
 try {
   const passwordHash=await bcrypt.hash(password,10)
   return  passwordHash;
 } catch (error) {
  
 }

}



const verifyOtp=async(req,res)=>{
try{
    const {otp}=req.body;
    console.log(otp)
    if(otp===req.session.userOtp){
      const user=req.session.userData
      const passwordHash=await securepassword(user.password)

      const saveUserData=new User({
        name:user.name,
        email:user.email,
        phone:user.phone,
        password:passwordHash
      })
      await saveUserData.save();
      req.session.user=saveUserData._id;
      res.json({success:true,redirectUrl:"/"})
    }
    else{
      res.status(400).json({success:false,message:"invalid otp please try again"})

    }
}
catch(error){
console.log("Error verifying otp")
res.status(500).json({success:false,message:"an error occured"})

}

}
const resendOtp=async(req,res)=>{
  try {
    const {email}=req.session.userData;
    if(!email){
      return res.status(400).json({success:false,message:"email not found in session"})
    }
    const otp=generateOtp();
    req.session.userOtp=otp;

    const emailSent=await sendVerificationEmail(email,otp);
    if(emailSent){
      console.log("Resend OTP:",otp);
      res.status(200).json({success:true,message:"OTP resend succesfully"})

    }
    else{
      res.status(500).json({success:false,message:"failed to resend otp please try again"})
    }
  } catch (error) {
   console.error("Error sending Otp")
   res.status(500).json({success:false,message:"internal server error. please try again"})
  }

}

const loadLogin=async(req,res)=>{
try {
  if(!req.session.user)
  {
    return res.render("login")
  }
  else{
    res.redirect("/")
  }
  
} catch (error) {
  res.redirect("/pageNotFound")

}
}

const login=async(req,res)=>{
  try {
    const {email,password}=req.body;
    const findUser=await User.findOne({isAdmin:0,email:email})
    if(!findUser){
      return res.render("login",{message:"user not found"});
    }
    if(findUser.isBlocked)
    {
      return res.render("login",{message:"user is blocked by admin"})
    }

    const passwordMatch=await bcrypt.compare(password,findUser.password)
    if(!passwordMatch)
    {
    return res.render("login",{message:"in correct password"})

    }

    req.session.user=findUser._id;
    res.redirect("/")
  } catch (error) {
    console.error("login error")
    res.render("loginn",{message:"login failed please try again later"})

  }
}


const logout=async(req,res)=>{
try {
  req.session.user = undefined
  req.session.userData = undefined
    return res.redirect("/login")
  
} catch (error) {
    console.log("logout error",error)
    res.redirect("/pageNotFound")
}

}



const loadShoppingPage = async (req, res) => {
  try {
      const user = req.session.user;
      const userData = await User.findOne({ _id: user });

      const categories = await Category.find({ isListed: true });
      const categoryIds = categories.map((category) => category._id.toString());

      // Pagination setup
      const page = parseInt(req.query.page) || 1;
      const limit = 9;
      const skip = (page - 1) * limit;

      // Ensure categoryIds is not empty
      const productQuery = {
          isBlocked: false,
          quantity: { $gt: 0 },
      };

      if (categoryIds.length > 0) {
          productQuery.category = { $in: categoryIds };
      }

      // Fetch products with pagination
      const products = await Product.find(productQuery)
          .sort({ createdOn: -1 })
          .skip(skip)
          .limit(limit);

      
   

      // Count total products
      const totalProducts = await Product.countDocuments(productQuery);
      const totalPages = Math.ceil(totalProducts / limit);

      // Fetch brands
      const brands = await Brand.find({ isBlocked: false });

      // Format category data
      const categoriesWithIds = categories.map((category) => ({
          _id: category._id,
          name: category.name,
      }));

      // Render shop page
      res.render("shop", {
          user: userData,
          products: products,
          category: categoriesWithIds,
          brand: brands,
          totalProducts: totalProducts,
          totalPages: totalPages,
          currentPage: page   

      });
  } catch (error) {
      console.error("Error loading shopping page:", error);
      res.redirect("/pageNotFound");
  }
};

const filterProduct=async(req,res)=>{
try {
  
const user=req.session.user;
const category=req.query.category;
const brand=req.query.brand;
const findCategory=category?await Category.findOne({_id:category}):null;
const findBrand=brand?await Brand.findOne({_id:brand}):null;
const brands=await Brand.find({}).lean();

const query={
isBlocked:false,
quantity:{$gt:0}
}
if(findCategory){
query.category=findCategory._id;

}

if(findBrand){
  query.brand=findBrand._id;
  
  }

  let findProducts=await Product.find(query).lean();
  findProducts.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));

  const categories=await Category.find({isListed:true});
  let itemsPerage=6;
  let currentPage=parseInt(req.query.page)||1;
  let startIndex=(currentPage-1)*itemsPerage;
  let endIndex=startIndex+itemsPerage;
  let totalPages=Math.ceil(findProducts.length/itemsPerage);
  const currentProduct=findProducts.slice(startIndex,endIndex);
  let userData=null;
  if(user){
  userData=await User.findOne({_id:user});
  if(userData){
   const searchEntry={
   category:findCategory ? findCategory._id:null,
   brand:findBrand ? findBrand.brandName:null,
   searchedOn:new Date(),
   }
  userData.searchHistory.push(searchEntry);
  await userData.save();

}
}
  
req.session.filteredProducts=currentProduct;
res.render("shop",{
user:userData,
products:currentProduct,
category:categories,
brand:brands,
totalPages,
currentPage,
selectedCategory:category||null,
selectedBrand:brand||null,
})
} catch (error) {
  res.redirect("/pageNotFound");
}


}


const filterByPrice= async(req,res)=>{
    try {
        const user=req.session.user;
        const userData=await User.findOne({_id:user});
        const brands=await Brand.find({}).lean();
        const categories=await Category.find({isListed:true}).lean();
       
      
        let findProducts = await Product.find({
          salePrice: { $gt: req.query.gt, $lt: req.query.lt },
          isBlocked: false,
          quantity: { $gt: 0 }
      }).lean();
        
        findProducts.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));

        let itemsPerage=6;
        let currentPage=parseInt(req.query.page)||1;
        let startIndex=(currentPage-1)*itemsPerage;
        let endIndex=startIndex+itemsPerage;
        let totalPages=Math.ceil(findProducts.length/itemsPerage);
        const currentProduct=findProducts.slice(startIndex,endIndex);
        req.session.filterProducts=findProducts;

        res.render("shop",{
        user:userData,
        products:currentProduct,
        category:categories,
        brand:brands,
        totalPages,
        currentPage,


        })


    } catch (error) {
      console.log(error);
      res.redirect("/pageNotFound")
      
    }

}

const searchProducts=async(req,res)=>{
    try {
      const user=req.session.user;
      const userData=await User.findOne({_id:user});
      let search=req.body.query||""

      const brands=await Brand.find({}).lean();
      const categories=await Category.find({isListed:true}).lean();
      const categoryIds=categories.map(category=>category._id.toString());
      let searchResult=[];
     
      if (Array.isArray(req.session.filteredProducts) && req.session.filteredProducts.length > 0) {
        searchResult = req.session.filteredProducts.filter(product =>
            product.productName.toLowerCase().includes(search.toLowerCase())
        );


      }else{

        searchResult=await Product.find({
          productName:{$regex:".*"+search+".*",$options:"i"},
          isBlocked:false,
          quantity:{$gt:0},
          category:{$in:categoryIds}

        })
      }

      searchResult.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
      let itemsPerage=6;
      let currentPage=parseInt(req.query.page)||1;
      let startIndex=(currentPage-1)*itemsPerage;
      let endIndex=startIndex+itemsPerage;
      let totalPages=Math.ceil(searchResult.length/itemsPerage);
      const currentProduct=searchResult.slice(startIndex,endIndex);

    
      res.render("shop",{
       user:userData,
       products:currentProduct,
       category:categories,
       brand:brands,
       totalPages,
       currentPage,
       count:searchResult.length,



      });


        } catch (error) {
        
       console.log("error while searching:",error);
       res.redirect("/pageNotFound");
   
        }

}


module.exports={
    loadHomepage,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    pageNotFound,
    login,
    logout,
    loadShoppingPage,
    filterProduct,
    filterByPrice,
    searchProducts
    }