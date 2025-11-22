import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// Lab 8: shared state for filtering + scrollytelling
let rawData;
let allCommits = [];

let commitProgress = 100;
let timeScale;
let commitMaxTime;
let filteredCommits = [];

const colorByType = d3.scaleOrdinal(d3.schemeTableau10);

/* Load + parse CSV */
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

/* Group by commit */
function processCommits(data, repoUrl) {
  return d3
    .groups(data, d => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: `${repoUrl.replace(/\/$/, '')}/commit/${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false,
        enumerable: false,
        writable: false,
      });
      return ret;
    });
}

/* Top summary stats */
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  const add = (label, value) => {
    dl.append('dt').html(label);
    dl.append('dd').text(value);
  };

  add('COMMITS', commits.length);
  add('FILES', d3.groups(data, d => d.file).length);
  add('TOTAL <abbr title="Lines of code">LOC</abbr>', data.length);

  const longestLine = d3.greatest(data, d => d.length);
  add('LONGEST LINE', longestLine?.length ?? 0);

  const maxLinesPerFile = d3.rollups(
    data,
    v => d3.max(v, r => r.line),
    d => d.file
  );
  add('MAX LINES', d3.max(maxLinesPerFile, d => d[1]) ?? 0);

  add('MAX DEPTH', d3.max(data, d => d.depth) ?? 0);
}

/* Tooltip helpers */
function renderTooltipContent(commit) {
  if (!commit) return;
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  time.textContent = commit.datetime?.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}
function updateTooltipVisibility(visible) {
  document.getElementById('commit-tooltip').hidden = !visible;
}
function updateTooltipPosition(event) {
  const t = document.getElementById('commit-tooltip');
  const pad = 14;
  t.style.left = `${event.clientX + pad}px`;
  t.style.top  = `${event.clientY + pad}px`;
}

/* Scatter plot */
function renderScatterPlot(data, commits) {
  const chartEl = document.getElementById('chart');

  const commitsArr = Array.isArray(commits) ? commits : [];
  if (commitsArr.length === 0) {
    d3.select('#chart').html('');
    return;
  }

  const width  = Math.min(1100, chartEl.clientWidth || 1100);
  const height = Math.round(width * 0.56);
  const margin = { top: 10, right: 20, bottom: 40, left: 64 };

  const area = {
    left:   margin.left,
    top:    margin.top,
    right:  width - margin.right,
    bottom: height - margin.bottom,
    width:  width - margin.left - margin.right,
    height: height - margin.top  - margin.bottom
  };

  const svg = d3.select('#chart')
    .html('')
    .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('width', '100%')
      .style('height', 'auto');

  let xDomain = d3.extent(commitsArr, d => d.datetime);
  if (xDomain[0] && xDomain[1] && +xDomain[0] === +xDomain[1]) {
    xDomain = [new Date(xDomain[0] - 6*3600e3), new Date(xDomain[1] + 6*3600e3)];
  }

  const xScale = d3.scaleTime()
    .domain(xDomain)
    .range([area.left, area.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([area.bottom, area.top]);

  const [minLines, maxLines] = d3.extent(commitsArr, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines ?? 0, (maxLines ?? 1) || 1])
    .range([5, 26]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${area.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-area.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0,${area.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${area.left},0)`)
    .call(yAxis);

  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(d3.sort(commitsArr, d => -d.totalLines), d => d.id)
    .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r',  d => rScale(d.totalLines))
      .style('fill', 'steelblue')
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mousemove', (event) => {
        updateTooltipPosition(event);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });

  const brush = d3.brush()
    .extent([[area.left, area.top], [area.right, area.bottom]])
    .on('start brush end', brushed);

  svg.append('g').attr('class', 'brush').call(brush);

  svg.selectAll('.dots, .overlay ~ *').raise();

  function isCommitSelected(selection, d) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(d.datetime);
    const y = yScale(d.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  function brushed(event) {
    const selection = event.selection;
    dots.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
    const selected = selection ? commitsArr.filter(d => isCommitSelected(selection, d)) : [];
    renderSelectionCount(selected);
    renderLanguageBreakdown(selected);
  }

  function renderSelectionCount(selectedCommits) {
    const el = document.querySelector('#selection-count');
    el.textContent = `${selectedCommits.length || 'No'} commits selected`;
  }

  function renderLanguageBreakdown(selectedCommits) {
    const container = document.getElementById('language-breakdown');

    const source = (selectedCommits && selectedCommits.length) ? selectedCommits : commitsArr;
    const lines = source.flatMap(d => d.lines);

    if (!lines.length) { container.innerHTML = ''; return; }

    const breakdown = d3.rollup(
      lines,
      v => v.length,
      d => d.type
    );

    container.innerHTML = '';
    for (const [lang, count] of breakdown) {
      const pct = d3.format('.1~%')(count / lines.length);
      container.innerHTML += `<dt>${lang.toUpperCase()}</dt><dd>${count} lines (${pct})</dd>`;
    }
  }
}

/* Unit visualization for file sizes */
function updateFileDisplay(commitsSubset) {
  const root = d3.select('#files');
  if (root.empty()) return;

  const lines = (commitsSubset || []).flatMap(d => d.lines || []);
  if (!lines.length) {
    root.html('');
    return;
  }

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const rows = root
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter =>
      enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      })
    );

  rows.select('dt > code').html(d => `
    ${d.name}
    <small>${d.lines.length} lines</small>
  `);

  rows.select('dd')
    .selectAll('div.loc')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background-color', line => colorByType(line.type));
}

/* Central filter function used by slider + scrollytelling */
function updateCommitFilter(maxTime, options = {}) {
  if (!maxTime || !allCommits.length || !timeScale) return;
  const { syncSlider = true } = options;

  commitMaxTime = maxTime;
  commitProgress = timeScale(commitMaxTime);

  const slider = document.getElementById('commit-progress');
  if (syncSlider && slider) {
    slider.value = commitProgress;
  }

  const timeEl = document.getElementById('commit-filter-time');
  if (timeEl) {
    timeEl.textContent = commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }

  filteredCommits = allCommits.filter(d => d.datetime <= commitMaxTime);

  renderScatterPlot(rawData, filteredCommits);
  updateFileDisplay(filteredCommits);
}

/* Slider setup */
function initCommitFiltering() {
  if (!allCommits.length) return;

  timeScale = d3.scaleTime()
    .domain(d3.extent(allCommits, d => d.datetime))
    .range([0, 100]);

  const slider = document.getElementById('commit-progress');
  if (slider) {
    slider.min = 0;
    slider.max = 100;
    slider.step = 1;
    slider.addEventListener('input', () => {
      const v = +slider.value;
      const date = timeScale.invert(v);
      updateCommitFilter(date, { syncSlider: false });
    });
  }

  const latest = d3.max(allCommits, d => d.datetime);
  updateCommitFilter(latest, { syncSlider: true });
}

/* Helper to build commit narrative text (used in both scrolly sections) */
function stepHTML(d, i) {
  const fileCount = d3.rollups(
    d.lines,
    v => v.length,
    line => line.file
  ).length;

  return `
    On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
    I made <a href="${d.url}" target="_blank" rel="noopener">
      ${i > 0 ? 'another glorious commit' : 'my first glorious commit'}
    </a>.
    I edited ${d.totalLines} lines across ${fileCount} files.
  `;
}

/* Scrollytelling: TOP (scatter) + BOTTOM (files) */
function setupScrolly() {
  if (!allCommits.length) return;

  const commitsChrono = d3.sort(allCommits, d => d.datetime);

  // inject steps into BOTH stories
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commitsChrono)
    .join('div')
    .attr('class', 'step')
    .html(stepHTML);

  d3.select('#files-story')
    .selectAll('.step')
    .data(commitsChrono)
    .join('div')
    .attr('class', 'step')
    .html(stepHTML);

  // scroller for top section
  const scroller1 = scrollama();
  scroller1
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter((response) => {
      const commit = response.element.__data__;
      if (commit && commit.datetime) {
        updateCommitFilter(commit.datetime);
      }
    });

  // scroller for bottom section
  const scroller2 = scrollama();
  scroller2
    .setup({
      container: '#scrolly-2',
      step: '#scrolly-2 .step',
    })
    .onStepEnter((response) => {
      const commit = response.element.__data__;
      if (commit && commit.datetime) {
        updateCommitFilter(commit.datetime);
      }
    });
}

/* Boot the page */
const REPO_URL = 'https://github.com/vis-society/lab-7'; // or your repo

rawData    = await loadData();
allCommits = processCommits(rawData, REPO_URL);

renderCommitInfo(rawData, allCommits);
initCommitFiltering();   // slider + initial scatter + files
setupScrolly();          // top + bottom scrollytelling

window.addEventListener('resize', () => {
  renderScatterPlot(rawData, filteredCommits.length ? filteredCommits : allCommits);
});
