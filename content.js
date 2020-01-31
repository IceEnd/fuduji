'use strict';
(function () {
    let $video;

    let firstLoaded = false;
    let start = 0;
    let end = 0;
    let repeat = 0;
    let status = false;
    let timer = null;

    function getVideo(sendResponse) {
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
            $video = videos[0];
            const duration = $video.duration;
            if (!firstLoaded) {
                firstLoaded = true;
                start = 0;
                end = duration;
            }
            sendResponse({
                duration,
                start,
                end,
                status,
                repeat,
            });
        }
    }

    function play() {
        if (timer) {
            clearInterval(timer);
        }
        timer = setInterval(() => {
            const currentTime = $video.currentTime;
            if (Math.floor(currentTime) < Math.floor(start) || Math.floor(currentTime) >= Math.floor(end)) {
                $video.currentTime = start;
                repeat++;
                message({
                    type: 'ADD_REPEAT',
                });
            }
            if ($video.paused) {
                $video.play();
            }
        }, 1000);
    }

    function pause() {
        clearInterval(timer);
        timer = null;
    }

    function togglePlay() {
        if (status) {
            // play
            play();
        } else {
            // pause
            pause();
        }
    }

    function message(data, cb) {
        chrome.runtime.sendMessage(data, res => {
            cb && cb(res);
        });
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        switch (msg.type) {
            case 'GET_VIDEO_INFO':
                getVideo(sendResponse);
                break;
            case 'SET_DURATION':
                start = msg.start;
                end = msg.end;
                sendResponse(true);
                break;
            case 'TOGGLE_PLAY':
                status = msg.status;
                togglePlay();
                sendResponse(true);
                break;
            default:
                break;
        }
    });
})();