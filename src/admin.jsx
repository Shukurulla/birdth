import React, { useEffect, useRef, useState } from "react";
import {
  getImages,
  deleteImage,
  addImage,
  getGreetings,
  addGreeting,
  deleteGreeting,
  updateGreeting,
  getVideos,
  addVideo,
  deleteVideo,
} from "./db";
import { FFmpeg, FFFSType } from "@ffmpeg/ffmpeg";

const menus = [
  "menu1",
  "menu2",
  "menu3",
  "menu4",
  "menu5",
  "menu6",
  "menu7",
  "galereya",
];

const BOOTSTRAP_ICONS_CDN =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css";

const resizeImage = (file, maxWidth = 1200, maxHeight = 800, quality = 0.7) => {
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

        const resizedImage = canvas.toDataURL("image/jpeg", quality);
        resolve(resizedImage);
      };
    };
  });
};

const createVideoThumbnail = (videoUrl) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.addEventListener("loadedmetadata", () => {
      // Videoning o'rtasiga o'tish
      video.currentTime = video.duration / 2;
    });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL("image/jpeg");
      resolve(thumbnail);
    });
  });
};
const optimizeVideo = async (file, onProgress) => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  // Faylni FFmpeg ga yuklash
  await ffmpeg.writeFile(inputName, file);

  // Progressni kuzatish
  ffmpeg.on("progress", ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });

  // Videoni optimizatsiya qilish
  await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    "scale=1280:-1", // Videoni kengligini 1280px ga moslashtirish
    "-c:v",
    "libx264", // Video codec
    "-crf",
    "28", // Sifatni saqlab qolish (28 - optimal)
    "-preset",
    "medium", // Tezlik va sifat balansi
    "-c:a",
    "aac", // Audio codec
    "-b:a",
    "128k", // Audio bitrate
    outputName,
  ]);

  // Optimizatsiya qilingan videoni olish
  const data = await ffmpeg.readFile(outputName);
  const optimizedVideo = new Blob([data], { type: "video/mp4" });
  return URL.createObjectURL(optimizedVideo);
};

const Admin = () => {
  const [activeMenu, setActiveMenu] = useState("menu1");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [greetings, setGreetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedGreetingImage, setSelectedGreetingImage] = useState(null);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const imagesCache = useRef({});

  const [adText, setAdText] = useState("");
  const [adDate, setAdDate] = useState("");

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      try {
        const storedImages = await getImages(activeMenu);
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
    const loadVideos = async () => {
      setLoading(true);
      try {
        const storedVideos = await getVideos(activeMenu);
        setVideos(storedVideos);
      } catch (error) {
        console.error("Videolarni yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, [activeMenu]);

  useEffect(() => {
    const loadGreetings = async () => {
      setLoading(true);
      try {
        const storedGreetings = await getGreetings();
        setGreetings(storedGreetings);
      } catch (error) {
        console.error("Tabriklarni olishda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    loadGreetings();
  }, []);

  const handleImageClick = (img) => {
    setSelectedImage(img);
    setIsModalOpen(true);
  };

  const handleDeleteImage = async () => {
    try {
      await deleteImage(selectedImage.id);
      setImages(images.filter((img) => img.id !== selectedImage.id));
      setSelectedImage(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Rasmni o'chirishda xatolik:", error);
    }
  };

  const handleDeleteVideo = async (id) => {
    try {
      await deleteVideo(id);
      setVideos(videos.filter((video) => video.id !== id));
      setSelectedVideo(null);
      setIsVideoModalOpen(false);
    } catch (error) {
      console.error("Videoni o'chirishda xatolik:", error);
    }
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
            const resizedImageData = await resizeImage(file);
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

      const updatedImages = await getImages(activeMenu);
      setImages(updatedImages);
      setLoading(false);
      setIsUploading(false);
    }
  };

  const handleVideoFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/")) {
        try {
          setIsUploading(true);
          setUploadProgress(0);

          // Video uchun noyob nom generatsiya qilish
          const videoName = `video_${Date.now()}_${Math.floor(
            Math.random() * 1000
          )}.${file.name.split(".").pop()}`;

          // Videoni FileReader orqali o'qish
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            const videoDataUrl = reader.result;

            // Thumbnail yaratish
            const thumbnail = await createVideoThumbnail(videoDataUrl);

            // Videoni IndexedDB ga saqlash
            await addVideo(activeMenu, videoDataUrl, thumbnail, videoName);

            // Videolarni yangilash
            const updatedVideos = await getVideos(activeMenu);
            setVideos(updatedVideos);

            setIsUploading(false);
          };
        } catch (error) {
          console.error("Videoni saqlashda xatolik:", error);
          setIsUploading(false);
        }
      } else {
        alert("Faqat video fayllarini yuklash mumkin!");
      }
    }
  };

  const handleGreetingFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
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
    if (!firstName.trim() || !lastName.trim() || !birthDate.trim()) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    try {
      const newGreeting = {
        firstName,
        lastName,
        birthDate,
        image: selectedGreetingImage,
      };

      await addGreeting(newGreeting);
      const storedGreetings = await getGreetings();
      setGreetings(storedGreetings);
      setEditingGreeting(false);
    } catch (error) {
      console.error("Tabrikni saqlashda xatolik:", error);
    }

    setFirstName("");
    setLastName("");
    setBirthDate("");
    setSelectedGreetingImage(null);
  };

  const handleDeleteGreeting = async (id) => {
    try {
      await deleteGreeting(id);
      const storedGreetings = await getGreetings();
      setGreetings(storedGreetings);
    } catch (error) {
      console.error("Tabrikni o'chirishda xatolik:", error);
    }
  };

  const [ads, setAds] = useState({});
  const createAd = () => {
    localStorage.setItem("ad", JSON.stringify({ adText, adDate }));
    setAds(JSON.parse(localStorage.getItem("ad")));
    setAdText("");
    setAdDate("");
  };

  useEffect(() => {
    setAds(JSON.parse(localStorage.getItem("ad")));
  }, [ads]);

  return (
    <div>
      <link rel="stylesheet" href={BOOTSTRAP_ICONS_CDN} />
      <div className="flex flex-1 h-[100vh] p-4">
        <div className="w-1/4 h-100 bg-[#ffffff34] p-3 rounded-xl shadow-lg">
          <ul className="space-y-3">
            {menus.map((menu) => (
              <li
                key={menu}
                className={`p-2 rounded-lg text-lg font-medium cursor-pointer text-white transition-all ${
                  activeMenu === menu
                    ? "bg-[#ffffff36] hover:bg-[#ffffff49] "
                    : "hover:bg-[#ffffff49]"
                }`}
                onClick={() => setActiveMenu(menu)}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
              </li>
            ))}
          </ul>
          <li
            className={`p-2 rounded-lg list-item text-lg font-medium cursor-pointer text-white transition-all ${
              activeMenu === "ad"
                ? "bg-[#ffffff36] hover:bg-[#ffffff49] "
                : "hover:bg-[#ffffff49]"
            }`}
            onClick={() => setActiveMenu("ad")}
          >
            Elon
          </li>
        </div>
        <div className="w-1/2 flex flex-col items-center px-6">
          {activeMenu === "ad" ? (
            <div className="w-full min-h-[500px]  bg-[#ffffff34] p-2 rounded-xl shadow-lg relative">
              <div className="flex items-center justify-between">
                <p className="text-2xl text-white text-start p-0 m-0 font-[500]">
                  Elon qoshish
                </p>
              </div>
              {ads ? (
                <div className="ad-box mt-3">
                  <li className="flex bg-[#ffffff34] py-2 rounded-lg items-center justify-between px-3">
                    <div>
                      <p className="font-medium text-lg text-white">
                        {ads.adText}
                      </p>
                      <p className="text-md text-[#ffffffaf]">{ads.adDate}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => localStorage.removeItem("ad")}
                        className="bg-red-500 text-white px-2 py-1 rounded-md"
                      >
                        O'chirish
                      </button>
                    </div>
                  </li>
                </div>
              ) : (
                <div className="  mt-4">
                  <div className="flex">
                    <input
                      type="text"
                      value={adText}
                      onChange={(e) => setAdText(e.target.value)}
                      className="form-control "
                      required
                      placeholder="Elon matni"
                    />
                    <input
                      type="date"
                      required
                      value={adDate}
                      onChange={(e) => setAdDate(e.target.value)}
                      className="form-control w-[20%]"
                      placeholder="Elon matni"
                    />
                  </div>
                  <button
                    onClick={() => createAd()}
                    className="btn btn-primary mt-2"
                  >
                    Qoshish
                  </button>
                </div>
              )}
            </div>
          ) : activeMenu === "galereya" ? (
            <div className="w-full bg-[#ffffff34] p-2 rounded-xl shadow-lg relative">
              <div className="flex py-2 justify-between items-center">
                <p className="text-2xl p-0 m-0 font-[500]">Video qoshish</p>
                <div className="">
                  <label
                    htmlFor="videoInput"
                    className="cursor-pointer w-10 h-10 bg-blue-500 rounded-full text-white flex items-center justify-center"
                  >
                    <i className="bi bi-plus-lg text-xl text-white"></i>
                  </label>

                  <input
                    id="videoInput"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoFileChange}
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
                {videos.length > 0 ? (
                  videos.map((video, index) => (
                    <div key={index} className="relative">
                      <img
                        src={video.thumbnail}
                        className="w-full h-[100px] object-cover rounded-md mb-2 cursor-pointer"
                      />
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteVideo(video.id)}
                      >
                        Ochirish
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="col-span-4">Hech qanday video topilmadi</p>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#ffffff34] p-2 rounded-xl shadow-lg relative">
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
                        loading="lazy"
                      />
                    </div>
                  ))
                ) : (
                  <p className="col-span-4">Hech qanday rasm topilmadi</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-1/4 h-100 overflow-y-scroll bg-[#ffffff34] p-3 rounded-xl shadow-lg">
          <p className="text-2xl p-0 m-0 font-[500]">Tabrik qoshish</p>
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
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ism"
            className="form-control my-3"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Familiya"
            className="form-control my-3"
          />
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            placeholder="Tug'ilgan sanasi"
            className="form-control my-3"
          />
          <button
            className="btn btn-primary"
            onClick={handleAddOrUpdateGreeting}
          >
            Qo'shish
          </button>

          <div className="mt-4">
            <h3 className="text-xl font-semibold">Tabriklar ro'yxati</h3>
            <ul className="space-y-2">
              {greetings.map((greeting, index) => (
                <li key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {greeting.text.firstName} {greeting.text.lastName}
                    </p>
                    <p className="text-md text-[#ffffff96]">
                      {greeting.text.birthDate}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded-md"
                      onClick={() => handleDeleteGreeting(greeting.id)}
                    >
                      O'chirish
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#ffffff34] p-6 rounded-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
              onClick={() => setIsModalOpen(false)}
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

      {isVideoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#ffffff34] p-6 rounded-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
              onClick={() => setIsVideoModalOpen(false)}
            >
              <i className="bi bi-x-lg text-2xl"></i>
            </button>
            <video
              src={selectedVideo.video}
              className="max-w-full max-h-[80vh] rounded-md"
              controls
              autoPlay
            />
            <div className="mt-4 flex justify-end">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                onClick={handleDeleteVideo}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGreeting && (
        <div className="fixed  inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#ffffff34] p-6 rounded-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
              onClick={() => setEditingGreeting(false)}
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
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ism"
              className="form-control my-3"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familiya"
              className="form-control my-3"
            />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              placeholder="Tug'ilgan sanasi"
              className="form-control my-3"
            />
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
