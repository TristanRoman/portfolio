import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* I load and parse the CSV from elocuent so numbers are numeric and dates are Date objects */
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

/* I group rows by commit and build a compact commit object so the plot and tooltip have everything they need */
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
        enumerable: false,   // I keep the raw lines off console listings so objects stay tidy
        writable: false,
      });
      return ret;
    });
}

/* I render the top summary so viewers get quick context about the repo */
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

/* I fill the tooltip with commit details and toggle/position it during hover */
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

/* I draw the responsive scatter, wire up hover + brush, and route selection to the counters */
function renderScatterPlot(data, commits) {
  const chartEl = document.getElementById('chart');

  // I guard against empty input so the page doesn’t throw errors
  const commitsArr = Array.isArray(commits) ? commits : [];
  if (commitsArr.length === 0) {
    d3.select('#chart').html('');
    return;
  }

  // I compute a responsive size with a wide-screen aspect that still fits laptops
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

  // I build the SVG once per render and keep it responsive via CSS sizing
  const svg = d3.select('#chart')
    .html('')
    .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('width', '100%')
      .style('height', 'auto');

  // I stabilize the time scale; if all commits land on one day, I pad the domain so dots don’t stack
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

  // I scale radius by sqrt so the dot area corresponds to lines changed
  const [minLines, maxLines] = d3.extent(commitsArr, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines ?? 0, (maxLines ?? 1) || 1])
    .range([5, 26]);

  // I draw gridlines before axes so ticks sit on top and remain crisp
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${area.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-area.width));

  // I render axes with a readable 24h label on Y
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0,${area.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${area.left},0)`)
    .call(yAxis);

  // I draw dots largest-first so big circles don’t hide small ones
  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(d3.sort(commitsArr, d => -d.totalLines))
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

  // I add a brush so users can lasso a region and update the stats live
  const brush = d3.brush()
    .extent([[area.left, area.top], [area.right, area.bottom]])
    .on('start brush end', brushed);

  svg.append('g').attr('class', 'brush').call(brush);

  // I raise the dots so hover remains active even with the brush overlay
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

    // I paint selected dots to give immediate visual feedback
    dots.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));

    // I compute the selected set once and feed it to both readouts
    const selected = selection ? commitsArr.filter(d => isCommitSelected(selection, d)) : [];
    renderSelectionCount(selected);
    renderLanguageBreakdown(selected);
  }

  // I show a concise selection count just under the chart title
  function renderSelectionCount(selectedCommits) {
    const el = document.querySelector('#selection-count');
    el.textContent = `${selectedCommits.length || 'No'} commits selected`;
  }

  // I aggregate the lines by language/type so brushing reports a live language mix
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

/* I boot the page by loading data, shaping commits, and rendering; I also re-render on resize so the chart stays snug */
const REPO_URL = 'https://github.com/vis-society/lab-7'; // replace with your repo if desired

const data    = await loadData();
const commits = processCommits(data, REPO_URL);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

window.addEventListener('resize', () => renderScatterPlot(data, commits));
