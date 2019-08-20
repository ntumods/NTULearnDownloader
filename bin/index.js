#!/usr/bin/env node

const NTUMobile = require("../modules/NTUMobile");
const meow = require("meow");

(async () => {
    const cli = meow(`
    Usage
        $ ntulearn <options>
    
    Options
        --username, -u              NTULearn username to login with
        --password, -p              Password to match the password with
        --directory, -d             Set download directory (default: ./data/)
    
    Examples
        $ ntulearn -u my_username -p my_password
        $ ntulearn --username my_username --password my_password -d "C:/downloads/"

`, {
            flags: {
                username: {
                    type: "string"
                },
                password: {
                    type: "string"
                },
                directory: {
                    type: "string",
                    default: "./NTULearn"
                }
            }
        });

    let username = cli["flags"]["username"];
    let password = cli["flags"]["password"];
    if (typeof username === "undefined" || username === null || typeof password === "undefined" || password === null) {
        return console.error("[!] username or password cannot be empty.");
    }

    let n = new NTUMobile({ username, password });
    let isLoggedIn = await n.login();
    if (!isLoggedIn) {
        return console.error("[!] Unable to login. Please check username and password validity.");
    }
    
    await n.fetchEnrollments();
})();