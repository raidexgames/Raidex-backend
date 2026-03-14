import express from "express";
import cors from "cors";
import { db } from "./firebase.js";
import { collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Route تجريبي
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// Route لتسجيل/تحديث لاعب تليجرام
app.post("/register-telegram-player", async (req, res) => {
  const { telegramId, telegramName } = req.body;

  if (!telegramId || !telegramName) {
    return res.status(400).json({ error: "telegramId and telegramName are required" });
  }

  try {
    const playersRef = collection(db, "players");

    // نخلي الـ doc id هو telegramId عشان مايتكررش
    const playerDocRef = doc(playersRef, String(telegramId));

   await setDoc(
  playerDocRef,
  {
    telegramId,
    telegramName,
    level: 1,
    xp: 0,
    resources: {
      gold: 1000,
      wood: 500,
      stone: 300
    }, 
    army: {
      tiger: 5,
      elephant: 1,
      gorilla: 0
    },
    buildings: {
      townHall: 1,
      barracks: 1
    },
    stats: {
      totalBattles: 0,
      wins: 0,
      losses: 0
    },
    createdAt: Date.now()
  },
  { merge: true }
);

    res.status(200).json({ message: "Telegram player registered/updated", id: telegramId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route لحفظ لاعب جديد (قديم – ممكن نخليه للتجارب)
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
    querySnapshot.forEach((docSnap) => {
      players.push({ id: docSnap.id, ...docSnap.data() });
    });
    res.status(200).json(players);
  } catch (err) {
    console.error("Error in /players:", err); // سطر جديد مهم
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

// Route لحذف لاعب
app.delete("/players/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const playerDocRef = doc(collection(db, "players"), id);
    await deleteDoc(playerDocRef);
    res.status(200).json({ message: "Player deleted", id });
  } catch (err) {
    console.error("Error deleting player:", err);
    res.status(500).json({ error: err.message });
  }
});

// Route لتعديل بيانات لاعب
app.patch("/players/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const playerDocRef = doc(collection(db, "players"), id);
    await updateDoc(playerDocRef, updates);
    res.status(200).json({ message: "Player updated", id });
  } catch (err) {
    console.error("Error updating player:", err);
    res.status(500).json({ error: err.message });
  }
});
// Route لبعت رسالة في الشات
app.post("/chat/send", async (req, res) => {
  const { senderName, message, name, text, chatType } = req.body;
  
  // نقبل senderName أو name، وكمان message أو text
  const finalName = senderName || name;
  const finalMessage = message || text;

  if (!finalName || !finalMessage) {
    return res.status(400).json({ error: "senderName and message are required" });
  }
  try {
    await addDoc(collection(db, "messages"), {
      senderName: finalName,
      message: finalMessage,
      chatType: chatType || "global",
      timestamp: Date.now()
    });
    res.status(200).json({ message: "Message sent" });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
});


// Route لجيب آخر الرسائل
app.get("/chat/latest", async (req, res) => {
  const { chatType, limit } = req.query;
  try {
    const querySnapshot = await getDocs(collection(db, "messages"));
    let messages = [];
    querySnapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() });
    });
    // فلتر بالـ chatType لو موجود
    if (chatType) {
      messages = messages.filter(m => m.chatType === chatType);
    }
    // رتّب من الأقدم للأحدث
    messages.sort((a, b) => a.timestamp - b.timestamp);
    // خد آخر limit رسالة
    const limitNum = parseInt(limit) || 50;
    messages = messages.slice(-limitNum);
    res.status(200).json(messages);
  } catch (err) {
    console.error("Error getting messages:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
