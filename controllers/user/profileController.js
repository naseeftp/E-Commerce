

const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");

function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP :${otp}</h4></b><br>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};

const getForgotPassPage = async (req, res) => {
    try {
        res.render("forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const forgotEmailValid = async (req, res) => {
    try {
        const email = req.body.email;
        const findUser = await User.findOne({ email: email });

        if (!findUser) {
            return res.render("forgot-password", {
                message: "User with this email doesn't exist",
            });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            res.render("forgotPass-otp", {
                message: "", // Default empty message
            });
            console.log("OTP:", otp);
        } else {
            res.render("forgot-password", {
                message: "Failed to send OTP. Please try again.",
            });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.redirect("/pageNotFound");
    }
};
const verifyForgotPassOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:"OTP not matching"})
        }

    } catch (error) {
       res.status(500).json({success:false,message:"An error occured please try again"});

    }
}

const getResetPassPage=async(req,res)=>{
    try {
res.render("reset-password");
       
    } catch (error) {
     res.redirect("/pageNotFound");

    }
}

const  resendOtp=async(req,res)=>{
    try {
        const otp=generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email;
        console.log("Resending OTP to email:",email);
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
         console.log("Resend OTP:",otp);
         res.status(200).json({success:true,message:"resend otp successfull"})

        }
    } catch (error) {
       console.error("Error in resend otp",error) ;
       res.status(500).json({success:false,message:"internal server error"})
    }
}


const resetPassword = async (req, res) => {

    try {
        
        console.log('request body: ', req.body);

        const { newPass1 } = req.body

        const email = req.session.email

        const hashedNewPass = await bcrypt.hash(newPass1, 10)

        const updatePassword = await User.updateOne(
            { email: email }, 
            {$set: {
                password: hashedNewPass
            }}
        )

        if (updatePassword) {
            return res.redirect('/')
        }
        
        res.redirect('/reset-password')
        
    } catch (error) {
        
        console.log('Error while updating the password', error);
        res.redirect('/pageNotFound')

    }
}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    resetPassword
};