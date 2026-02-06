import express from "express";
import cors from "cors";
import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "firebase/firestore";

const app = express();
const PORT = 3000; // تعريف الـ PORT

app.use(cors());
app.use(express.json());

// Route تجريبي
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});


// Route لحفظ لاعب جديد
app.post("/add-player", async (req, res) => {
  const { name, score } = req.body;

  try {
    const docRef = await addDoc(collection(db, "players"), {
      name,
      score
    });
    res.status(200).json({ message: "Player added", id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route لجلب كل اللاعبين
app.get("/players", async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, "players"));
    const players = [];
    querySnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
