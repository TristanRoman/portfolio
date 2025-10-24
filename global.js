/*console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Step 2: automatic current-page link
const navLinks = $$("nav a");

let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);

if (currentLink) {
  currentLink.classList.add("current");
}
*/
console.log("IT’S ALIVE!");

// Step 3 — Automatic navigation menu (concise)

const PAGES = [
  { url: "",                    title: "Home" },
  { url: "resume.html",         title: "Resume" },
  { url: "projectwork.html",    title: "Project Work" },
  { url: "future_goals.html",   title: "Future Goals" },
  { url: "https://github.com/TristanRoman/portfolio", title: "Github" },
  { url: "contact/contact.html",title: "Contact Me" },
];

// Local vs GitHub Pages base path
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"                 // Live Server / local
    : "/portfolio/";      // <-- your GitHub Pages repo name

// Create the nav and insert at the top of <body>
const nav = document.createElement("nav");
nav.className = "navbar";
document.body.prepend(nav);

// Build links
for (const p of PAGES) {
  let href = p.url;
  if (!href.startsWith("http")) href = BASE_PATH + href; // prefix internal links

  const a = document.createElement("a");
  a.href = href;
  a.textContent = p.title;

  // open external links in a new tab
  if (!a.href.startsWith(location.origin)) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }


  // highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  nav.append(a);
}

// ---------- Step 4: Dark mode switch ----------
// After you've created/inserted `nav` and added the <a> links…
const schemeUI = `
  <label class="color-scheme" id="theme-switcher">
    Theme:
    <select id="color-scheme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`;
// Put the switcher INSIDE the nav
nav.insertAdjacentHTML("beforeend", schemeUI);

const select = document.querySelector("#color-scheme-select");

function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
  localStorage.colorScheme = value;
}
const saved = localStorage.colorScheme;
const initial = saved || "light dark";
setColorScheme(initial);
select.value = initial;
select.addEventListener("input", (e) => setColorScheme(e.target.value));

// global.js
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch projects: ${response.statusText}`);
    return await response.json();
  } catch (err) {
    console.error('Error fetching or parsing JSON data:', err);
    return [];
  }
}

// global.js (add after fetchJSON)
export function renderProjects(projects, container, headingLevel = 'h3') {
  if (!container) return;

  // find or use existing <ul class="tilesWrap">
  const ul =
    container.matches('ul.tilesWrap')
      ? container
      : container.querySelector('ul.tilesWrap') || container;

  ul.innerHTML = '';

  projects.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <h2>${p.acronym || ''}</h2>
      <${headingLevel}>${p.title || ''}</${headingLevel}>
      <p>${p.description || ''}</p>
      ${p.link ? `<a href="${p.link}" target="_blank" class="view_buttons">View</a>` : ''}
    `;
    ul.appendChild(li);
  });
}
// Fetch public GitHub user data
export async function fetchGitHubData(username) {
  // Reuse your fetchJSON helper
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}


