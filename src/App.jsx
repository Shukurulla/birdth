import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Carousel } from "antd";
import { getImages, getGreetings, getVideos } from "./db";
import "antd/dist/reset.css";
import { Route, Routes } from "react-router-dom";
import Admin from "./admin";
import moment from "moment/moment";
import banner from "../public/banner.png";
import Ad from "./ad";

const BOOTSTRAP_ICONS_CDN =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css";

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

// TV size constants (200cm × 123cm converted to viewport units)
const TV_ASPECT_RATIO = 200 / 123;

const App = () => {
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [activeMenu, setActiveMenu] = useState("menu1");
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const itemsPerPage = 7;
  const [greeting, setGreeting] = useState([]);
  const carouselRef = useRef(null);
  const imagesLoadedRef = useRef({});
  const loadingTimeoutRef = useRef(null);
  const goToTimeoutRef = useRef(null);

  const today = new Date();
  const todayFormatted = moment(today).format("YYYY-MM-DD");

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate responsive font size based on screen width
  const getFontSize = (baseSize) => {
    const scaleFactor = screenSize.width / 1920; // Assuming 1920px as reference width
    return Math.max(baseSize * scaleFactor, baseSize * 0.7); // Don't go below 70% of base size
  };

  // Calculate scaling for elements
  const getScale = useCallback(() => {
    const widthScale = screenSize.width / 1920;
    const heightScale = screenSize.height / 1080;
    return Math.min(widthScale, heightScale);
  }, [screenSize]);

  const todaysGreetings = useMemo(() => {
    return greeting.filter((item) => {
      const birthDate = item.text.birthDate;
      return birthDate === todayFormatted;
    });
  }, [greeting, todayFormatted]);

  const menuItems = useMemo(
    () =>
      menus.map((menu) => (
        <li
          key={menu}
          className={` flex items-center justify-between rounded-lg font-medium cursor-pointer text-white transition-all ${
            activeMenu === menu
              ? "bg-[#ffffff62] hover:bg-[#ffffff49] "
              : "hover:bg-[#ffffff49] bg-[#ffffff25]"
          }`}
          style={{
            fontSize: `${getFontSize(1.1)}rem`,
            padding: `${getFontSize(0.7)}rem`,
            marginBottom: `${getFontSize(0.4)}rem`,
          }}
          onClick={() => setActiveMenu(menu)}
        >
          <span>{menu.charAt(0).toUpperCase() + menu.slice(1)}</span>
          <i
            className="bi bi-chevron-right"
            style={{ fontSize: `${getFontSize(1.2)}rem` }}
          ></i>
        </li>
      )),
    [activeMenu, screenSize]
  );

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

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (goToTimeoutRef.current) clearTimeout(goToTimeoutRef.current);
    };
  }, []);

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
    if (carouselRef.current && images.length > 0) {
      if (goToTimeoutRef.current) clearTimeout(goToTimeoutRef.current);

      goToTimeoutRef.current = setTimeout(() => {
        carouselRef.current.goTo(0, false);
      }, 100);
    }
  }, [images.length]);

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

  useEffect(() => {
    const targetPage = Math.floor(currentIndex / itemsPerPage);
    if (page !== targetPage) {
      setPage(targetPage);
    }
  }, [currentIndex, itemsPerPage, page]);

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

  const videoCarouselSettings = useMemo(
    () => ({
      beforeChange: (_, next) => {
        setCurrentIndex(next);
      },
      afterChange: (current) => {
        setCurrentIndex(current);
      },
      speed: 500,
      autoplay: videos.length > 1,
      autoplaySpeed: 3000,
      dots: false,
      effect: "fade",
      lazyLoad: "ondemand",
      easing: "linear",
    }),
    [videos.length]
  );

  const handleThumbnailClick = useCallback((absoluteIndex) => {
    if (carouselRef.current) {
      carouselRef.current.goTo(absoluteIndex, false);
    }
  }, []);

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

  const scale = getScale();
  const thumbnailSize = useMemo(() => {
    return {
      width: Math.round(64 * scale),
      height: Math.round(48 * scale),
    };
  }, [scale]);

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
                width: `${thumbnailSize.width}px`,
                height: `${thumbnailSize.height}px`,
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
  }, [
    visibleThumbnails,
    startIndex,
    currentIndex,
    handleThumbnailClick,
    thumbnailSize,
  ]);

  const renderCarouselContent = useCallback(() => {
    if (loading) {
      return (
        <div
          className="w-full flex items-center justify-center"
          style={{ height: `${Math.round(600 * scale)}px` }}
        >
          <div
            className="font-semibold text-gray-500"
            style={{ fontSize: `${getFontSize(1.2)}rem` }}
          >
            Rasmlar yuklanmoqda...
          </div>
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div
          className="w-full flex items-center justify-center text-gray-400 font-semibold border-2 border-dashed border-gray-300 rounded-md"
          style={{
            height: `${Math.round(800 * scale)}px`,
            fontSize: `${getFontSize(1.2)}rem`,
          }}
        >
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
                  width: "100%",
                  height: `${Math.round(700 * scale)}px`,
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
          <div className="flex w-[80%] mx-auto items-center justify-center mt-4 space-x-3 relative">
            {renderThumbnails()}

            <button
              onClick={handlePrevPage}
              className="absolute left-5"
              disabled={startIndex === 0}
              style={{
                opacity: startIndex === 0 ? 0.5 : 1,
                fontSize: `${getFontSize(1.5)}rem`,
              }}
            >
              <i className="bi text-white bi-chevron-left"></i>
            </button>
            <button
              onClick={handleNextPage}
              className="absolute right-5"
              disabled={endIndex >= images.length - 1}
              style={{
                opacity: endIndex >= images.length - 1 ? 0.5 : 1,
                fontSize: `${getFontSize(1.5)}rem`,
              }}
            >
              <i className="bi text-white bi-chevron-right"></i>
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
    scale,
  ]);

  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);
  const [videoLoading, setVideoLoading] = useState({});

  const renderVideoCarouselContent = useCallback(() => {
    if (loading) {
      return (
        <div
          className="w-full flex items-center justify-center"
          style={{ height: `${Math.round(800 * scale)}px` }}
        >
          <div
            className="font-semibold text-gray-500"
            style={{ fontSize: `${getFontSize(1.2)}rem` }}
          >
            Videolar yuklanmoqda...
          </div>
        </div>
      );
    }

    if (videos.length === 0) {
      return (
        <div
          className="w-full flex items-center justify-center text-gray-400 font-semibold border-2 border-dashed border-gray-300 rounded-md"
          style={{
            height: `${Math.round(800 * scale)}px`,
            fontSize: `${getFontSize(1.2)}rem`,
          }}
        >
          Videolar yuklanmagan
        </div>
      );
    }

    const handleBeforeChange = (current, next) => {
      const videoElements = document.querySelectorAll("video");
      if (videoElements[current]) {
        videoElements[current].pause();
        videoElements[current].currentTime = 0;
      }
    };

    const updatedVideoCarouselSettings = {
      ...videoCarouselSettings,
      beforeChange: handleBeforeChange,
      autoplay: false,
    };

    const preloadVideo = (index) => {
      // Only preload the current video and the next one
      if (
        index === currentPlayingIndex ||
        index === (currentPlayingIndex + 1) % videos.length
      ) {
        return "auto";
      }
      return "metadata"; // Only load metadata for other videos
    };

    return (
      <div
        className="carousel-container video-slider"
        style={{ overflow: "hidden" }}
      >
        <Carousel ref={carouselRef} {...updatedVideoCarouselSettings}>
          {videos.map((video, index) => (
            <div key={index} className="w-full flex justify-center">
              {/* Loading indicator for videos */}
              {videoLoading[index] && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    className="border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
                    style={{
                      width: `${Math.round(40 * scale)}px`,
                      height: `${Math.round(30 * scale)}px`,
                    }}
                  ></div>
                </div>
              )}

              <video
                src={video.video}
                className="w-full object-cover rounded-md"
                style={{ height: `${Math.round(640 * scale)}px` }}
                controls
                autoPlay={true}
                preload={preloadVideo(index)}
                data-index={index}
                onLoadStart={() => {
                  setVideoLoading((prev) => ({ ...prev, [index]: true }));
                }}
                onCanPlay={() => {
                  setVideoLoading((prev) => ({ ...prev, [index]: false }));
                }}
                onPlay={() => {
                  const videoElements = document.querySelectorAll("video");
                  videoElements.forEach((el, i) => {
                    if (i !== index && !el.paused) {
                      el.pause();
                      el.currentTime = 0;
                    }
                  });
                  setCurrentPlayingIndex(index);
                }}
                onEnded={() => {
                  if (carouselRef.current) {
                    const nextIndex = (index + 1) % videos.length;
                    carouselRef.current.goTo(nextIndex);

                    setTimeout(() => {
                      const nextVideo = document.querySelector(
                        `video[data-index="${nextIndex}"]`
                      );
                      if (nextVideo) {
                        // Start preloading the next video
                        nextVideo.preload = "auto";
                        nextVideo.load();
                        nextVideo.play();
                      }
                    }, 300);
                  }
                  setCurrentPlayingIndex(null);
                }}
                onLoadedMetadata={(e) => {
                  const duration = e.target.duration * 1000;
                  if (carouselRef.current) {
                    carouselRef.current.innerSlider.autoPlaySpeed = duration;
                  }
                }}
              />
            </div>
          ))}
        </Carousel>

        {videos.length > 0 && !loading && (
          <div className="flex items-center justify-center mt-4 space-x-3 relative">
            <div className="flex items-center justify-center space-x-2 max-w-full overflow-x-auto py-2 px-10">
              {videos.map((video, index) => (
                <div
                  key={index}
                  className={`cursor-pointer rounded-md overflow-hidden flex-shrink-0 border-2 ${
                    currentPlayingIndex === index
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                  onClick={() => {
                    const videoElements = document.querySelectorAll("video");
                    videoElements.forEach((video) => {
                      video.pause();
                      video.currentTime = 0;
                    });

                    // Start preloading before switching
                    if (videos[index]) {
                      const selectedVideo = document.querySelector(
                        `video[data-index="${index}"]`
                      );
                      if (selectedVideo) {
                        selectedVideo.preload = "auto";
                        selectedVideo.load();

                        carouselRef.current.goTo(index);

                        // Only play after a short delay to allow for initial loading
                        setTimeout(() => {
                          selectedVideo.play();
                        }, 100);
                      }
                    }
                  }}
                >
                  <img
                    src={
                      video.thumbnail ||
                      `https://via.placeholder.com/100x60/eee/999?text=Video ${
                        index + 1
                      }`
                    }
                    alt={`Video ${index + 1}`}
                    style={{
                      width: `${Math.round(60 * scale * 1.5)}px`,
                      height: `${Math.round(50 * scale * 1.5)}px`,
                    }}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const videoElements = document.querySelectorAll("video");
                videoElements.forEach((video) => {
                  video.pause();
                  video.currentTime = 0;
                });
                handlePrevPage();
              }}
              className="absolute left-5"
              disabled={startIndex === 0}
              style={{
                opacity: startIndex === 0 ? 0.5 : 1,
                fontSize: `${getFontSize(1.5)}rem`,
              }}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <button
              onClick={() => {
                const videoElements = document.querySelectorAll("video");
                videoElements.forEach((video) => {
                  video.pause();
                  video.currentTime = 0;
                });
                handleNextPage();
              }}
              className="absolute right-5"
              disabled={endIndex >= videos.length - 1}
              style={{
                opacity: endIndex >= videos.length - 1 ? 0.5 : 1,
                fontSize: `${getFontSize(1.5)}rem`,
              }}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    );
  }, [
    loading,
    videos,
    videoCarouselSettings,
    handlePrevPage,
    handleNextPage,
    startIndex,
    endIndex,
    currentPlayingIndex,
    videoLoading,
    scale,
  ]);

  const renderGreetingCard = useMemo(() => {
    return (
      <div className="bg-[#ffffff34] border w-100 h-100 p-4 rounded-xl shadow-lg">
        <h2
          className="text-white font-semibold text-center mb-4"
          style={{ fontSize: `${getFontSize(1.5)}rem` }}
        >
          Bugungi tavalludlar
        </h2>
        {todaysGreetings.length > 0 ? (
          <Carousel autoplay autoplaySpeed={4000} dots={false}>
            {todaysGreetings.map((item, index) => (
              <div
                key={index}
                className="flex flex-col text-white items-center mb-4 p-4 bg-[#ffffff34] rounded-lg shadow-sm"
              >
                <img
                  src={item.text.image}
                  alt="userImage"
                  className="mx-auto rounded-full border-4 border-blue-200 shadow-md"
                  style={{
                    width: `${Math.round(78 * scale * 1.5)}px`,
                    height: `${Math.round(78 * scale * 1.5)}px`,
                  }}
                  loading="lazy"
                />
                <p
                  className="mt-2 font-medium"
                  style={{ fontSize: `${getFontSize(1.3)}rem` }}
                >
                  {item.text.firstName} {item.text.lastName}
                </p>
                <p style={{ fontSize: `${getFontSize(1)}rem` }}>
                  {item.text.birthDate}
                </p>
                <p style={{ fontSize: `${getFontSize(1.1)}rem` }}>
                  Hurmatli {item.text.firstName} {item.text.lastName}, sizni
                  bugungi tug'ilgan kuningiz bilan tabriklaymiz🎉🎉
                </p>
              </div>
            ))}
          </Carousel>
        ) : (
          <div
            className="text-center text-gray-400 py-4"
            style={{ fontSize: `${getFontSize(1.1)}rem` }}
          >
            Bugun tavallud topganlar yo'q.
          </div>
        )}
      </div>
    );
  }, [todaysGreetings, scale]);

  const ad = JSON.parse(localStorage.getItem("ad"));

  useEffect(() => {
    function checkAndRemoveExpiredAd() {
      const adData = localStorage.getItem("ad");

      if (adData) {
        const ad = JSON.parse(adData);
        const adDate = new Date(ad.adDate);
        const currentDate = new Date();

        if (adDate + 1 < currentDate) {
          localStorage.removeItem("ad");
          console.log("Eski reklama ma'lumoti o'chirildi.");
        } else {
          console.log("Reklama hali amal qilish muddati tugamagan.");
        }
      } else {
        console.log('LocalStorage da "ad" ma\'lumoti mavjud emas.');
      }
    }

    checkAndRemoveExpiredAd();
  }, []);

  return (
    <div className="">
      <Routes>
        <Route
          path="/"
          element={
            <div
              className="mx-auto"
              style={{
                width: "95%",
                height: "99vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <link rel="stylesheet" href={BOOTSTRAP_ICONS_CDN} />
              <div className="w-full gap-3 pt-2 flex items-start text-center mb-2 text-white ">
                <img
                  src={`https://upload.wikimedia.org/wikipedia/commons/c/c9/Uzbekistan_coa.png`}
                  style={{ height: `${Math.round(110 * scale)}px` }}
                  alt="banner-image"
                />
                <p
                  className="pt-3 font-semibold"
                  style={{ fontSize: `${Math.round(30 * scale)}px` }}
                >
                  5-Sonli maktab
                </p>
              </div>
              <div
                className="flex justify-between"
                style={{ gap: "1%", flex: 1 }}
              >
                <div
                  className="border bg-[#ffffff34] p-2 rounded-xl shadow-lg"
                  style={{ width: "21%" }}
                >
                  <ul className="space-y-2">{menuItems}</ul>
                </div>
                <div
                  className="flex h-100 items-center "
                  style={{ width: "56%" }}
                >
                  <div className="w-full  border bg-[#ffffff34] p-2 rounded-xl shadow-lg relative">
                    {activeMenu === "galereya"
                      ? renderVideoCarouselContent()
                      : renderCarouselContent()}
                  </div>
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{ width: "21%" }}
                >
                  {renderGreetingCard}
                </div>
              </div>
              <div className="pb-2">
                <footer
                  className="text-center py-3 border rounded-lg text-white shadow-md my-2"
                  style={{ fontSize: `${getFontSize(1.2)}rem` }}
                >
                  <div className="w-[90%] mx-auto">
                    <marquee
                      behavior="scroll"
                      direction="left"
                      scrollamount="5"
                    >
                      {ad?.adText}
                    </marquee>
                  </div>
                </footer>
              </div>
            </div>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ad" element={<Ad />} />
      </Routes>
    </div>
  );
};

export default App;
