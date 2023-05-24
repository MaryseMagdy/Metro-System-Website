const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const { getSessionToken } = require("../../utils/session");

const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return null; // Changed from res.status(301).redirect("/") to returning null
  }

  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userId",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleId",
      "se_project.roles.id"
    )
    .first();

  console.log("user =>", user);
  if (user) {
    user.isNormal = user.roleId === roles.user;
    user.isAdmin = user.roleId === roles.admin;
    user.isSenior = user.roleId === roles.senior;
  }
  return user;
};

module.exports = function (app) {
  // example
  app.put("/users", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const users = await db.select("*").from("se_project.users");

      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });

  // reset password user
  app.put("/api/v1/password/reset", async function (req, res) {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { newPassword } = req.body; // Removed the extra `.newPassword` here

    // ??? Make sure that user is not an admin ??? (You need to provide the necessary condition)

    try {
      await db("se_project.users").where({ id: user.id }).update({ password: newPassword }); // Changed `userId` to `user.id`
      return res.status(200).send("Password changed!");
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not change password");
    }
  });
};
