import { state, saveSettings } from './state.js';
import {
    computeRunMetrics, formatDate, getWeekKey,
    getRunningWeekNumber, getPaceZoneIndex,
    getPaceZoneColor, getHrClass
} from './utils.js';
import { openRunModal } from './modals.js';

const calendarDaysGrid = document.getElementById('calendar-days-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const statsTotalRuns = document.getElementById('stats-total-runs');
const statsTotalDistance = document.getElementById('stats-total-distance');
const statsCurrentStreak = document.getElementById('stats-current-streak');

export function renderCalendar() {
    if (!calendarDaysGrid) return;
    calendarDaysGrid.innerHTML = '';

    const startDate = new Date(state.currentDate.getTime());
    const endDate = new Date(state.currentDate.getTime());
    endDate.setDate(endDate.getDate() + 20);

    const polishMonths = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];

    const startMonth = polishMonths[startDate.getMonth()];
    const startYear = startDate.getFullYear();
    const endMonth = polishMonths[endDate.getMonth()];
    const endYear = endDate.getFullYear();

    if (startDate.getMonth() === endDate.getMonth()) {
        calendarMonthYear.textContent = `${startMonth} ${startYear}`;
    } else {
        if (startYear === endYear) {
            calendarMonthYear.textContent = `${startMonth} – ${endMonth} ${startYear}`;
        } else {
            calendarMonthYear.textContent = `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
        }
    }

    const runsWithMetrics = computeRunMetrics();

    const dayGoalsMap = {};
    for (let w = 0; w < 3; w++) {
        const weekMonday = new Date(state.currentDate.getTime());
        weekMonday.setDate(weekMonday.getDate() + (w * 7));
        const weekKey = getWeekKey(weekMonday);
        const weekDailyGoal = state.settings.weeklyGoals?.[weekKey] !== undefined ? parseFloat(state.settings.weeklyGoals[weekKey]) : 14;

        for (let d = 0; d < 7; d++) {
            const dayDate = new Date(weekMonday.getTime());
            dayDate.setDate(dayDate.getDate() + d);
            dayGoalsMap[formatDate(dayDate)] = weekDailyGoal;
        }
    }

    for (let i = 0; i < 21; i++) {
        const currentGridDate = new Date(state.currentDate.getTime());
        currentGridDate.setDate(currentGridDate.getDate() + i);
        const dateStr = formatDate(currentGridDate);

        if (i % 7 === 0) {
            const weekMonday = new Date(currentGridDate.getTime());
            const weekKey = getWeekKey(weekMonday);
            const weekDailyGoal = dayGoalsMap[dateStr];

            const weekDates = [];
            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(weekMonday.getTime());
                dayDate.setDate(dayDate.getDate() + d);
                weekDates.push(formatDate(dayDate));
            }

            const runsInWeek = runsWithMetrics.filter(r => weekDates.includes(r.date));
            const totalDist = runsInWeek.reduce((sum, run) => sum + (parseFloat(run.distance) || 0), 0);
            const runsWithHr = runsInWeek.filter(r => (parseInt(r.hr) || 0) > 0);
            const avgHr = runsWithHr.length > 0 ? Math.round(runsWithHr.reduce((sum, r) => sum + r.hr, 0) / runsWithHr.length) : null;

            let totalSeconds = 0;
            runsInWeek.forEach((run) => {
                const h = parseInt(run.durationH) || 0;
                const m = parseInt(run.durationM) || 0;
                const s = parseInt(run.durationS) || 0;
                const durationSeconds = (h * 3600) + (m * 60) + s;
                if (durationSeconds > 0) {
                    totalSeconds += durationSeconds;
                } else {
                    const paceSec = ((parseInt(run.paceM) || 0) * 60) + (parseInt(run.paceS) || 0);
                    totalSeconds += (paceSec * (parseFloat(run.distance) || 0));
                }
            });

            let avgPaceStr = '--:--';
            let paceText = `🏃 Avg pace: --:-- /km`;
            if (totalDist > 0 && totalSeconds > 0) {
                const avgSecondsPerKm = totalSeconds / totalDist;
                const avgMin = Math.floor(avgSecondsPerKm / 60);
                const avgSec = Math.round(avgSecondsPerKm % 60);
                const avgSecStr = String(avgSec === 60 ? 59 : avgSec).padStart(2, '0');
                avgPaceStr = `${avgMin}:${avgSecStr}`;
                paceText = `🏃 ${avgPaceStr} min/km`;
            }

            const weekNum = getRunningWeekNumber(weekMonday);
            const weekNumText = weekNum && weekNum > 0 ? `${weekNum}` : `Week --`;
            const hrText = avgHr ? `❤️ ${avgHr} bpm` : `❤️ -- bpm`;

            const weeklyGoal = weekDailyGoal * 7;
            let distText = weekDailyGoal > 0 ? `📈 ${totalDist.toFixed(1)} / ${weeklyGoal.toFixed(1)} km` : `📈 ${totalDist.toFixed(1)} km`;

            const summaryBar = document.createElement('div');
            summaryBar.classList.add('week-summary-bar');
            summaryBar.innerHTML = `
                <span class="week-summary-title">${weekNumText}</span>
                <span class="week-summary-item">${distText}</span>
                <span class="week-summary-item">${hrText}</span>
                <span class="week-summary-item">${paceText}</span>
                <span class="week-summary-item week-goal-wrapper">
                    🎯 Goal: <input type="number" class="input-weekly-goal" value="${weekDailyGoal}" min="0" step="0.5"> km/day
                </span>
            `;

            const goalInput = summaryBar.querySelector('.input-weekly-goal');
            goalInput.addEventListener('change', (e) => {
                const val = parseFloat(e.target.value);
                const targetVal = isNaN(val) ? 0 : val;
                if (!state.settings.weeklyGoals) state.settings.weeklyGoals = {};
                state.settings.weeklyGoals[weekKey] = targetVal;
                saveSettings();
                renderCalendar();
            });

            calendarDaysGrid.appendChild(summaryBar);
        }

        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');

        const todayStr = formatDate(new Date());
        if (dateStr === todayStr) dayCell.classList.add('today');

        const dayHeader = document.createElement('div');
        dayHeader.classList.add('day-header');

        const dayNumSpan = document.createElement('span');
        dayNumSpan.classList.add('day-number');
        dayNumSpan.textContent = currentGridDate.getDate();
        dayHeader.appendChild(dayNumSpan);

        const addRunBtn = document.createElement('button');
        addRunBtn.classList.add('add-run-btn-cell');
        addRunBtn.innerHTML = '➕';
        addRunBtn.setAttribute('title', 'Dodaj bieg pod tą datą');
        addRunBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openRunModal(null, dateStr);
        });
        dayHeader.appendChild(addRunBtn);
        dayCell.appendChild(dayHeader);

        const runsOnThisDay = runsWithMetrics.filter(r => r.date === dateStr);
        const currentDailyGoal = dayGoalsMap[dateStr] !== undefined ? dayGoalsMap[dateStr] : 14;

        if (runsOnThisDay.length > 0) {
            const runContainer = document.createElement('div');
            runContainer.classList.add('day-run-container');
            const dayTotalDist = runsOnThisDay.reduce((sum, r) => sum + (parseFloat(r.distance) || 0), 0);

            if (currentDailyGoal > 0 && dayTotalDist < currentDailyGoal) {
                runContainer.classList.add('goal-failed');
            }

            runsOnThisDay.forEach((run) => {
                const paceBar = document.createElement('div');
                const zoneIndex = getPaceZoneIndex(run.paceM, run.paceS);
                const zoneColor = getPaceZoneColor(zoneIndex);
                paceBar.classList.add('run-bar');
                paceBar.style.background = zoneColor;
                const paceSecStr = String(run.paceS || 0).padStart(2, '0');
                paceBar.innerHTML = `🏃 ${run.paceM || 0}:${paceSecStr} min/km`;
                runContainer.appendChild(paceBar);

                if (run.hr && parseInt(run.hr) > 0) {
                    const hrBar = document.createElement('div');
                    hrBar.classList.add('run-bar', getHrClass(run.hr));
                    hrBar.innerHTML = `❤️ ${run.hr || 0} bpm`;
                    runContainer.appendChild(hrBar);
                }

                const durationBar = document.createElement('div');
                durationBar.classList.add('run-bar', 'bar-duration');
                const hStr = run.durationH > 0 ? `${run.durationH}:` : '';
                const mStr = String(run.durationM || 0).padStart(2, '0');
                const sStr = String(run.durationS || 0).padStart(2, '0');
                durationBar.innerHTML = `⌚ ${hStr}${mStr}:${sStr}`;
                runContainer.appendChild(durationBar);

                const detailsBar = document.createElement('div');
                detailsBar.classList.add('run-bar', 'bar-details');
                const distFormatted = typeof run.distance === 'number' ? run.distance.toFixed(1) : parseFloat(run.distance || 0).toFixed(1);
                const mountainEmoji = run.mountainRun ? ' ⛰️' : '';
                const notesEmoji = run.notes ? ' 📝' : '';
                detailsBar.innerHTML = `<span>🕖 ${run.time || '--:--'} &#8226;</span> ${run.computedNumber || 0} || ${distFormatted} km [${run.computedStreak || 1}]${mountainEmoji}${notesEmoji}`;

                if (run.notes) {
                    const notesIcon = detailsBar.querySelector('[style*=""]');
                    detailsBar.addEventListener('mouseenter', (e) => {
                        const tooltip = document.createElement('div');
                        tooltip.classList.add('run-notes-tooltip');
                        tooltip.textContent = run.notes;
                        document.body.appendChild(tooltip);

                        const rect = detailsBar.getBoundingClientRect();
                        tooltip.style.top = (rect.bottom + 5) + 'px';
                        tooltip.style.left = rect.left + 'px';

                        detailsBar._tooltip = tooltip;
                    });

                    detailsBar.addEventListener('mouseleave', () => {
                        if (detailsBar._tooltip) {
                            detailsBar._tooltip.remove();
                            detailsBar._tooltip = null;
                        }
                    });
                }

                runContainer.appendChild(detailsBar);

                runContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRunModal(run.id);
                });
            });
            dayCell.appendChild(runContainer);
        } else {
            if (currentDailyGoal > 0) dayCell.classList.add('goal-failed');
            dayCell.addEventListener('click', () => openRunModal(null, dateStr));
        }
        calendarDaysGrid.appendChild(dayCell);
    }
}

export function updateStats() {
    if (!statsTotalRuns) return;
    if (state.runs.length === 0) {
        statsTotalRuns.textContent = '0';
        statsTotalDistance.textContent = '0.0 km';
        statsCurrentStreak.textContent = '0 dni';
        return;
    }

    const runsWithMetrics = computeRunMetrics();
    statsTotalRuns.textContent = runsWithMetrics.length;

    const totalDist = runsWithMetrics.reduce((sum, run) => sum + (parseFloat(run.distance) || 0), 0);
    const formattedDist = new Intl.NumberFormat('pl-PL').format(Math.floor(totalDist));
    statsTotalDistance.textContent = `${formattedDist} km`;

    let totalSeconds = 0;
    runsWithMetrics.forEach((run) => {
        const h = parseInt(run.durationH) || 0;
        const m = parseInt(run.durationM) || 0;
        const s = parseInt(run.durationS) || 0;
        const seconds = (h * 3600) + (m * 60) + s;
        if (seconds > 0) {
            totalSeconds += seconds;
        } else {
            const paceSec = ((parseInt(run.paceM) || 0) * 60) + (parseInt(run.paceS) || 0);
            totalSeconds += (paceSec * (parseFloat(run.distance) || 0));
        }
    });

    const runDates = new Set(runsWithMetrics.map(r => r.date));
    let activeStreak = 0;
    let checkDate = new Date();

    const todayStr = formatDate(checkDate);
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = formatDate(checkDate);

    if (runDates.has(todayStr) || runDates.has(yesterdayStr)) {
        checkDate = runDates.has(todayStr) ? new Date() : checkDate;
        while (true) {
            const dateStr = formatDate(checkDate);
            if (runDates.has(dateStr)) {
                activeStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }
    statsCurrentStreak.textContent = `${activeStreak} ${activeStreak === 1 ? 'day' : 'days'}`;
}