const FileCookieStore = require("tough-cookie-filestore");
const fs = require("fs-extra");
const request = require("request-promise-native");
const qs = require("querystring");
const Utils = require("./Utils");
const path = require("path");
const download = require("./Downloader");
const filenamify = require("filenamify");

const NTULEARN_BASE_URL = "https://ntulearn.ntu.edu.sg";

class NTUMobile {
    constructor({ username, password, directory }) {
        fs.ensureFileSync("./cookies.json");
        this.jar = request.jar(new FileCookieStore("./cookies.json"));
        this.req = request.defaults({ jar: this.jar });
        this.username = username;
        this.password = password;
        this.isLoggedIn = false;
        this._userModules = [];
        this._userId = null;
        this.baseDirectory = directory;
    }

    get modules() {
        return this._userModules;
    }

    set modules(modules) {
        this._userModules = modules;
    }

    async login() {
        try {
            let params = {
                "v": "2",
                "f": "xml",
                "ver": "4.1.2",
                "registration_id": "29409"
            }

            let loginResult = await this.req.post({
                url: `https://ntulearn.ntu.edu.sg/webapps/Bb-mobile-BBLEARN/sslUserLogin?${qs.stringify(params)}`,
                form: {
                    "username": this.username,
                    "password": this.password
                },
                resolveWithFullResponse: true,
                simple: false,
                headers: {
                    "User-Agent": "Mobile%20Learn/3333 CFNetwork/711.1.16 Darwin/14.0.0",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "*/*"
                }
            });

            if (loginResult["statusCode"] !== 200) return console.log("Error logging in.");
            let parsedLogin = await Utils.parseXml(loginResult["body"]);
            let loginStatus = parsedLogin["mobileresponse"]["$"]["status"];
            this.isLoggedIn = loginStatus === "OK";
            return this.isLoggedIn;
        } catch (error) {
            throw new Error(error);
        }
    }

    async fetchEnrollments() {
        try {
            let params = {
                "v": "1",
                "f": "xml",
                "ver": "4.1.2",
                "registration_id": "29409",
                "course_type": "ALL",
                "include_grades": "false"
            }

            let enrollmentResult = await this.req.get({
                url: `https://ntulearn.ntu.edu.sg/webapps/Bb-mobile-BBLEARN/enrollments?${qs.stringify(params)}`,
                resolveWithFullResponse: true,
                simple: false,
                headers: {
                    "User-Agent": "Mobile%20Learn/3333 CFNetwork/711.1.16 Darwin/14.0.0",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "*/*"
                }
            });

            if (enrollmentResult["statusCode"] !== 200) return;
            let enrollmentJson = await Utils.parseXml(enrollmentResult["body"]);
            let enrollmentCourses = enrollmentJson["mobileresponse"]["courses"][0]["course"];
            if (enrollmentCourses.length < 1) return "[!] no currently registered courses";

            for (let index = 0; index < enrollmentCourses.length; index++) {
                let course = enrollmentCourses[index]["$"];
                let courseId = course["bbid"];
                let courseName = course["name"];
                let courseType = course["courseid"];
                console.log("-".repeat(30));
                console.log(`Course ${index} - ${courseType}: ${courseName}`);
                let params = {
                    "v": "1",
                    "f": "xml",
                    "ver": "4.1.2",
                    "registration_id": "29409",
                    "course_id": courseId
                };

                let courseResponse = await this.req.get({
                    url: `https://ntulearn.ntu.edu.sg/webapps/Bb-mobile-BBLEARN/courseMap?${qs.stringify(params)}`,
                    resolveWithFullResponse: true,
                    simple: false,
                    headers: {
                        "User-Agent": "Mobile%20Learn/3333 CFNetwork/711.1.16 Darwin/14.0.0",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "*/*"
                    }
                });

                if (courseResponse["statusCode"] !== 200) return;
                let courseJson = await Utils.parseXml(courseResponse["body"]);
                let courseItem = courseJson["mobileresponse"]["map"][0]["map-item"];
                for (let index = 0; index < courseItem.length; index++) {
                    let courseElement = courseItem[index]["$"];
                    let name = courseElement["name"];
                    let linkType = courseElement["linktype"];
                    if (name.toLowerCase() === "recorded lectures" || linkType.toLowerCase() !== "content") continue;
                    await this.iter(courseId, courseItem[index], path.join(this.baseDirectory, courseName, name))
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    async iter(courseId, currentItem, directoryPath) {
        if (typeof currentItem["children"] === "undefined" || currentItem["children"] === null) return;
        let courseItem = currentItem["children"][0]["map-item"];
        for (let index = 0; index < courseItem.length; index++) {
            let courseElement = courseItem[index]["$"];
            let name = courseElement["name"];
            let linkType = courseElement["linktype"];
            let contentId = courseElement["contentid"];
            if (linkType.toLowerCase() === "resource/x-bb-folder") return this.iter(courseId, courseItem[index], path.join(directoryPath, name))
            if (linkType.toLowerCase() === "resource/x-bb-document" || linkType.toLowerCase() === "resource/x-bb-file") return await this.downloadDocuments(courseId, contentId, directoryPath)
        }
    }

    async downloadDocuments(courseId, contentId, directoryPath) {
        let params = {
            "v": "1",
            "f": "xml",
            "ver": "4.1.2",
            "registration_id": "29409",
            "rich_content_level": "RICH",
            "course_id": courseId,
            "content_id": contentId
        };

        let documentsResult = await this.req.get({
            url: `https://ntulearn.ntu.edu.sg/webapps/Bb-mobile-BBLEARN/contentDetail?${qs.stringify(params)}`,
            resolveWithFullResponse: true,
            simple: false,
            headers: {
                "User-Agent": "Mobile%20Learn/3333 CFNetwork/711.1.16 Darwin/14.0.0",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "*/*"
            }
        });

        if (documentsResult["statusCode"] !== 200) return console.log("NO".repeat(30));
        let documentsJson = await Utils.parseXml(documentsResult["body"]);
        let documentsAttachments = documentsJson["mobileresponse"]["content"][0];
        if (typeof documentsAttachments["attachments"] === "undefined" || documentsAttachments["attachments"].length < 1) return;
        documentsAttachments = documentsAttachments["attachments"][0]["attachment"];
        for (let index = 0; index < documentsAttachments.length; index++) {
            const element = documentsAttachments[index]["$"];
            let attachmentUri = element["uri"];
            let attachmentName = filenamify(element["name"]);
            fs.ensureDirSync(directoryPath);
            await download(`${NTULEARN_BASE_URL}${attachmentUri}`, path.join(directoryPath, attachmentName));
        }
    }
}

module.exports = NTUMobile;