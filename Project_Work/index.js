import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

const all = await fetchJSON('./lib/projects.json');
renderProjects(all.slice(0, 3), document.querySelector('.projects'), 'h3');

// --- GitHub profile stats ---
const username = 'TristanRoman'; // <-- your real username
const githubData = await fetchGitHubData(username);
console.log('GitHub data for', username, githubData); // debug

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  if (githubData && !githubData.message) {
    profileStats.innerHTML = `
      <h3>GitHub Profile</h3>
      <dl class="gh-stats">
        <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers</dt><dd>${githubData.followers}</dd>
        <dt>Following</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  } else {
    // Fallback UI if API fails or rate-limits
    const msg = githubData?.message || 'Unable to load GitHub data.';
    profileStats.innerHTML = `
      <h3>GitHub Profile</h3>
      <p>${msg}</p>
    `;
  }
}
