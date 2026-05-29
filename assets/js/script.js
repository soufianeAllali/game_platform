const searchInput = document.querySelector("#searchInput");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const cards = [...document.querySelectorAll(".game-card")];
const emptyState = document.querySelector("#emptyState");
const pageLoader = document.querySelector("#pageLoader");
const installAppButton = document.querySelector("#installAppButton");

let activeFilter = "all";
let deferredInstallPrompt = null;

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
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

if (installAppButton) {
  window.addEventListener("beforeinstallprompt", (event) => {
    if (isStandaloneApp()) return;

    event.preventDefault();
    deferredInstallPrompt = event;
    installAppButton.hidden = false;
  });

  installAppButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;

    installAppButton.hidden = true;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installAppButton.hidden = true;
  });
}
