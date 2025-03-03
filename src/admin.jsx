import React, { useEffect, useRef, useState } from "react";
import {
  getImages,
  deleteImage,
  addImage,
  getGreetings,
  addGreeting,
  deleteGreeting,
  updateGreeting,
} from "./db";

const menus = ["menu1", "menu2", "menu3", "menu4", "menu5", "menu6", "menu7"];

const BOOTSTRAP_ICONS_CDN =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css";

// Rasm hajmini kichraytiradigan funksiya
const resizeImage = (file, maxWidth = 1200, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Rasmni canvas orqali kichraytirish
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // O'lchamlarni sozlash
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Siqilgan rasmni qaytarish
        const resizedImage = canvas.toDataURL("image/jpeg", quality);
        resolve(resizedImage);
      };
    };
  });
};

// Umumiy rasm thumbnailini yaratish funksiyasi
const createThumbnail = (
  file,
  maxWidth = 100,
  maxHeight = 100,
  quality = 0.6
) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const thumbnailImage = canvas.toDataURL("image/jpeg", quality);
        resolve(thumbnailImage);
      };
    };
  });
};

// Rasmni Base64 dan Blob ga aylantirish
const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64.split(",")[1]);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
};

const Admin = () => {
  const [activeMenu, setActiveMenu] = useState("menu1");
  const [images, setImages] = useState([]);
  const [greeting, setGreeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [selectedGreetingImage, setSelectedGreetingImage] = useState(null);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const imagesCache = useRef({});

  // Rasmlarni keshga yuklash
  useEffect(() => {
    // Keshlanganliklarni tekshirish
    const loadImages = async () => {
      setLoading(true);
      try {
        const storedImages = await getImages(activeMenu);

        // Rasmlarni keshga yuklash
        storedImages.forEach((img) => {
          if (!imagesCache.current[img.id]) {
            imagesCache.current[img.id] = img.image;
          }
        });

        setImages([...storedImages]);
      } catch (error) {
        console.error("Rasm olishda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    loadImages();
  }, [activeMenu]);

  useEffect(() => {
    const loadGreeting = async () => {
      setLoading(true);
      try {
        const storedGreetings = await getGreetings();
        if (storedGreetings.length > 0) {
          setGreeting(storedGreetings[0]);
        }
      } catch (error) {
        console.error("Tabrikni olishda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    loadGreeting();
  }, []);

  const handleImageClick = (img) => {
    if (selectedImage !== img) {
      setSelectedImage(img);
      setIsModalOpen(true);
    }
  };

  const handleDeleteImage = async () => {
    try {
      const imageToDelete = images.find(
        (img) => img.image === selectedImage.image
      );
      if (!imageToDelete) return;

      await deleteImage(imageToDelete.id);
      setImages(images.filter((img) => img.id !== imageToDelete.id));

      // Keshdan o'chirish
      delete imagesCache.current[imageToDelete.id];

      setSelectedImage(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Rasmni o'chirishda xatolik:", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const closeEditModal = () => {
    setEditingGreeting(false);
    setGreetingText("");
    setSelectedGreetingImage(null);
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      setIsUploading(true);
      setUploadProgress(0);
      setLoading(true);

      let processed = 0;
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          try {
            // Rasmni hajmini kichraytirish
            const resizedImageData = await resizeImage(file);

            // Kichraytirilgan rasmni saqlash
            await addImage(activeMenu, resizedImageData);

            processed++;
            setUploadProgress(Math.round((processed / totalFiles) * 100));
          } catch (error) {
            console.error("Rasmni saqlashda xatolik:", error);
          }
        } else {
          alert("Faqat rasm fayllarini yuklash mumkin!");
          processed++;
          setUploadProgress(Math.round((processed / totalFiles) * 100));
        }
      }

      // Yangilangan rasmlarni olish
      const updatedImages = await getImages(activeMenu);

      // Yangi rasmlarni keshga yuklash
      updatedImages.forEach((img) => {
        if (!imagesCache.current[img.id]) {
          imagesCache.current[img.id] = img.image;
        }
      });

      setImages(updatedImages);
      setLoading(false);
      setIsUploading(false);
    }
  };

  const handleGreetingFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          // Tabrik rasmi hajmini kichraytirish (sifatli bo'lishi uchun siqish darajasi kamroq)
          const resizedGreetingImage = await resizeImage(file, 500, 500, 0.8);
          setSelectedGreetingImage(resizedGreetingImage);
        } catch (error) {
          console.error("Rasmni o'qishda xatolik:", error);
        }
      } else {
        alert("Faqat rasm fayllarini yuklash mumkin!");
      }
    }
  };

  const handleAddOrUpdateGreeting = async () => {
    if (!selectedGreetingImage) {
      alert("Iltimos, avval rasm tanlang!");
      return;
    }
    if (!greetingText.trim()) {
      alert("Iltimos, tabrik matnini kiriting!");
      return;
    }

    try {
      if (greeting) {
        await updateGreeting(greeting.id, greetingText, selectedGreetingImage);
      } else {
        await addGreeting(greetingText, selectedGreetingImage);
      }
      const storedGreetings = await getGreetings();
      setGreeting(storedGreetings[0]);
      setEditingGreeting(false);
    } catch (error) {
      console.error("Tabrikni saqlashda xatolik:", error);
    }

    setGreetingText("");
    setSelectedGreetingImage(null);
  };

  const handleDeleteGreeting = async () => {
    if (greeting) {
      try {
        await deleteGreeting(greeting.id);
        setGreeting(null);
      } catch (error) {
        console.error("Tabrikni o'chirishda xatolik:", error);
      }
    }
  };

  const handleEditGreeting = () => {
    if (greeting) {
      setGreetingText(greeting.text);
      setSelectedGreetingImage(greeting.image);
      setEditingGreeting(true);
    }
  };

  return (
    <div>
      <link rel="stylesheet" href={BOOTSTRAP_ICONS_CDN} />
      <div className="flex flex-1 h-[100vh] p-4">
        <div className="w-1/4 h-100 bg-white p-3 rounded-xl shadow-lg">
          <ul className="space-y-3">
            {menus.map((menu) => (
              <li
                key={menu}
                className={`p-2 rounded-lg text-lg font-medium cursor-pointer transition-all hover:bg-gray-200 ${
                  activeMenu === menu
                    ? "bg-blue-500 hover:bg-blue-400 text-white"
                    : ""
                }`}
                onClick={() => setActiveMenu(menu)}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-1/2 flex flex-col items-center px-6">
          <div className="w-full bg-white p-2 rounded-xl shadow-lg relative">
            <div className="flex py-2 justify-between items-center">
              <p className="text-2xl p-0 m-0 font-[500]">Rasm qoshish</p>
              <div className="">
                <label
                  htmlFor="fileInput"
                  className="cursor-pointer w-10 h-10 bg-blue-500 rounded-full text-white flex items-center justify-center"
                >
                  <i className="bi bi-plus-lg text-xl"></i>
                </label>

                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-center text-xs mt-1">
                  {uploadProgress}% yuklandi
                </p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {images.length > 0 ? (
                images.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img.image}
                      alt="Admin Image"
                      className="w-full h-[100px] object-cover rounded-md mb-2 cursor-pointer"
                      onClick={() => handleImageClick(img)}
                      loading="lazy" // Laziy yuklash
                    />
                  </div>
                ))
              ) : (
                <p className="col-span-4">Hech qanday rasm topilmadi</p>
              )}
            </div>
          </div>
        </div>
        <div className="w-1/4 h-100 bg-white p-3 rounded-xl shadow-lg">
          <p className="text-2xl p-0 m-0 font-[500]">Tabrik qoshish</p>
          {greeting ? (
            <>
              <div className="w-full h-[160px] mt-3 flex items-center justify-center text-gray-400 text-md font-semibold border-2 border-dashed border-gray-300 px-4 mx-auto rounded-md">
                <img
                  src={greeting.image}
                  alt="Tabrik rasmi"
                  className="w-full h-full object-cover rounded-md"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-center">{greeting.text}</p>
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded-md"
                  onClick={handleEditGreeting}
                >
                  Tahrirlash
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded-md"
                  onClick={handleDeleteGreeting}
                >
                  O'chirish
                </button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="greet" className="cursor-pointer block">
                <div className="w-full h-[160px] mt-3 flex items-center justify-center text-gray-400 text-md font-semibold border-2 border-dashed border-gray-300 px-4 mx-auto rounded-md">
                  {selectedGreetingImage ? (
                    <img
                      src={selectedGreetingImage}
                      alt="Tanlangan rasm"
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    "Rasmlar yuklanmagan"
                  )}
                </div>
              </label>
              <input
                type="file"
                accept="image/*"
                className="hidden w-0"
                id="greet"
                onChange={handleGreetingFileChange}
              />
              <textarea
                value={greetingText}
                onChange={(e) => setGreetingText(e.target.value)}
                cols="30"
                className="form-control my-3"
                rows="5"
                placeholder="Tabrik matnini kiriting..."
              ></textarea>
              <button
                className="btn btn-primary"
                onClick={handleAddOrUpdateGreeting}
              >
                Qo'shish
              </button>
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
              onClick={closeModal}
            >
              <i className="bi bi-x-lg text-2xl"></i>
            </button>
            <img
              src={selectedImage.image}
              alt="Selected"
              className="max-w-full max-h-[80vh] rounded-md"
            />
            <div className="mt-4 flex justify-end">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                onClick={handleDeleteImage}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGreeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
              onClick={closeEditModal}
            >
              <i className="bi bi-x-lg text-2xl"></i>
            </button>
            <label htmlFor="editGreet" className="cursor-pointer block">
              <div className="w-full h-[160px] mt-3 flex items-center justify-center text-gray-400 text-md font-semibold border-2 border-dashed border-gray-300 px-4 mx-auto rounded-md">
                {selectedGreetingImage ? (
                  <img
                    src={selectedGreetingImage}
                    alt="Tanlangan rasm"
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <p>Rasmlar yuklanmagan</p>
                )}
              </div>
            </label>
            <input
              type="file"
              accept="image/*"
              className="hidden w-0"
              id="editGreet"
              onChange={handleGreetingFileChange}
            />
            <textarea
              value={greetingText}
              onChange={(e) => setGreetingText(e.target.value)}
              cols="30"
              className="form-control my-3"
              rows="5"
              placeholder="Tabrik matnini kiriting..."
            ></textarea>
            <button
              className="btn btn-primary"
              onClick={handleAddOrUpdateGreeting}
            >
              Yangilash
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
