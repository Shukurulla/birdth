export const openDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MenuImagesDB", 2); // Versiyani oshirdik
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Rasm saqlash uchun
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      }

      // Tabriklar uchun
      if (!db.objectStoreNames.contains("greetings")) {
        db.createObjectStore("greetings", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("IndexedDB ochilmadi!");
  });
};

// ✅ Rasm qo‘shish
export const addImage = async (menu, image) => {
  const db = await openDB();
  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");
  store.add({ menu, image });
  return tx.complete;
};

// ✅ Tabrik qo‘shish
export const addGreeting = async (text, image) => {
  const db = await openDB();
  const tx = db.transaction("greetings", "readwrite");
  const store = tx.objectStore("greetings");
  store.add({ text, image });
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
          images.push({ id: cursor.key, image: cursor.value.image }); // ID ni ham qo'shamiz
        }
        cursor.continue();
      } else {
        resolve(images);
      }
    };
  });
};

// ✅ Tabriklarni olish
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

// ✅ Rasmni o‘chirish
export const deleteImage = async (id) => {
  const db = await openDB();
  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");
  store.delete(id);
  return tx.complete;
};

// ✅ Tabrikni o‘chirish
export const deleteGreeting = async (id) => {
  const db = await openDB();
  const tx = db.transaction("greetings", "readwrite");
  const store = tx.objectStore("greetings");
  store.delete(id);
  return tx.complete;
};

// ✅ Rasmni yangilash
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

// ✅ Tabrikni yangilash
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
