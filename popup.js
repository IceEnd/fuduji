'use strict';

let tabId;

let isLeftMove = false;
let isRightMove = false;
let width = 0;

let bound = 26;

/**** selector ****/
const $leftText = document.querySelector('.start.text');
const $rightText = document.querySelector('.end.text');
const $left = document.querySelector('.slider-handle.left');
const $right = document.querySelector('.slider-handle.right');
const $silder = document.querySelector('#slider');
const $rail = document.querySelector('.slider-rail');
const $track = document.querySelector('.slider-track');
const $play = document.querySelector('#play');
const $pause = document.querySelector('#pause');
const $repeat = document.querySelector('#repeat');

/**** utils ****/
function formatTime(number) {
    let second = parseInt(number, 10);
    let minute = 0;
    let hour = 0;
    let result;
    if (second < 60) {
        if (second < 10) {
            result = `0:0${second}`;
        } else {
            result = `0:${second}`;
        }
    } else if (second < 3600) {
        minute = Math.floor(second / 60);
        second %= 60;
        if (second < 10) {
          result = `${minute}:0${second}`;
        } else {
          result = `${minute}:${second}`;
        }
    } else {
        hour = Math.floor(second / 3600);
        minute = Math.floor((second - (hour * 3600)) / 60);
        second %= 60;
        if (minute < 10 && second < 10) {
          result = `${hour}:0${minute}:0${second}`;
        } else if (minute < 10 && second >= 10) {
          result = `${hour}:0${minute}:${second}`;
        } else if (minute >= 10 && second < 10) {
          result = `${hour}:${minute}:0${second}`;
        } else if (minute >= 10 && second >= 10) {
          result = `${hour}:${minute}:${second}`;
        }
    }
    return result;
}

function setDuration(type, t, r = 0) {
    if (type === 'left') {
        $leftText.innerText = formatTime(t);
        $left.style.left = `${r * 100}%`;
    } else if (type === 'right') {
        $rightText.innerText = formatTime(t);
        $right.style.right = `${(1 - r) * 100}%`;
    }
    const { start, end, duration } = loopData;
    $track.style.width = `${(end - start) / duration * 100}%`;
    $track.style.left = $left.style.left;
}

function sendDuration() {
    const { start, end } = loopData;
    message({
        type: 'SET_DURATION',
        start,
        end,
    });
}

function togglePlay() {
    status = !status;
}

function bindEvent() {
    $silder.addEventListener('mousemove', e => {
        if (!isLeftMove && !isRightMove) {
            return;
        }
        if (!width) {
            width = $rail.offsetWidth;
        }
        const x = e.clientX - bound;
        const ratio = x / width;
        if (ratio < 0 || ratio > 1) {
            return;
        }
        if (isLeftMove) {
            const { duration, end } = loopData;
            const start = duration * ratio;
            if (start <= end) {
                loopData.start = start;
            }
        } else if (isRightMove) {
            const { duration, start } = loopData;
            const end = duration * ratio;
            if (start <= end) {
                loopData.end = end;
            }
        }
    });

    $silder.addEventListener('mouseleave', () => {
        isLeftMove = false;
        isRightMove = false;
        sendDuration();
    });

    $silder.addEventListener('mouseup', () => {
        isLeftMove = false;
        isRightMove = false;
        sendDuration();
    });

    $left.addEventListener('mousedown', () => {
        isLeftMove = true;
    });
    $left.addEventListener('mouseup', () => {
        isLeftMove = false;
    });
    $right.addEventListener('mousedown', () => {
        isRightMove = true;
    });
    $right.addEventListener('mouseup', () => {
        isRightMove = false;
    });

    $play.addEventListener('click', () => {
        loopData.status = true;
    });
    $pause.addEventListener('click', () => {
        loopData.status = false;
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        loopData.repeat++;
        sendResponse(true);
    });
}

function message(msg, cb) {
    chrome.tabs.sendMessage(tabId, msg, data => {
        cb && cb(data);
    });
}

function setWebsite() {
    chrome.tabs.getSelected(null, tab => {
        let url = tab.url;
        if (url) {
            url = new URL(url);
            const hostname = url.hostname
            document.getElementById('website').innerText = hostname;
            document.getElementById('title').innerText = tab.title;
        }
        tabId = tab.id;
        setSlider(tab.id);
    });
}

function setSlider(tabId) {
    chrome.tabs.sendMessage(tabId, {type: 'GET_VIDEO_INFO'}, data => {
        loopData.duration = data.duration || 0;
        loopData.start = data.start || 0;
        loopData.end = data.end || 0;
        loopData.repeat = data.repeat || 0;
        loopData.status = data.status || false;
        bindEvent();
    });
}

const handler = {
    set: function(target, name, value, receiver) {
        const success = Reflect.set(target, name, value, receiver);
        if (name === 'status') {
            if (value) {
                $play.style.display = 'none';
                $pause.style.display = 'inline-block';
            } else {
                $play.style.display = 'inline-block';
                $pause.style.display = 'none';
            }
            message({
                type: 'TOGGLE_PLAY',
                status: value,
            });
        } else if (name === 'start') {
            const duration = Reflect.get(target, 'duration', receiver);
            const start = Reflect.get(target, 'start', receiver);
            setDuration('left', start, start / duration);
        } else if (name === 'end') {
            const duration = Reflect.get(target, 'duration', receiver);
            const end = Reflect.get(target, 'end', receiver);
            setDuration('right', end, end / duration);
        } else if (name === 'repeat') {
            $repeat.innerText = value;
        }
        return success;
    }
};

const loopData = new Proxy({
    duration: 0,
    repeat: 0,
    start: 0,
    end: 0,
    status: false,
}, handler);

function init() {
    setWebsite();
}

document.addEventListener('DOMContentLoaded', function () {
    init();
});