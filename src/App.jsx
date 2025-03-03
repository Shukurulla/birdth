import React, { useState, useRef, useEffect, useMemo } from "react";
import { Carousel } from "antd";
import { openDB, addImage, getImages } from "./db";
import "antd/dist/reset.css";

const BOOTSTRAP_ICONS_CDN =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css";

const menus = ["menu1", "menu2", "menu3", "menu4", "menu5", "menu6", "menu7"];

const App = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [activeMenu, setActiveMenu] = useState("menu1");
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const itemsPerPage = 7;
  const carouselRef = useRef(null);
  const imagesLoaded = useRef({});

  // Rasmlarni oldindan yuklash funksiyasi
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
        setImages(storedImages);
        setPage(0);
        setCurrentIndex(0);

        // Rasmlarni oldindan yuklash
        preloadImages(storedImages);

        // Carouselni reset qilish
        if (carouselRef.current) {
          // setTimeout orqali yurgazish uchun vaqt berish
          setTimeout(() => {
            if (carouselRef.current) {
              carouselRef.current.goTo(0, false); // false - animation o'chirilgan
            }
            setLoading(false);
          }, 300);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Rasmlarni yuklashda xatolik:", error);
        setLoading(false);
      }
    };

    loadImages();
  }, [activeMenu]);

  // Birinchi render paytida carouselni to'g'rilash
  useEffect(() => {
    if (carouselRef.current && images.length > 0) {
      setTimeout(() => {
        carouselRef.current.goTo(0, false);
      }, 100);
    }
  }, [images.length]);

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      setLoading(true);
      let processed = 0;

      const processComplete = async () => {
        processed++;
        if (processed === files.length) {
          const updatedImages = await getImages(activeMenu);
          setImages(updatedImages);
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

  // Thumbnaillar ko'rsatiladigan indexlarni hisoblash
  const { totalPages, visibleThumbnails, startIndex } = useMemo(() => {
    const totalPages = Math.ceil(images.length / itemsPerPage);
    const startIndex = page * itemsPerPage;
    const visibleThumbnails = images.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return { totalPages, visibleThumbnails, startIndex };
  }, [images, page, itemsPerPage]);

  // Joriy slide o'zgarganda page ni yangilash
  useEffect(() => {
    const targetPage = Math.floor(currentIndex / itemsPerPage);
    if (page !== targetPage) {
      setPage(targetPage);
    }
  }, [currentIndex, itemsPerPage]);

  // Carousel settings
  const carouselSettings = {
    beforeChange: (_, next) => {
      // Keyingi slide indeksini oldindan o'rnatish
      setCurrentIndex(next);
    },
    afterChange: (current) => {
      // afterChange bizga haqiqiy joriy indeksni beradi
      setCurrentIndex(current);
    },
    speed: 500, // animation tezligi
    autoplay: true,
    autoplaySpeed: 3000,
    dots: false,
    effect: "fade", // fade effekti bilan yumshoqroq o'tish
    lazyLoad: "ondemand",
    easing: "linear", // yumshoq o'tish
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <link rel="stylesheet" href={BOOTSTRAP_ICONS_CDN} />
      <div className="w-full text-center py-4 bg-gray-800 text-white text-3xl shadow-md">
        Banner
      </div>
      <div className="flex flex-1 p-4">
        <div className="w-1/4 bg-white p-3 rounded-xl shadow-lg">
          <ul className="space-y-3">
            {menus.map((menu) => (
              <li
                key={menu}
                className={`p-2 rounded-lg text-lg font-medium cursor-pointer transition-all hover:bg-gray-200 ${
                  activeMenu === menu ? "bg-blue-500 text-white" : ""
                }`}
                onClick={() => setActiveMenu(menu)}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-1/2 flex flex-col items-center px-6">
          <div
            className="w-full bg-white p-2 rounded-xl shadow-lg relative"
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
          >
            {loading ? (
              <div className="w-full h-[400px] flex items-center justify-center">
                <div className="text-xl font-semibold text-gray-500">
                  Rasmlar yuklanmoqda...
                </div>
              </div>
            ) : images.length > 0 ? (
              <div
                className="carousel-container"
                style={{ overflow: "hidden" }}
              >
                <Carousel ref={carouselRef} {...carouselSettings}>
                  {images.map((img, index) => (
                    <div key={index} className="w-full flex justify-center">
                      <div
                        style={{
                          width: "700px",
                          height: "500px",
                          backgroundImage: `url(${img})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius: "0.375rem",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            ) : (
              <div className="w-full h-[400px] flex items-center justify-center text-gray-400 text-xl font-semibold border-2 border-dashed border-gray-300 rounded-md">
                Rasmlar yuklanmagan
              </div>
            )}
            {images.length > 0 && !loading && (
              <div className="flex items-center justify-center mt-4 space-x-3 relative">
                <div className="flex space-x-3">
                  {visibleThumbnails.map((img, index) => {
                    const absoluteIndex = index + startIndex;
                    return (
                      <div
                        key={index}
                        style={{
                          width: "64px",
                          height: "48px",
                          backgroundImage: `url(${img})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          opacity: currentIndex === absoluteIndex ? 1 : 0.5,
                          boxShadow:
                            currentIndex === absoluteIndex
                              ? "0 0 0 3px #3b82f6"
                              : "none",
                        }}
                        onClick={() => {
                          if (carouselRef.current) {
                            carouselRef.current.goTo(absoluteIndex, false);
                          }
                        }}
                      />
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  className="absolute left-4 bg-gray-300 p-2 rounded-full shadow-md transition hover:bg-gray-400 focus:outline-none"
                  disabled={page === 0}
                  style={{ opacity: page === 0 ? 0.5 : 1 }}
                >
                  <i className="bi bi-chevron-left text-xl"></i>
                </button>
                <button
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages - 1))
                  }
                  className="absolute right-5 bg-gray-300 p-2 rounded-full shadow-md transition hover:bg-gray-400 focus:outline-none"
                  disabled={page === totalPages - 1 || totalPages <= 1}
                  style={{
                    opacity:
                      page === totalPages - 1 || totalPages <= 1 ? 0.5 : 1,
                  }}
                >
                  <i className="bi bi-chevron-right text-xl"></i>
                </button>
              </div>
            )}
            <label
              className={`absolute top-2 right-2 bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-full cursor-pointer shadow-md hover:bg-blue-600 transition-all duration-300 ${
                isCarouselHovered
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform -translate-y-2"
              }`}
              style={{
                pointerEvents: isCarouselHovered ? "auto" : "none",
                zIndex: 10,
              }}
            >
              <div>
                <i className="bi bi-plus-lg text-xl"></i>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </label>
          </div>
        </div>
        <div className="w-1/4 flex items-center justify-center">
          <div className="bg-white w-100 h-100 flex justify-center p-2 rounded-xl shadow-lg">
            <img
              src="https://plus.unsplash.com/premium_photo-1734543932038-6bb3d024f5a0?w=500&auto=format&fit=crop&q=60"
              alt="userImage"
              className="w-40 h-40 rounded-full border-4 border-gray-300 shadow-md"
            />
          </div>
        </div>
      </div>
      <footer className="text-center py-3 bg-gray-800 text-white shadow-md mt-auto">
        <p>Footer Text</p>
      </footer>
    </div>
  );
};

export default App;
