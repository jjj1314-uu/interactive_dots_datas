let columns = 8;
let datasetConfigs = [
    { key: "battersea", label: "Battersea Park", path: "css/Battersea 20 Air Data.csv", sizeScale: 1.0, fixedValues: { ph: 6.5 } },
    { key: "wandle", label: "River Wandle", path: "css/River Wandle Air Data CSV NEW.csv", sizeScale: 1.25, fixedValues: { ph: 8.0 } },
];
let airDataSets = {};
let metricRanges = {};
let dataError = "";

const metrics = [
    { key: "voc", label: "VOC", color: "rgb(12, 23, 79)" },
    { key: "humidity", label: "Humidity", color: "rgb(3, 41, 115)" },
    { key: "co2", label: "CO2", color: "rgb(9, 75, 133)" },
    { key: "temp", label: "Temp", color: "rgb(51, 108, 158)" },
    { key: "pm2p5", label: "PM2P5", color: "rgb(78, 131, 166)" },
    { key: "pm1", label: "PM1", color: "rgb(101, 142, 168)" },
    { key: "nox", label: "NOX", color: "rgb(128, 168, 209)" },
    { key: "ph", label: "pH", color: "rgb(136, 156, 36)" },
];

const metricsWandle = [
    { key: "voc", label: "VOC", color: "rgb(4, 43, 5)" },
    { key: "humidity", label: "Humidity", color: "rgb(7, 61, 9)" },
    { key: "co2", label: "CO2", color: "rgb(36, 99, 38)" },
    { key: "temp", label: "Temp", color: "rgb(56, 120, 68)" },
    { key: "pm2p5", label: "PM2P5", color: "rgb(82, 156, 84)" },
    { key: "pm1", label: "PM1", color: "rgb(114, 179, 116)" },
    { key: "nox", label: "NOX", color: "rgb(151, 191, 152)" },
    { key: "ph", label: "pH", color: "rgb(68, 112, 88)" },
];

function setup() {
    createCanvas(1120, 420);
    canvas.style('background', 'transparent'); // force transparent on canvas element
    clear();
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(12);
    loadAirData();
}

function draw() {
    clear();

    let leftMargin = 140;

    let datasetsLoaded = datasetConfigs.every(ds => airDataSets[ds.key] && airDataSets[ds.key].length > 0);
    if (!datasetsLoaded) {
        fill(40);
        text(dataError || "No CSV data loaded", width / 2, height / 2);
        return;
    }

    // Draw title at the top
    textSize(20);
    textStyle(BOLD);
    fill(255);
    text("Average Data Results", width / 2, 50);
    textStyle(NORMAL);
    textSize(12);

    let rows = datasetConfigs.length;
    let topPadding = 55;
    let bottomPadding = 25;
    let plotHeight = height - topPadding - bottomPadding;

    let spaceX = (width - leftMargin) / (columns + 1);
    let spaceY = plotHeight / rows;
    let avgRows = computeAverageRows();

    for (let ri = 0; ri < rows; ri++) {
        let dataset = datasetConfigs[ri];
        let rowCenterY = topPadding + (ri + 0.5) * spaceY;

        // Dataset arrow label on left
        let arrowX = 10;
        let arrowY = rowCenterY;
        let arrowW = 150;
        let arrowH = 34;

        noStroke();
        if (dataset.key === "battersea") {
            fill(34, 98, 175, 200);
        } else {
            fill(22, 145, 56, 210);
        }
        rect(arrowX, arrowY - arrowH / 2, arrowW, arrowH, 6);
        fill(255, 230);
        triangle(arrowX + arrowW, arrowY - arrowH / 2 + 2,
                 arrowX + arrowW, arrowY + arrowH / 2 - 2,
                 arrowX + arrowW + 20, arrowY);

        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        fill(255);
        text(dataset.label, arrowX + arrowW / 2, rowCenterY);

        for (let i = 0; i < metrics.length; i++) {
            let metric = metrics[i];
            if (dataset.key === "wandle") {
                metric = metricsWandle[i];
            }
            let x = leftMargin + (i + 1) * spaceX;
            let y = rowCenterY;

            let currentValue = avgRows[dataset.key][metric.key];
            let range = metricRanges[metric.key];
            let baseDiam = map(currentValue, range.min, range.max, 45, 130, true);
            let scale = dataset.sizeScale || 1;
            let phScale = metric.key === "ph" ? 0.75 : 1; // make pH circle smaller by 25%
            let diam = baseDiam * scale * phScale;
            let hoverBoost = map(dist(mouseX, mouseY, x, y), 0, 120, 18, 0, true);

            fill(metric.color);
            ellipse(x, y, diam + hoverBoost);

            let proximity = dist(mouseX, mouseY, x, y);
            let radius = (diam + hoverBoost) / 2;

            if (proximity <= radius) {
                textAlign(CENTER, CENTER);
                textSize(14);
                textStyle(BOLD);
                fill(255);
                text(metric.label, x, y - 12);

                if (metric.key === "ph") {
                    let labelValue = nf(currentValue, 0, 1);
                    let descriptor = dataset.key === "battersea" ? "Neutral" : "Alkaline";
                    text(`${labelValue} ${descriptor}`, x, y + 12);
                } else {
                    text(nf(currentValue, 0, 1), x, y + 12);
                }

                textStyle(NORMAL);
                textSize(12);
            }
        }
    }

    // restore default alignment for any further text
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
    textSize(12);
}

async function loadAirData() {
    try {
        for (let dataset of datasetConfigs) {
            let response = await fetch(encodeURI(dataset.path));
            if (!response.ok) {
                throw new Error(`CSV request failed for ${dataset.path}`);
            }

            let csvText = await response.text();
            airDataSets[dataset.key] = parseCsv(csvText);
        }

        metricRanges = buildMetricRanges();
        dataError = "";
    } catch (error) {
        dataError = "CSV failed to load";
        console.error(error);
    }
}

function parseCsv(csvText) {
    let lines = csvText.trim().split(/\r?\n/);
    let headers = lines[0].split(",");
    let rows = [];

    for (let i = 1; i < lines.length; i++) {
        let values = lines[i].split(",");
        let row = {};

        for (let j = 0; j < headers.length; j++) {
            let header = headers[j].trim();
            let value = values[j].trim();
            row[header] = header === "time" ? value : Number(value);
        }

        rows.push(row);
    }

    return rows;
}

function buildMetricRanges() {
    let ranges = {};

    for (let metric of metrics) {
        let minValue = Infinity;
        let maxValue = -Infinity;

        for (let dataset of datasetConfigs) {
            let rows = airDataSets[dataset.key] || [];
            for (let row of rows) {
                let value = row[metric.key];
                if (metric.key === "ph" && dataset.fixedValues && dataset.fixedValues.ph !== undefined) {
                    value = dataset.fixedValues.ph;
                }
                if (value !== undefined && !isNaN(value)) {
                    minValue = min(minValue, value);
                    maxValue = max(maxValue, value);
                }
            }
            if (metric.key === "ph" && dataset.fixedValues && dataset.fixedValues.ph !== undefined) {
                let value = dataset.fixedValues.ph;
                minValue = min(minValue, value);
                maxValue = max(maxValue, value);
            }
        }

        if (minValue === Infinity || maxValue === -Infinity) {
            minValue = 0;
            maxValue = 1;
        }

        if (minValue === maxValue) {
            maxValue = minValue + 1;
        }

        ranges[metric.key] = { min: minValue, max: maxValue };
    }

    return ranges;
}

function setGradient(x, y, w, h, c1, c2) {
    noFill();
    for (let i = x; i <= x + w; i++) {
        let inter = map(i, x, x + w, 0, 1);
        let c = lerpColor(c1, c2, inter);
        stroke(c);
        line(i, y, i, y + h);
    }
}

function computeAverageRow(rows, fixedValues = {}) {
    let sums = {};
    let counts = {};

    for (let metric of metrics) {
        sums[metric.key] = 0;
        counts[metric.key] = 0;
    }

    for (let row of rows) {
        for (let metric of metrics) {
            let value = row[metric.key];
            if (value !== undefined && !isNaN(value)) {
                sums[metric.key] += value;
                counts[metric.key] += 1;
            }
        }
    }

    let avgRow = {};
    for (let metric of metrics) {
        if (fixedValues[metric.key] !== undefined) {
            avgRow[metric.key] = fixedValues[metric.key];
        } else if (counts[metric.key] > 0) {
            avgRow[metric.key] = sums[metric.key] / counts[metric.key];
        } else {
            avgRow[metric.key] = 0;
        }
    }

    return avgRow;
}

function computeAverageRows() {
    let avgPerDataset = {};
    for (let dataset of datasetConfigs) {
        avgPerDataset[dataset.key] = computeAverageRow(airDataSets[dataset.key], dataset.fixedValues || {});
    }
    return avgPerDataset;
}


