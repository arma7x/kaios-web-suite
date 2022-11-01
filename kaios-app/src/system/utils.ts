declare var navigator:any;

const toastNotification = (title, body, requireInteraction = false, closeOnClick = false) => {
  window.Notification.requestPermission()
  .then((result) => {
    var notification = new window.Notification(title, {
      body: body,
      requireInteraction: requireInteraction
    });
    notification.onerror = function(err) {
      console.warn(err);
    }
    notification.onclick = function(event) {
      if (navigator.mozApps) {
        var request = navigator.mozApps.getSelf();
        request.onsuccess = function() {
          if (request.result && closeOnClick) {
            notification.close();
            request.result.launch();
          }
        };
      } else {
        window.open(document.location.origin, '_blank');
      }
    }
    notification.onshow = function() {
      // notification.close();
    }
  });
}

const getIMEI = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    navigator.mozTelephony.dial('*#06#')
    .then(res => {
      res.result
      .then((result) => {
        if (result && result.success && (result.serviceCode === 'scImei')) {
          resolve(result.statusMessage)
        } else {
          reject("")
        }
      })
      .catch(e => reject(e))
    })
    .catch(e => reject(e))
  });
}

const getContacts = (): Promise<any> => {
  let kaicontacts = [];
  return new Promise((resolve, reject) => {
    var cursor = navigator.mozContacts.getAll()
    cursor.onsuccess = function () {
      if (!this.done) {
        if(cursor.result !== null) {
          kaicontacts.push(cursor.result)
          this.continue()
        }
      } else if (this.done) {
        resolve(kaicontacts);
      }
    }
    cursor.onerror = (err) => {
      reject(err)
    }
  });
}

export {
  toastNotification,
  getIMEI,
  getContacts,
}
