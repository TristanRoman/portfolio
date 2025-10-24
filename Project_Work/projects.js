// /Project_Work/projects.js
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json'); // <-- fix path

// render Project Management (PM)
renderProjects(
  projects.filter(p => p.acronym === 'PM'),
  document.querySelector('.project_management_grid .tilesWrap'),
  'h3'
);

// render Business Communication (BC)
renderProjects(
  projects.filter(p => p.acronym === 'BC'),
  document.querySelector('.business_communication_grid .tilesWrap'),
  'h3'
);

// optional: count total
const titleEl = document.querySelector('.projects-title');
if (titleEl) titleEl.textContent = `Projects (${projects.length})`;
