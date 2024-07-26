importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/^data/, /^cr_user_id/],
  exclude: [/^lang\//],
});

const channel = new BroadcastChannel("as-message-channel");

let version = 1.5;
let cachingProgress = 0;
let cachableAssetsCount = 0;

self.addEventListener("message", async (event) => {
  console.log("Registration message received in the service worker ");
  if (event.data.type === "Registration") {
    if (!!!caches.keys().length) {
      cachingProgress = 0;
      let cacheName = await getCacheName(event.data.value);
    }
  }
});

self.addEventListener("install", async function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
  channel.postMessage({ command: "Activated", data: {} });
});

self.registration.addEventListener("updatefound", function (e) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      if (cacheName == workbox.core.cacheNames.precache) {
        // caches.delete(cacheName);
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ msg: "UpdateFound" })
          );
        });
      }
    });
  });
});

channel.addEventListener("message", async function (event) {
  if (event.data.command === "Cache") {
    console.log("Caching request received in the service worker with data: ");
    console.log(event.data);
    cachingProgress = 0;
    await cacheTheBookJSONAndImages(event.data.data);
  }
});

function updateCachingProgress(bookName) {
  cachingProgress++;
  let progress = Math.round((cachingProgress / cachableAssetsCount) * 100);
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) =>
      client.postMessage({
        msg: "Loading",
        data: {progress, bookName},
      })
    );
  });
}

let debugCaching = true;

function cacheTheBookJSONAndImages(data) {
  console.log("Caching the book JSON and images", data);
  let appData = data["appData"];
  let cachableAssets = [];

  cachableAssets.push(appData["contentFilePath"]);
  cachableAssets.push(...appData["audioVisualResources"])

  // let audioVisualResources = appData["audioVisualResources"];
  
  // for (let i = 0; i < audioVisualResources.length; i++) {
  //   cachableAssets.push(audioVisualResources[i]);
  // }

  cachableAssetsCount = cachableAssets.length;

  console.log("Cachable app assets: ", cachableAssets);

  caches.open(appData["appName"]).then((cache) => {
    for (let i = 0; i < cachableAssets.length; i++) {
      cache.add(cachableAssets[i].toLowerCase()).finally(() => {
        updateCachingProgress(appData["appName"]);
      }).catch((error) => {
        if (debugCaching) {
          console.log("Error while caching an asset: ", cachableAssets[i], error);
          cachableAssets[i] = cachableAssets[i] + " ERROR WHILE CACHING!";
        }
      });
    }
    console.log("After caching: ", cachableAssets);
  });
}

self.addEventListener("fetch", function (event) {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.protocol === 'chrome-extension:') {
    return;
  }
  event.respondWith(
      caches.match(event.request).then(function (response) {
          if (response) {
            return response;
          }
          return fetch(event.request);
      }).catch(function (error) {
          console.log("Error while fetching: ", event.request.url, error);
      })
  );
});