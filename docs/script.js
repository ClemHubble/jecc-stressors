const TOTAL_WIDTH = 1200;
const propMargin = { top: 20, right: 10, bottom: 20, left: 60 };
const propWidth = TOTAL_WIDTH - propMargin.left - propMargin.right;
const propHeight = 300;
const subchartHeight = 300;
const subchartGap = 8;
const eqMarginFirst = { top: 20, right: 10, bottom: 30, left: 60 };
const eqMarginOther = { top: 20, right: 10, bottom: 30, left: 10 };

const validSubjects = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18];
let currentSubjectIndex = 0;

const phaseLineColors = {
  baseline: "#808080",
  tmct: "#ff8c00",
  "first rest": "#6fb07a",
  "real opinion": "#ff8c00",
  "opposite opinion": "#ff8c00",
  "second rest": "#6fb07a",
  subtract: "#ff8c00",
  "no phase": "#e0e0e0",
};

const phaseBackgroundColors = {
  baseline: "#f5f5f5",
  tmct: "#fff3e0",
  "first rest": "#e8f5e9",
  "real opinion": "#fff3e0",
  "opposite opinion": "#fff3e0",
  "second rest": "#e8f5e9",
  subtract: "#fff3e0",
  "no phase": "#f5f5f5",
};

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function createGradient(defs, id, observed, reported, baseColor) {
  const gradient = defs
    .append("linearGradient")
    .attr("id", id)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  if (reported > observed) {
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0.6);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0);
  } else {
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0.6);
  }
}

const showTooltip = (event, phase) => {
  if (phase.phase === "no phase") return;
  const disparity = Math.abs(phase.reportedMean - phase.observedMean).toFixed(
    2
  );
  const type =
    phase.reportedMean > phase.observedMean
      ? "Overestimated"
      : "Underestimated";
  d3.select("#tooltip")
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px")
    .html(
      `
          <strong>${phase.phase}</strong><br/>
          ${type} by ${disparity} points<br/>
          Reported: ${phase.reportedMean.toFixed(2)}<br/>
          Observed: ${phase.observedMean.toFixed(2)}
        `
    )
    .transition()
    .duration(200)
    .style("opacity", 0.9);
};

const hideTooltip = () => {
  d3.select("#tooltip").transition().duration(500).style("opacity", 0);
};

function applyToggleStyles() {
  let activePhases = [];
  d3.selectAll("#phase-toggle-container input[type='checkbox']").each(
    function () {
      if (this.checked) {
        activePhases.push(this.value);
      }
    }
  );
  if (activePhases.length === 0) {
    d3.selectAll("[data-phase]").style("display", null);
  } else {
    d3.selectAll("[data-phase]").each(function () {
      let elPhase = d3.select(this).attr("data-phase");
      if (activePhases.includes(elPhase)) {
        d3.select(this).style("display", null);
      } else {
        d3.select(this).style("display", "none");
      }
    });
  }
}

const allPhases = [
  "baseline",
  "tmct",
  "first rest",
  "real opinion",
  "opposite opinion",
  "second rest",
  "subtract",
  "no phase",
];
const phaseToggleContainer = d3.select("#phase-toggle-container");
allPhases.forEach((phase) => {
  phaseToggleContainer
    .append("label")
    .attr("class", "phase-toggle-label")
    .html(`<input type="checkbox" value="${phase}"> ${phase}`);
});
d3.selectAll("#phase-toggle-container input[type='checkbox']").on(
  "change",
  applyToggleStyles
);

function createSubjectIndicators() {
  const indicator = d3.select("#subject-indicator");
  indicator.selectAll("*").remove();
  for (let i = 1; i <= 18; i++) {
    let dot = indicator
      .append("span")
      .attr(
        "class",
        "subject-dot" + (validSubjects.includes(i) ? "" : " invalid")
      )
      .attr("data-subject", i);
    if (validSubjects.includes(i)) {
      dot.attr("data-tooltip", `Subject f${String(i).padStart(2, "0")}`);
    } else {
      dot.attr(
        "data-tooltip",
        `Subject f${String(i).padStart(2, "0")} is disabled due to invalid data`
      );
    }
    dot.on("click", function () {
      const subj = +d3.select(this).attr("data-subject");
      if (validSubjects.includes(subj)) {
        currentSubjectIndex = validSubjects.indexOf(subj);
        updateCharts(subj);
        updateActiveSubjectIndicator(subj);
      }
    });
  }
}

function updateActiveSubjectIndicator(currentValidSubject) {
  d3.selectAll("#subject-indicator .subject-dot").classed(
    "active",
    function () {
      return +d3.select(this).attr("data-subject") === currentValidSubject;
    }
  );
}

createSubjectIndicators();

function updateCharts(subjectNumber) {
  d3.select("#proportional-chart").selectAll("*").remove();
  d3.select("#equal-width-subcharts").selectAll("*").remove();
  d3.select("#current-subject").text(
    `Subject f${String(subjectNumber).padStart(2, "0")}`
  );

  d3.csv(`data/f${String(subjectNumber).padStart(2, "0")}.csv`).then((data) => {
    data.forEach((d) => {
      d.relative_time = +d.relative_time;
      d.observed_stress = +d.observed_stress;
      d.reported_stress = +d.reported_stress;
    });

    const globalStart = d3.min(data, (d) => d.relative_time);
    const globalEnd = d3.max(data, (d) => d.relative_time);

    const phases = d3.group(data, (d) => d.phase);
    const phaseInfo = Array.from(phases, ([phase, pdata]) => ({
      phase,
      start: d3.min(pdata, (d) => d.relative_time),
      end: d3.max(pdata, (d) => d.relative_time),
      data: pdata,
      observedMean: d3.mean(pdata, (d) => d.observed_stress),
      reportedMean: d3.mean(pdata, (d) => d.reported_stress),
    })).sort((a, b) => a.start - b.start);

    const noPhaseData = phaseInfo.find((p) => p.phase === "no phase");
    const regularPhases = phaseInfo.filter((p) => p.phase !== "no phase");

    let overallDiff = d3.mean(
      regularPhases,
      (d) => d.reportedMean - d.observedMean
    );
    let summaryText = "";
    if (overallDiff > 0) {
      summaryText = `On average, subject f${String(subjectNumber).padStart(
        2,
        "0"
      )} <span style="color:#ff4d4d">overestimated</span> their stress by <span style="color:#ff4d4d">+${overallDiff.toFixed(
        2
      )}</span> points.`;
    } else if (overallDiff < 0) {
      summaryText = `On average, subject f${String(subjectNumber).padStart(
        2,
        "0"
      )} <span style="color:#4d4dff">underestimated</span> their stress by <span style="color:#4d4dff">${overallDiff.toFixed(
        2
      )}</span> points.`;
    } else {
      summaryText = `On average, subject f${String(subjectNumber).padStart(
        2,
        "0"
      )} was accurate in their stress estimation.`;
    }
    d3.select("#subject-summary").html(summaryText);

    const xScaleProp = d3
      .scaleLinear()
      .domain([globalStart, globalEnd])
      .range([0, propWidth]);
    const yScaleProp = d3.scaleLinear().domain([0, 10]).range([propHeight, 0]);

    const svgProp = d3
      .select("#proportional-chart")
      .append("svg")
      .attr("width", TOTAL_WIDTH)
      .attr("height", propHeight + propMargin.top + propMargin.bottom);

    const defsProp = svgProp.append("defs");
    const gProp = svgProp
      .append("g")
      .attr("transform", `translate(${propMargin.left},${propMargin.top})`);

    regularPhases.forEach((phase, i) => {
      gProp
        .append("rect")
        .attr("x", xScaleProp(phase.start))
        .attr("y", yScaleProp(10))
        .attr("width", xScaleProp(phase.end) - xScaleProp(phase.start))
        .attr("height", yScaleProp(0) - yScaleProp(10))
        .attr("fill", phaseBackgroundColors[phase.phase])
        .attr("data-phase", phase.phase);

      const gradId = "grad-prop-" + i;
      createGradient(
        defsProp,
        gradId,
        phase.observedMean,
        phase.reportedMean,
        phaseLineColors[phase.phase]
      );

      gProp
        .append("rect")
        .attr("x", xScaleProp(phase.start))
        .attr("y", yScaleProp(Math.max(phase.observedMean, phase.reportedMean)))
        .attr("width", xScaleProp(phase.end) - xScaleProp(phase.start))
        .attr(
          "height",
          Math.abs(
            yScaleProp(phase.observedMean) - yScaleProp(phase.reportedMean)
          )
        )
        .attr("fill", `url(#${gradId})`)
        .attr("data-phase", phase.phase)
        .on("mouseover", (event) => showTooltip(event, phase))
        .on("mouseout", hideTooltip);

      gProp
        .append("path")
        .datum(phase.data)
        .attr("class", "line")
        .style("stroke", phaseLineColors[phase.phase])
        .attr(
          "d",
          d3
            .line()
            .x((d) => xScaleProp(d.relative_time))
            .y((d) => yScaleProp(d.observed_stress))
            .curve(d3.curveBasis)
        )
        .attr("data-phase", phase.phase);

      gProp
        .append("line")
        .attr("class", "mean-line")
        .attr("x1", xScaleProp(phase.start))
        .attr("x2", xScaleProp(phase.end))
        .attr("y1", yScaleProp(phase.observedMean))
        .attr("y2", yScaleProp(phase.observedMean))
        .style("stroke", phaseLineColors[phase.phase])
        .attr("data-phase", phase.phase);

      const repColor =
        phase.reportedMean > phase.observedMean ? "#ff4d4d" : "#4d4dff";
      gProp
        .append("line")
        .attr("x1", xScaleProp(phase.start))
        .attr("x2", xScaleProp(phase.end))
        .attr("y1", yScaleProp(phase.reportedMean))
        .attr("y2", yScaleProp(phase.reportedMean))
        .style("stroke", repColor)
        .style("stroke-width", 4)
        .style("stroke-linecap", "round")
        .style("stroke-dasharray", "7,10")
        .attr("data-phase", phase.phase);
    });

    if (noPhaseData) {
      let segments = [];
      let currentSegment = [noPhaseData.data[0]];
      for (let i = 1; i < noPhaseData.data.length; i++) {
        const diff =
          noPhaseData.data[i].relative_time -
          noPhaseData.data[i - 1].relative_time;
        if (diff > 1) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        currentSegment.push(noPhaseData.data[i]);
      }
      if (currentSegment.length) segments.push(currentSegment);
      segments.forEach((segment) => {
        gProp
          .append("path")
          .datum(segment)
          .attr("class", "line")
          .style("stroke", phaseLineColors["no phase"])
          .attr(
            "d",
            d3
              .line()
              .x((d) => xScaleProp(d.relative_time))
              .y((d) => yScaleProp(d.observed_stress))
              .curve(d3.curveBasis)
          )
          .attr("data-phase", "no phase");
      });
    }

    gProp
      .append("g")
      .attr("transform", `translate(0,${propHeight})`)
      .call(
        d3
          .axisBottom(xScaleProp)
          .tickFormat(formatTime)
          .tickSize(6)
          .tickPadding(3)
      );
    gProp.append("g").call(d3.axisLeft(yScaleProp).tickSize(6).tickPadding(3));

    const phaseCount = regularPhases.length;
    const totalEqualWidth = TOTAL_WIDTH;
    const fixedWidth =
      eqMarginFirst.left +
      eqMarginFirst.right +
      (phaseCount - 1) * (eqMarginOther.left + eqMarginOther.right) +
      subchartGap * (phaseCount - 1);
    const dataAreaWidth = (totalEqualWidth - fixedWidth) / phaseCount;

    const subchartsContainer = d3
      .select("#equal-width-subcharts")
      .style("width", totalEqualWidth + "px");

    regularPhases.forEach((phase, i) => {
      const margin = i === 0 ? eqMarginFirst : eqMarginOther;
      const svgWidth = margin.left + dataAreaWidth + margin.right;
      const subchartInnerHeight = subchartHeight - margin.top - margin.bottom;

      const phaseDiv = subchartsContainer
        .append("div")
        .attr("class", "subchart-container")
        .style("width", svgWidth + "px")
        .style("flex", "none");

      const diff = phase.reportedMean - phase.observedMean;
      phaseDiv
        .append("div")
        .attr("class", "subchart-footer")
        .style("padding-left", i === 0 ? "50px" : "8px")
        .html(
          `<span class="subchart-label">${
            phase.phase
          }</span><span class="subchart-indicator" style="color: ${
            phase.reportedMean > phase.observedMean ? "#ff4d4d" : "#4d4dff"
          }">${diff >= 0 ? "+" : ""}${diff.toFixed(2)}</span>`
        );

      const svgPhase = phaseDiv
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", subchartHeight);

      const defsEq = svgPhase.append("defs");
      const gPhase = svgPhase
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScaleEq = d3
        .scaleLinear()
        .domain([phase.start, phase.end])
        .range([0, dataAreaWidth]);
      const yScaleEq = d3
        .scaleLinear()
        .domain([0, 10])
        .range([subchartInnerHeight, 0]);

      gPhase
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", dataAreaWidth)
        .attr("height", subchartInnerHeight)
        .attr("fill", phaseBackgroundColors[phase.phase])
        .attr("data-phase", phase.phase);

      const gradIdEq = "grad-eq-" + i;
      createGradient(
        defsEq,
        gradIdEq,
        phase.observedMean,
        phase.reportedMean,
        phaseLineColors[phase.phase]
      );

      gPhase
        .append("rect")
        .attr("x", 0)
        .attr("y", yScaleEq(Math.max(phase.observedMean, phase.reportedMean)))
        .attr("width", dataAreaWidth)
        .attr(
          "height",
          Math.abs(yScaleEq(phase.observedMean) - yScaleEq(phase.reportedMean))
        )
        .attr("fill", `url(#${gradIdEq})`)
        .attr("data-phase", phase.phase)
        .on("mouseover", (event) => showTooltip(event, phase))
        .on("mouseout", hideTooltip);

      gPhase
        .append("path")
        .datum(phase.data)
        .attr("class", "line")
        .style("stroke", phaseLineColors[phase.phase])
        .attr(
          "d",
          d3
            .line()
            .x((d) => xScaleEq(d.relative_time))
            .y((d) => yScaleEq(d.observed_stress))
            .curve(d3.curveBasis)
        )
        .attr("data-phase", phase.phase);

      gPhase
        .append("line")
        .attr("class", "mean-line")
        .attr("x1", 0)
        .attr("x2", dataAreaWidth)
        .attr("y1", yScaleEq(phase.observedMean))
        .attr("y2", yScaleEq(phase.observedMean))
        .style("stroke", phaseLineColors[phase.phase])
        .attr("data-phase", phase.phase);

      const repColorEq =
        phase.reportedMean > phase.observedMean ? "#ff4d4d" : "#4d4dff";
      gPhase
        .append("line")
        .attr("x1", 0)
        .attr("x2", dataAreaWidth)
        .attr("y1", yScaleEq(phase.reportedMean))
        .attr("y2", yScaleEq(phase.reportedMean))
        .style("stroke", repColorEq)
        .style("stroke-width", 4)
        .style("stroke-linecap", "round")
        .style("stroke-dasharray", "7,10")
        .attr("data-phase", phase.phase);

      if (i === 0) {
        gPhase
          .append("g")
          .call(d3.axisLeft(yScaleEq).ticks(5).tickSize(6).tickPadding(3));
      }

      gPhase
        .append("g")
        .attr("transform", `translate(0,${subchartInnerHeight})`)
        .call(
          d3
            .axisBottom(xScaleEq)
            .ticks(2)
            .tickFormat(formatTime)
            .tickSize(6)
            .tickPadding(3)
        );
    });

    applyToggleStyles();
  });
}

updateCharts(validSubjects[currentSubjectIndex]);
updateActiveSubjectIndicator(validSubjects[currentSubjectIndex]);

d3.select("#prev-button").on("click", () => {
  currentSubjectIndex =
    (currentSubjectIndex - 1 + validSubjects.length) % validSubjects.length;
  updateCharts(validSubjects[currentSubjectIndex]);
  updateActiveSubjectIndicator(validSubjects[currentSubjectIndex]);
});

d3.select("#next-button").on("click", () => {
  currentSubjectIndex = (currentSubjectIndex + 1) % validSubjects.length;
  updateCharts(validSubjects[currentSubjectIndex]);
  updateActiveSubjectIndicator(validSubjects[currentSubjectIndex]);
});
