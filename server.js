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
    const playerDocRef = doc(playersRef, String(telegramId));
    await setDoc(playerDocRef, {
      telegramId,
      telegramName,
      level: 1,
      xp: 0,
      resources: { gold: 1000, wood: 500, stone: 300 },
      army: { tiger: 5, elephant: 1, gorilla: 0 },
      buildings: { townHall: 1, barracks: 1 },
      stats: { totalBattles: 0, wins: 0, losses: 0 },
      createdAt: Date.now()
    }, { merge: true });
    res.status(200).json({ message: "Telegram player registered/updated", id: telegramId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route لحفظ لاعب جديد (للتجارب)
app.post("/add-player", async (req, res) => {
  const { name, score } = req.body;
  try {
    const docRef = await addDoc(collection(db, "players"), { name, score });
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
    console.error("Error in /players:", err);
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
    if (chatType) {
      messages = messages.filter(m => m.chatType === chatType);
    }
    messages.sort((a, b) => a.timestamp - b.timestamp);
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
  const { telegramId, gameState, power } = req.body;
  if (!telegramId || !gameState) {
    return res.status(400).json({ error: "telegramId and gameState are required" });
  }
  try {
    const playerDocRef = doc(collection(db, "players"), String(telegramId));
    await setDoc(playerDocRef, { 
      gameState,
      power: power || 0  // نحفظ قوة اللاعب
    }, { merge: true });
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
    const alreadyMember = members.find(m => String(m.telegramId) === String(telegramId));
    if (alreadyMember) {
      return res.status(400).json({ error: "Already a member" });
    }
    members.push({ telegramId: String(telegramId), name: playerName, role: "member" });
    await setDoc(doc(db, "clans", clanDoc.id), { members }, { merge: true });
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
    const telegramIdStr = String(telegramId);
    const playerDocRef = doc(collection(db, "players"), telegramIdStr);
    const playerSnap = await getDoc(playerDocRef);
    if (!playerSnap.exists()) {
      return res.status(404).json({ error: "Player not found" });
    }
    const playerData = playerSnap.data();
    const clanId = playerData.clanId;
    if (!clanId) {
      return res.status(400).json({ error: "Player is not in a clan" });
    }
    const clanDocRef = doc(db, "clans", clanId);
    const clanSnap = await getDoc(clanDocRef);
    if (clanSnap.exists()) {
      const members = clanSnap.data().members || [];
      const newMembers = members.filter(m => String(m.telegramId) !== telegramIdStr);
      await setDoc(clanDocRef, { members: newMembers }, { merge: true });
    }
    await setDoc(playerDocRef, { clanId: null, clanName: null }, { merge: true });
    res.status(200).json({ message: "Left clan successfully" });
  } catch (err) {
    console.error("Error leaving clan:", err);
    res.status(500).json({ error: err.message });
  }
});
// متطلبات مستويات الكلان
const CLAN_LEVEL_REQUIREMENTS = {
  1: { gems: 5000, gold: 100000, maxMembers: 15 },
  2: { gems: 10000, gold: 250000, maxMembers: 20 },
  3: { gems: 25000, gold: 1000000, maxMembers: 25 },
  4: { gems: 50000, gold: 5000000, maxMembers: 30 },
  5: { gems: 100000, gold: 10000000, maxMembers: 35 },
  6: { gems: 125000, gold: 20000000, maxMembers: 40 },
  7: { gems: 150000, gold: 50000000, maxMembers: 45 },
  8: { gems: 175000, gold: 100000000, maxMembers: 50 },
  9: { gems: 200000, gold: 200000000, maxMembers: 55 },
  10: { gems: 250000, gold: 500000000, maxMembers: 60 }
};

// Route للتبرع للكلان
app.post("/clan/donate", async (req, res) => {
  const { telegramId, gold, gems } = req.body;
  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }
  try {
    const telegramIdStr = String(telegramId);

    // نجيب بيانات اللاعب
    const playerDocRef = doc(collection(db, "players"), telegramIdStr);
    const playerSnap = await getDoc(playerDocRef);
    if (!playerSnap.exists()) {
      return res.status(404).json({ error: "Player not found" });
    }

    const playerData = playerSnap.data();
    if (!playerData.clanId) {
      return res.status(400).json({ error: "Player is not in a clan" });
    }

    // نجيب بيانات الكلان
    const clanDocRef = doc(db, "clans", playerData.clanId);
    const clanSnap = await getDoc(clanDocRef);
    if (!clanSnap.exists()) {
      return res.status(404).json({ error: "Clan not found" });
    }

    const clanData = clanSnap.data();
    const treasury = clanData.treasury || { gold: 0, gems: 0 };

    // نضيف التبرع للخزينة
    const donateGold = parseInt(gold) || 0;
    const donateGems = parseInt(gems) || 0;

    treasury.gold += donateGold;
    treasury.gems += donateGems;

    await setDoc(clanDocRef, { treasury }, { merge: true });

    res.status(200).json({
      message: "Donation successful",
      treasury
    });
  } catch (err) {
    console.error("Error donating:", err);
    res.status(500).json({ error: err.message });
  }
});

// Route لرفع مستوى الكلان (القائد بس)
app.post("/clan/levelup", async (req, res) => {
  const { telegramId } = req.body;
  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }
  try {
    const telegramIdStr = String(telegramId);

    // نتأكد إن اللاعب قائد
    const playerDocRef = doc(collection(db, "players"), telegramIdStr);
    const playerSnap = await getDoc(playerDocRef);
    if (!playerSnap.exists()) {
      return res.status(404).json({ error: "Player not found" });
    }

    const playerData = playerSnap.data();
    if (!playerData.clanId) {
      return res.status(400).json({ error: "Player is not in a clan" });
    }

    const clanDocRef = doc(db, "clans", playerData.clanId);
    const clanSnap = await getDoc(clanDocRef);
    if (!clanSnap.exists()) {
      return res.status(404).json({ error: "Clan not found" });
    }

    const clanData = clanSnap.data();

    // نتأكد إن اللاعب قائد
    if (String(clanData.leaderTelegramId) !== telegramIdStr) {
      return res.status(403).json({ error: "Only the leader can level up the clan" });
    }

    const currentLevel = clanData.level || 1;
    if (currentLevel >= 10) {
      return res.status(400).json({ error: "Clan is already at max level" });
    }

    const requirements = CLAN_LEVEL_REQUIREMENTS[currentLevel];
    const treasury = clanData.treasury || { gold: 0, gems: 0 };

    // نتأكد إن الخزينة فيها الكافي
    if (treasury.gold < requirements.gold || treasury.gems < requirements.gems) {
      return res.status(400).json({
        error: "Not enough resources in treasury",
        required: requirements,
        current: treasury
      });
    }

    // نخصم من الخزينة ونرفع المستوى
    treasury.gold -= requirements.gold;
    treasury.gems -= requirements.gems;
    const newLevel = currentLevel + 1;

    await setDoc(clanDocRef, {
      level: newLevel,
      treasury,
      maxMembers: CLAN_LEVEL_REQUIREMENTS[currentLevel].maxMembers
    }, { merge: true });

    res.status(200).json({
      message: "Clan leveled up!",
      newLevel,
      treasury
    });
  } catch (err) {
    console.error("Error leveling up clan:", err);
    res.status(500).json({ error: err.message });
  }
});
// تحديث قوة الكلان بناءً على قوة الأعضاء
app.post("/clan/update-power", async (req, res) => {
  const { clanId } = req.body;
  if (!clanId) {
    return res.status(400).json({ error: "clanId required" });
  }
  try {
    // نجيب بيانات الكلان
    const clanDocRef = doc(db, "clans", clanId);
    const clanSnap = await getDoc(clanDocRef);
    if (!clanSnap.exists()) {
      return res.status(404).json({ error: "Clan not found" });
    }

    const members = clanSnap.data().members || [];
    let totalPower = 0;

  // نجيب قوة كل عضو من Firestore
for (const member of members) {
  const playerDocRef = doc(collection(db, "players"), String(member.telegramId));
  const playerSnap = await getDoc(playerDocRef);
  if (playerSnap.exists()) {
    const playerData = playerSnap.data();

    if (playerData.power) {
      totalPower += playerData.power;
    } else if (playerData.gameState) {
      const gs = playerData.gameState;
      const cl = gs.castleLevel || 1;
      const bl = gs.buildingLevels || {};
      const base = 100;
      const growth = 1.15;
      let cp = Math.floor(base * Math.pow(growth, cl - 1));
      let bonus = 0;
      if (cl >= 5) bonus += Math.floor(Math.min(cl, 25) / 5) * 10000;
      if (cl >= 30) bonus += 20000;
      if (cl >= 35) bonus += 25000;
      if (cl >= 40) bonus += 30000;
      if (cl >= 45) bonus += 35000;
      if (cl >= 50) bonus += 50000;
      cp += bonus;
      const bp =
        (bl.goldMine || 1) * 20 +
        (bl.woodMine || 1) * 15 +
        (bl.meatFarm || 1) * 10 +
        (bl.school || 1) * 25 +
        (bl.hospital || 1) * 30;
      totalPower += cp + bp;
    }
  }
}


    // نحدّث قوة الكلان
    await setDoc(clanDocRef, { totalPower }, { merge: true });

    res.status(200).json({ message: "Clan power updated", totalPower });
  } catch (err) {
    console.error("Error updating clan power:", err);
    res.status(500).json({ error: err.message });
  }
});
// جيب لاعب واحد
app.get("/players/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const playerDocRef = doc(collection(db, "players"), String(id));
    const docSnap = await getDoc(playerDocRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.status(200).json({ id: docSnap.id, ...docSnap.data() });
  } catch (err) {
    console.error("Error getting player:", err);
    res.status(500).json({ error: err.message });
  }
});
// أقوى اللاعبين
app.get("/leaderboard/players", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "players"));
    let players = [];
    snapshot.forEach(d => {
      const data = d.data();
      if (data.telegramName) {
        const gs = data.gameState || {};
        const bl = gs.buildingLevels || {};
        const armyPower =
          (bl.attackTower || 1) * 50 +
          (bl.defenseTower || 1) * 40 +
          (bl.school || 1) * 30;
        players.push({
          id: d.id,
          name: data.telegramName,
          power: data.power || 0,
          level: gs.castleLevel || 1,
          armyPower: armyPower,
          clanName: data.clanName || null
        });
      }
    });
    players.sort((a, b) => b.power - a.power);
 players = players.slice(0, 100);
    res.status(200).json(players);
  } catch (err) {
    console.error("Error getting leaderboard:", err);
    res.status(500).json({ error: err.message });
  }
});

// أقوى الكلانات
app.get("/leaderboard/clans", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "clans"));
    let clans = [];
    snapshot.forEach(d => {
      const data = d.data();
      clans.push({
        id: d.id,
        name: data.name,
        totalPower: data.totalPower || 0,
        level: data.level || 1,
        membersCount: data.members?.length || 0
      });
    });
    clans.sort((a, b) => b.totalPower - a.totalPower);
    res.status(200).json(clans);
  } catch (err) {
    console.error("Error getting clans leaderboard:", err);
    res.status(500).json({ error: err.message });
  }
});
// بعت طلب صداقة
app.post("/friends/request", async (req, res) => {
  const { fromId, toId } = req.body;
  if (!fromId || !toId) return res.status(400).json({ error: "fromId and toId required" });
  try {
    const requestRef = doc(db, "friendRequests", `${fromId}_${toId}`);
    await setDoc(requestRef, {
      fromId: String(fromId),
      toId: String(toId),
      status: "pending",
      createdAt: Date.now()
    });
    res.status(200).json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جيب طلبات الصداقة الواردة
app.get("/friends/requests/:telegramId", async (req, res) => {
  const { telegramId } = req.params;
  try {
    const q = query(collection(db, "friendRequests"), where("toId", "==", String(telegramId)), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    const requests = [];
    for (const d of snapshot.docs) {
      const data = d.data();
      const playerSnap = await getDoc(doc(db, "players", data.fromId));
      const playerName = playerSnap.exists() ? playerSnap.data().telegramName : "Unknown";
      requests.push({ id: d.id, ...data, fromName: playerName });
    }
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// قبول طلب صداقة
app.post("/friends/accept", async (req, res) => {
  const { fromId, toId } = req.body;
  if (!fromId || !toId) return res.status(400).json({ error: "fromId and toId required" });
  try {
    // حدّث الطلب
    const requestRef = doc(db, "friendRequests", `${fromId}_${toId}`);
    await setDoc(requestRef, { status: "accepted" }, { merge: true });

    // أضف كل واحد في قائمة أصدقاء التاني
    const fromRef = doc(db, "players", String(fromId));
    const toRef = doc(db, "players", String(toId));
    const fromSnap = await getDoc(fromRef);
    const toSnap = await getDoc(toRef);

    const fromFriends = fromSnap.data().friends || [];
    const toFriends = toSnap.data().friends || [];

    if (!fromFriends.includes(String(toId))) fromFriends.push(String(toId));
    if (!toFriends.includes(String(fromId))) toFriends.push(String(fromId));

    await setDoc(fromRef, { friends: fromFriends }, { merge: true });
    await setDoc(toRef, { friends: toFriends }, { merge: true });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جيب قائمة الأصدقاء
app.get("/friends/:telegramId", async (req, res) => {
  const { telegramId } = req.params;
  try {
    const playerSnap = await getDoc(doc(db, "players", String(telegramId)));
    if (!playerSnap.exists()) return res.status(404).json({ error: "Player not found" });
    const friends = playerSnap.data().friends || [];
    const friendsList = [];
    for (const fId of friends) {
      const fSnap = await getDoc(doc(db, "players", fId));
      if (fSnap.exists()) {
        friendsList.push({ id: fId, name: fSnap.data().telegramName });
      }
    }
    res.status(200).json(friendsList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// بعت رسالة لصديق
app.post("/friends/message", async (req, res) => {
  const { fromId, toId, message } = req.body;
  if (!fromId || !toId || !message) return res.status(400).json({ error: "fromId, toId and message required" });
  try {
    const chatId = [String(fromId), String(toId)].sort().join("_");
    await addDoc(collection(db, "friendMessages"), {
      chatId,
      fromId: String(fromId),
      toId: String(toId),
      message,
      timestamp: Date.now()
    });
    res.status(200).json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جيب رسائل بين صديقين
app.get("/friends/messages/:id1/:id2", async (req, res) => {
  const { id1, id2 } = req.params;
  try {
    const chatId = [String(id1), String(id2)].sort().join("_");
    const q = query(collection(db, "friendMessages"), where("chatId", "==", chatId));
    const snapshot = await getDocs(q);
    let messages = [];
    snapshot.forEach(d => messages.push({ id: d.id, ...d.data() }));
    messages.sort((a, b) => a.timestamp - b.timestamp);
    messages = messages.slice(-50);
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
