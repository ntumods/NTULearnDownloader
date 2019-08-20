const parseString = require("xml2js").parseString;

module.exports = {
    async parseXml(str) {
        return new Promise((resolve, reject) => {
            parseString(str, function (err, result) {
                if (err) return reject(err);
                return resolve(result);
            });
        })
    }
}