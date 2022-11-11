const serverConfig = {
  "iceServers": [
    {
      "urls": "stun:stun.l.google.com:19302",
    },
    {
      "urls": "stun:iphone-stun.strato-iphone.de:3478",
    },
    {
      "urls": "stun:numb.viagenie.ca:3478",
    },
    {
      "urls": "stun:openrelay.metered.ca:80",
    },
    {
      "urls": "turn:openrelay.metered.ca:80",
      "username": "openrelayproject",
      "credential": "openrelayproject",
    },
    {
      "urls": "turn:openrelay.metered.ca:443",
      "username": "openrelayproject",
      "credential": "openrelayproject",
    },
    {
      "urls": "turn:openrelay.metered.ca:443?transport=tcp",
      "username": "openrelayproject",
      "credential": "openrelayproject",
    },
  ],
};

export {
  serverConfig,
}
