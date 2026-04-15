import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Razorpay Initialization
  let razorpay: Razorpay | null = null;
  try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  } catch (err) {
    console.error("Failed to initialize Razorpay:", err);
  }

  // MongoDB connection (with fallback)
  // In AI Studio, we can hardcode it for this specific user request since they provided it
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://yuvarajs1511_db_user:q7FPV1tW1qGzrFr0@cluster0.sozqoyt.mongodb.net/neuc2m?appName=Cluster0";
  let isMongoConnected = false;

  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      isMongoConnected = true;
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error. Using mock data fallback.', err);
    }
  } else {
    console.log('No MONGODB_URI provided in .env. Using mock data fallback.');
  }

  // Mongoose Schema
  const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    videoUrl: String,
    price: Number,
    preOrderTarget: Number,
    currentPreOrders: Number,
    c2m: Boolean,
  });
  
  const Product = isMongoConnected ? mongoose.model('Product', productSchema) : null;

  // Mock Data Fallback
  let mockProducts = [
    {
      _id: '1',
      name: 'Midnight Velvet Gown',
      description: 'Luxurious velvet gown perfect for evening events. Pre-order to start manufacturing.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-a-black-dress-walking-in-a-park-1249-large.mp4',
      price: 4999,
      preOrderTarget: 50,
      currentPreOrders: 32,
      c2m: true
    },
    {
      _id: '2',
      name: 'Crimson Elegance Dress',
      description: 'Premium silk dress. Zero inventory risk, made just for you.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-walking-on-the-street-with-a-red-dress-1250-large.mp4',
      price: 2999,
      preOrderTarget: 100,
      currentPreOrders: 85,
      c2m: true
    },
    {
      _id: '3',
      name: 'Urban Chic Outfit',
      description: 'Modern streetwear collection. Back this design to bring it to life.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-a-woman-in-a-fashionable-outfit-poses-in-the-city-51000-large.mp4',
      price: 1999,
      preOrderTarget: 200,
      currentPreOrders: 195,
      c2m: true
    }
  ];

  // API Routes
  app.get('/api/products', async (req, res) => {
    if (isMongoConnected && Product) {
      try {
        const products = await Product.find();
        if (products.length === 0) {
          // Seed database if empty
          await Product.insertMany(mockProducts);
          const newProducts = await Product.find();
          return res.json(newProducts);
        }
        res.json(products);
      } catch (error) {
        res.status(500).json({ error: 'Database error' });
      }
    } else {
      res.json(mockProducts);
    }
  });

  app.post('/api/products/:id/preorder', async (req, res) => {
    const { id } = req.params;
    if (isMongoConnected && Product) {
      try {
        const product = await Product.findByIdAndUpdate(
          id,
          { $inc: { currentPreOrders: 1 } },
          { new: true }
        );
        res.json(product);
      } catch (error) {
        res.status(500).json({ error: 'Database error' });
      }
    } else {
      const product = mockProducts.find(p => p._id === id);
      if (product) {
        product.currentPreOrders += 1;
        res.json(product);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    }
  });

  app.post('/api/create-razorpay-order', async (req, res) => {
    try {
      if (!razorpay) {
        return res.status(500).json({ error: 'Razorpay is not configured' });
      }
      const { amount, currency = 'INR' } = req.body;
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency,
        receipt: `receipt_${Date.now()}`
      };
      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.post('/api/verify-razorpay-payment', (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const secret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!secret) {
        return res.status(500).json({ error: 'Razorpay secret not configured' });
      }

      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const digest = shasum.digest('hex');

      if (digest === razorpay_signature) {
        res.json({ status: 'success' });
      } else {
        res.status(400).json({ status: 'failure', message: 'Invalid signature' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
