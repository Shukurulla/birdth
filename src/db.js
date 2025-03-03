export const openDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MenuImagesDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("IndexedDB ochilmadi!");
  });
};

export const addImage = async (menu, image) => {
  const db = await openDB();
  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");
  store.add({ menu, image });
  return tx.complete;
};

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
          images.push(cursor.value.image);
        }
        cursor.continue();
      } else {
        resolve(images);
      }
    };
  });
};
