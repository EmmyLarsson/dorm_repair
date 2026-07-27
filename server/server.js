const http = require('http');
const bp = require('body-parser');
const cors = require("cors");
const express = require('express');
const userAccountModel = require('./models/user_account');
const jwt = require('./libs/jwt');
const dateUtils = require('./libs/date_utils');
const repair_request = require('./models/repair_request');
const progress_status = require('./models/progress_status');

const app = express();   
app.use(bp.urlencoded({ extended: true}));
app.use(cors());    
app.use(bp.json());

const hostname = "127.0.0.1";
const port = 3000;

const checkAccessToken = (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    } else {
        token = req.body.token;
    }

    jwt.verify(token)
        .then((decoded) => {
            req.decoded = decoded;
            next();
        }, (err) => {
            res.json({
                isError: false,
                result: false,
                errorMessage: "ยังไม่ได้เข้าสู่ระบบ"
            });
        });
}

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

app.post("/api/authen/authen_request", async (req, res) => {
    console.log(req.body.authen_request);
    const authenRequest = req.body.authen_request;
    const result = await userAccountModel.checkAuthenRequest(authenRequest);
    console.log(result);

    if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };    
    } else {
        var payload = { username: result.data[0].username };
        const authenToken = jwt.sign(payload);
        response = {
            isError: false,
            data: authenToken,
            errorMessage: ""
        }
    }
    
    res.send(JSON.stringify(response));
});

app.post("/api/authen/access_request", async (req, res) => {
    const authenSignature = req.body.authen_signature;
    const authenToken = req.body.authen_token;

    var decoded = jwt.verify(authenToken);

    let response;

    if (decoded) {
        const result = await userAccountModel.checkAccessRequest(authenSignature, authenToken);
        console.log(result);

        if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };
        } else {
            var payload = {
                user_id: result.data[0].account_id,
                username: result.data[0].username,
                image_url: result.data[0].profile_image,
                date: dateUtils.getCurrentDateForToken()
            };

            const accessToken = jwt.sign(payload);
            response = {
                isError: false,
                data: {
                    access_token: accessToken,
                    image_url: result.data[0].profile_image
                },
                errorMessage: ""
            }
        }
    } else {
        response = {
            isError: true,
            data: "",
            errorMessage: "ข้อมูลไม่ถูกต้อง"
        };
    }
    res.send(JSON.stringify(response));
});

app.get("/api/progress_status/get_all", checkAccessToken, async (req, res) => {
    const response = await progress_status.getAllProgressStatus();
    res.json(response);
});

app.get("/api/repair_request/get_all_by_user", checkAccessToken, async (req, res) => {
    console.log(req.decoded);
    const accountId = req.decoded.user_id;
    const response = await repair_request.getAllRepairRequestbyUser(accountId);
    res.json(response);
});

app.listen(port, () => {
    console.log("Server is running");
});