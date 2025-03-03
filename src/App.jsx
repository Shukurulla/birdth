import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Carousel } from "antd";
import { getImages, getGreetings } from "./db";
import "antd/dist/reset.css";
import { Route, Routes } from "react-router-dom";
import Admin from "./admin";
import moment from "moment/moment";

const BOOTSTRAP_ICONS_CDN =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css";

const menus = ["menu1", "menu2", "menu3", "menu4", "menu5", "menu6", "menu7"];

const App = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [activeMenu, setActiveMenu] = useState("menu1");
  const itemsPerPage = 7;
  const [greeting, setGreeting] = useState([]);
  const carouselRef = useRef(null);
  const imagesLoadedRef = useRef({});
  const loadingTimeoutRef = useRef(null);
  const goToTimeoutRef = useRef(null);

  // Bugungi sanani olish
  const today = new Date();
  const todayFormatted = moment(today).format("YYYY-MM-DD"); // Format: "kun-oy"

  // Bugungi sanada tug'ilganlar ro'yxati
  const todaysGreetings = useMemo(() => {
    return greeting.filter((item) => {
      const birthDate = item.text.birthDate; // Format: "kun-oy"
      console.log(todayFormatted);
      return birthDate === todayFormatted;
    });
  }, [greeting, todayFormatted]);

  // Memorized menu items for better performance
  const menuItems = useMemo(
    () =>
      menus.map((menu) => (
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
      )),
    [activeMenu]
  );

  // Improved image preloading with priority and cancelation
  const preloadImages = useCallback((imageUrls) => {
    const visibleImages = imageUrls.slice(0, 5);

    visibleImages.forEach((url) => {
      if (!imagesLoadedRef.current[url]) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          imagesLoadedRef.current[url] = true;
        };
      }
    });

    setTimeout(() => {
      const remainingImages = imageUrls.slice(5);
      remainingImages.forEach((url) => {
        if (!imagesLoadedRef.current[url]) {
          const img = new Image();
          img.loading = "lazy";
          img.src = url;
          img.onload = () => {
            imagesLoadedRef.current[url] = true;
          };
        }
      });
    }, 1000);
  }, []);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (goToTimeoutRef.current) clearTimeout(goToTimeoutRef.current);
    };
  }, []);

  // Load images for active menu with debouncing
  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      try {
        setImages([]);
        const storedImages = await getImages(activeMenu);
        const sortedImages = [...storedImages].sort((a, b) => {
          return a.size && b.size ? a.size - b.size : 0;
        });

        setImages(sortedImages);
        setPage(0);
        setCurrentIndex(0);

        preloadImages(sortedImages.map((img) => img.image));

        if (carouselRef.current) {
          if (loadingTimeoutRef.current)
            clearTimeout(loadingTimeoutRef.current);

          loadingTimeoutRef.current = setTimeout(() => {
            if (carouselRef.current) {
              carouselRef.current.goTo(0, false);
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
  }, [activeMenu, preloadImages]);

  // Birinchi render paytida carouselni to'g'rilash - optimallashtirilgan
  useEffect(() => {
    if (carouselRef.current && images.length > 0) {
      if (goToTimeoutRef.current) clearTimeout(goToTimeoutRef.current);

      goToTimeoutRef.current = setTimeout(() => {
        carouselRef.current.goTo(0, false);
      }, 100);
    }
  }, [images.length]);

  // Tabrik ma'lumotlarini olish - memoized greeting fetch
  useEffect(() => {
    const controller = new AbortController();

    const loadGreeting = async () => {
      try {
        const storedGreetings = await getGreetings();
        if (storedGreetings && storedGreetings.length > 0) {
          setGreeting(storedGreetings);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Tabrikni olishda xatolik:", error);
        }
      }
    };

    loadGreeting();

    return () => {
      controller.abort();
    };
  }, []);

  // O'ZGARTIRILGAN QISM: Slayderda ko'rinadigan rasmchalarni hisoblash
  const { totalPages, visibleThumbnails, startIndex, endIndex } =
    useMemo(() => {
      const totalPages = Math.ceil(images.length / itemsPerPage);
      const centerIndex = currentIndex;
      const halfItemCount = Math.floor(itemsPerPage / 2);
      let startIndex = Math.max(0, centerIndex - halfItemCount);
      let endIndex = Math.min(images.length - 1, startIndex + itemsPerPage - 1);

      if (endIndex - startIndex + 1 < itemsPerPage && startIndex > 0) {
        startIndex = Math.max(0, endIndex - itemsPerPage + 1);
      }

      const visibleThumbnails = images.slice(startIndex, endIndex + 1);

      return { totalPages, visibleThumbnails, startIndex, endIndex };
    }, [images, currentIndex, itemsPerPage]);

  // Joriy slide o'zgarganda page ni yangilash - optimallashtirilgan
  useEffect(() => {
    const targetPage = Math.floor(currentIndex / itemsPerPage);
    if (page !== targetPage) {
      setPage(targetPage);
    }
  }, [currentIndex, itemsPerPage, page]);

  // Carousel settings with optimized performance
  const carouselSettings = useMemo(
    () => ({
      beforeChange: (_, next) => {
        setCurrentIndex(next);
      },
      afterChange: (current) => {
        setCurrentIndex(current);
      },
      speed: 500,
      autoplay: images.length > 1,
      autoplaySpeed: 3000,
      dots: false,
      effect: "fade",
      lazyLoad: "ondemand",
      easing: "linear",
    }),
    [images.length]
  );

  // Optimized thumbnail click handler
  const handleThumbnailClick = useCallback((absoluteIndex) => {
    if (carouselRef.current) {
      carouselRef.current.goTo(absoluteIndex, false);
    }
  }, []);

  // O'ZGARTIRILGAN QISM: Navigatsiya tugmalarini yangilash
  const handlePrevPage = useCallback(() => {
    const newStartIndex = Math.max(0, startIndex - Math.ceil(itemsPerPage / 2));
    if (carouselRef.current) {
      carouselRef.current.goTo(newStartIndex, false);
    }
  }, [startIndex, itemsPerPage]);

  const handleNextPage = useCallback(() => {
    const newStartIndex = Math.min(
      images.length - 1,
      startIndex + Math.ceil(itemsPerPage / 2)
    );
    if (carouselRef.current) {
      carouselRef.current.goTo(newStartIndex, false);
    }
  }, [startIndex, itemsPerPage, images.length]);

  // O'ZGARTIRILGAN QISM: Rasmchalarni ko'rsatish funksiyasini yangilash
  const renderThumbnails = useCallback(() => {
    if (!visibleThumbnails || visibleThumbnails.length === 0) return null;

    return (
      <div className="flex space-x-3">
        {visibleThumbnails.map((img, index) => {
          const absoluteIndex = index + startIndex;
          return (
            <div
              key={absoluteIndex}
              style={{
                width: "64px",
                height: "48px",
                backgroundImage: `url(${img.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "0.375rem",
                cursor: "pointer",
                transition: "all 0.2s",
                opacity: currentIndex === absoluteIndex ? 1 : 0.5,
                boxShadow:
                  currentIndex === absoluteIndex ? "0 0 0 3px #3b82f6" : "none",
              }}
              onClick={() => handleThumbnailClick(absoluteIndex)}
            />
          );
        })}
      </div>
    );
  }, [visibleThumbnails, startIndex, currentIndex, handleThumbnailClick]);

  // Optimized carousel content rendering
  const renderCarouselContent = useCallback(() => {
    if (loading) {
      return (
        <div className="w-full h-[400px] flex items-center justify-center">
          <div className="text-xl font-semibold text-gray-500">
            Rasmlar yuklanmoqda...
          </div>
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="w-full h-[400px] flex items-center justify-center text-gray-400 text-xl font-semibold border-2 border-dashed border-gray-300 rounded-md">
          Rasmlar yuklanmagan
        </div>
      );
    }

    return (
      <div className="carousel-container" style={{ overflow: "hidden" }}>
        <Carousel ref={carouselRef} {...carouselSettings}>
          {images.map((img, index) => (
            <div key={index} className="w-full flex justify-center">
              <div
                style={{
                  width: "700px",
                  height: "500px",
                  backgroundImage: `url(${img.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "0.375rem",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                loading="lazy"
              />
            </div>
          ))}
        </Carousel>

        {images.length > 0 && !loading && (
          <div className="flex items-center justify-center mt-4 space-x-3 relative">
            {renderThumbnails()}

            <button
              onClick={handlePrevPage}
              className="absolute left-5"
              disabled={startIndex === 0}
              style={{ opacity: startIndex === 0 ? 0.5 : 1 }}
            >
              <i className="bi bi-chevron-left text-xl"></i>
            </button>
            <button
              onClick={handleNextPage}
              className="absolute right-5"
              disabled={endIndex >= images.length - 1}
              style={{ opacity: endIndex >= images.length - 1 ? 0.5 : 1 }}
            >
              <i className="bi bi-chevron-right text-xl"></i>
            </button>
          </div>
        )}
      </div>
    );
  }, [
    loading,
    images,
    carouselSettings,
    handlePrevPage,
    handleNextPage,
    renderThumbnails,
    startIndex,
    endIndex,
  ]);

  // Optimized greeting card rendering
  const renderGreetingCard = useMemo(() => {
    return (
      <div className="bg-white w-100 h-100 p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-center mb-4">
          Bugungi tavalludlar
        </h2>
        {todaysGreetings.length > 0 ? (
          todaysGreetings.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center mb-4 p-4 bg-gray-50 rounded-lg shadow-sm"
            >
              <img
                src={item.text.image}
                alt="userImage"
                className="w-24 h-24 rounded-full border-4 border-blue-200 shadow-md"
                loading="lazy"
              />
              <p className="mt-2 text-lg font-medium">
                {item.text.firstName} {item.text.lastName}
              </p>
              <p className="text-sm text-gray-500">{item.text.birthDate}</p>
              <p>
                Hurmatli {item.text.firstName}
                {item.text.lastName} sizni bugungi tugulgan kuningiz bilan
                tabriklaymiz🎉🎉
              </p>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            Bugun tavallud topganlar yo'q.
          </div>
        )}
      </div>
    );
  }, [todaysGreetings]);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex flex-col bg-gray-50 min-h-screen">
              <link rel="stylesheet" href={BOOTSTRAP_ICONS_CDN} />
              <div className="w-full text-center py-4 bg-gray-800 text-white text-3xl shadow-md">
                Banner
              </div>
              <div className="flex flex-1 p-4">
                <div className="w-1/4 bg-white p-3 rounded-xl shadow-lg">
                  <ul className="space-y-3">{menuItems}</ul>
                </div>
                <div className="w-1/2 flex flex-col items-center px-6">
                  <div className="w-full bg-white p-2 rounded-xl shadow-lg relative">
                    {renderCarouselContent()}
                  </div>
                </div>
                <div className="w-1/4 flex items-center justify-center">
                  {renderGreetingCard}
                </div>
              </div>
              <footer className="text-center py-3 bg-gray-800 text-white shadow-md mt-auto">
                <p>Footer Text</p>
              </footer>
            </div>
          }
        />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
};

export default App;
