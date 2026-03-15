import express from "express";
import cors from "cors";
import { db } from "./firebase.js";
import { collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";


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
// Route لحفظ حالة اللعبة
app.post("/save-game-state", async (req, res) => {
  const { telegramId, gameState } = req.body;
  if (!telegramId || !gameState) {
    return res.status(400).json({ error: "telegramId and gameState are required" });
  }
  try {
    const playerDocRef = doc(collection(db, "players"), String(telegramId));
    await setDoc(playerDocRef, { gameState }, { merge: true });
    res.status(200).json({ message: "Game state saved" });
  } catch (err) {
    console.error("Error saving game state:", err);
    res.status(500).json({ error: err.message });
  }
});

// Route لجلب حالة اللعبة
app.get("/load-game-state/:telegramId", async (req, res) => {
  const { telegramId } = req.params;
  try {
    const playerDocRef = doc(collection(db, "players"), String(telegramId));
    const docSnap = await getDoc(playerDocRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Player not found" });
    }
    const data = docSnap.data();
    res.status(200).json({ gameState: data.gameState || null });
  } catch (err) {
    console.error("Error loading game state:", err);
    res.status(500).json({ error: err.message });
  }
});
// إنشاء كلان جديد
app.post("/clan/create", async (req, res) => {
  const { clanName, leaderTelegramId, leaderName } = req.body;
  if (!clanName || !leaderTelegramId) {
    return res.status(400).json({ error: "clanName and leaderTelegramId required" });
  }
  try {
    // نتأكد إن مفيش كلان بنفس الاسم
    const clansRef = collection(db, "clans");
    const q = query(clansRef, where("name", "==", clanName));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return res.status(400).json({ error: "Clan name already exists" });
    }

    const clanRef = await addDoc(clansRef, {
      name: clanName,
      leaderTelegramId: String(leaderTelegramId),
      members: [{ telegramId: String(leaderTelegramId), name: leaderName, role: "leader" }],
      createdAt: Date.now()
    });

    // نحدّث بيانات اللاعب إنه انضم لكلان
    const playerDocRef = doc(collection(db, "players"), String(leaderTelegramId));
    await setDoc(playerDocRef, { clanId: clanRef.id, clanName }, { merge: true });

    res.status(200).json({ message: "Clan created", clanId: clanRef.id });
  } catch (err) {
    console.error("Error creating clan:", err);
    res.status(500).json({ error: err.message });
  }
});

// الانضمام لكلان
app.post("/clan/join", async (req, res) => {
  const { clanName, telegramId, playerName } = req.body;
  if (!clanName || !telegramId) {
    return res.status(400).json({ error: "clanName and telegramId required" });
  }
  try {
    const clansRef = collection(db, "clans");
    const q = query(clansRef, where("name", "==", clanName));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return res.status(404).json({ error: "Clan not found" });
    }

    const clanDoc = snapshot.docs[0];
    const clanData = clanDoc.data();
    const members = clanData.members || [];

    // نتأكد إن اللاعب مش موجود بالفعل
    const alreadyMember = members.find(m => m.telegramId === String(telegramId));
    if (alreadyMember) {
      return res.status(400).json({ error: "Already a member" });
    }

    members.push({ telegramId: String(telegramId), name: playerName, role: "member" });
    await setDoc(doc(db, "clans", clanDoc.id), { members }, { merge: true });

    // نحدّث بيانات اللاعب
    const playerDocRef = doc(collection(db, "players"), String(telegramId));
    await setDoc(playerDocRef, { clanId: clanDoc.id, clanName }, { merge: true });

    res.status(200).json({ message: "Joined clan", clanId: clanDoc.id, members });
  } catch (err) {
    console.error("Error joining clan:", err);
    res.status(500).json({ error: err.message });
  }
});

// جيب بيانات كلان
app.get("/clan/:clanId", async (req, res) => {
  const { clanId } = req.params;
  try {
    const clanDocRef = doc(db, "clans", clanId);
    const clanSnap = await getDoc(clanDocRef);
    if (!clanSnap.exists()) {
      return res.status(404).json({ error: "Clan not found" });
    }
    res.status(200).json({ id: clanSnap.id, ...clanSnap.data() });
  } catch (err) {
    console.error("Error getting clan:", err);
    res.status(500).json({ error: err.message });
  }
});

// جيب كل الكلانات
app.get("/clans", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "clans"));
    const clans = [];
    snapshot.forEach(d => clans.push({ id: d.id, ...d.data() }));
    res.status(200).json(clans);
  } catch (err) {
    console.error("Error getting clans:", err);
    res.status(500).json({ error: err.message });
  }
});
// مغادرة كلان
app.post("/clan/leave", async (req, res) => {
  const { telegramId } = req.body;
  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }
  try {
    // نجيب بيانات اللاعب عشان نعرف الـ clanId
    const playerDocRef = doc(collection(db, "players"), String(telegramId));
    const playerSnap = await getDoc(playerDocRef);
    if (!playerSnap.exists()) {
      return res.status(404).json({ error: "Player not found" });
    }

    const playerData = playerSnap.data();
    const clanId = playerData.clanId;
    if (!clanId) {
      return res.status(400).json({ error: "Player is not in a clan" });
    }

    // نشيل اللاعب من الكلان
    const clanDocRef = doc(db, "clans", clanId);
    const clanSnap = await getDoc(clanDocRef);
    if (clanSnap.exists()) {
      const members = clanSnap.data().members || [];
      const newMembers = members.filter(m => m.telegramId !== String(telegramId));
      await setDoc(clanDocRef, { members: newMembers }, { merge: true });
    }

    // نشيل الكلان من بيانات اللاعب
    await setDoc(playerDocRef, { clanId: null, clanName: null }, { merge: true });

    res.status(200).json({ message: "Left clan successfully" });
  } catch (err) {
    console.error("Error leaving clan:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
