declare var navigator:any;

import { SyncProtocol, BroadcastCallback } from './sync_protocol';

class SMSSyncHub {

  broadcastCallback: BroadcastCallback;

  constructor(callback: BroadcastCallback) {
    this.broadcastCallback = callback;
    navigator.mozMobileMessage.ondeliveryerror = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_DELIVERY_ERROR, data: { message: clone(evt.message) } });
      this.syncThread();
    }
    navigator.mozMobileMessage.ondeliverysuccess = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_DELIVERY_SUCCESS, data: { message: clone(evt.message) } });
      this.syncThread();
    }
    navigator.mozMobileMessage.onreceived = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_RECEIVED, data: { message: clone(evt.message) } });
      this.syncThread();
    }
    navigator.mozMobileMessage.onretrieving = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_RETRIEVING, data: { message: clone(evt.message) } });
      this.syncThread();
    }
    navigator.mozMobileMessage.onsent = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_SENT, data: { message: clone(evt.message) } });
      this.syncThread();
    }
    navigator.mozMobileMessage.onsending = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_SENDING, data: { message: clone(evt.message) } });
      this.syncThread();
    }
    navigator.mozMobileMessage.onfailed = (evt: SyncProtocol.MozSmsEvent | SyncProtocol.MozMmsEvent) => {
      this.broadcastCallback({ type: SyncProtocol.SMS_ON_FAILED, data: { message: clone(evt.message) } });
      this.syncThread();
    }
  }

  filterEvent(event: any) {
    // console.log('SMSSyncHub.filterEvent: ', event.type);
    switch (event.type) {
      case SyncProtocol.SMS_GET_THREAD:
        this.syncThread();
        break;
      case SyncProtocol.SMS_GET_MESSAGES:
        this.getMessages(event.data.threadId)
        .then(messages => {
          this.broadcastCallback({ type: SyncProtocol.SMS_GET_MESSAGES, data: { messages, threadId: event.data.threadId } });
        })
        .catch(err => {
          console.warn(err);
        })
        break;
      case SyncProtocol.SMS_SEND_MESSAGE_SMS:
        let sendOpts = getSIMServiceId(event.data.iccId);
        getMessageSegments(event.data.message)
        .then((segments) => {
          this.processMessageSegments(event.data.receivers, segments, sendOpts);
        })
        .catch((err) => {
          console.warn(err);
        });
        break;
      case SyncProtocol.SMS_DELETE_MESSAGE:
        const req = navigator.mozMobileMessage.delete(event.data.id);
        req.onsuccess = (result) => {
          let response = typeof result.target.result == 'object' ? result.target.result : [result.target.result ? 1 : 0];
          this.broadcastCallback({ type: SyncProtocol.SMS_DELETE_MESSAGE, data: { request: event.data.id, response: response } });
          this.syncThread();
        }
        req.onerror = () => {
          console.warn(err);
        }
        break;
      case SyncProtocol.SMS_READ_MESSAGE:
        if (event.data.id != null) {
          let len = event.data.id.length;
          event.data.id.forEach(id => {
            const req = navigator.mozMobileMessage.markMessageRead(id, true);
            req.onsuccess = () => {
              len--;
              if (len == 0)
                this.syncThread();
            }
            req.onerror = () => {
              len--;
              if (i == 0)
                this.syncThread();
            }
          })
        }
        break;
      case SyncProtocol.SMS_SMSC_ADDRESS:
        navigator.mozMobileMessage.getSmscAddress()
        .then(result => {
          console.log(result);
          this.broadcastCallback({ type: SyncProtocol.SMS_SMSC_ADDRESS, data: { result } });
        })
        .catch(err => {
          console.warn(err);
        });
        break;
    }
  }

  processMessageSegments(receivers, segments, sendOpts) {
    if (segments.length === 0) {
      this.syncThread();
    } else {
      let content = segments.pop();
      this.sendSMS(receivers, content, sendOpts);
      .finally(() => {
        this.processMessageSegments(receivers, segments, sendOpts);
      });
    }
  }

  sendSMS(receivers, content, sendOpts): Promise<Error|void> {
    return new Promise((resolve, reject) => {
      let req = navigator.mozSettings.createLock().get('ril.sms.encoding_mode');
      req.onsuccess = ()=> {
        let encodeMode = req.result['ril.sms.encoding_mode'];
        if(encodeMode == "0") {
          content = shift2Normal(content);
        }
        let requests = navigator.mozMobileMessage.send(receivers, content, sendOpts);
        let done = requests.length;
        requests.forEach((request) => {
          request.onsuccess = function(result) {
            done--;
            if (done <= 0)
              resolve();
          }
          request.onerror = function(err) {
            done--;
            if (done <= 0)
              resolve();
          }
        })
      };
      req.onerror = function(err) {
        reject(err);
      }
    })
  }

  // https://contest-server.cs.uchicago.edu/ref/JavaScript/developer.mozilla.org/en-US/docs/Archive/B2G_OS/API/MozMobileMessageManager/sendMMS.html
  sendMMS() {

  }

  syncThread() {
    this.getThreads()
    .then(threads => {
      this.broadcastCallback({ type: SyncProtocol.SMS_GET_THREAD, data: { threads } });
    })
    .catch(err => {
      console.warn(err);
    })
  }

  getThreads() {
    return new Promise((resolve, reject) => {
      let threads = [];
      let request = navigator.mozMobileMessage.getThreads();
      request.onsuccess = function() {
        if (!request.done) {
          if(request.result !== null) {
            threads.push(clone(request.result));
            request.continue();
          }
        } else if (request.done) {
          resolve(threads);
        }
      }
      request.onerror = (err) => {
        reject(err);
      }
    })
  }

  getMessages(threadId: string|number): Promise<any> {
    return new Promise((resolve, reject) => {
      let messages = [];
      let request = navigator.mozMobileMessage.getMessages({ threadId: threadId }, false);
      request.onsuccess = function() {
        if (!request.done) {
          if (request.result !== null) {
            messages.push(clone(request.result));
            request.continue();
          }
        } else if (request.done) {
          resolve(messages);
        }
      }
      request.onerror = (err) => {
        reject(err);
      }
    });
  }
}

export {
  SMSSyncHub as default
}

const clone = (obj): Object => {
  if (null == obj || "object" != typeof obj) return obj;
  var copy = {};
  for (var attr in obj) {
    copy[attr] = obj[attr];
  }
  return copy;
}

const getSIMServiceId = (iccId) => {
  let sendOpts = null
  if ('mozMobileConnections' in navigator) {
    for (let i in navigator.mozMobileConnections) {
      if (navigator.mozMobileConnections[i].iccId === iccId) {
        sendOpts = { serviceId: navigator.mozMobileConnections[i] }
        break
      }
    }
  }
  return sendOpts
}

const shift2Normal = (content): string => {
  /* << [ARG-71]: BDC kanxj 20191025 Cyrillic characters are not displayed in SMS in case of reduced character set is selected */
  var shiftTable = new Map([
    [ 0x60, 0x27], // "`" => "'"
    [ 0xc0, 0x41], // "À" => "A"
    [ 0xc1, 0x41], // "Á" => "A"
    [ 0xc2, 0x41], // "Â" => "A"
    [ 0xc3, 0x41], // "Ã" => "A"
    [ 0xc8, 0x45], // "È" => "E"
    [ 0xca, 0x45], // "Ê" => "E"
    [ 0xcb, 0x45], // "Ë" => "E"
    [ 0xcc, 0x49], // "Ì" => "I"
    [ 0xcd, 0x49], // "Í" => "I"
    [ 0xce, 0x49], // "Î" => "I"
    [ 0xcf, 0x49], // "Ï" => "I"
    [ 0xd1, 0x4e], // "Ñ" => "N"
    [ 0xd2, 0x4f], // "Ò" => "O"
    [ 0xd3, 0x4f], // "Ó" => "O"
    [ 0xd4, 0x4f], // "Ô" => "O"
    [ 0xd5, 0x4f], // "Õ" => "O"
    [ 0xd9, 0x55], // "Ù" => "U"
    [ 0xda, 0x55], // "Ú" => "U"
    [ 0xdb, 0x55], // "Û" => "U"
    [ 0xe1, 0x61], // "á" => "a"
    [ 0xe2, 0x61], // "â" => "a"
    [ 0xe3, 0x61], // "ã" => "a"
    [ 0xe7, 0x63], // "ç" => "c"
    [ 0xea, 0x65], // "ê" => "e"
    [ 0xeb, 0x65], // "ë" => "e"
    [ 0xed, 0x69], // "í" => "i"
    [ 0xee, 0x69], // "î" => "i"
    [ 0xef, 0x69], // "ï" => "i"
    [ 0xf3, 0x6f], // "ó" => "o"
    [ 0xf4, 0x6f], // "ô" => "o"
    [ 0xf5, 0x6f], // "õ" => "o"
    [ 0xfa, 0x75], // "ú" => "u"
    [ 0xfb, 0x75], // "û" => "u"
    [ 0xfe, 0x74], // "þ" => "t"
    [ 0x100, 0x41], // "0x100" => "A"
    [ 0x101, 0x61], // "0x101" => "a"
    [ 0x102, 0x41], // "0x102" => "A"
    [ 0x103, 0x61], // "0x103" => "a"
    [ 0x104, 0x41], // "0x104" => "A"
    [ 0x105, 0x61], // "0x105" => "a"
    [ 0x106, 0x43], // "0x106" => "C"
    [ 0x107, 0x63], // "0x107" => "c"
    [ 0x108, 0x43], // "0x108" => "C"
    [ 0x109, 0x63], // "0x109" => "c"
    [ 0x10a, 0x43], // "0x10a" => "C"
    [ 0x10b, 0x63], // "0x10b" => "c"
    [ 0x10c, 0x43], // "0x10c" => "C"
    [ 0x10d, 0x63], // "0x10d" => "c"
    [ 0x10f, 0x64], // "0x10f" => "d"
    [ 0x110, 0x44], // "0x110" => "D"
    [ 0x111, 0x64], // "0x111" => "d"
    [ 0x112, 0x45], // "0x112" => "E"
    [ 0x113, 0x65], // "0x113" => "e"
    [ 0x116, 0x45], // "0x116" => "E"
    [ 0x117, 0x65], // "0x117" => "e"
    [ 0x118, 0x45], // "0x118" => "E"
    [ 0x119, 0x65], // "0x119" => "e"
    [ 0x11a, 0x45], // "0x11a" => "E"
    [ 0x11b, 0x65], // "0x11b" => "e"
    [ 0x11c, 0x47], // "0x11c" => "G"
    [ 0x11d, 0x67], // "0x11d" => "g"
    [ 0x11e, 0x47], // "0x11e" => "G"
    [ 0x11f, 0x67], // "0x11f" => "g"
    [ 0x120, 0x47], // "0x120" => "G"
    [ 0x121, 0x67], // "0x121" => "g"
    [ 0x122, 0x47], // "0x122" => "G"
    [ 0x123, 0x67], // "0x123" => "g"
    [ 0x124, 0x48], // "0x124" => "H"
    [ 0x125, 0x68], // "0x125" => "h"
    [ 0x126, 0x48], // "0x126" => "H"
    [ 0x127, 0x68], // "0x127" => "h"
    [ 0x128, 0x49], // "0x128" => "I"
    [ 0x129, 0x69], // "0x129" => "i"
    [ 0x12a, 0x49], // "0x12a" => "I"
    [ 0x12b, 0x69], // "0x12b" => "i"
    [ 0x12c, 0x49], // "0x12a" => "I"
    [ 0x12d, 0x69], // "0x12b" => "i"
    [ 0x12e, 0x49], // "0x12e" => "I"
    [ 0x12f, 0x69], // "0x12f" => "i"
    [ 0x130, 0x49], // "0x130" => "I"
    [ 0x131, 0x69], // "0x131" => "i"
    [ 0x134, 0x4a], // "0x134" => "J"
    [ 0x135, 0x6a], // "0x135" => "j"
    [ 0x136, 0x4b], // "0x136" => "K"
    [ 0x137, 0x6b], // "0x137" => "k"
    [ 0x138, 0x6b], // "0x138" => "k"
    [ 0x139, 0x4c], // "0x139" => "k"
    [ 0x13a, 0x49], // "0x13a" => "I"
    [ 0x13b, 0x4c], // "0x13b" => "L"
    [ 0x13c, 0x6c], // "0x13c" => "l"
    [ 0x13d, 0x4c], // "0x13d" => "L"
    [ 0x13e, 0x49], // "0x13e" => "I"
    [ 0x13f, 0x4c], // "0x13f" => "L"
    [ 0x140, 0x49], // "0x140" => "I"
    [ 0x141, 0x4c], // "0x141" => "L"
    [ 0x142, 0x6c], // "0x142" => "l"
    [ 0x143, 0x4e], // "0x143" => "N"
    [ 0x144, 0x6e], // "0x144" => "n"
    [ 0x145, 0x4e], // "0x145" => "N"
    [ 0x146, 0x6e], // "0x146" => "n"
    [ 0x147, 0x4e], // "0x147" => "N"
    [ 0x148, 0x6e], // "0x148" => "n"
    [ 0x14c, 0x4f], // "0x14c" => "O"
    [ 0x14d, 0x6f], // "0x14d" => "o"
    [ 0x14e, 0x4f], // "0x14e" => "O"
    [ 0x14f, 0x6f], // "0x14f" => "o"
    [ 0x150, 0x4f], // "0x150" => "O"
    [ 0x151, 0x6f], // "0x151" => "o"
    [ 0x152, 0x4f], // "0x152" => "O"
    [ 0x153, 0x6f], // "0x153" => "o"
    [ 0x156, 0x52], // "0x156" => "R"
    [ 0x157, 0x72], // "0x157" => "r"
    [ 0x158, 0x52], // "0x158" => "R"
    [ 0x159, 0x72], // "0x159" => "r"
    [ 0x15a, 0x53], // "0x15a" => "S"
    [ 0x15b, 0x73], // "0x15b" => "s"
    [ 0x15c, 0x53], // "0x15c" => "S"
    [ 0x15d, 0x73], // "0x15d" => "s"
    [ 0x15e, 0x53], // "0x15e" => "S"
    [ 0x15f, 0x73], // "0x15f" => "s"
    [ 0x160, 0x53], // "0x160" => "S"
    [ 0x161, 0x73], // "0x161" => "s"
    [ 0x162, 0x54], // "0x162" => "T"
    [ 0x163, 0x74], // "0x163" => "t"
    [ 0x164, 0x54], // "0x164" => "T"
    [ 0x165, 0x74], // "0x165" => "t"
    [ 0x166, 0x54], // "0x166" => "T"
    [ 0x167, 0x74], // "0x167" => "t"
    [ 0x168, 0x55], // "0x168" => "U"
    [ 0x169, 0x75], // "0x169" => "u"
    [ 0x16a, 0x55], // "0x16a" => "U"
    [ 0x16b, 0x75], // "0x16b" => "u"
    [ 0x16c, 0x55], // "0x16c" => "U"
    [ 0x16d, 0x75], // "0x16d" => "u"
    [ 0x16e, 0x55], // "0x16e" => "U"
    [ 0x16f, 0x75], // "0x16f" => "u"
    [ 0x170, 0x55], // "0x170" => "U"
    [ 0x171, 0x75], // "0x171" => "u"
    [ 0x172, 0x55], // "0x172" => "U"
    [ 0x173, 0x75], // "0x173" => "u"
    [ 0x174, 0x57], // "0x174" => "W"
    [ 0x175, 0x77], // "0x175" => "w"
    [ 0x176, 0x59], // "0x176" => "Y"
    [ 0x177, 0x79], // "0x177" => "y"
    [ 0x178, 0x59], // "0x178" => "Y"
    [ 0x179, 0x5a], // "0x179" => "Z"
    [ 0x17a, 0x7a], // "0x17a" => "z"
    [ 0x17b, 0x5a], // "0x17b" => "Z"
    [ 0x17c, 0x7a], // "0x17c" => "z"
    [ 0x17d, 0x5a], // "0x17d" => "Z"
    [ 0x17e, 0x7a], // "0x17e" => "z"
    [ 0x218, 0x53], // "0x218" => "S"
    [ 0x219, 0x73], // "0x219" => "s"
    [ 0x21a, 0x54], // "0x21a" => "T"
    [ 0x21b, 0x74], // "0x21b" => "t"
    [ 0x25b, 0x45], // "0x25b" => "E"
    [ 0x1e7c, 0x56], // "0x1e7c" => "V"
    [ 0x1e7d, 0x76], // "0x1e7d" => "v"
    [ 0x1ebc, 0x45], // "0x1ebc" => "E"
    [ 0x1ebd, 0x65], // "0x1ebd" => "e"
    [ 0x1ef8, 0x59], // "0x1ebd" => "Y"
    [ 0x1ef9, 0x79], // "0x1ef9" => "y"
    [ 0x20a4, 0xa3], // "0x20a4" => "£"
  ]);
  /* >> [BTS-1676] */

  var content2 = "";
  var normalChar = "";
  for(var i = 0; i < content.length; i++  ){
    var letter = content.charAt(i);
    let letterCode = letter.charCodeAt();
    letterCode = shiftTable.get(letterCode);
    normalChar = String.fromCharCode(letterCode);

    if (typeof(normalChar) == "undefined" || typeof(letterCode) == "undefined"){
      normalChar = letter;
    }
    content2  += normalChar;
  }
  /* >> [ARG-71] */
  return content2;
}

const getMessageSegments = (msg): Promise<any> => {
  return new Promise((resolve, reject) => {
    navigator.mozMobileMessage.getSegmentInfoForText(msg)
    .then((result) => {
      resolve(msg.match(new RegExp('.{1,' + result.charsPerSegment + '}', 'g')).reverse())
    })
    .catch((err) => {
      reject(err)
    });
  });
}
