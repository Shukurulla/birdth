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

const Admin = () => {
  const [activeMenu, setActiveMenu] = useState("menu1");
  const [images, setImages] = useState([]);
  const [greeting, setGreeting] = useState(null); // Faqat bitta tabrik
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [selectedGreetingImage, setSelectedGreetingImage] = useState(null);
  const [editingGreeting, setEditingGreeting] = useState(false); // Tahrirlash rejimi
  const imagesLoaded = useRef({});

  const preloadImages = (imageUrls) => {
    imageUrls.forEach((url) => {
      if (!imagesLoaded.current[url]) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          imagesLoaded.current[url] = true;
        };
      }
    });
  };

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      try {
        const storedImages = await getImages(activeMenu);
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
          setGreeting(storedGreetings[0]); // Faqat birinchi tabrikni olamiz
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

  // Update the closeEditModal function to reset states properly
  const closeEditModal = () => {
    setEditingGreeting(false);
    setGreetingText("");
    setSelectedGreetingImage(null);
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      setLoading(true);
      let processed = 0;
      const processComplete = async () => {
        processed++;
        if (processed === files.length) {
          const updatedImages = await getImages(activeMenu);
          setImages([...updatedImages]);
          preloadImages(updatedImages);
          setLoading(false);
        }
      };

      for (let file of files) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              await addImage(activeMenu, e.target.result);
              processComplete();
            } catch (error) {
              console.error("Rasmni saqlashda xatolik:", error);
              processComplete();
            }
          };
          reader.onerror = () => {
            console.error("Rasmni o'qishda xatolik");
            processComplete();
          };
          reader.readAsDataURL(file);
        } else {
          alert("Faqat rasm fayllarini yuklash mumkin!");
          processComplete();
        }
      }
    }
  };

  const handleGreetingFileChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedGreetingImage(e.target.result); // Tanlangan rasmni saqlash
        };
        reader.readAsDataURL(file);
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
        // Agar tabrik mavjud bo'lsa, uni yangilaymiz
        await updateGreeting(greeting.id, greetingText, selectedGreetingImage);
      } else {
        // Yangi tabrik qo'shamiz
        await addGreeting(greetingText, selectedGreetingImage);
      }
      const storedGreetings = await getGreetings();
      setGreeting(storedGreetings[0]); // Yangilangan tabrikni o'rnatamiz
      setEditingGreeting(false); // Tahrirlash rejimini yopamiz
    } catch (error) {
      console.error("Tabrikni saqlashda xatolik:", error);
    }

    // Stateni tozalash
    setGreetingText("");
    setSelectedGreetingImage(null);
  };

  const handleDeleteGreeting = async () => {
    if (greeting) {
      try {
        await deleteGreeting(greeting.id);
        setGreeting(null); // Tabrikni o'chirib, stateni tozalaymiz
      } catch (error) {
        console.error("Tabrikni o'chirishda xatolik:", error);
      }
    }
  };

  // Add this new function to handle the edit button click
  const handleEditGreeting = () => {
    if (greeting) {
      // Set the greeting text and image from the current greeting
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
            <div className="row">
              {images.length > 0 ? (
                images.map((img, index) => (
                  <div className="col-3" key={index}>
                    <img
                      src={img.image}
                      alt="Admin Image"
                      className="w-full h-[100px] rounded-md mb-2 cursor-pointer"
                      onClick={() => handleImageClick(img)}
                    />
                  </div>
                ))
              ) : (
                <p>Hech qanday rasm topilmadi</p>
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
