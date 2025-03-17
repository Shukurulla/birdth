export const openDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MediaDB", 3); // Versiya 3

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Rasmlar uchun object store
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      }

      // Tabriklar uchun object store
      if (!db.objectStoreNames.contains("greetings")) {
        db.createObjectStore("greetings", {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // Videolar uchun object store
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("IndexedDB ochilmadi!");
  });
};

// Rasmlarni qo'shish
export const addImage = async (menu, image) => {
  const db = await openDB();
  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");
  store.add({ menu, image });
  return tx.complete;
};

// Rasmlarni olish
export const getImages = async (menu) => {
  return new Promise(async (resolve) => {
    const db = await openDB();
    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");
    const images = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.menu === menu) {
          images.push({ id: cursor.key, image: cursor.value.image });
        }
        cursor.continue();
      } else {
        resolve(images);
      }
    };
  });
};

// Rasmni o'chirish
export const deleteImage = async (id) => {
  const db = await openDB();
  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");
  store.delete(id);
  return tx.complete;
};

// Rasmni yangilash
export const updateImage = async (id, newImage) => {
  const db = await openDB();
  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");
  const request = store.get(id);
  request.onsuccess = () => {
    const data = request.result;
    if (data) {
      data.image = newImage;
      store.put(data);
    }
  };
  return tx.complete;
};

// Tabrik qo'shish
export const addGreeting = async (text, image) => {
  const db = await openDB();
  const tx = db.transaction("greetings", "readwrite");
  const store = tx.objectStore("greetings");
  store.add({ text, image });
  return tx.complete;
};

// Tabriklarni olish
export const getGreetings = async () => {
  return new Promise(async (resolve) => {
    const db = await openDB();
    const tx = db.transaction("greetings", "readonly");
    const store = tx.objectStore("greetings");
    const greetings = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        greetings.push(cursor.value);
        cursor.continue();
      } else {
        resolve(greetings);
      }
    };
  });
};

// Tabrikni o'chirish
export const deleteGreeting = async (id) => {
  const db = await openDB();
  const tx = db.transaction("greetings", "readwrite");
  const store = tx.objectStore("greetings");
  store.delete(id);
  return tx.complete;
};

// Tabrikni yangilash
export const updateGreeting = async (id, newText, newImage) => {
  const db = await openDB();
  const tx = db.transaction("greetings", "readwrite");
  const store = tx.objectStore("greetings");
  const request = store.get(id);
  request.onsuccess = () => {
    const data = request.result;
    if (data) {
      data.text = newText;
      data.image = newImage;
      store.put(data);
    }
  };
  return tx.complete;
};

// Video qo'shish
export const addVideo = async (menu, videoDataUrl, thumbnail, videoName) => {
  // IndexedDB ga video va thumbnail bilan birga saqlash
  const db = await openDB("myDatabase", 1);
  const tx = db.transaction("videos", "readwrite");
  const store = tx.objectStore("videos");
  await store.add({ menu, video: videoDataUrl, thumbnail, name: videoName });
  await tx.done;
};

// Videolarni olish
export const getVideos = async (menu) => {
  return new Promise(async (resolve) => {
    const db = await openDB();
    const tx = db.transaction("videos", "readonly");
    const store = tx.objectStore("videos");
    const videos = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.menu === menu) {
          videos.push({
            id: cursor.key,
            video: cursor.value.video,
            thumbnail: cursor.value.thumbnail,
          });
        }
        cursor.continue();
      } else {
        resolve(videos);
      }
    };
  });
};

// Videoni o'chirish
export const deleteVideo = async (id) => {
  const db = await openDB();
  const tx = db.transaction("videos", "readwrite");
  const store = tx.objectStore("videos");
  store.delete(id);
  return tx.complete;
};

// Videoni yangilash
export const updateVideo = async (id, newVideo, newThumbnail) => {
  const db = await openDB();
  const tx = db.transaction("videos", "readwrite");
  const store = tx.objectStore("videos");
  const request = store.get(id);
  request.onsuccess = () => {
    const data = request.result;
    if (data) {
      data.video = newVideo;
      data.thumbnail = newThumbnail;
      store.put(data);
    }
  };
  return tx.complete;
};