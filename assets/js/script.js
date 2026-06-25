const searchInput = document.querySelector("#searchInput");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const cards = [...document.querySelectorAll(".game-card")];
const emptyState = document.querySelector("#emptyState");
const pageLoader = document.querySelector("#pageLoader");
const installAppButton = document.querySelector("#installAppButton");
const visitorCount = document.querySelector("#visitorCount");

let activeFilter = "all";
let deferredInstallPrompt = null;

window.wonderPlayPWA = {
  installPromptReady: false,
  serviceWorkerReady: false,
  displayMode: "browser"
};

function filterGames() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach((card) => {
    const title = card.dataset.title.toLowerCase();
    const categories = card.dataset.category;
    const matchesSearch = query === "" || title.includes(query);
    const matchesFilter = activeFilter === "all" || categories.includes(activeFilter);
    const isVisible = matchesSearch && matchesFilter;

    card.classList.toggle("hidden-card", !isVisible);
    if (isVisible) visibleCount += 1;
  });

  emptyState.hidden = visibleCount !== 0;
}

searchInput.addEventListener("input", filterGames);
filterGames();

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    filterGames();
  });
});

async function updateVisitorCounter() {
  if (!visitorCount) return;

  const namespace = "wonderplay-kids-game-hub";
  const key = "unique-visitors";
  const countedKey = "wonderplayVisitorCounted";
  const endpoint = localStorage.getItem(countedKey)
    ? `https://api.countapi.xyz/get/${namespace}/${key}`
    : `https://api.countapi.xyz/hit/${namespace}/${key}`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("Counter request failed.");
    const data = await response.json();
    localStorage.setItem(countedKey, "true");
    visitorCount.textContent = Number(data.value || 0).toLocaleString();
  } catch (error) {
    visitorCount.textContent = "Live";
    console.warn("WonderPlay visitor counter unavailable.", error);
  }
}

updateVisitorCounter();

document.querySelectorAll(".play-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    event.preventDefault();
    pageLoader.classList.add("active");
    window.setTimeout(() => {
      window.location.href = href;
    }, 420);
  });
});

document.querySelectorAll("[data-tilt]").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = ((y / rect.height) - 0.5) * -8;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" })
      .then((registration) => {
        window.wonderPlayPWA.serviceWorkerReady = true;
        console.info("WonderPlay PWA: service worker registered.", registration.scope);
      })
      .catch((error) => {
        console.warn("WonderPlay PWA: service worker registration failed.", error);
      });
  });
} else {
  console.warn("WonderPlay PWA: service workers are not supported in this browser.");
}

if (installAppButton) {
  installAppButton.hidden = true;
  installAppButton.disabled = true;

  window.wonderPlayPWA.displayMode = isStandaloneApp() ? "standalone" : "browser";

  window.addEventListener("beforeinstallprompt", (event) => {
    if (isStandaloneApp()) return;

    event.preventDefault();
    deferredInstallPrompt = event;
    window.wonderPlayPWA.installPromptReady = true;
    installAppButton.hidden = false;
    installAppButton.disabled = false;
    console.info("WonderPlay PWA: install prompt is ready.");
  });

  installAppButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      installAppButton.hidden = true;
      installAppButton.disabled = true;
      console.warn("WonderPlay PWA: install prompt is not available yet.");
      return;
    }

    try {
      installAppButton.disabled = true;
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      console.info("WonderPlay PWA: install prompt result.", choice.outcome);
    } catch (error) {
      console.warn("WonderPlay PWA: install prompt failed.", error);
    } finally {
      deferredInstallPrompt = null;
      window.wonderPlayPWA.installPromptReady = false;
      installAppButton.hidden = true;
      installAppButton.disabled = true;
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.wonderPlayPWA.installPromptReady = false;
    window.wonderPlayPWA.displayMode = "standalone";
    installAppButton.hidden = true;
    installAppButton.disabled = true;
    console.info("WonderPlay PWA: app installed.");
  });
}
