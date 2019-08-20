# NTULearnDownloader

[![npm](https://img.shields.io/npm/dt/ntulearndownloader.svg)]()
[![npm](https://img.shields.io/npm/v/ntulearndownloader.svg)]()

> Download all files from NTULearn

## Install

```
$ npm install -g ntulearndownloader
```
```
$ yarn global add ntulearndownloader
```


## Usage

```js
ntulearn --username YOUR_USERNAME --password YOUR_PASSWORD
```
This command will download all content to current folder.
To change directory:

```js
ntulearn --username YOUR_USERNAME --password YOUR_PASSWORD --directory C:\ntu
```

## How it works

- Login to NTULearn Blackboard, just like the mobile application
- Iterate through all modules that you have
- Download all downloadable content


## Related

- [kenrick95/ntulearn-dl](https://github.com/kenrick95/ntulearn-dl) - where this module is based on


## License

MIT © [Shaun](https://github.co/shaunidiot)