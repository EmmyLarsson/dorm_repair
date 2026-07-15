var jwt = require('jsonwebtoken');
var secretKey = "MySecretKey";

module.exports = {
    sign(payload) {
        let token = jwt.sign(payload, secretKey, {
            expiresIn: '1d'
        });
        return token;
    },

    verify(token) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secretKey, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    }
}
