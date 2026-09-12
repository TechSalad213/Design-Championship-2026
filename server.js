const express = require("express");
const multer = require("multer");
const app = express();

const upload = multer({ dest: "uploads/" });

app.use("/uploads", express.static("uploads"));

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const databasePath = path.join(__dirname, "database.json");
const database = JSON.parse(fs.readFileSync(databasePath));

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "heroPage.html"));
});

app.post("/signup", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = await new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(derivedKey.toString("hex"));
            }
        });
    });

    database.users.push({
        username: username,
        salt: salt,
        passwordHash: hash,
        id: id
    });

    console.log(database);

    fs.writeFileSync(
        databasePath,
        JSON.stringify(database, null, 2)
    );

    res.send("Sign Up Received!");
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const user = database.users.find(
        user => user.username === username
    );

    if (!user) {
        return res.send("Username or password is incorrect");
    }

    const hash = await new Promise((resolve, reject) => {
        crypto.scrypt(password, user.salt, 64, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(derivedKey.toString("hex"));
            }
        });
    });

    if (hash === user.passwordHash) {
        res.json({
            success: true,
            userId: user.id,
            username: user.username
        });
    } else {
        res.send("Username or password is incorrect");
    }
});

app.post("/uploadSkill", upload.any(), async (req, res) => {
    console.log("UPLOAD DATA:", req.body);

    const {
        userId,
        skillName,
        learning,
        description,
        category,
        learningTime,
        requirements,
        topic
    } = req.body;

    const stages = JSON.parse(req.body.stages);

    if (!database.skills) {
        database.skills = {};
    }

    if (!database.skills[userId]) {
        database.skills[userId] = {};
    }

    const skillId = crypto.randomBytes(6).toString("hex");

    const courseFile = req.files.find(
        file => file.fieldname === "courseFile"
    );

    const stageFiles = req.files.filter(
        file => file.fieldname === "stageFile"
    );

    stages.forEach((stage, i) => {
        stage.attachment = stageFiles[i]
            ? `/uploads/${stageFiles[i].filename}`
            : null;
    });

    database.skills[userId][skillId] = {
        name: skillName,
        heading: learning,
        description: description,
        stages: stages,
        category: category,
        learningTime: learningTime,
        itemsNeeded: requirements,
        topic: topic,
        courseFile: courseFile
            ? `/uploads/${courseFile.filename}`
            : null
    };

    fs.writeFileSync(
        databasePath,
        JSON.stringify(database, null, 2)
    );

    res.json({
        success: true,
        skillId: skillId
    });
});

app.get("/skills", (req, res) => {
    res.json(database.skills || {});
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
