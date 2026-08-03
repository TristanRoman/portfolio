// Project_Work/projects.js
// Prior labs (category grids) + Lab 5 (pie, legend, search, combined filters)

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

// --------------------------- Data load ---------------------------
// fetch() resolves relative to the page URL (not this script's location),
// and projectwork.html lives at the repo root alongside lib/.
const projects = await fetchJSON('./lib/projects.json');

// -------------------- Stable color scale (by YEAR) --------------------
// Build a stable domain from the FULL dataset (not filtered)
const ALL_YEARS = Array.from(new Set(projects.map(p => String(p.year)))).sort();

// Create a range with enough colors for all years (cycle if needed)
const BASE = d3.schemeTableau10;
const range = Array.from({ length: ALL_YEARS.length }, (_, i) => BASE[i % BASE.length]);

// One color scale, defined ONCE, keyed by label (year)
const colors = d3.scaleOrdinal().domain(ALL_YEARS).range(range);

// --------------------- Prior labs: category lists ----------------
function renderCategoryGrids() {
  // Project Management (PM)
  const pmUL = document.querySelector('.project_management_grid .tilesWrap');
  if (pmUL) {
    renderProjects(
      projects.filter((p) => p.acronym === 'PM'),
      pmUL,
      'h3'
    );
  }

  // Business Communication (BC)
  const bcUL = document.querySelector('.business_communication_grid .tilesWrap');
  if (bcUL) {
    renderProjects(
      projects.filter((p) => p.acronym === 'BC'),
      bcUL,
      'h3'
    );
  }

  // Data Science (DS)
  const dsUL = document.querySelector('.data_science_grid .tilesWrap');
  if (dsUL) {
    const ds = projects.filter((p) => p.acronym === 'DS');
    dsUL.innerHTML = '';
    if (ds.length) renderProjects(ds, dsUL, 'h3');
  }

  // Optional: update a title counter if present
  const titleEl = document.querySelector('.projects-title');
  if (titleEl) titleEl.textContent = `Projects (${projects.length})`;
}
renderCategoryGrids();

// ---------------------- Lab 5: pie + legend + search -------------
const labSection = document.querySelector('#lab5');
const svg    = labSection ? d3.select('#projects-pie-plot') : null;
const legend = labSection ? d3.select('.legend') : null;
const searchInput = labSection
  ? (document.querySelector('#project-search') || document.querySelector('#lab5 .searchBar'))
  : null;
// IMPORTANT: standard cards UL so CSS is reused
const labList = labSection ? document.querySelector('#lab5-tiles') : null;

// State
let query = '';
let selectedIndex = -1; // none
let currentData = [];   // [{label: year, value: count}]

// ----------------------------- Helpers -----------------------------
function rollProjectsByYear(arr) {
  const rolled = d3.rollups(arr, (v) => v.length, (d) => d.year);
  rolled.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return rolled.map(([year, count]) => ({ label: String(year), value: count }));
}

function computeVisible() {
  const q = query.trim().toLowerCase();
  let base =
    q === ''
      ? projects
      : projects.filter((p) => {
          const blob = Object.values(p).join('\n').toLowerCase();
          return blob.includes(q);
        });

  if (selectedIndex !== -1 && currentData[selectedIndex]) {
    const yr = currentData[selectedIndex].label;
    base = base.filter((p) => String(p.year) === String(yr));
  }
  return base;
}

// --------------------------- Rendering ----------------------------
function renderPieChart(projectsArr) {
  if (!svg || !legend) return;

  currentData = rollProjectsByYear(projectsArr);

  // clear previous
  svg.selectAll('*').remove();
  legend.selectAll('li').remove();

  if (currentData.length === 0) {
    // neutral placeholder so block keeps its height
    svg.append('circle').attr('r', 50).attr('fill', '#2a2a2a');
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#aaaaaa')
      .style('font-size', '7px')
      .text('No data');
    return;
  }

  const arcGen   = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGen = d3.pie().value((d) => d.value);
  const arcData  = sliceGen(currentData);
  const arcs     = arcData.map((d) => arcGen(d));

  // Draw arcs (key color by LABEL/YEAR, not by index)
  arcs.forEach((dAttr, i) => {
    const yearLabel = currentData[i].label;
    svg.append('path')
      .attr('d', dAttr)
      .attr('fill', colors(yearLabel))
      .attr('class', i === selectedIndex ? 'selected' : null)
      .on('click', () => {
        // toggle selection
        selectedIndex = (selectedIndex === i) ? -1 : i;
        const vis = computeVisible();
        if (labList) renderProjects(vis, labList, 'h3');
        // re-render the whole pie/legend from filtered set
        renderPieChart(projects);
      });
  });

  // Legend (also keyed by LABEL/YEAR)
  currentData.forEach((item, i) => {
    legend.append('li')
      .attr('style', `--color:${colors(item.label)}`)
      .attr('class', i === selectedIndex ? 'selected' : null)
      .html(`<span class="swatch"></span> ${item.label} <em>(${item.value})</em>`)
      .on('click', () => {
        selectedIndex = (selectedIndex === i) ? -1 : i;
        const vis = computeVisible();
        if (labList) renderProjects(vis, labList, 'h3');
        renderPieChart(vis);

      });
  });
}

// -------- initial render (ORDER MATTERS) --------
if (labSection) {
  // 1) pie first → initializes currentData
  renderPieChart(projects);

  // 2) now compute + render cards (uses your existing tiles CSS)
  const initialVisible = computeVisible();
  if (labList) renderProjects(initialVisible, labList, 'h3');

  // 3) search behavior
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      query = e.target.value || '';
      const vis = computeVisible();
      if (labList) renderProjects(vis, labList, 'h3');
      renderPieChart(projects);
    });
  }
}
