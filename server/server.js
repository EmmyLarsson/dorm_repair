const http = require('http');
const bp = require('body-parser');
const express = require('express');
const userAccountModel = require('./models/user_account');
const jwt = require('./libs/jwt');
const dateUtils = require('./libs/date_utils');

const app = express();
app.use(bp.urlencoded({ extended: true}));
app.use(bp.json());

const hostname = "127.0.0.1";
const port = 3000;

app.get("/api/users", (req, res) => {
    var response = {
        isError: true,
        errorMessage: "You are not logged in"
    };

    res.send(JSON.stringify(response));
});

app.get("/api/user/:accountId", async (req, res) => {
  const accountId = req.params.accountId;
  const response = await userAccountModel.getUserAccountById(accountId);
  res.send(JSON.stringify(response));
});


app.listen(port, () => {
    console.log("Server is running");
});