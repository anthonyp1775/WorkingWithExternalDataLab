import * as Carousel from "./Carousel.js";

// The breed selection input element.
const breedSelect = document.getElementById("breedSelect");
// The information section div element.
const infoDump = document.getElementById("infoDump");
// The progress bar div element.
const progressBar = document.getElementById("progressBar");
// The get favourites button element.
const getFavouritesBtn = document.getElementById("getFavouritesBtn");

// Step 0: Store your API key here for reference and easy access.
const API_KEY = "live_j21ERpzBbARMakGExSv2IVakPqtXsZ9SPvrE3Y0yElPpxmw6W2eexouAy6nobxbp";

axios.defaults.baseURL = "https://api.thecatapi.com/v1";
axios.defaults.headers.common["x-api-key"] = API_KEY;

let breeds = [];

/**
 * 1. initialLoad async function using Axios
 */
async function initialLoad() {
  try {
    const response = await axios.get("/breeds");
    breeds = response.data;

    breeds.forEach((breed) => {
      const option = document.createElement("option");
      option.value = breed.id;
      option.textContent = breed.name;
      breedSelect.append(option);
    });

    await getBreedInfo();
  } catch (error) {
    console.error("Error during initial load:", error);
  }
}


/**
 * 2. Event logic and dynamic structures
 */
function createInfoDump(breed) {
  infoDump.innerHTML = "";
  if (!breed) return;

  const title = document.createElement("h3");
  title.textContent = breed.name;

  const description = document.createElement("p");
  description.textContent = breed.description || "No description available.";

  const list = document.createElement("ul");
  const facts = [
    ["Origin", breed.origin],
    ["Temperament", breed.temperament],
    ["Life Span", breed.life_span ? `${breed.life_span} years` : undefined],
    ["Wikipedia", breed.wikipedia_url],
  ];
  facts.forEach(([label, value]) => {
    if (!value) return;
    const item = document.createElement("li");
    if (label === "Wikipedia") {
      const link = document.createElement("a");
      link.href = value;
      link.target = "_blank";
      link.textContent = "Wiki Article";
      item.textContent = `${label}: `;
      item.appendChild(link);
    } else {
      item.textContent = `${label}: ${value}`;
    }
    list.append(item);
  });

  infoDump.append(title, description, list);
}

function populateCarousel(images) {
  Carousel.clear();

  if (!images || images.length === 0) {
    // Fallback if a breed (like Malayan) has zero images attached to it
    const fallbackItem = Carousel.createCarouselItem(
      "https://via.placeholder.com/600x400?text=No+Image+Available",
      "No image available",
      ""
    );
    Carousel.appendCarousel(fallbackItem);
    return;
  }

  images.forEach((image) => {
    const carouselItem = Carousel.createCarouselItem(
      image.url,
      image.breeds?.[0]?.name || "Cat image",
      image.id
    );
    Carousel.appendCarousel(carouselItem);
  });

  Carousel.start();
}

async function getBreedInfo() {
  const breedId = breedSelect.value;
  if (!breedId) return;

  try {
    const response = await axios.get("/images/search", {
      params: { breed_ids: breedId, limit: 10 },
      onDownloadProgress: updateProgress,
    });
    const images = response.data;

    populateCarousel(images);
    createInfoDump(breeds.find((breed) => breed.id === breedId));
  } catch (error) {
    console.error("Error retrieving breed info:", error);
  }
}

breedSelect.addEventListener("change", getBreedInfo);

/**
 * 5 & 7. Axios Interceptors for Timing, Progress Cursors, and Reset
 */
axios.interceptors.request.use((config) => {
  console.log(`Starting request to ${config.url}`);
  config.metadata = { startTime: new Date() };
  progressBar.style.width = "0%";
  document.body.style.cursor = "progress";
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const elapsed = new Date() - response.config.metadata.startTime;
    console.log(`Request to ${response.config.url} took ${elapsed}ms`);
    document.body.style.cursor = "default";
    progressBar.style.width = "100%";
    return response;
  },
  (error) => {
    document.body.style.cursor = "default";
    progressBar.style.width = "0%";
    console.error("API error intercepted:", error);
    return Promise.reject(error);
  }
);

/**
 * 6. Progress Bar Function with safe layout measurement fallback
 */
function updateProgress(progressEvent) {
  if (progressEvent.lengthComputable && progressEvent.total) {
    const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
    progressBar.style.width = `${percent}%`;
  } else {
    progressBar.style.width = "75%";
  }
}

/**
 * 8. Dynamic Toggle Favourites Logic
 */
export async function favourite(imgId) {
  if (!imgId) return;
  try {
    const response = await axios.get("/favourites");
    const existingFavourite = response.data.find(
      (fav) => fav.image_id === imgId
    );

    if (existingFavourite) {
      await axios.delete(`/favourites/${existingFavourite.id}`);
      console.log(`Removed favorite: ${imgId}`);
    } else {
      await axios.post("/favourites", { image_id: imgId });
      console.log(`Added favorite: ${imgId}`);
    }
  } catch (error) {
    console.error("Error updating favourites:", error);
  }
}

/**
 * 9. Get Favourites View Construction
 */
async function getFavourites() {
  try {
    const response = await axios.get("/favourites");
    // Extract the internal nested image object from the favourite format
    const images = response.data.map((fav) => fav.image).filter(Boolean);

    populateCarousel(images);
    infoDump.innerHTML = "<h3>Your Favorited Collection</h3><p>Showing your selected favorites from the API account.</p>";
  } catch (error) {
    console.error("Error retrieving favourites:", error);
  }
}

getFavouritesBtn.addEventListener("click", getFavourites);

initialLoad();
