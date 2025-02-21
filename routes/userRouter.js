const express=require("express")
const router=express.Router();
const passport = require("../config/passport");
const userController=require("../controllers/user/userController");
const profileController=require("../controllers/user/profileController");
const { userAuth } = require("../middlewares/auth");
const productController=require("../controllers/user/productController");



router.get("/pageNotFound",userController.pageNotFound);
router.get("/",userController.loadHomepage)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);

router.get('/auth/google',passport.authenticate('google'))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user._id
    // console.log('fgs')
    res.redirect('/')
});
//loginmanagement
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout)
//profile management
router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password", profileController.resetPassword)
 


router.get("/shop",userController.loadShoppingPage);
router.get('/filter',userController.filterProduct);
router.get('/filterPrice',userController.filterByPrice);
router.post("/search",userController.searchProducts);

router.get("/productDetails",productController.productDetails);

module.exports=router;