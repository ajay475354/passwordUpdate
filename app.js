const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

let database = null;

const intializeDbServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server start at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`error at:${e.message}`);
    process.exit(1);
  }
};

intializeDbServer();

//create user
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(password, 10);

  const userQuery = `
  select * from user
  where username='${username}';`;
  const userDb = await database.get(userQuery);

  if (userDb === undefined) {
    const passwordLength = password.length;
    if (passwordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const userQuery = `
        insert into user(username,name,password,gender,location)
        values(
            '${username}',
            '${name}',
            '${hashPassword}',
            '${gender}',
            '${location}'
        );`;
      await database.run(userQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//login user api
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `
    select * from user
    where username='${username}';`;
  const userCheck = await database.get(userQuery);
  if (userCheck === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const matchPassword = await bcrypt.compare(password, userCheck.password);
    if (matchPassword === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//change password api
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const userQuery = `
  select * from user
  where username='${username}';`;
  const userCheck = await database.get(userQuery);

  if (userCheck !== undefined) {
    const matchedPassword = await bcrypt.compare(
      oldPassword,
      userCheck.password
    );
    if (matchedPassword === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashPassword = await bcrypt.hash(newPassword, 10);
        const updateNewPassword = `
            update user
            set
            password='${hashPassword}'
            where username='${username}';`;
        await database.run(updateNewPassword);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
