export function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getRunningWeekNumber(mondayDate, runs) {
    if (!runs || runs.length === 0) return null;
    const runDates = runs.map(r => new Date(r.date));
    const earliestDate = new Date(Math.min(...runDates));
    const earliestMonday = getMonday(earliestDate);

    const utcMondayDate = Date.UTC(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate());
    const utcEarliestMonday = Date.UTC(earliestMonday.getFullYear(), earliestMonday.getMonth(), earliestMonday.getDate());

    const diffTime = utcMondayDate - utcEarliestMonday;
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks + 1;
}

export function getWeekKey(mondayDate, runs) {
    const year = mondayDate.getFullYear();
    const weekNum = getRunningWeekNumber(mondayDate, runs) || 0;
    return `${year}-W${weekNum}`;
}

// 3. Strefy tempa i tętna (zostają bez zmian)
export function getPaceZoneIndex(min, sec) {
    const totalSec = (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
    if (totalSec > 429) return 0;
    if (totalSec < 240) return 18;
    return Math.floor((429 - totalSec) / 10);
}

export function getPaceZoneColor(zoneIndex) {
    const zoneColors = {
        0: '#b10000ff', 1: '#d43838ff', 2: '#f72302ff', 3: '#ff5500ff', 4: '#ff863fff',
        5: '#ff9625ff', 6: '#fcbb52ff', 7: '#ffd326ff', 8: '#fff336ff', 9: '#e2f536ff',
        10: '#b9e50cff', 11: '#8ce510ff', 12: '#64cf1dff', 13: '#49b800ff', 14: '#13d16dff',
        15: '#0fb7b1ff', 16: '#2fd4cfff', 17: '#82ebe7ff', 18: '#b4f4ffff'
    };
    return zoneColors[zoneIndex] || '#cccccc';
}

export function getHrClass(hr) {
    const heartRate = parseInt(hr) || 0;
    if (heartRate < 130) return 'bar-hr-under-130';
    if (heartRate <= 134) return 'bar-hr-130-134';
    if (heartRate <= 139) return 'bar-hr-135-139';
    if (heartRate <= 144) return 'bar-hr-140-144';
    if (heartRate <= 149) return 'bar-hr-145-149';
    if (heartRate <= 154) return 'bar-hr-150-154';
    if (heartRate <= 159) return 'bar-hr-155-159';
    if (heartRate <= 164) return 'bar-hr-160-164';
    return 'bar-hr-165-plus';
}

export function computeRunMetrics(runsAsInput) {
    if (!runsAsInput || runsAsInput.length === 0) return [];
    
    const sortedRuns = [...runsAsInput].sort((a, b) => new Date(a.date) - new Date(b.date));
    let autoRunNumCounter = 1;
    const runDates = new Set(sortedRuns.map(r => r.date));

    sortedRuns.forEach((run) => {
        let streak = 1;
        let currentDate = new Date(run.date);

        while (true) {
            currentDate.setDate(currentDate.getDate() - 1);
            const prevDateStr = formatDate(currentDate);
            if (runDates.has(prevDateStr)) {
                streak++;
            } else {
                break;
            }
        }

        run.computedNumber = autoRunNumCounter;
        autoRunNumCounter++;
        run.computedStreak = streak;
    });

    return sortedRuns;
}