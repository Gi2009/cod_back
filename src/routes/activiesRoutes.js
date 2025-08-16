import express from "express";
import cloudinary from "../lib/cloudinary.js";
import activies from "../models/activites.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title,  description, duration, image, local, dif, maxi, incluid, required } = req.body;

    if ( !title||  !description|| !duration|| !image|| !local|| !dif || !maxi || !incluid || !required) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // upload the image to cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url;

    // save to the database
    const newActivie = new activies({
      title,  
      description, 
      duration, 
      local, 
      dif, 
      maxi, 
      incluid, 
      required,
      image: imageUrl,
      user: req.user._id,
    });

    await newActivie.save();

    res.status(201).json(newActivie);
  } catch (error) {
    console.log("Error creating activie", error);
    res.status(500).json({ message: error.message });
  }
});

// pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
  // example call from react native - frontend
  // const response = await fetch("http://localhost:3000/api/books?page=1&limit=5");
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 2;
    const skip = (page - 1) * limit;

    const activie = await Activie.find()
      .sort({ createdAt: -1 }) // desc
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage");

    const totalActivies = await activies.countDocuments();

    res.send({
      activies,
      currentPage: page,
      totalActivies,
      totalPages: Math.ceil(totalActivies / limit),
    });
  } catch (error) {
    console.log("Error in get all books route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get recommended books by the logged in user
router.get("/user", protectRoute, async (req, res) => {
  try {
    const activie = await activies.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(!activie);
  } catch (error) {
    console.error("Get user books error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const activie = await activies.findById(req.params.id);
    if (!activie) return res.status(404).json({ message: "Book not found" });

    // check if user is the creator of the book
    if (activie.user.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "Unauthorized" });

    // https://res.cloudinary.com/de1rm4uto/image/upload/v1741568358/qyup61vejflxxw8igvi0.png
    // delete image from cloduinary as well
    if (activie.image && activie.image.includes("cloudinary")) {
      try {
        const publicId = activie.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.log("Error deleting image from cloudinary", deleteError);
      }
    }

    await activie.deleteOne();

    res.json({ message: "activie deleted successfully" });
  } catch (error) {
    console.log("Error deleting activie", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;