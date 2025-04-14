const { options } = require("pdfkit");
const Category=require("../../models/categorySchema");
const { findOne } = require("../../models/productSchema");


const addCategory=async(req,res)=>{
const {name,description}=req.body;
try {
    const existingCategory=await findOne({name:{$regex:`${name}`,$options:'i'}})
     if(existingCategory){
        return res.status(400).json({
            swalError:true,
            message:'product with this name allredy exist'
        })
     }

     const newCategory= new Category({
        name:name,
        description:description
     })

     await newCategory.save();
     return res.json({message:'category created successfully'})
} catch (error) {
    console.error("error while crearting category",error)
    return res.status(500).json({message:'internal server error'})
}



}



const editCategory=async(req,res)=>{
try {
    

    const id=req.params.id;
    const {categoryName, description}=req.body

    const existingCategory=await Category.findOne({
   name:categoryName,
   _id:{$ne:id}
         
    }).collation({locale:'en', strength:2})

  if(existingCategory){
    return res.status(400).json({
        success:false,
        message:'category with this name allredy exist'
    })
  }



  
} catch (error) {
    
}


}