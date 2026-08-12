
console.log("IT’S ALIVE!");



const PAGES = [
  { url: "",                    title: "Home" },
  { url: "resume.html",         title: "Resume" },
  { url: "projectwork.html",    title: "Project Work" },
  { url: "future_goals.html",   title: "Future Goals" },
  { url: "https://github.com/TristanRoman/portfolio", title: "Github" },
  { url: "contact/contact.html",title: "Contact Me" },
  { url: "project2_report.html",title: "Project 2" },
  { url: "meta/index.html",title: "Meta" },
];

// Local vs GitHub Pages base path
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"                 // Live Server / local
    : "/portfolio/";      // <-- GitHub Pages repo name

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

// ------------------ Data helpers ------------------

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

/**
 * Render an array of project objects into a container (usually a <ul class="tilesWrap">).
 * Shows title, description, and YEAR (if present).
 * @param {Array<Object>} projects
 * @param {HTMLElement} container  ul.tilesWrap or a parent that contains one
 * @param {string} headingLevel    e.g., 'h2'|'h3'
 */
export function renderProjects(projects, container, headingLevel = 'h3') {
  if (!container) return;

  // Find an existing <ul class="tilesWrap"> inside the container
  let ul = container.matches('ul.tilesWrap')
    ? container
    : container.querySelector('ul.tilesWrap');

  // If none exists, create one (DON'T wipe the container!)
  if (!ul) {
    ul = document.createElement('ul');
    ul.className = 'tilesWrap';
    container.appendChild(ul);
  }

  // Rebuild the list items
  ul.innerHTML = '';

  (projects || []).forEach((p) => {
    const li = document.createElement('li');

    // Optional acronym header
    if (p.acronym) {
      const h2 = document.createElement('h2');
      h2.textContent = p.acronym;
      li.appendChild(h2);
    }

    // Title
    const title = document.createElement(headingLevel);
    title.className = 'project-title';
    title.textContent = p.title || '';
    li.appendChild(title);

    // Description
    const desc = document.createElement('p');
    desc.className = 'project-desc';
    desc.textContent = p.description || '';
    li.appendChild(desc);

    // Year
    if (p.year) {
      const yr = document.createElement('p');
      yr.className = 'project-year';
      yr.style.cssText = 'color:#666;font-variant-numeric:oldstyle-nums;';
      yr.textContent = String(p.year);
      li.appendChild(yr);
    }

    // Link button (supports p.link or p.url)
    const linkHref = p.link || p.url;
    if (linkHref) {
      const a = document.createElement('a');
      a.href = linkHref;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'view_buttons';
      a.textContent = 'View';
      li.appendChild(a);
    }

    // Optional GitHub link button
    if (p.github) {
      const gh = document.createElement('a');
      gh.href = p.github;
      gh.target = '_blank';
      gh.rel = 'noopener noreferrer';
      gh.className = 'view_buttons';
      gh.textContent = 'GitHub';
      li.appendChild(gh);
    }

    ul.appendChild(li);
  });
}

// Fetch public GitHub user data
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}

/* No stray top-level code here. */
