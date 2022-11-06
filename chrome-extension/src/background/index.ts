chrome.runtime.onInstalled.addListener(() => {

    //chrome.contextMenus.create({
      //id: 'welcome',
      //title: 'Web Suite',
      //contexts: ['action']
    //})

});

//setTimeout(() => {
    //chrome.runtime.sendMessage({greeting: "HELLO FROM BACKGROUND.JS"}).catch(err => console.log(err));
    //chrome.notifications.create('', {
        //title: 'Just wanted to notify you',
        //message: 'How great it is!',
        //iconUrl: '/src/assets/icons/get_started128.png',
        //type: 'basic'
    //});
//}, 10000);

//chrome.runtime.onMessage.addListener(
  //(request, sender, sendResponse) => {
    //console.log("BACKGROUND.JS:", request);
  //}
//);

//function contextClick(info, tab) {
    //console.log(info, tab);
    //const { menuItemId } = info

    //if (menuItemId === 'welcome') {
        //const optionsUrl = chrome.runtime.getURL('src/dashboard/dashboard.html');
        //chrome.tabs.query({url: optionsUrl}, (tabs) => {
            //if (tabs.length) {
                //chrome.tabs.update(tabs[0].id, {active: true});
            //} else {
                //chrome.tabs.create({ 'url': optionsUrl });
            //}
        //});
    //}
//}

//chrome.contextMenus.onClicked.addListener(contextClick);

console.log("RUN BACKGROUND.JS");
