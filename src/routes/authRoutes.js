import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
};

router.post("/register", async (req, res) => {
  try {
    const { email, username, password, phone, cpf } = req.body;

    if (!username || !email || !password|| !phone || !cpf) {
      return res.status(400).json({ message: "Todos os dados são necessários" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "A senha precisa de 6 caracteres ou mais" });
    }

    if (phone.length < 11) {
        return res.status(400).json({ message: "Telefone incompleto" });
    }
    if (cpf.length < 11) {
        return res.status(400).json({ message: "Cpf incompleto" });
      }

    if (username.length < 3) {
      return res.status(400).json({ message: "O nome precisa de 3 caracteres ou mais" });
    }

    // check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email já existe" });
    }

    const existingCPF = await User.findOne({ cpf });
    if (existingCPF) {
      return res.status(400).json({ message: "CPF já cadastrado" });
    }

    // get random avatar
    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const user = new User({
      username,
      cpf,
      phone, 
      email,
      password,
      profileImage,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        cpf: user.cpf,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    // check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        cpf: user.cpf,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;